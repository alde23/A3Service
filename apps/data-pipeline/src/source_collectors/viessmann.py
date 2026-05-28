from __future__ import annotations

import hashlib
import re
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag

from src.manual_source_schema import ManualSource, SourceRegistryEntry


REQUEST_TIMEOUT_SECONDS = 30

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


NOISE_TERMS = [
    "warranty",
    "parts list",
    "wiring diagram",
    "wiring diagrams",
    "combustion chamber dimensions",
    "quick reference",
    "brochure",
    "catalog",
    "catalogue",
    "energyguide",
    "energy guide",
    "certificate",
    "certification",
]


MAX_VIESSMANN_SOURCES_PER_PAGE = 250
MIN_VIESSMANN_DISCOVERY_SCORE = 10

USEFUL_TERMS = [
    "installation manual",
    "installation/service manual",
    "installation/operating/service manual",
    "installation instructions",
    "start-up/service instructions",
    "startup/service instructions",
    "service manual",
    "operating manual",
    "technical data manual",
    "troubleshooting guide",
]


def _source_id(source_name: str, pdf_url: str) -> str:
    value = f"{source_name}|{pdf_url}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()[:16]


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _filename_from_url(url: str) -> str | None:
    decoded_url = unquote(url)
    parsed = urlparse(decoded_url)
    filename = Path(parsed.path).name

    if filename.lower().endswith(".pdf"):
        return filename

    return None


def _infer_document_type(title: str, path: str) -> str | None:
    combined = f"{title} {path}".lower()

    if "installation/operating/service" in combined:
        return "installation_operating_service_manual"

    if "installation/service" in combined:
        return "installation_service_manual"

    if "start-up/service" in combined or "startup/service" in combined:
        return "startup_service_instructions"

    if "installation instructions" in combined:
        return "installation_instructions"

    if "installation manual" in combined:
        return "installation_manual"

    if "service manual" in combined:
        return "service_manual"

    if "operating manual" in combined:
        return "operating_manual"

    if "technical data manual" in combined:
        return "technical_data_manual"

    if "troubleshooting guide" in combined:
        return "troubleshooting_guide"

    if "manual" in combined:
        return "manual"

    return None


def _is_likely_manual(title: str, path: str) -> bool:
    combined = f"{title} {path}".lower()

    if any(term in combined for term in NOISE_TERMS):
        return False

    if any(term in combined for term in USEFUL_TERMS):
        return True

    return "manual" in combined or "instructions" in combined


def _infer_language(title: str, path: str, default_language: str | None) -> str | None:
    combined = f"{title} {path}".lower()

    if "_fr" in combined or "-fr" in combined or "french" in combined or "française" in combined:
        return "fr"

    return default_language


def _anchor_context(anchor: Tag) -> str:
    chunks: list[str] = []

    text = anchor.get_text(" ", strip=True)
    if text:
        chunks.append(text)

    parent = anchor.parent
    for _ in range(3):
        if parent is None or not isinstance(parent, Tag):
            break

        parent_text = parent.get_text(" ", strip=True)
        if parent_text:
            chunks.append(parent_text)

        parent = parent.parent

    return _clean_text(" ".join(chunks))


def _collect_from_anchor_links(
    soup: BeautifulSoup,
    entry: SourceRegistryEntry,
) -> list[ManualSource]:
    sources: list[ManualSource] = []
    seen_pdf_urls: set[str] = set()

    for anchor in soup.find_all("a", href=True):
        href = str(anchor.get("href")).strip()

        if ".pdf" not in href.lower():
            continue

        pdf_url = unquote(urljoin(entry.source_url, href))

        if pdf_url in seen_pdf_urls:
            continue

        seen_pdf_urls.add(pdf_url)

        context = _anchor_context(anchor)
        file_name = _filename_from_url(pdf_url)
        document_type = _infer_document_type(context, pdf_url)

        sources.append(
            ManualSource(
                source_id=_source_id(entry.source_name, pdf_url),
                brand=entry.brand,
                model_family=None,
                model_names=[],
                document_type=document_type,
                language=_infer_language(context, pdf_url, entry.language),
                region=entry.region,
                source_authority=entry.source_authority,
                source_name=entry.source_name,
                source_page_url=entry.source_url,
                pdf_url=pdf_url,
                file_name=file_name,
                is_likely_manual=_is_likely_manual(context, pdf_url),
                notes=context[:500] if context else entry.notes,
            )
        )

    return sources


def _collect_from_viessmann_embedded_literature(
    page_text: str,
    entry: SourceRegistryEntry,
) -> list[ManualSource]:
    """
    Viessmann historic manual pages expose a compact embedded format like:

    H|Main Boiler Documentation
    D|648 KB|09/1983|Installation Manual|/old/13516/13516_ii_manual.pdf
    T|Viessmann Gas Burner
    D|924 KB|04/1983|Installation/Service Manual|/old/13516/...
    
    This parser extracts those D/C/F records and keeps the most recent H/T label
    as model/context metadata.
    """

    token_pattern = re.compile(
        r"(?P<section_kind>[HT])\|(?P<section_label>[^|]+?)(?=\s+[DCTF]\||\s+[HT]\||$)"
        r"|(?P<doc_kind>[DCTF])\|(?P<size>[^|]*)\|(?P<date>[^|]*)\|"
        r"(?P<title>[^|]*)\|(?P<path>/[^\s|]+?\.pdf)",
        flags=re.IGNORECASE | re.DOTALL,
    )

    sources: list[ManualSource] = []
    seen_pdf_urls: set[str] = set()

    current_section: str | None = None

    for match in token_pattern.finditer(page_text):
        section_kind = match.group("section_kind")

        if section_kind:
            current_section = _clean_text(match.group("section_label") or "")
            continue

        path = match.group("path")
        title = _clean_text(match.group("title") or "")
        date = _clean_text(match.group("date") or "")
        size = _clean_text(match.group("size") or "")

        if not path:
            continue

        pdf_url = unquote(urljoin(entry.source_url, path))

        if pdf_url in seen_pdf_urls:
            continue

        seen_pdf_urls.add(pdf_url)

        file_name = _filename_from_url(pdf_url)
        document_type = _infer_document_type(title, path)

        if current_section and current_section.lower() not in ["main boiler documentation"]:
            model_family = current_section
        else:
            model_family = None

        notes = _clean_text(
            f"section={current_section or 'unknown'} | "
            f"title={title} | date={date or 'unknown'} | size={size or 'unknown'}"
        )

        sources.append(
            ManualSource(
                source_id=_source_id(entry.source_name, pdf_url),
                brand=entry.brand,
                model_family=model_family,
                model_names=[],
                document_type=document_type,
                language=_infer_language(title, path, entry.language),
                region=entry.region,
                source_authority=entry.source_authority,
                source_name=entry.source_name,
                source_page_url=entry.source_url,
                pdf_url=pdf_url,
                file_name=file_name,
                is_likely_manual=_is_likely_manual(title, path),
                notes=notes[:500],
            )
        )

    return sources


def _viessmann_discovery_score(source: ManualSource) -> int:
    """
    Score Viessmann discovered PDFs before saving them into manual_sources.generated.json.

    The Viessmann pages expose a lot of literature. We only want records that are
    likely useful for boiler technical-library extraction.
    """

    combined = " ".join(
        [
            source.brand or "",
            source.model_family or "",
            source.document_type or "",
            source.file_name or "",
            source.pdf_url or "",
            source.notes or "",
            
        ]
    ).lower()

    if "/old/" in combined:
        return -100

    score = 0

    high_value_types = [
        "installation_operating_service_manual",
        "installation_service_manual",
        "startup_service_instructions",
        "installation_instructions",
        "installation_manual",
        "service_manual",
        "operating_manual",
        "technical_data_manual",
        "troubleshooting_guide",
    ]

    medium_value_terms = [
        "manual",
        "instructions",
        "service",
        "operating",
        "technical data",
        "vitodens",
        "vitocrossal",
        "vitorond",
        "vitola",
        "vitocal",
        "vitotronic",
    ]

    noise_terms = [
        "warranty",
        "parts list",
        "wiring diagram",
        "wiring diagrams",
        "combustion chamber dimensions",
        "quick reference",
        "brochure",
        "catalog",
        "catalogue",
        "certificate",
        "certification",
        "energyguide",
        "energy guide",
    ]

    if source.document_type in high_value_types:
        score += 25

    for term in medium_value_terms:
        if term in combined:
            score += 5

    for term in noise_terms:
        if term in combined:
            score -= 25

    if not source.is_likely_manual:
        score -= 30

    if source.language and source.language.lower() != "en":
        score -= 25

    return score


def collect_viessmann_us_sources(entry: SourceRegistryEntry) -> list[ManualSource]:
    response = requests.get(
        entry.source_url,
        timeout=REQUEST_TIMEOUT_SECONDS,
        headers=DEFAULT_HEADERS,
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    sources_by_id: dict[str, ManualSource] = {}

    anchor_sources = _collect_from_anchor_links(soup, entry)
    embedded_sources = _collect_from_viessmann_embedded_literature(
        page_text=soup.get_text(" ", strip=True),
        entry=entry,
    )

    for source in [*anchor_sources, *embedded_sources]:
        sources_by_id[source.source_id] = source

    raw_sources = list(sources_by_id.values())

    scored_sources = [
        (_viessmann_discovery_score(source), source)
        for source in raw_sources
    ]

    kept_sources = [
        source
        for score, source in scored_sources
        if score >= MIN_VIESSMANN_DISCOVERY_SCORE
    ]

    kept_sources = sorted(
        kept_sources,
        key=lambda item: (
            -_viessmann_discovery_score(item),
            item.model_family or "",
            item.document_type or "",
            item.pdf_url,
        ),
    )

    kept_sources = kept_sources[:MAX_VIESSMANN_SOURCES_PER_PAGE]

    print(f"📎 Viessmann raw PDF links collected: {len(raw_sources)}")
    print(f"✅ Viessmann useful manual candidates kept: {len(kept_sources)}")

    for source in kept_sources[:10]:
        print(
            f"   score={_viessmann_discovery_score(source):>3} | "
            f"{source.model_family} | {source.document_type} | {source.file_name}"
        )

    return kept_sources
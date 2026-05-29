from __future__ import annotations

import hashlib
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag

from src.manual_source_schema import ManualSource, SourceRegistryEntry


REQUEST_TIMEOUT_SECONDS = 30


LIKELY_MANUAL_KEYWORDS = [
    "manual",
    "installation",
    "operating",
    "operation",
    "service",
    "maintenance",
    "instructions",
    "troubleshooting",
    "technical",
    "specification",
]

UNWANTED_KEYWORDS = [
    "brochure",
    "flyer",
    "catalog",
    "warranty",
    "rebate",
    "advertisement",
    "quick start",
]


MODEL_PATTERNS = [
    r"\bBGH\d+[A-Z0-9\-]*\b",
    r"\bGB\d+[A-Z0-9\-]*\b",
    r"\bG\d{3,4}[A-Z0-9\-]*\b",
    r"\bB\d{2,4}[A-Z0-9\-]*\b",
    r"\bTronic\s+\d+[A-Z0-9\-]*\b",
    r"\bGreentherm\s+[A-Z0-9\-]+\b",
    r"\bSingular\s+Boiler\b",
    r"\bGreenstar\s+[A-Za-z0-9 &\-]+\b",
    r"\bSSB[0-9, TLG]+",
]


def _source_id(source_name: str, pdf_url: str) -> str:
    value = f"{source_name}|{pdf_url}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()[:16]


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _looks_like_pdf_link(href: str, anchor_text: str, context_text: str) -> bool:
    combined = f"{href} {anchor_text} {context_text}".lower()

    if ".pdf" in combined:
        return True

    if "(pdf" in combined:
        return True

    if "pdf " in combined:
        return True

    return False


def _filename_from_url(url: str) -> str | None:
    parsed = urlparse(url)
    filename = Path(parsed.path).name

    if filename and filename.lower().endswith(".pdf"):
        return filename

    return None


def _safe_context_text(anchor: Tag) -> str:
    chunks: list[str] = []

    link_text = anchor.get_text(" ", strip=True)
    if link_text:
        chunks.append(link_text)

    parent = anchor.parent
    for _ in range(4):
        if parent is None or not isinstance(parent, Tag):
            break

        parent_text = parent.get_text(" ", strip=True)
        if parent_text:
            chunks.append(parent_text)

        parent = parent.parent

    return _clean_text(" ".join(chunks))


def _nearest_heading(anchor: Tag) -> str | None:
    parent = anchor.parent

    for _ in range(8):
        if parent is None or not isinstance(parent, Tag):
            break

        heading = parent.find(["h1", "h2", "h3", "h4", "h5"])
        if heading:
            text = _clean_text(heading.get_text(" ", strip=True))
            if text:
                return text

        parent = parent.parent

    previous = anchor.find_previous(["h1", "h2", "h3", "h4", "h5"])
    if previous:
        text = _clean_text(previous.get_text(" ", strip=True))
        if text:
            return text

    return None


def _infer_model_family(context_text: str, heading_text: str | None) -> str | None:
    combined = _clean_text(f"{heading_text or ''} {context_text}")

    for pattern in MODEL_PATTERNS:
        match = re.search(pattern, combined, flags=re.IGNORECASE)
        if match:
            return _clean_text(match.group(0))

    if heading_text and len(heading_text) <= 100:
        return heading_text

    return None


def _infer_document_type(context_text: str, file_name: str | None) -> str | None:
    combined = _clean_text(f"{context_text} {file_name or ''}").lower()

    known_types = [
        ("installation_operations_maintenance_manual", ["installation", "operation", "maintenance"]),
        ("installation_and_operating_manual", ["installation", "operating"]),
        ("installation_and_service_manual", ["installation", "service"]),
        ("installation_and_maintenance_manual", ["installation", "maintenance"]),
        ("installation_manual", ["installation"]),
        ("service_manual", ["service"]),
        ("maintenance_manual", ["maintenance"]),
        ("troubleshooting_guide", ["troubleshooting"]),
        ("operating_manual", ["operating"]),
        ("user_manual", ["user manual"]),
        ("owner_manual", ["owner"]),
        ("technical_specification", ["specification", "technical"]),
    ]

    for document_type, keywords in known_types:
        if all(keyword in combined for keyword in keywords):
            return document_type

    if "manual" in combined:
        return "manual"

    return None


def _is_likely_manual(context_text: str, file_name: str | None) -> bool:
    combined = _clean_text(f"{context_text} {file_name or ''}").lower()

    if any(keyword in combined for keyword in UNWANTED_KEYWORDS):
        return False

    return any(keyword in combined for keyword in LIKELY_MANUAL_KEYWORDS)


def _debug_page_summary(soup: BeautifulSoup) -> None:
    anchors = soup.find_all("a", href=True)
    pdf_text_links = []

    for anchor in anchors:
        href = str(anchor.get("href"))
        text = anchor.get_text(" ", strip=True)
        context = _safe_context_text(anchor)

        if _looks_like_pdf_link(href, text, context):
            pdf_text_links.append((text, href))

    print(f"🔗 Total links found on page: {len(anchors)}")
    print(f"📎 Links that look like PDF/manual downloads: {len(pdf_text_links)}")

    for text, href in pdf_text_links[:5]:
        print(f"   - {text[:80]} -> {href[:100]}")


def collect_bosch_homecomfort_sources(entry: SourceRegistryEntry) -> list[ManualSource]:
    response = requests.get(
        entry.source_url,
        timeout=REQUEST_TIMEOUT_SECONDS,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0 Safari/537.36"
            )
        },
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    _debug_page_summary(soup)

    sources: list[ManualSource] = []
    seen_pdf_urls: set[str] = set()

    for anchor in soup.find_all("a", href=True):
        href = str(anchor.get("href"))
        anchor_text = anchor.get_text(" ", strip=True)
        context_text = _safe_context_text(anchor)

        if not _looks_like_pdf_link(href, anchor_text, context_text):
            continue

        pdf_url = urljoin(entry.source_url, href)

        if pdf_url in seen_pdf_urls:
            continue

        seen_pdf_urls.add(pdf_url)

        heading_text = _nearest_heading(anchor)
        file_name = _filename_from_url(pdf_url)

        model_family = _infer_model_family(
            context_text=context_text,
            heading_text=heading_text,
        )

        document_type = _infer_document_type(
            context_text=context_text,
            file_name=file_name,
        )

        is_likely_manual = _is_likely_manual(
            context_text=context_text,
            file_name=file_name,
        )

        sources.append(
            ManualSource(
                source_id=_source_id(entry.source_name, pdf_url),
                brand=entry.brand,
                model_family=model_family,
                model_names=[],
                document_type=document_type,
                language=entry.language,
                region=entry.region,
                source_authority=entry.source_authority,
                source_name=entry.source_name,
                source_page_url=entry.source_url,
                pdf_url=pdf_url,
                file_name=file_name,
                is_likely_manual=is_likely_manual,
                notes=context_text[:500] if context_text else entry.notes,
            )
        )

    return sources
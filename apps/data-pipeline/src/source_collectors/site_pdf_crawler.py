from __future__ import annotations

import hashlib
import re
from collections import deque
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


LIKELY_MANUAL_TERMS = [
    "manual",
    "manuale",
    "installation",
    "installazione",
    "installator",
    "servicing",
    "service",
    "maintenance",
    "manutenzione",
    "instruction",
    "instructions",
    "istruzioni",
    "user",
    "utente",
    "operation",
    "operating",
    "technical",
    "tecnico",
    "caldaia",
    "boiler",
]

NOISE_TERMS = [
    "catalogue",
    "catalog",
    "brochure",
    "brochures",
    "depliant",
    "flyer",
    "price",
    "warranty",
    "certificate",
    "certification",
    "certifications",
    "declaration",
    "energy label",
    "datasheet",
    "data sheet",
]


def _source_id(source_name: str, pdf_url: str) -> str:
    value = f"{source_name}|{pdf_url}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()[:16]


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _domain(url: str) -> str:
    return urlparse(url).netloc.lower()


def _path(url: str) -> str:
    return urlparse(url).path.lower()


def _matches_any(value: str, patterns: list[str]) -> bool:
    value = value.lower()
    return any(pattern.lower() in value for pattern in patterns)


def _is_pdf_url(url: str) -> bool:
    decoded = unquote(url.lower())
    return ".pdf" in decoded


def _filename_from_url(url: str) -> str | None:
    decoded_url = unquote(url)
    parsed = urlparse(decoded_url)
    filename = Path(parsed.path).name

    if filename.lower().endswith(".pdf"):
        return filename

    return None


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


def _nearest_heading(anchor: Tag) -> str | None:
    previous = anchor.find_previous(["h1", "h2", "h3", "h4", "h5"])
    if previous:
        text = _clean_text(previous.get_text(" ", strip=True))
        if text:
            return text

    return None


def _nearby_section_label(anchor: Tag) -> str | None:
    """
    Try to detect labels like:
    - User Manuals
    - Installation Manuals
    - Brochures
    - Certifications
    - Technical informations

    Unical product pages place the download button below these labels.
    """

    # Check previous siblings first because the label is usually above the button.
    current = anchor

    for _ in range(8):
        previous = current.find_previous_sibling()

        if previous is None:
            break

        if isinstance(previous, Tag):
            text = _clean_text(previous.get_text(" ", strip=True))

            if text:
                lowered = text.lower()

                known_labels = [
                    "user manuals",
                    "user manual",
                    "installation manuals",
                    "installation manual",
                    "technical informations",
                    "technical information",
                    "certifications",
                    "certification",
                    "brochures",
                    "brochure",
                ]

                for label in known_labels:
                    if label in lowered:
                        return text

            current = previous
        else:
            break

    # Fall back to nearby previous heading-like elements.
    previous_label = anchor.find_previous(["h2", "h3", "h4", "h5", "strong", "b"])
    if previous_label:
        text = _clean_text(previous_label.get_text(" ", strip=True))
        if text:
            return text

    return None


def _is_unwanted_document_section(section_label: str | None, context_text: str, file_name: str | None) -> bool:
    combined = f"{section_label or ''} {context_text} {file_name or ''}".lower()

    unwanted_sections = [
        "certification",
        "certifications",
        "brochure",
        "brochures",
        "catalog",
        "catalogue",
        "depliant",
    ]

    return any(term in combined for term in unwanted_sections)


def _is_priority_manual_section(section_label: str | None, context_text: str, file_name: str | None) -> bool:
    combined = f"{section_label or ''} {context_text} {file_name or ''}".lower()

    priority_sections = [
        "user manual",
        "user manuals",
        "installation manual",
        "installation manuals",
        "service manual",
        "servicing manual",
        "maintenance manual",
    ]

    return any(term in combined for term in priority_sections)


def _should_visit_page(url: str, entry: SourceRegistryEntry, depth: int) -> bool:
    if depth > entry.max_depth:
        return False

    parsed = urlparse(url)

    if parsed.scheme not in ["http", "https"]:
        return False

    if _is_pdf_url(url):
        return False

    allowed_domains = entry.allowed_page_domains or [_domain(entry.source_url)]

    if _domain(url) not in [domain.lower() for domain in allowed_domains]:
        return False

    if entry.url_include_patterns and not _matches_any(url, entry.url_include_patterns):
        return False

    if entry.url_exclude_patterns and _matches_any(url, entry.url_exclude_patterns):
        return False

    return True


def _should_collect_pdf(url: str, entry: SourceRegistryEntry) -> bool:
    if not _is_pdf_url(url):
        return False

    if entry.allowed_pdf_domains:
        allowed_pdf_domains = [domain.lower() for domain in entry.allowed_pdf_domains]
        if _domain(url) not in allowed_pdf_domains:
            return False

    if entry.pdf_url_include_patterns and not _matches_any(url, entry.pdf_url_include_patterns):
        return False

    if entry.pdf_url_exclude_patterns and _matches_any(url, entry.pdf_url_exclude_patterns):
        return False

    return True


def _infer_document_type(
    context_text: str,
    file_name: str | None,
    section_label: str | None = None,
) -> str | None:
    combined = f"{section_label or ''} {context_text} {file_name or ''}".lower()

    if "installation manual" in combined or "installation manuals" in combined:
        return "installation_manual"

    if "user manual" in combined or "user manuals" in combined:
        return "user_manual"

    if "installation" in combined and ("service" in combined or "servicing" in combined):
        return "installation_and_servicing_manual"

    if "installation" in combined and "maintenance" in combined:
        return "installation_and_maintenance_manual"

    if "service" in combined or "servicing" in combined:
        return "service_manual"

    if "maintenance" in combined:
        return "maintenance_manual"

    if "operation" in combined or "operating" in combined:
        return "operating_manual"

    if "technical information" in combined or "technical informations" in combined:
        return "technical_information"

    if "technical" in combined:
        return "technical_document"

    if "manual" in combined:
        return "manual"

    return None


def _infer_model_family(context_text: str, file_name: str | None, brand: str) -> str | None:
    heading_candidate = context_text

    if heading_candidate:
        # Keep it short; huge page context is not useful as model name.
        parts = re.split(r"download|manual|installation|servicing|service", heading_candidate, flags=re.IGNORECASE)
        candidate = _clean_text(parts[0]) if parts else _clean_text(heading_candidate)
        candidate = re.sub(brand, "", candidate, flags=re.IGNORECASE).strip(" -|")

        if 2 <= len(candidate) <= 80:
            return candidate

    if file_name:
        stem = Path(file_name).stem
        stem = stem.replace("_", " ").replace("-", " ")
        stem = re.sub(brand, "", stem, flags=re.IGNORECASE)
        stem = re.sub(r"\bmanuale\b|\binstallazione\b|\bservicing\b|\bmanual\b", "", stem, flags=re.IGNORECASE)
        return _clean_text(stem)

    return None


def _is_likely_manual(
    context_text: str,
    file_name: str | None,
    section_label: str | None = None,
) -> bool:
    if _is_unwanted_document_section(section_label, context_text, file_name):
        return False

    if _is_priority_manual_section(section_label, context_text, file_name):
        return True

    combined = f"{section_label or ''} {context_text} {file_name or ''}".lower()

    return any(term in combined for term in LIKELY_MANUAL_TERMS)


def collect_site_pdf_sources(entry: SourceRegistryEntry) -> list[ManualSource]:
    """
    Generic controlled crawler for sites that expose PDF links somewhere
    under a source URL.

    This is useful for official manufacturer websites where product pages
    link to PDFs, but there is no single simple manual listing page.
    """

    session = requests.Session()

    queue: deque[tuple[str, int]] = deque([(entry.source_url, 0)])
    visited_pages: set[str] = set()
    seen_pdf_urls: set[str] = set()

    sources: list[ManualSource] = []

    while queue and len(visited_pages) < entry.crawl_limit:
        page_url, depth = queue.popleft()

        if page_url in visited_pages:
            continue

        if not _should_visit_page(page_url, entry, depth):
            continue

        visited_pages.add(page_url)

        print(f"🔎 Crawling page ({len(visited_pages)}/{entry.crawl_limit}): {page_url}")

        try:
            response = session.get(
                page_url,
                headers=DEFAULT_HEADERS,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()

        except Exception as error:
            print(f"⚠️ Could not crawl page: {page_url}. Error: {error}")
            continue

        soup = BeautifulSoup(response.text, "html.parser")

        for anchor in soup.find_all("a", href=True):
            href = str(anchor.get("href")).strip()
            resolved_url = unquote(urljoin(page_url, href))

            if _should_collect_pdf(resolved_url, entry):
                if resolved_url in seen_pdf_urls:
                    continue

                seen_pdf_urls.add(resolved_url)

                context_text = _anchor_context(anchor)
                heading_text = _nearest_heading(anchor)
                section_label = _nearby_section_label(anchor)

                combined_context = _clean_text(
                    f"{heading_text or ''} {section_label or ''} {context_text}"
                )

                file_name = _filename_from_url(resolved_url)

                document_type = _infer_document_type(
                    context_text=combined_context,
                    file_name=file_name,
                    section_label=section_label,
                )

                model_family = _infer_model_family(
                    context_text=combined_context,
                    file_name=file_name,
                    brand=entry.brand,
                )

                sources.append(
                    ManualSource(
                        source_id=_source_id(entry.source_name, resolved_url),
                        brand=entry.brand,
                        model_family=model_family,
                        model_names=[],
                        document_type=document_type,
                        language=entry.language,
                        region=entry.region,
                        source_authority=entry.source_authority,
                        source_name=entry.source_name,
                        source_page_url=page_url,
                        pdf_url=resolved_url,
                        file_name=file_name,
                        is_likely_manual=_is_likely_manual(combined_context, file_name, section_label),
                        notes=f"section={section_label or 'unknown'} | {combined_context[:450]}" if combined_context else entry.notes,
                    )
                )

                continue

            if _should_visit_page(resolved_url, entry, depth + 1):
                if resolved_url not in visited_pages:
                    queue.append((resolved_url, depth + 1))

    print(f"📄 Pages crawled: {len(visited_pages)}")
    print(f"📎 PDF/manual links collected: {len(sources)}")

    return sources
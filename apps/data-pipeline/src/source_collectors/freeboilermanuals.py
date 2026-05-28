from __future__ import annotations

import hashlib
import re
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag

from src.manual_source_schema import ManualSource, SourceRegistryEntry


REQUEST_TIMEOUT_SECONDS = 30


UNWANTED_TEXT_PATTERNS = [
    "spares for",
    "spare parts",
    "parts for",
    "facebook",
    "twitter",
    "web design",
    "branding agency",
    "contact",
    "home",
    "brands",
]


def _source_id(source_name: str, pdf_url: str) -> str:
    value = f"{source_name}|{pdf_url}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()[:16]


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _slugify(value: str | None, fallback: str = "manual") -> str:
    if not value:
        value = fallback

    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    value = value.strip("-")

    return value or fallback


def _is_pdf_href(href: str) -> bool:
    decoded = unquote(href.lower())
    return ".pdf" in decoded or "/assets/pdf/" in decoded


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
    for _ in range(2):
        if parent is None or not isinstance(parent, Tag):
            break

        parent_text = parent.get_text(" ", strip=True)
        if parent_text:
            chunks.append(parent_text)

        parent = parent.parent

    return _clean_text(" ".join(chunks))


def _should_skip_link(anchor_text: str, href: str) -> bool:
    combined = f"{anchor_text} {href}".lower()

    return any(pattern in combined for pattern in UNWANTED_TEXT_PATTERNS)


def _infer_document_type(anchor_text: str, source_url: str, pdf_url: str) -> str:
    combined = f"{anchor_text} {source_url} {pdf_url}".lower()

    if "fault" in combined and "code" in combined:
        return "fault_codes_reference"

    if "user" in combined:
        return "user_manual"

    return "boiler_manual"


def _infer_model_family(anchor_text: str, pdf_url: str, brand: str) -> str | None:
    text = _clean_text(anchor_text)

    if text and not text.lower().startswith("gc no"):
        return text

    filename = _filename_from_url(pdf_url)
    if filename:
        stem = Path(filename).stem
        stem = stem.replace("_", " ").replace("-", " ")
        stem = re.sub(brand, "", stem, flags=re.IGNORECASE)
        return _clean_text(stem)

    return None


def _make_file_name(brand: str, model_family: str | None, document_type: str, pdf_url: str) -> str:
    original_filename = _filename_from_url(pdf_url)

    if original_filename:
        return original_filename

    return f"{_slugify(brand)}_{_slugify(model_family)}_{_slugify(document_type)}.pdf"


def _build_pdf_url(source_page_url: str, href: str) -> str:
    """
    FreeBoilerManuals brand pages live under paths like /vaillant/,
    but PDF assets live under the site root, e.g. /assets/pdf/...
    urljoin(source_page_url, "assets/pdf/...") incorrectly creates
    /vaillant/assets/pdf/..., which returns 404.

    This function normalizes asset links to the site root.
    """

    decoded_href = unquote(href).strip()

    parsed_source = urlparse(source_page_url)
    site_root = f"{parsed_source.scheme}://{parsed_source.netloc}/"

    if decoded_href.startswith("http://") or decoded_href.startswith("https://"):
        return decoded_href

    if decoded_href.startswith("/assets/pdf/"):
        return urljoin(site_root, decoded_href.lstrip("/"))

    if decoded_href.startswith("assets/pdf/"):
        return urljoin(site_root, decoded_href)

    return urljoin(source_page_url, decoded_href)



def collect_freeboilermanuals_sources(entry: SourceRegistryEntry) -> list[ManualSource]:
    """
    Collect direct PDF links from FreeBoilerManuals brand pages.

    This is a third-party source. It is useful for older UK/EU boiler models,
    but outputs should remain traceable and reviewable.
    """

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

    sources: list[ManualSource] = []
    seen_pdf_urls: set[str] = set()

    anchors = soup.find_all("a", href=True)

    print(f"🔗 Total links found on FreeBoilerManuals page: {len(anchors)}")

    for anchor in anchors:
        href = str(anchor.get("href"))

        if not _is_pdf_href(href):
            continue

        anchor_text = _clean_text(anchor.get_text(" ", strip=True))
        context_text = _anchor_context(anchor)

        if _should_skip_link(anchor_text, href):
            continue

        pdf_url = _build_pdf_url(entry.source_url, href)

        if pdf_url in seen_pdf_urls:
            continue

        seen_pdf_urls.add(pdf_url)

        document_type = _infer_document_type(
            anchor_text=anchor_text,
            source_url=entry.source_url,
            pdf_url=pdf_url,
        )

        model_family = _infer_model_family(
            anchor_text=anchor_text,
            pdf_url=pdf_url,
            brand=entry.brand,
        )

        file_name = _make_file_name(
            brand=entry.brand,
            model_family=model_family,
            document_type=document_type,
            pdf_url=pdf_url,
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
                is_likely_manual=True,
                notes=context_text[:500] if context_text else entry.notes,
            )
        )

    print(f"📎 FreeBoilerManuals PDF/manual links collected: {len(sources)}")

    return sources
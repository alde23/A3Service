from __future__ import annotations

from collections.abc import Callable

from src.manual_source_schema import ManualSource, SourceRegistryEntry
from src.source_collectors.bosch import collect_bosch_homecomfort_sources
from src.source_collectors.direct_pdf import collect_direct_pdf_source
from src.source_collectors.freeboilermanuals import collect_freeboilermanuals_sources
from src.source_collectors.site_pdf_crawler import collect_site_pdf_sources
from src.source_collectors.viessmann import collect_viessmann_us_sources

CollectorFunction = Callable[[SourceRegistryEntry], list[ManualSource]]


COLLECTORS: dict[str, CollectorFunction] = {
    "bosch_homecomfort": collect_bosch_homecomfort_sources,
    "freeboilermanuals": collect_freeboilermanuals_sources,
    "direct_pdf": collect_direct_pdf_source,
    "site_pdf_crawler": collect_site_pdf_sources,
    "viessmann_us": collect_viessmann_us_sources,
}


def get_collector(name: str) -> CollectorFunction:
    try:
        return COLLECTORS[name]
    except KeyError as error:
        supported = ", ".join(sorted(COLLECTORS))
        raise ValueError(
            f"Unsupported collector: {name}. Supported collectors: {supported}"
        ) from error
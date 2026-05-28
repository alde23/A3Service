from __future__ import annotations

import argparse

from src.downloader import discover_manual_sources, download_manual_sources


def main() -> None:
    parser = argparse.ArgumentParser(
        description="A3Service manual PDF downloader"
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    discover_parser = subparsers.add_parser(
        "discover",
        help="Discover PDF manual sources from configured websites.",
    )
    discover_parser.add_argument(
        "--brand",
        type=str,
        default=None,
        help="Optional brand filter, e.g. Bosch.",
    )
    discover_parser.add_argument(
        "--collector",
        type=str,
        default=None,
        help="Optional collector filter, e.g. bosch_homecomfort.",
    )
    discover_parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional maximum number of discovered records to process.",
    )

    download_parser = subparsers.add_parser(
        "download",
        help="Download PDFs from the generated manual source list.",
    )
    download_parser.add_argument(
        "--brand",
        type=str,
        default=None,
        help="Optional brand filter, e.g. Bosch.",
    )
    download_parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional maximum number of PDFs to download.",
    )
    download_parser.add_argument(
        "--download-all",
        action="store_true",
        help="Download all discovered PDFs, including records not marked as likely manuals.",
    )

    combined_parser = subparsers.add_parser(
        "discover-and-download",
        help="Discover PDF sources and immediately download them.",
    )
    combined_parser.add_argument(
        "--brand",
        type=str,
        default=None,
        help="Optional brand filter, e.g. Bosch.",
    )
    combined_parser.add_argument(
        "--collector",
        type=str,
        default=None,
        help="Optional collector filter, e.g. bosch_homecomfort.",
    )
    combined_parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional maximum number of discovered/downloaded records.",
    )
    combined_parser.add_argument(
        "--download-all",
        action="store_true",
        help="Download all discovered PDFs, including records not marked as likely manuals.",
    )

    args = parser.parse_args()

    if args.command == "discover":
        discover_manual_sources(
            brand=args.brand,
            collector_name=args.collector,
            limit=args.limit,
        )

    elif args.command == "download":
        download_manual_sources(
            brand=args.brand,
            limit=args.limit,
            download_all=args.download_all,
        )

    elif args.command == "discover-and-download":
        discover_manual_sources(
            brand=args.brand,
            collector_name=args.collector,
            limit=args.limit,
        )

        download_manual_sources(
            brand=args.brand,
            limit=args.limit,
            download_all=args.download_all,
        )


if __name__ == "__main__":
    main()
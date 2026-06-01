# A3Service Data Pipeline Requirements

## Purpose

The data pipeline converts boiler and HVAC manufacturer manuals into structured JSON data that can later be ingested by the backend and used by the mobile app's offline technical library.

The pipeline is used at development/build time, not at app runtime. The mobile application should not depend on live LLM calls for field use because the product is designed around offline access to technical documentation and fault information.

## Current scope

The pipeline should extract structured information from PDF manuals placed locally under:

```text
apps/data-pipeline/raw_pdfs/
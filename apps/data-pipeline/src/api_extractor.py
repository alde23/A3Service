from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel

from src.schemas import BoilerManualData


MAX_RETRIES = 4
BASE_RETRY_SECONDS = 20

DATA_PIPELINE_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = DATA_PIPELINE_DIR / ".env"


def _parsed_response_to_json(parsed_response: Any) -> str:
    if isinstance(parsed_response, BaseModel):
        return parsed_response.model_dump_json()

    return json.dumps(parsed_response, ensure_ascii=False)


def _create_gemini_client() -> tuple[genai.Client, str]:
    """
    Load Gemini configuration from apps/data-pipeline/.env.
    """

    load_dotenv(dotenv_path=ENV_PATH, override=True)

    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if not api_key:
        raise RuntimeError(
            f"GEMINI_API_KEY is missing. Add it to: {ENV_PATH}"
        )

    client = genai.Client(api_key=api_key)

    return client, model_name


def extract_boiler_data_from_pdf(pdf_path: Path, prompt_path: Path) -> str:
    """
    Upload one PDF manual to Gemini and return structured JSON text.
    """

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_path}")

    client, model_name = _create_gemini_client()
    system_prompt = prompt_path.read_text(encoding="utf-8")

    uploaded_file = None

    try:
        print(f"☁️ Uploading {pdf_path.name} to Gemini API...")
        print(f"🤖 Using Gemini model: {model_name}")

        uploaded_file = client.files.upload(file=str(pdf_path))

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                print(
                    f"⏳ File uploaded. Extracting structured manual data "
                    f"(attempt {attempt}/{MAX_RETRIES})..."
                )

                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        uploaded_file,
                        f"Extract structured boiler manual data from this PDF file: {pdf_path.name}",
                    ],
                    config={
                        "system_instruction": system_prompt,
                        "response_mime_type": "application/json",
                        "response_schema": BoilerManualData,
                        "temperature": 0.0,
                    },
                )

                parsed_response = getattr(response, "parsed", None)

                if parsed_response is not None:
                    return _parsed_response_to_json(parsed_response)

                if not response.text:
                    raise ValueError("Gemini returned an empty response.")

                return response.text

            except Exception as error:
                if attempt == MAX_RETRIES:
                    raise

                wait_seconds = BASE_RETRY_SECONDS * attempt
                print(
                    f"⚠️ Gemini request failed: {error}\n"
                    f"⏳ Waiting {wait_seconds} seconds before retry..."
                )
                time.sleep(wait_seconds)

        raise RuntimeError("Gemini extraction failed after retries.")

    finally:
        if uploaded_file is not None:
            print("🧹 Cleaning uploaded file from Gemini file storage...")
            client.files.delete(name=uploaded_file.name)
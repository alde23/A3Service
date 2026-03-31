import os
from google import genai
from pathlib import Path
from dotenv import load_dotenv
from src.schemas import BoilerManualData

# Load the API key from the .env file
load_dotenv()
client = genai.Client()

def extract_boiler_data_from_pdf(pdf_path: Path, prompt_path: Path) -> str:
    print(f"☁️ Uploading {pdf_path.name} to Gemini API...")
    
    # Upload the file using the new SDK
    sample_file = client.files.upload(file=str(pdf_path))
    
    print(f"⏳ File uploaded. Processing... (This takes about 15-30 seconds)")
    
    # Read your strict instructions
    with open(prompt_path, "r", encoding="utf-8") as f:
        system_prompt = f.read()

    # Call the new API endpoint
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=[sample_file, "Extract the boiler data from this manual."],
        config={
            "system_instruction": system_prompt,
            "response_mime_type": "application/json",
            "response_schema": BoilerManualData,
            "temperature": 0.0
        }
    )
    
    # Clean up the file from Google's servers
    client.files.delete(name=sample_file.name)
    
    return response.text
import json
from pathlib import Path
from src.api_extractor import extract_boiler_data_from_pdf

# Setup paths reliably
BASE_DIR = Path(__file__).resolve().parent
RAW_PDF_DIR = BASE_DIR / "raw_pdfs"
OUTPUT_JSON_DIR = BASE_DIR / "output_json"
PROMPT_PATH = BASE_DIR / "prompts" / "extract_faults.txt"

def main():
    print("🚀 Starting A3Service API Data Extraction Pipeline...")
    
    # Target the Vaillant manual
    target_pdf = RAW_PDF_DIR / "ecotec-plus-open-vent-installation-and-servicing-instructions-2914319.pdf"
    
    if not target_pdf.exists():
        print(f"❌ Could not find {target_pdf.name}")
        return

    # Ensure output directory exists
    OUTPUT_JSON_DIR.mkdir(exist_ok=True)

    try:
        # STEP 1: Send the whole PDF to Gemini
        json_string = extract_boiler_data_from_pdf(target_pdf, PROMPT_PATH)
        
        # STEP 2: Parse and format the output
        final_data = json.loads(json_string) 
        
        output_file = OUTPUT_JSON_DIR / f"vaillant_sprint1_poc.json"
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(final_data, f, indent=2)
            
        print(f"\n✅ Success! Data perfectly extracted.")
        print(f"📁 Saved to: {output_file.relative_to(BASE_DIR)}")
        print(f"📊 Found {len(final_data.get('fault_codes', []))} fault codes!")

    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")

if __name__ == "__main__":
    main()
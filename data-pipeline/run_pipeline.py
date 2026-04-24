import json
import re
import time
from pathlib import Path
from src.api_extractor import extract_appliance_data_from_pdf

# Setup paths reliably
BASE_DIR = Path(__file__).resolve().parent
RAW_PDF_DIR = BASE_DIR / "raw_pdfs"
OUTPUT_JSON_DIR = BASE_DIR / "output_json"
PROMPT_PATH = BASE_DIR / "prompts" / "extract_faults.txt"
PROCESSED_LOG_PATH = BASE_DIR / "processed_files.txt"  # NEW: Our tracking log

def slugify(text: str) -> str:
    """Turns messy strings into clean filenames."""
    text = str(text).lower()
    text = re.sub(r'[^a-z0-9]+', '_', text)
    return text.strip('_')

def load_processed_files() -> set:
    """Loads the list of already processed PDFs into memory."""
    if not PROCESSED_LOG_PATH.exists():
        return set()
    with open(PROCESSED_LOG_PATH, "r", encoding="utf-8") as f:
        return set(line.strip() for line in f if line.strip())

def mark_as_processed(filename: str):
    """Appends a successfully processed PDF to the log."""
    with open(PROCESSED_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"{filename}\n")

def main():
    print("🚀 Starting A3Service Batch Data Extraction Pipeline...")
    
    # Grab every PDF in the folder
    pdf_files = list(RAW_PDF_DIR.glob("*.pdf"))
    
    if not pdf_files:
        print("❌ No PDFs found in the raw_pdfs folder.")
        return
        
    # Load our history
    processed_files = load_processed_files()
    
    print(f"📁 Found {len(pdf_files)} total manuals.")
    print(f"📝 {len(processed_files)} previously processed manuals logged.\n")

    for pdf_path in pdf_files:
        print(f"==================================================")
        
        # THE SKIP CHECK: If we already did this one, ignore it
        if pdf_path.name in processed_files:
            print(f"⏭️  Skipping {pdf_path.name} (Already processed)")
            continue
            
        try:
            # 1. Send the PDF to Gemini
            json_string = extract_appliance_data_from_pdf(pdf_path, PROMPT_PATH)
            
            # 2. Parse the output into a Python dictionary
            extracted_data = json.loads(json_string) 
            
            # 3. Get the brand and model for dynamic naming
            brand = extracted_data.get("brand_name", "Unknown_Brand")
            model = extracted_data.get("model_name_or_number", "Unknown_Model")
            
            clean_brand = slugify(brand)
            clean_model = slugify(model)
            
            # 4. Create the specific brand folder
            brand_dir = OUTPUT_JSON_DIR / clean_brand
            brand_dir.mkdir(parents=True, exist_ok=True)
            
            # 5. Define the final file path
            output_file = brand_dir / f"{clean_model}.json"
            
            # 6. Save it
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(extracted_data, f, indent=2)
                
            print(f"✅ Success: Saved to {output_file.relative_to(BASE_DIR)}")
            print(f"📊 Found {len(extracted_data.get('fault_codes', []))} faults for {brand} {model}.")
            
            # 7. LOG IT AS DONE so we never run it again
            mark_as_processed(pdf_path.name)
            processed_files.add(pdf_path.name)
            
            # Sleep for 3 seconds between files to respect API rate limits
            time.sleep(3)

        except Exception as e:
            print(f"❌ Failed to process {pdf_path.name}: {e}")
            
    print("\n🎉 Batch processing complete!")

if __name__ == "__main__":
    main()
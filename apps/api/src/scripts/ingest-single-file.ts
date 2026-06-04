import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const filePath = path.resolve(__dirname, '../../../../apps/data-pipeline/output_json/Vaillant/vaillant_aquaplus_4d918d18ca.json');
  console.log(`Loading JSON from: ${filePath}`);
  
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const jsonData = JSON.parse(rawData);

  console.log(`Sending payload to local API for ingestion...`);

  // Send payload to the ingestion endpoint.
  const response = await fetch('http://localhost:3000/api/library/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // TODO: Add authorization header once the ingestion endpoint is protected by JwtAuthGuard
    },
    body: JSON.stringify(jsonData)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API returned ${response.status}: ${errText}`);
  }

  const result = await response.json();
  console.log(`Successfully ingested! Response:`, result);
}

main()
  .catch((e) => {
    console.error('Ingestion failed:', e);
    process.exit(1);
  });

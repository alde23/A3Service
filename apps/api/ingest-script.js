const fs = require('fs');
const path = require('path');
const http = require('http');

const API_URL = 'http://localhost:3000/api';
const USERNAME = 'alic.kovac@a3service.ba';
const PASSWORD = 'password123';

function login() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email: USERNAME, password: PASSWORD });
    const req = http.request(
      `${API_URL}/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data).access_token);
          } else {
            reject(new Error(`Login failed with status ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function ingestJson(token, jsonContent) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(jsonContent);
    const req = http.request(
      `${API_URL}/library/ingest`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${token}`
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Ingest failed with status ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function findJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findJsonFiles(filePath, fileList);
    } else if (filePath.endsWith('.json')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function main() {
  try {
    console.log('Logging in...');
    const token = await login();
    console.log('Login successful. Token acquired.');

    const dataDir = path.join(__dirname, '../data-pipeline/output_json');
    const jsonFiles = findJsonFiles(dataDir);
    
    console.log(`Found ${jsonFiles.length} JSON files to ingest.`);

    let successCount = 0;
    for (const filePath of jsonFiles) {
      console.log(`Ingesting ${filePath}...`);
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        await ingestJson(token, content);
        successCount++;
        console.log(`  -> Success`);
      } catch (err) {
        console.error(`  -> Failed to ingest ${filePath}:`, err.message);
      }
    }

    console.log(`\nDone! Successfully ingested ${successCount} out of ${jsonFiles.length} files.`);
  } catch (error) {
    console.error('Script failed:', error);
  }
}

main();

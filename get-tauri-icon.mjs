import { mkdirSync, writeFileSync } from 'fs';
import https from 'https';
import { join } from 'path';

const iconsDir = 'C:/Birch Vault/apps/desktop/src-tauri/icons';
mkdirSync(iconsDir, { recursive: true });

// Download from official Tauri examples
const iconUrl = 'https://raw.githubusercontent.com/nicholassm/tauri-vite-template/main/src-tauri/icons/icon.ico';

function download(url, callback) {
  console.log('Trying:', url);
  https.get(url, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
      download(response.headers.location, callback);
      return;
    }
    if (response.statusCode === 404) {
      callback(new Error('Not found: ' + url));
      return;
    }
    const chunks = [];
    response.on('data', (chunk) => chunks.push(chunk));
    response.on('end', () => callback(null, Buffer.concat(chunks)));
    response.on('error', callback);
  }).on('error', callback);
}

// Try multiple sources
const sources = [
  'https://raw.githubusercontent.com/nicholassm/tauri-vite-template/main/src-tauri/icons/icon.ico',
  'https://github.com/nicholassm/tauri-vite-template/raw/main/src-tauri/icons/icon.ico',
];

async function tryDownload() {
  for (const url of sources) {
    try {
      await new Promise((resolve, reject) => {
        download(url, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      }).then(data => {
        const outputPath = join(iconsDir, 'icon.ico');
        writeFileSync(outputPath, data);
        console.log(`SUCCESS: Downloaded to ${outputPath} (${data.length} bytes)`);
        process.exit(0);
      });
    } catch (e) {
      console.log('Failed:', e.message);
    }
  }
  console.log('All sources failed. Please manually create an icon.');
}

tryDownload();






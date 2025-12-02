import { mkdirSync, writeFileSync } from 'fs';
import https from 'https';
import { join } from 'path';

const iconsDir = 'C:/Birch Vault/apps/desktop/src-tauri/icons';
mkdirSync(iconsDir, { recursive: true });

// Download the Tauri default icon
const iconUrl = 'https://raw.githubusercontent.com/nicholassm/tauri-vite-template/main/src-tauri/icons/icon.ico';

console.log('Downloading icon from:', iconUrl);

https.get(iconUrl, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Follow redirect
    https.get(response.headers.location, handleResponse);
  } else {
    handleResponse(response);
  }
});

function handleResponse(response) {
  const chunks = [];
  response.on('data', (chunk) => chunks.push(chunk));
  response.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const outputPath = join(iconsDir, 'icon.ico');
    writeFileSync(outputPath, buffer);
    console.log(`Downloaded icon to ${outputPath} (${buffer.length} bytes)`);
  });
  response.on('error', (err) => {
    console.error('Download failed:', err.message);
  });
}






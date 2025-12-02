import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const iconsDir = 'C:/Birch Vault/apps/desktop/src-tauri/icons';
mkdirSync(iconsDir, { recursive: true });

// Create a simple 1024x1024 PNG using a data URL approach
// This creates a valid PNG with green background
const createSimplePng = () => {
  // Install sharp if needed and create icon
  console.log('Installing sharp for PNG generation...');
  try {
    execSync('npm install sharp --no-save', { 
      cwd: 'C:/Birch Vault',
      stdio: 'inherit' 
    });
    
    const sharp = (await import('sharp')).default;
    
    // Create a 1024x1024 green image with white "B"
    const svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <rect width="1024" height="1024" fill="#22c55e"/>
        <text x="512" y="700" font-size="600" font-family="Arial" font-weight="bold" fill="white" text-anchor="middle">B</text>
      </svg>
    `;
    
    const pngPath = join(iconsDir, 'app-icon.png');
    await sharp(Buffer.from(svg))
      .resize(1024, 1024)
      .png()
      .toFile(pngPath);
    
    console.log('Created source PNG:', pngPath);
    return pngPath;
  } catch (e) {
    console.error('Sharp failed:', e.message);
    return null;
  }
};

// Alternative: create minimal valid PNG manually
const createMinimalPng = () => {
  // This is a valid 32x32 solid green PNG
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAADklEQVR4nGNgGAWjYBQMdwAAA4AAAT8EqKoAAAAASUVORK5CYII=';
  const pngBuffer = Buffer.from(pngBase64, 'base64');
  const pngPath = join(iconsDir, 'app-icon.png');
  writeFileSync(pngPath, pngBuffer);
  console.log('Created minimal PNG:', pngPath);
  return pngPath;
};

async function main() {
  console.log('Generating icon for BirchVault...\n');
  
  // Try sharp first, fall back to minimal PNG
  let pngPath = await createSimplePng();
  if (!pngPath) {
    console.log('Falling back to minimal PNG...');
    pngPath = createMinimalPng();
  }
  
  // Now use Tauri icon generator
  console.log('\nGenerating icons with Tauri CLI...');
  try {
    execSync(`npx tauri icon "${pngPath}"`, {
      cwd: 'C:/Birch Vault/apps/desktop',
      stdio: 'inherit'
    });
    console.log('\nIcons generated successfully!');
  } catch (e) {
    console.error('Tauri icon generation failed:', e.message);
    console.log('\nPlease run manually:');
    console.log(`  cd "C:\\Birch Vault\\apps\\desktop"`);
    console.log(`  npx tauri icon "${pngPath}"`);
  }
}

main();


import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const iconsDir = 'C:/Birch Vault/apps/desktop/src-tauri/icons';

console.log('Creating icons directory at:', iconsDir);

// Create directory
try {
  mkdirSync(iconsDir, { recursive: true });
  console.log('Directory created');
} catch (e) {
  console.log('Directory creation error:', e.message);
}

// Create a valid ICO file (32x32 green with "B")
const base64Ico = "AAABAAEAICAAAAEAIACoEAAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAABAAABMLAAATCwAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wAiyV7/Islf/yLJX/8iyV//Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX//////////////////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX//////////////////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX//////////////////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf//////////////////yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX//////////////////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf//////////////////yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJX/////8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const bytes = Buffer.from(base64Ico, 'base64');

const icoPath = join(iconsDir, 'icon.ico');
writeFileSync(icoPath, bytes);
console.log('Wrote icon.ico');

// Verify
if (existsSync(icoPath)) {
  const stats = statSync(icoPath);
  console.log('SUCCESS: icon.ico created (' + stats.size + ' bytes)');
} else {
  console.log('FAILED: icon.ico was not created');
  process.exit(1);
}

// List contents
console.log('');
console.log('Contents of icons directory:');
const files = readdirSync(iconsDir);
files.forEach(f => {
  const s = statSync(join(iconsDir, f));
  console.log('  ' + f + ' (' + s.size + ' bytes)');
});


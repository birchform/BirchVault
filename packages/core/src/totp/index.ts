// ============================================
// BirchVault TOTP (Time-based One-Time Password)
// RFC 6238 Implementation
// ============================================

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generates a random TOTP secret
 */
export function generateTOTPSecret(length: number = 20): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += BASE32_CHARS[bytes[i] % 32];
  }
  return secret;
}

/**
 * Decodes a base32 string to Uint8Array
 */
function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bits: number[] = [];
  
  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char);
    for (let i = 4; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i * 8 + j];
    }
    bytes[i] = byte;
  }
  
  return bytes;
}

/**
 * Generates HMAC-SHA1 hash
 */
async function hmacSHA1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

/**
 * Converts number to 8-byte big-endian buffer
 */
function intToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num = Math.floor(num / 256);
  }
  return bytes;
}

/**
 * Generates a TOTP code
 * @param secret Base32-encoded secret
 * @param timestamp Unix timestamp (default: now)
 * @param period Time step in seconds (default: 30)
 * @param digits Number of digits (default: 6)
 */
export async function generateTOTP(
  secret: string,
  timestamp?: number,
  period: number = 30,
  digits: number = 6
): Promise<string> {
  const time = timestamp ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(time / period);
  
  const key = base32Decode(secret);
  const counterBytes = intToBytes(counter);
  
  const hmac = await hmacSHA1(key, counterBytes);
  
  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  
  const otp = code % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Verifies a TOTP code with time window
 * @param secret Base32-encoded secret
 * @param code The code to verify
 * @param window Number of periods to check before/after (default: 1)
 */
export async function verifyTOTP(
  secret: string,
  code: string,
  window: number = 1
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const period = 30;
  
  for (let i = -window; i <= window; i++) {
    const timestamp = now + i * period;
    const expectedCode = await generateTOTP(secret, timestamp);
    if (expectedCode === code) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generates an otpauth:// URI for QR code generation
 */
export function generateTOTPUri(
  secret: string,
  accountName: string,
  issuer: string = 'BirchVault'
): string {
  const encodedAccount = encodeURIComponent(accountName);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Calculates remaining seconds until code changes
 */
export function getTOTPTimeRemaining(period: number = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period);
}

// TOTP Types
export interface TOTPSetup {
  secret: string;
  uri: string;
  backupCodes: string[];
}

/**
 * Generates backup codes for 2FA recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Creates a complete TOTP setup for a user
 */
export function createTOTPSetup(accountName: string): TOTPSetup {
  const secret = generateTOTPSecret();
  const uri = generateTOTPUri(secret, accountName);
  const backupCodes = generateBackupCodes();
  
  return { secret, uri, backupCodes };
}





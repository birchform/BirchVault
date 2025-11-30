// ============================================
// BirchVault Crypto Module
// Zero-Knowledge Encryption using Web Crypto API
// ============================================

import type { EncryptedData, DerivedKeys, PasswordGeneratorOptions } from '../types';

// Constants
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

// ============================================
// Key Derivation
// ============================================

/**
 * Derives encryption keys from master password and email
 * Uses PBKDF2 with 100,000 iterations for key stretching
 */
export async function deriveKeys(
  masterPassword: string,
  email: string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<DerivedKeys> {
  const encoder = new TextEncoder();

  // Use email as salt (normalized to lowercase)
  const salt = encoder.encode(email.toLowerCase().trim());

  // Import master password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive master key using PBKDF2
  const masterKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  // Derive encryption key from master key using HKDF
  const masterKeyBytes = await crypto.subtle.exportKey('raw', masterKey);
  const encryptionKeyMaterial = await crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    'HKDF',
    false,
    ['deriveKey']
  );

  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: encoder.encode('birchvault-encryption'),
      info: encoder.encode('enc'),
      hash: 'SHA-256',
    },
    encryptionKeyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  // Create auth hash for server authentication (never send master password)
  const authHashMaterial = await crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    'HKDF',
    false,
    ['deriveBits']
  );

  const authHashBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: encoder.encode('birchvault-auth'),
      info: encoder.encode('auth'),
      hash: 'SHA-256',
    },
    authHashMaterial,
    256
  );

  const authHash = arrayBufferToBase64(authHashBits);

  return { masterKey, encryptionKey, authHash };
}

// ============================================
// Encryption / Decryption
// ============================================

/**
 * Encrypts data using AES-256-GCM
 */
export async function encrypt(
  data: string,
  encryptionKey: CryptoKey
): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    encoder.encode(data)
  );

  return {
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(encryptedBuffer),
  };
}

/**
 * Decrypts data using AES-256-GCM
 */
export async function decrypt(
  encryptedData: EncryptedData,
  encryptionKey: CryptoKey
): Promise<string> {
  const decoder = new TextDecoder();
  const iv = base64ToArrayBuffer(encryptedData.iv);
  const data = base64ToArrayBuffer(encryptedData.data);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    data
  );

  return decoder.decode(decryptedBuffer);
}

/**
 * Encrypts a vault item (object)
 */
export async function encryptVaultItem<T>(
  item: T,
  encryptionKey: CryptoKey
): Promise<EncryptedData> {
  const json = JSON.stringify(item);
  return encrypt(json, encryptionKey);
}

/**
 * Decrypts a vault item (object)
 */
export async function decryptVaultItem<T>(
  encryptedData: EncryptedData,
  encryptionKey: CryptoKey
): Promise<T> {
  const json = await decrypt(encryptedData, encryptionKey);
  return JSON.parse(json) as T;
}

// ============================================
// Symmetric Key Management
// ============================================

/**
 * Generates a new symmetric key for vault encryption
 */
export async function generateSymmetricKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports a CryptoKey to base64 string
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Imports a base64 string as CryptoKey
 */
export async function importKey(base64Key: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts the symmetric key with the master key (for storage)
 */
export async function encryptSymmetricKey(
  symmetricKey: CryptoKey,
  masterKey: CryptoKey
): Promise<EncryptedData> {
  const exportedKey = await exportKey(symmetricKey);
  return encrypt(exportedKey, masterKey);
}

/**
 * Decrypts the symmetric key using the master key
 */
export async function decryptSymmetricKey(
  encryptedKey: EncryptedData,
  masterKey: CryptoKey
): Promise<CryptoKey> {
  const base64Key = await decrypt(encryptedKey, masterKey);
  return importKey(base64Key);
}

// ============================================
// Password Generator
// ============================================

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'l1IO0';

/**
 * Generates a secure random password
 */
export function generatePassword(options: PasswordGeneratorOptions): string {
  let charset = '';

  if (options.lowercase) charset += LOWERCASE;
  if (options.uppercase) charset += UPPERCASE;
  if (options.numbers) charset += NUMBERS;
  if (options.symbols) charset += SYMBOLS;

  if (options.excludeAmbiguous) {
    charset = charset
      .split('')
      .filter((c) => !AMBIGUOUS.includes(c))
      .join('');
  }

  if (charset.length === 0) {
    charset = LOWERCASE + UPPERCASE + NUMBERS;
  }

  const password: string[] = [];
  const randomValues = new Uint32Array(options.length);
  crypto.getRandomValues(randomValues);

  // Ensure minimum requirements
  const requirements: string[] = [];
  if (options.minNumbers && options.numbers) {
    for (let i = 0; i < options.minNumbers; i++) {
      requirements.push(getRandomChar(NUMBERS));
    }
  }
  if (options.minSymbols && options.symbols) {
    for (let i = 0; i < options.minSymbols; i++) {
      requirements.push(getRandomChar(SYMBOLS));
    }
  }

  // Fill remaining length
  for (let i = 0; i < options.length - requirements.length; i++) {
    const index = randomValues[i] % charset.length;
    password.push(charset[index]);
  }

  // Insert requirements at random positions
  for (const req of requirements) {
    const pos = Math.floor(Math.random() * (password.length + 1));
    password.splice(pos, 0, req);
  }

  return password.join('');
}

function getRandomChar(charset: string): string {
  const randomValue = new Uint32Array(1);
  crypto.getRandomValues(randomValue);
  return charset[randomValue[0] % charset.length];
}

/**
 * Calculates password strength (0-4)
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  return Math.min(4, Math.floor(score * 0.7));
}

// ============================================
// Utility Functions
// ============================================

/**
 * Converts ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generates a cryptographically secure random ID
 */
export function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Securely compares two strings (constant-time)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}





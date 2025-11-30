// ============================================
// BirchVault Sharing Module
// Asymmetric encryption for secure sharing
// ============================================

import { arrayBufferToBase64, base64ToArrayBuffer } from '../crypto';

// Key generation for sharing
const RSA_ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface ShareInvite {
  id: string;
  itemId: string;
  encryptedKey: string;
  permission: 'read' | 'write';
  expiresAt?: string;
}

/**
 * Generates an RSA key pair for sharing
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    RSA_ALGORITHM,
    true,
    ['encrypt', 'decrypt']
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    privateKey: arrayBufferToBase64(privateKeyBuffer),
  };
}

/**
 * Imports a public key from base64 string
 */
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey(
    'spki',
    keyBuffer,
    RSA_ALGORITHM,
    false,
    ['encrypt']
  );
}

/**
 * Imports a private key from base64 string
 */
export async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    RSA_ALGORITHM,
    false,
    ['decrypt']
  );
}

/**
 * Encrypts a symmetric key with recipient's public key
 */
export async function encryptKeyForSharing(
  symmetricKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> {
  const rawKey = await crypto.subtle.exportKey('raw', symmetricKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    rawKey
  );
  return arrayBufferToBase64(encrypted);
}

/**
 * Decrypts a shared symmetric key with own private key
 */
export async function decryptSharedKey(
  encryptedKey: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const encrypted = base64ToArrayBuffer(encryptedKey);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encrypted
  );
  
  return crypto.subtle.importKey(
    'raw',
    decrypted,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Creates a share invite with encrypted item key
 */
export async function createShareInvite(
  itemId: string,
  itemKey: CryptoKey,
  recipientPublicKeyBase64: string,
  permission: 'read' | 'write' = 'read',
  expiresInDays?: number
): Promise<ShareInvite> {
  const recipientPublicKey = await importPublicKey(recipientPublicKeyBase64);
  const encryptedKey = await encryptKeyForSharing(itemKey, recipientPublicKey);
  
  const invite: ShareInvite = {
    id: crypto.randomUUID(),
    itemId,
    encryptedKey,
    permission,
  };
  
  if (expiresInDays) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    invite.expiresAt = expiresAt.toISOString();
  }
  
  return invite;
}

// Re-export organization types from types module
export type { Organization, OrgMember } from '../types';

// Sharing-specific types
export interface OrgCollection {
  id: string;
  organizationId: string;
  name: string;
  itemCount: number;
  createdAt: string;
}

export interface OrgInvite {
  id: string;
  organizationId: string;
  email: string;
  role: 'admin' | 'member';
  token: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Generates a secure invite token
 */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Creates an organization invite
 */
export function createOrgInvite(
  organizationId: string,
  email: string,
  role: 'admin' | 'member' = 'member',
  expiresInDays: number = 7
): OrgInvite {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  
  return {
    id: crypto.randomUUID(),
    organizationId,
    email: email.toLowerCase().trim(),
    role,
    token: generateInviteToken(),
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };
}





import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  importPublicKey,
  importPrivateKey,
  encryptKeyForSharing,
  decryptSharedKey,
  generateInviteToken,
  createOrgInvite,
} from './index';
import { generateSymmetricKey } from '../crypto';

describe('Key Pair Generation', () => {
  it('should generate a valid RSA key pair', async () => {
    const keyPair = await generateKeyPair();
    
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicKey.length).toBeGreaterThan(100);
    expect(keyPair.privateKey.length).toBeGreaterThan(100);
  });

  it('should generate unique key pairs', async () => {
    const keyPair1 = await generateKeyPair();
    const keyPair2 = await generateKeyPair();
    
    expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
    expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
  });
});

describe('Key Import', () => {
  it('should import public key', async () => {
    const keyPair = await generateKeyPair();
    const importedKey = await importPublicKey(keyPair.publicKey);
    
    expect(importedKey).toBeDefined();
    expect(importedKey.type).toBe('public');
  });

  it('should import private key', async () => {
    const keyPair = await generateKeyPair();
    const importedKey = await importPrivateKey(keyPair.privateKey);
    
    expect(importedKey).toBeDefined();
    expect(importedKey.type).toBe('private');
  });
});

describe('Key Sharing Encryption', () => {
  it('should encrypt and decrypt a symmetric key', async () => {
    // Generate sender's symmetric key
    const symmetricKey = await generateSymmetricKey();
    
    // Generate recipient's key pair
    const recipientKeyPair = await generateKeyPair();
    const recipientPublicKey = await importPublicKey(recipientKeyPair.publicKey);
    const recipientPrivateKey = await importPrivateKey(recipientKeyPair.privateKey);
    
    // Encrypt the symmetric key for the recipient
    const encryptedKey = await encryptKeyForSharing(symmetricKey, recipientPublicKey);
    
    expect(encryptedKey).toBeDefined();
    expect(encryptedKey.length).toBeGreaterThan(0);
    
    // Recipient decrypts the key
    const decryptedKey = await decryptSharedKey(encryptedKey, recipientPrivateKey);
    
    expect(decryptedKey).toBeDefined();
    
    // Verify the keys are functionally equivalent by encrypting/decrypting data
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const testData = encoder.encode('Test data for verification');
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      symmetricKey,
      testData
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      decryptedKey,
      encrypted
    );
    
    expect(decoder.decode(decrypted)).toBe('Test data for verification');
  });
});

describe('Invite Token Generation', () => {
  it('should generate a 64-character hex token', () => {
    const token = generateInviteToken();
    
    expect(token.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('should generate unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateInviteToken());
    }
    expect(tokens.size).toBe(100);
  });
});

describe('Organization Invite', () => {
  it('should create a valid invite object', () => {
    const invite = createOrgInvite('org-123', 'user@example.com', 'member', 7);
    
    expect(invite.id).toBeDefined();
    expect(invite.organizationId).toBe('org-123');
    expect(invite.email).toBe('user@example.com');
    expect(invite.role).toBe('member');
    expect(invite.token).toBeDefined();
    expect(invite.token.length).toBe(64);
    
    // Check expiration is ~7 days from now
    const expiresAt = new Date(invite.expiresAt);
    const now = new Date();
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6.9);
    expect(diffDays).toBeLessThan(7.1);
  });

  it('should normalize email to lowercase', () => {
    const invite = createOrgInvite('org-123', 'User@Example.COM');
    expect(invite.email).toBe('user@example.com');
  });

  it('should default to member role', () => {
    const invite = createOrgInvite('org-123', 'user@example.com');
    expect(invite.role).toBe('member');
  });
});








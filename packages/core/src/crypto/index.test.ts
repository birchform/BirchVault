import { describe, it, expect } from 'vitest';
import {
  deriveKeys,
  encrypt,
  decrypt,
  encryptVaultItem,
  decryptVaultItem,
  generatePassword,
  calculatePasswordStrength,
  generateId,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from './index';
import type { LoginItem } from '../types';

describe('Key Derivation', () => {
  it('should derive consistent keys from same password and email', async () => {
    const keys1 = await deriveKeys('masterpassword123', 'test@example.com');
    const keys2 = await deriveKeys('masterpassword123', 'test@example.com');

    expect(keys1.authHash).toBe(keys2.authHash);
  });

  it('should derive different keys for different passwords', async () => {
    const keys1 = await deriveKeys('password1', 'test@example.com');
    const keys2 = await deriveKeys('password2', 'test@example.com');

    expect(keys1.authHash).not.toBe(keys2.authHash);
  });

  it('should normalize email to lowercase', async () => {
    const keys1 = await deriveKeys('password', 'Test@Example.com');
    const keys2 = await deriveKeys('password', 'test@example.com');

    expect(keys1.authHash).toBe(keys2.authHash);
  });
});

describe('Encryption / Decryption', () => {
  it('should encrypt and decrypt string data', async () => {
    const keys = await deriveKeys('password', 'test@example.com');
    const original = 'Hello, BirchVault!';

    const encrypted = await encrypt(original, keys.encryptionKey);
    const decrypted = await decrypt(encrypted, keys.encryptionKey);

    expect(decrypted).toBe(original);
  });

  it('should produce different ciphertext for same plaintext (random IV)', async () => {
    const keys = await deriveKeys('password', 'test@example.com');
    const original = 'Same data';

    const encrypted1 = await encrypt(original, keys.encryptionKey);
    const encrypted2 = await encrypt(original, keys.encryptionKey);

    expect(encrypted1.data).not.toBe(encrypted2.data);
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
  });

  it('should encrypt and decrypt vault items', async () => {
    const keys = await deriveKeys('password', 'test@example.com');

    const loginItem: LoginItem = {
      id: generateId(),
      type: 'login',
      name: 'Test Login',
      favorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      login: {
        username: 'testuser',
        password: 'testpassword123',
        uris: [{ uri: 'https://example.com' }],
      },
    };

    const encrypted = await encryptVaultItem(loginItem, keys.encryptionKey);
    const decrypted = await decryptVaultItem<LoginItem>(encrypted, keys.encryptionKey);

    expect(decrypted).toEqual(loginItem);
  });
});

describe('Password Generator', () => {
  it('should generate password of specified length', () => {
    const password = generatePassword({
      length: 20,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: false,
      excludeAmbiguous: false,
    });

    expect(password.length).toBe(20);
  });

  it('should include required character types', () => {
    const password = generatePassword({
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: false,
    });

    expect(/[A-Z]/.test(password)).toBe(true);
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[0-9]/.test(password)).toBe(true);
  });

  it('should exclude ambiguous characters when specified', () => {
    // Generate multiple passwords to ensure ambiguous chars are excluded
    for (let i = 0; i < 10; i++) {
      const password = generatePassword({
        length: 50,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: false,
        excludeAmbiguous: true,
      });

      expect(/[l1IO0]/.test(password)).toBe(false);
    }
  });
});

describe('Password Strength', () => {
  it('should rate weak passwords low', () => {
    expect(calculatePasswordStrength('abc')).toBeLessThan(2);
    expect(calculatePasswordStrength('password')).toBeLessThan(3);
  });

  it('should rate strong passwords high', () => {
    expect(calculatePasswordStrength('MyStr0ng!P@ssw0rd')).toBeGreaterThanOrEqual(3);
  });
});

describe('Utility Functions', () => {
  it('should convert ArrayBuffer to Base64 and back', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const base64 = arrayBufferToBase64(original.buffer);
    const restored = new Uint8Array(base64ToArrayBuffer(base64));

    expect(Array.from(restored)).toEqual(Array.from(original));
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});








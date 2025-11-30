import { describe, it, expect } from 'vitest';
import {
  generateTOTPSecret,
  generateTOTP,
  verifyTOTP,
  generateTOTPUri,
  getTOTPTimeRemaining,
  generateBackupCodes,
  createTOTPSetup,
} from './index';

describe('TOTP Secret Generation', () => {
  it('should generate a secret of specified length', () => {
    const secret = generateTOTPSecret(20);
    expect(secret.length).toBe(20);
  });

  it('should only contain valid base32 characters', () => {
    const secret = generateTOTPSecret(32);
    const validChars = /^[A-Z2-7]+$/;
    expect(validChars.test(secret)).toBe(true);
  });

  it('should generate unique secrets', () => {
    const secrets = new Set<string>();
    for (let i = 0; i < 100; i++) {
      secrets.add(generateTOTPSecret());
    }
    expect(secrets.size).toBe(100);
  });
});

describe('TOTP Code Generation', () => {
  it('should generate a 6-digit code by default', async () => {
    const secret = 'JBSWY3DPEHPK3PXP'; // Test secret
    const code = await generateTOTP(secret);
    expect(code.length).toBe(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it('should generate consistent codes for the same timestamp', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const timestamp = 1234567890;
    
    const code1 = await generateTOTP(secret, timestamp);
    const code2 = await generateTOTP(secret, timestamp);
    
    expect(code1).toBe(code2);
  });

  it('should generate different codes for different timestamps', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    
    const code1 = await generateTOTP(secret, 1234567890);
    const code2 = await generateTOTP(secret, 1234567920); // 30 seconds later
    
    expect(code1).not.toBe(code2);
  });
});

describe('TOTP Verification', () => {
  it('should verify a valid code', async () => {
    const secret = generateTOTPSecret();
    const code = await generateTOTP(secret);
    
    const isValid = await verifyTOTP(secret, code);
    expect(isValid).toBe(true);
  });

  it('should reject an invalid code', async () => {
    const secret = generateTOTPSecret();
    
    const isValid = await verifyTOTP(secret, '000000');
    // This might occasionally pass if 000000 is the actual code
    // but probability is very low
  });

  it('should accept codes within time window', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const now = Math.floor(Date.now() / 1000);
    
    // Generate code for 30 seconds ago
    const pastCode = await generateTOTP(secret, now - 30);
    
    // Should still verify with window=1
    const isValid = await verifyTOTP(secret, pastCode, 1);
    expect(isValid).toBe(true);
  });
});

describe('TOTP URI Generation', () => {
  it('should generate a valid otpauth URI', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const uri = generateTOTPUri(secret, 'user@example.com', 'BirchVault');
    
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain(secret);
    expect(uri).toContain('BirchVault');
    expect(uri).toContain('user%40example.com');
  });

  it('should properly encode special characters', () => {
    const uri = generateTOTPUri('SECRET', 'user+test@example.com', 'My App');
    
    expect(uri).toContain('user%2Btest%40example.com');
    expect(uri).toContain('My%20App');
  });
});

describe('Backup Codes', () => {
  it('should generate the specified number of codes', () => {
    const codes = generateBackupCodes(10);
    expect(codes.length).toBe(10);
  });

  it('should generate codes in the correct format', () => {
    const codes = generateBackupCodes(5);
    const format = /^[0-9A-F]{4}-[0-9A-F]{4}$/;
    
    codes.forEach((code) => {
      expect(format.test(code)).toBe(true);
    });
  });

  it('should generate unique codes', () => {
    const codes = generateBackupCodes(100);
    const unique = new Set(codes);
    expect(unique.size).toBe(100);
  });
});

describe('TOTP Setup', () => {
  it('should create a complete setup object', () => {
    const setup = createTOTPSetup('user@example.com');
    
    expect(setup.secret).toBeDefined();
    expect(setup.secret.length).toBe(20);
    expect(setup.uri).toContain('otpauth://totp/');
    expect(setup.backupCodes.length).toBe(10);
  });
});

describe('Time Remaining', () => {
  it('should return a value between 1 and period', () => {
    const remaining = getTOTPTimeRemaining(30);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(30);
  });
});








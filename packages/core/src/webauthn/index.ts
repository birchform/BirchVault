// ============================================
// BirchVault WebAuthn / Passkey Support
// ============================================

import { arrayBufferToBase64, base64ToArrayBuffer, generateId } from '../crypto';

// WebAuthn Types
export interface WebAuthnCredential {
  id: string;
  publicKey: string;
  counter: number;
  deviceType: 'platform' | 'cross-platform';
  transports?: AuthenticatorTransport[];
  createdAt: string;
  lastUsedAt: string;
  name: string;
}

export interface WebAuthnChallenge {
  challenge: string;
  timeout: number;
  rpId: string;
  rpName: string;
  userId: string;
  userName: string;
}

export interface RegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout: number;
  attestation: AttestationConveyancePreference;
  authenticatorSelection: AuthenticatorSelectionCriteria;
  excludeCredentials?: PublicKeyCredentialDescriptor[];
}

export interface AuthenticationOptions {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  userVerification: UserVerificationRequirement;
}

/**
 * Checks if WebAuthn is supported in the current browser
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * Checks if platform authenticator (Touch ID, Face ID, Windows Hello) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Generates a random challenge for WebAuthn operations
 */
export function generateChallenge(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return arrayBufferToBase64(bytes.buffer);
}

/**
 * Creates registration options for a new passkey
 */
export function createRegistrationOptions(
  userId: string,
  userName: string,
  displayName: string,
  existingCredentialIds: string[] = []
): RegistrationOptions {
  const challenge = generateChallenge();
  
  return {
    challenge,
    rp: {
      name: 'BirchVault',
      id: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    },
    user: {
      id: userId,
      name: userName,
      displayName: displayName || userName,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    timeout: 60000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
      requireResidentKey: false,
    },
    excludeCredentials: existingCredentialIds.map((id) => ({
      id: base64ToArrayBuffer(id),
      type: 'public-key' as const,
      transports: ['internal'] as AuthenticatorTransport[],
    })),
  };
}

/**
 * Creates authentication options for passkey login
 */
export function createAuthenticationOptions(
  allowedCredentialIds: string[] = []
): AuthenticationOptions {
  const challenge = generateChallenge();
  
  return {
    challenge,
    timeout: 60000,
    rpId: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    allowCredentials: allowedCredentialIds.length > 0
      ? allowedCredentialIds.map((id) => ({
          id: base64ToArrayBuffer(id),
          type: 'public-key' as const,
          transports: ['internal'] as AuthenticatorTransport[],
        }))
      : undefined,
    userVerification: 'required',
  };
}

/**
 * Registers a new passkey with the browser
 */
export async function registerPasskey(
  options: RegistrationOptions
): Promise<{
  credentialId: string;
  publicKey: string;
  attestationObject: string;
  clientDataJSON: string;
}> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }
  
  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64ToArrayBuffer(options.challenge),
    rp: options.rp,
    user: {
      id: new TextEncoder().encode(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout,
    attestation: options.attestation,
    authenticatorSelection: options.authenticatorSelection,
    excludeCredentials: options.excludeCredentials,
  };
  
  const credential = await navigator.credentials.create({
    publicKey: publicKeyOptions,
  }) as PublicKeyCredential;
  
  if (!credential) {
    throw new Error('Failed to create credential');
  }
  
  const response = credential.response as AuthenticatorAttestationResponse;
  
  return {
    credentialId: arrayBufferToBase64(credential.rawId),
    publicKey: arrayBufferToBase64(response.getPublicKey() || new ArrayBuffer(0)),
    attestationObject: arrayBufferToBase64(response.attestationObject),
    clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
  };
}

/**
 * Authenticates using an existing passkey
 */
export async function authenticateWithPasskey(
  options: AuthenticationOptions
): Promise<{
  credentialId: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
  userHandle: string | null;
}> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }
  
  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64ToArrayBuffer(options.challenge),
    timeout: options.timeout,
    rpId: options.rpId,
    allowCredentials: options.allowCredentials,
    userVerification: options.userVerification,
  };
  
  const credential = await navigator.credentials.get({
    publicKey: publicKeyOptions,
  }) as PublicKeyCredential;
  
  if (!credential) {
    throw new Error('Authentication failed');
  }
  
  const response = credential.response as AuthenticatorAssertionResponse;
  
  return {
    credentialId: arrayBufferToBase64(credential.rawId),
    authenticatorData: arrayBufferToBase64(response.authenticatorData),
    clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
    signature: arrayBufferToBase64(response.signature),
    userHandle: response.userHandle
      ? arrayBufferToBase64(response.userHandle)
      : null,
  };
}

/**
 * Creates a new WebAuthn credential record for storage
 */
export function createCredentialRecord(
  credentialId: string,
  publicKey: string,
  name: string,
  deviceType: 'platform' | 'cross-platform' = 'platform'
): WebAuthnCredential {
  const now = new Date().toISOString();
  return {
    id: credentialId,
    publicKey,
    counter: 0,
    deviceType,
    createdAt: now,
    lastUsedAt: now,
    name,
  };
}








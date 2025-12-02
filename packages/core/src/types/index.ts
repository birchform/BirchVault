// ============================================
// BirchVault Core Types
// ============================================

// Vault Item Types
export type VaultItemType = 'login' | 'card' | 'identity' | 'securenote' | 'apikey' | 'wifi' | 'document';

export interface VaultItemBase {
  id: string;
  type: VaultItemType;
  name: string;
  folderId?: string;
  organizationId?: string;
  favorite: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginItem extends VaultItemBase {
  type: 'login';
  login: {
    username?: string;
    password?: string;
    uris?: { uri: string; match?: number }[];
    totp?: string;
  };
}

export interface CardItem extends VaultItemBase {
  type: 'card';
  card: {
    cardholderName?: string;
    brand?: string;
    number?: string;
    expMonth?: string;
    expYear?: string;
    code?: string;
  };
}

export interface IdentityItem extends VaultItemBase {
  type: 'identity';
  identity: {
    title?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    company?: string;
    ssn?: string;
    passportNumber?: string;
    licenseNumber?: string;
  };
}

export interface SecureNoteItem extends VaultItemBase {
  type: 'securenote';
  secureNote: {
    type: 0; // Generic note type
  };
}

export interface ApiKeyItem extends VaultItemBase {
  type: 'apikey';
  apiKey: {
    key: string;                  // The API key itself
    secret?: string;              // Optional secret/token
    endpoint?: string;            // Optional API endpoint URL
    environment?: string;         // e.g., "production", "staging", "development"
    expiresAt?: string;           // ISO date when key expires
    renewalReminderAt?: string;   // ISO date to remind for renewal
  };
}

export interface WifiItem extends VaultItemBase {
  type: 'wifi';
  wifi: {
    ssid: string;                 // Network name
    password?: string;            // WiFi password
    securityType?: 'wpa3' | 'wpa2' | 'wpa' | 'wep' | 'open';
    hidden?: boolean;             // Hidden network flag
    routerAdminUrl?: string;      // Router admin panel URL
  };
}

export interface DocumentItem extends VaultItemBase {
  type: 'document';
  document: {
    fileName: string;             // Original file name
    fileSize: number;             // File size in bytes
    mimeType: string;             // MIME type
    storageKey: string;           // Reference to encrypted file in Supabase Storage
    description?: string;         // Optional description
  };
}

export type VaultItem = LoginItem | CardItem | IdentityItem | SecureNoteItem | ApiKeyItem | WifiItem | DocumentItem;

// Folder
export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Organization
export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface OrgMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  status: 'invited' | 'accepted';
  createdAt: string;
}

// User Profile
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  kdfIterations: number;
  encryptedSymmetricKey: string; // Encrypted with master key
  createdAt: string;
  updatedAt: string;
}

// Encrypted Data Structure
export interface EncryptedData {
  iv: string; // Base64 encoded IV
  data: string; // Base64 encoded encrypted data
}

// Encryption Keys
export interface DerivedKeys {
  masterKey: CryptoKey;
  encryptionKey: CryptoKey;
  authHash: string; // Sent to server for authentication
}

// Auth Types
export interface AuthCredentials {
  email: string;
  masterPassword: string;
}

export interface Session {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Password Generator Options
export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  minNumbers?: number;
  minSymbols?: number;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}








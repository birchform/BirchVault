'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Key,
  CreditCard,
  StickyNote,
  User,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { generatePassword, generateId, type VaultItemType, type LoginItem, type CardItem, type IdentityItem, type SecureNoteItem } from '@birchvault/core';
import { useVaultStore } from '@/store/vault';

const typeConfig: Record<VaultItemType, { icon: React.ElementType; label: string }> = {
  login: { icon: Key, label: 'Login' },
  card: { icon: CreditCard, label: 'Card' },
  identity: { icon: User, label: 'Identity' },
  securenote: { icon: StickyNote, label: 'Secure Note' },
};

export default function NewItemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem, folders } = useVaultStore();

  const initialType = (searchParams.get('type') as VaultItemType) || 'login';
  const [itemType, setItemType] = useState<VaultItemType>(initialType);
  const [isLoading, setIsLoading] = useState(false);

  // Common fields
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [folderId, setFolderId] = useState('');
  const [favorite, setFavorite] = useState(false);

  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [uri, setUri] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Card fields
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [brand, setBrand] = useState('');

  // Identity fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleGeneratePassword = () => {
    const newPassword = generatePassword({
      length: 20,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: true,
    });
    setPassword(newPassword);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const now = new Date().toISOString();
    const baseItem = {
      id: generateId(),
      name,
      notes,
      folderId: folderId || undefined,
      favorite,
      createdAt: now,
      updatedAt: now,
    };

    let newItem;

    // Normalize URL - add https:// if no protocol specified
    const normalizeUrl = (url: string): string => {
      if (!url) return url;
      const trimmed = url.trim();
      if (trimmed.match(/^https?:\/\//i)) {
        return trimmed;
      }
      return `https://${trimmed}`;
    };

    switch (itemType) {
      case 'login':
        newItem = {
          ...baseItem,
          type: 'login' as const,
          login: {
            username,
            password,
            uris: uri ? [{ uri: normalizeUrl(uri) }] : [],
          },
        } satisfies LoginItem;
        break;
      case 'card':
        newItem = {
          ...baseItem,
          type: 'card' as const,
          card: {
            cardholderName,
            number: cardNumber,
            expMonth,
            expYear,
            code: cvv,
            brand,
          },
        } satisfies CardItem;
        break;
      case 'identity':
        newItem = {
          ...baseItem,
          type: 'identity' as const,
          identity: {
            firstName,
            lastName,
            email,
            phone,
          },
        } satisfies IdentityItem;
        break;
      case 'securenote':
        newItem = {
          ...baseItem,
          type: 'securenote' as const,
          secureNote: {
            type: 0 as const,
          },
        } satisfies SecureNoteItem;
        break;
    }

    // TODO: Encrypt and save to Supabase
    addItem(newItem);
    router.push('/vault');
  };

  const Icon = typeConfig[itemType].icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/vault"
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">New {typeConfig[itemType].label}</h1>
              <p className="text-sm text-muted-foreground">
                Add a new item to your vault
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Type Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Item Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(typeConfig) as VaultItemType[]).map((type) => {
                const config = typeConfig[type];
                const TypeIcon = config.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setItemType(type)}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      itemType === type
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <TypeIcon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., My Bank Login"
              required
            />
          </div>

          {/* Type-specific fields */}
          {itemType === 'login' && (
            <>
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="username or email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
                    title="Generate password"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(password)}
                    className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
                    title="Copy password"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="uri" className="block text-sm font-medium mb-2">
                  Website URL
                </label>
                <input
                  id="uri"
                  type="text"
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="example.com/login or https://example.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Include the full path if the login page is at a specific URL (e.g., birchform.co.uk/auth)
                </p>
              </div>
            </>
          )}

          {itemType === 'card' && (
            <>
              <div>
                <label htmlFor="cardholderName" className="block text-sm font-medium mb-2">
                  Cardholder Name
                </label>
                <input
                  id="cardholderName"
                  type="text"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium mb-2">
                  Card Number
                </label>
                <input
                  id="cardNumber"
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  placeholder="1234 5678 9012 3456"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="expMonth" className="block text-sm font-medium mb-2">
                    Exp Month
                  </label>
                  <input
                    id="expMonth"
                    type="text"
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="MM"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label htmlFor="expYear" className="block text-sm font-medium mb-2">
                    Exp Year
                  </label>
                  <input
                    id="expYear"
                    type="text"
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="YY"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label htmlFor="cvv" className="block text-sm font-medium mb-2">
                    CVV
                  </label>
                  <input
                    id="cvv"
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="•••"
                    maxLength={4}
                  />
                </div>
              </div>
            </>
          )}

          {itemType === 'identity' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Folder */}
          {folders.length > 0 && (
            <div>
              <label htmlFor="folder" className="block text-sm font-medium mb-2">
                Folder
              </label>
              <select
                id="folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Favorite */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
              className="w-4 h-4 rounded border-input"
            />
            <span className="text-sm">Mark as favorite</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/vault"
              className="flex-1 px-4 py-2 text-center border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading || !name}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}








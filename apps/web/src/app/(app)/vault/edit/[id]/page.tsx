'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Key,
  CreditCard,
  StickyNote,
  User,
  Copy,
  Eye,
  EyeOff,
  Code,
  Loader2,
  Wifi,
  FileText,
  Download,
} from 'lucide-react';
import { encryptVaultItem, decryptFile, type VaultItemType, type VaultItem, type WifiItem, type DocumentItem } from '@birchvault/core';
import { getSupabaseClient } from '@/lib/supabase';
import { useVaultStore } from '@/store/vault';

const typeConfig: Record<VaultItemType, { icon: React.ElementType; label: string }> = {
  login: { icon: Key, label: 'Login' },
  card: { icon: CreditCard, label: 'Card' },
  identity: { icon: User, label: 'Identity' },
  securenote: { icon: StickyNote, label: 'Secure Note' },
  apikey: { icon: Code, label: 'API Key' },
  wifi: { icon: Wifi, label: 'WiFi' },
  document: { icon: FileText, label: 'Document' },
};

export default function EditItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  const { items, updateItem, encryptionKey } = useVaultStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [item, setItem] = useState<VaultItem | null>(null);

  // Common fields
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
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

  // API Key fields
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiEnvironment, setApiEnvironment] = useState('');
  const [apiExpiresAt, setApiExpiresAt] = useState('');
  const [apiRenewalReminder, setApiRenewalReminder] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  // WiFi fields
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiSecurityType, setWifiSecurityType] = useState<'wpa3' | 'wpa2' | 'wpa' | 'wep' | 'open' | ''>('');
  const [wifiHidden, setWifiHidden] = useState(false);
  const [wifiRouterUrl, setWifiRouterUrl] = useState('');
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  // Document fields (read-only display for edit)
  const [documentFileName, setDocumentFileName] = useState('');
  const [documentFileSize, setDocumentFileSize] = useState(0);
  const [documentDescription, setDocumentDescription] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Load item data
  useEffect(() => {
    const foundItem = items.find((i) => i.id === itemId);
    if (foundItem) {
      setItem(foundItem);
      setName(foundItem.name);
      setNotes(foundItem.notes || '');
      setFavorite(foundItem.favorite);

      if (foundItem.type === 'login' && foundItem.login) {
        setUsername(foundItem.login.username || '');
        setPassword(foundItem.login.password || '');
        setUri(foundItem.login.uris?.[0]?.uri || '');
      } else if (foundItem.type === 'card' && foundItem.card) {
        setCardholderName(foundItem.card.cardholderName || '');
        setCardNumber(foundItem.card.number || '');
        setExpMonth(foundItem.card.expMonth || '');
        setExpYear(foundItem.card.expYear || '');
        setCvv(foundItem.card.code || '');
        setBrand(foundItem.card.brand || '');
      } else if (foundItem.type === 'identity' && foundItem.identity) {
        setFirstName(foundItem.identity.firstName || '');
        setLastName(foundItem.identity.lastName || '');
        setEmail(foundItem.identity.email || '');
        setPhone(foundItem.identity.phone || '');
      } else if (foundItem.type === 'apikey' && foundItem.apiKey) {
        setApiKeyValue(foundItem.apiKey.key || '');
        setApiSecret(foundItem.apiKey.secret || '');
        setApiEndpoint(foundItem.apiKey.endpoint || '');
        setApiEnvironment(foundItem.apiKey.environment || '');
        setApiExpiresAt(foundItem.apiKey.expiresAt ? foundItem.apiKey.expiresAt.split('T')[0] : '');
        setApiRenewalReminder(foundItem.apiKey.renewalReminderAt ? foundItem.apiKey.renewalReminderAt.split('T')[0] : '');
      } else if (foundItem.type === 'wifi' && foundItem.wifi) {
        setWifiSsid(foundItem.wifi.ssid || '');
        setWifiPassword(foundItem.wifi.password || '');
        setWifiSecurityType(foundItem.wifi.securityType || '');
        setWifiHidden(foundItem.wifi.hidden || false);
        setWifiRouterUrl(foundItem.wifi.routerAdminUrl || '');
      } else if (foundItem.type === 'document' && foundItem.document) {
        setDocumentFileName(foundItem.document.fileName || '');
        setDocumentFileSize(foundItem.document.fileSize || 0);
        setDocumentDescription(foundItem.document.description || '');
      }
      setIsLoading(false);
    } else {
      // Item not found, redirect back
      router.push('/vault');
    }
  }, [itemId, items, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !encryptionKey) return;

    setIsSaving(true);

    try {
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();

      let updatedItem: VaultItem;

      switch (item.type) {
        case 'login':
          updatedItem = {
            ...item,
            name,
            notes,
            favorite,
            updatedAt: now,
            login: {
              username,
              password,
              uris: uri ? [{ uri: uri.startsWith('http://') || uri.startsWith('https://') ? uri : `https://${uri}` }] : [],
            },
          };
          break;
        case 'card':
          updatedItem = {
            ...item,
            name,
            notes,
            favorite,
            updatedAt: now,
            card: {
              cardholderName,
              number: cardNumber,
              expMonth,
              expYear,
              code: cvv,
              brand,
            },
          };
          break;
        case 'identity':
          updatedItem = {
            ...item,
            name,
            notes,
            favorite,
            updatedAt: now,
            identity: {
              ...item.identity,
              firstName,
              lastName,
              email,
              phone,
            },
          };
          break;
        case 'securenote':
          updatedItem = {
            ...item,
            name,
            notes,
            favorite,
            updatedAt: now,
          };
          break;
        case 'apikey':
          updatedItem = {
            ...item,
            name,
            notes,
            favorite,
            updatedAt: now,
            apiKey: {
              key: apiKeyValue,
              secret: apiSecret || undefined,
              endpoint: apiEndpoint || undefined,
              environment: apiEnvironment || undefined,
              expiresAt: apiExpiresAt || undefined,
              renewalReminderAt: apiRenewalReminder || undefined,
            },
          };
          break;
        case 'wifi':
          updatedItem = {
            ...item,
            name,
            notes,
            favorite,
            updatedAt: now,
            wifi: {
              ssid: wifiSsid,
              password: wifiPassword || undefined,
              securityType: wifiSecurityType || undefined,
              hidden: wifiHidden || undefined,
              routerAdminUrl: wifiRouterUrl || undefined,
            },
          } as WifiItem;
          break;
        case 'document':
          updatedItem = {
            ...item,
            name,
            notes,
            favorite,
            updatedAt: now,
            document: {
              ...(item as DocumentItem).document,
              description: documentDescription || undefined,
            },
          } as DocumentItem;
          break;
        default:
          throw new Error('Unknown item type');
      }

      // Encrypt the updated item
      const encryptedData = await encryptVaultItem(updatedItem, encryptionKey);
      const encryptedString = JSON.stringify(encryptedData);

      // Update in Supabase
      const { error } = await supabase
        .from('vault_items')
        .update({
          encrypted_data: encryptedString,
          updated_at: now,
        })
        .eq('id', item.id);

      if (error) {
        console.error('Failed to update vault item:', error);
        alert(`Failed to save: ${error.message}`);
        setIsSaving(false);
        return;
      }

      // Update local store
      updateItem(updatedItem);
      router.push('/vault');
    } catch (err) {
      console.error('Error updating vault item:', err);
      alert('Failed to update vault item');
      setIsSaving(false);
    }
  };

  if (isLoading || !item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const Icon = typeConfig[item.type].icon;

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
              <h1 className="font-semibold">Edit {typeConfig[item.type].label}</h1>
              <p className="text-sm text-muted-foreground">
                Update your vault item
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
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
              required
            />
          </div>

          {/* Type-specific fields */}
          {item.type === 'login' && (
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
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                />
              </div>
            </>
          )}

          {item.type === 'card' && (
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
                    maxLength={4}
                  />
                </div>
              </div>
            </>
          )}

          {item.type === 'identity' && (
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
                />
              </div>
            </>
          )}

          {item.type === 'apikey' && (
            <>
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
                  API Key *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyValue}
                      onChange={(e) => setApiKeyValue(e.target.value)}
                      className="w-full px-4 py-2 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(apiKeyValue)}
                    className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
                    title="Copy API key"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="apiSecret" className="block text-sm font-medium mb-2">
                  Secret / Token
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="apiSecret"
                      type={showApiSecret ? 'text' : 'password'}
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      className="w-full px-4 py-2 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiSecret(!showApiSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(apiSecret)}
                    className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
                    title="Copy secret"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="apiEndpoint" className="block text-sm font-medium mb-2">
                  API Endpoint
                </label>
                <input
                  id="apiEndpoint"
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://api.example.com/v1"
                />
              </div>

              <div>
                <label htmlFor="apiEnvironment" className="block text-sm font-medium mb-2">
                  Environment
                </label>
                <select
                  id="apiEnvironment"
                  value={apiEnvironment}
                  onChange={(e) => setApiEnvironment(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select environment</option>
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                  <option value="test">Test</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="apiExpiresAt" className="block text-sm font-medium mb-2">
                    Expiry Date
                  </label>
                  <input
                    id="apiExpiresAt"
                    type="date"
                    value={apiExpiresAt}
                    onChange={(e) => setApiExpiresAt(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="apiRenewalReminder" className="block text-sm font-medium mb-2">
                    Renewal Reminder
                  </label>
                  <input
                    id="apiRenewalReminder"
                    type="date"
                    value={apiRenewalReminder}
                    onChange={(e) => setApiRenewalReminder(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </>
          )}

          {item.type === 'wifi' && (
            <>
              <div>
                <label htmlFor="wifiSsid" className="block text-sm font-medium mb-2">
                  Network Name (SSID) *
                </label>
                <input
                  id="wifiSsid"
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label htmlFor="wifiPassword" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="wifiPassword"
                      type={showWifiPassword ? 'text' : 'password'}
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWifiPassword(!showWifiPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showWifiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(wifiPassword)}
                    className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
                    title="Copy password"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="wifiSecurityType" className="block text-sm font-medium mb-2">
                  Security Type
                </label>
                <select
                  id="wifiSecurityType"
                  value={wifiSecurityType}
                  onChange={(e) => setWifiSecurityType(e.target.value as typeof wifiSecurityType)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select security type</option>
                  <option value="wpa3">WPA3</option>
                  <option value="wpa2">WPA2</option>
                  <option value="wpa">WPA</option>
                  <option value="wep">WEP</option>
                  <option value="open">Open (No Password)</option>
                </select>
              </div>

              <div>
                <label htmlFor="wifiRouterUrl" className="block text-sm font-medium mb-2">
                  Router Admin URL
                </label>
                <input
                  id="wifiRouterUrl"
                  type="text"
                  value={wifiRouterUrl}
                  onChange={(e) => setWifiRouterUrl(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="192.168.1.1 or http://router.local"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wifiHidden}
                  onChange={(e) => setWifiHidden(e.target.checked)}
                  className="w-4 h-4 rounded border-input"
                />
                <span className="text-sm">Hidden network</span>
              </label>
            </>
          )}

          {item.type === 'document' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  File
                </label>
                <div className="flex items-center justify-between bg-accent/50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-medium">{documentFileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {documentFileSize < 1024
                          ? `${documentFileSize} B`
                          : documentFileSize < 1024 * 1024
                          ? `${(documentFileSize / 1024).toFixed(1)} KB`
                          : `${(documentFileSize / (1024 * 1024)).toFixed(1)} MB`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!encryptionKey || !item) return;
                      setIsDownloading(true);
                      try {
                        const supabase = getSupabaseClient();
                        const docItem = item as DocumentItem;
                        const { data, error } = await supabase.storage
                          .from('vault-documents')
                          .download(docItem.document.storageKey);
                        
                        if (error) {
                          alert(`Failed to download: ${error.message}`);
                          return;
                        }

                        const decryptedBlob = await decryptFile(data, encryptionKey, docItem.document.mimeType);
                        const url = URL.createObjectURL(decryptedBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = docItem.document.fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Download failed:', err);
                        alert('Failed to download file');
                      } finally {
                        setIsDownloading(false);
                      }
                    }}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Files cannot be replaced. Delete this item and create a new one to upload a different file.
                </p>
              </div>

              <div>
                <label htmlFor="documentDescription" className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  id="documentDescription"
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Add a description for this document..."
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
            />
          </div>

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
              disabled={isSaving || !name}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

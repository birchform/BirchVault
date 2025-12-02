import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Key,
  CreditCard,
  StickyNote,
  User,
  Code,
  Wifi,
  FileText,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { useVaultStore } from '../../store/vault';
import {
  generatePassword,
  generateId,
  encryptVaultItem,
  type VaultItem,
  type VaultItemType,
} from '@birchvault/core';

const itemTypeIcons: Record<VaultItemType, React.ElementType> = {
  login: Key,
  card: CreditCard,
  securenote: StickyNote,
  identity: User,
  apikey: Code,
  wifi: Wifi,
  document: FileText,
};

const itemTypeLabels: Record<VaultItemType, string> = {
  login: 'Login',
  card: 'Card',
  securenote: 'Secure Note',
  identity: 'Identity',
  apikey: 'API Key',
  wifi: 'WiFi Network',
  document: 'Document',
};

export function VaultNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemType = (searchParams.get('type') as VaultItemType) || 'login';

  const { createItem, addItem, encryptionKey, folders } = useVaultStore();
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

  // WiFi fields
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiSecurityType, setWifiSecurityType] = useState('');

  const Icon = itemTypeIcons[itemType];

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
    if (!encryptionKey) {
      alert('No encryption key found');
      return;
    }

    setIsLoading(true);

    try {
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

      let newItem: VaultItem;

      switch (itemType) {
        case 'login':
          newItem = {
            ...baseItem,
            type: 'login',
            login: {
              username,
              password,
              uris: uri ? [{ uri: uri.startsWith('http') ? uri : `https://${uri}` }] : [],
            },
          };
          break;
        case 'card':
          newItem = {
            ...baseItem,
            type: 'card',
            card: { cardholderName, number: cardNumber, expMonth, expYear, code: cvv },
          };
          break;
        case 'identity':
          newItem = {
            ...baseItem,
            type: 'identity',
            identity: { firstName, lastName, email, phone },
          };
          break;
        case 'securenote':
          newItem = {
            ...baseItem,
            type: 'securenote',
            secureNote: { type: 0 },
          };
          break;
        case 'apikey':
          newItem = {
            ...baseItem,
            type: 'apikey',
            apiKey: {
              key: apiKeyValue,
              secret: apiSecret || undefined,
              endpoint: apiEndpoint || undefined,
              environment: apiEnvironment || undefined,
            },
          };
          break;
        case 'wifi':
          newItem = {
            ...baseItem,
            type: 'wifi',
            wifi: {
              ssid: wifiSsid,
              password: wifiPassword || undefined,
              securityType: (wifiSecurityType as any) || undefined,
            },
          };
          break;
        default:
          throw new Error('Unknown item type');
      }

      // Encrypt the item
      const encryptedData = await encryptVaultItem(newItem, encryptionKey);

      // Save to database via Tauri
      await createItem(
        JSON.stringify(encryptedData),
        itemType,
        folderId || undefined,
        favorite
      );

      // Add to local state
      addItem(newItem);

      navigate('/vault');
    } catch (err) {
      console.error('Error saving vault item:', err);
      alert('Failed to save vault item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center gap-4">
        <button
          onClick={() => navigate('/vault')}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">New {itemTypeLabels[itemType]}</h2>
            <p className="text-sm text-muted-foreground">Add a new item to your vault</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            required
            autoFocus
          />
        </div>

        {itemType === 'login' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
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
                  onClick={handleGeneratePassword}
                  className="p-2 border border-border rounded-lg hover:bg-accent"
                  title="Generate"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(password)}
                  className="p-2 border border-border rounded-lg hover:bg-accent"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website URL</label>
              <input
                type="text"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="example.com"
              />
            </div>
          </>
        )}

        {itemType === 'card' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Cardholder Name</label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">MM</label>
                <input
                  type="text"
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">YY</label>
                <input
                  type="text"
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CVV</label>
                <input
                  type="password"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={4}
                />
              </div>
            </div>
          </>
        )}

        {itemType === 'identity' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </>
        )}

        {itemType === 'apikey' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">API Key *</label>
              <input
                type="text"
                value={apiKeyValue}
                onChange={(e) => setApiKeyValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secret / Token</label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Endpoint</label>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://api.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Environment</label>
              <select
                value={apiEnvironment}
                onChange={(e) => setApiEnvironment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select...</option>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>
          </>
        )}

        {itemType === 'wifi' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Network Name (SSID) *</label>
              <input
                type="text"
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Security Type</label>
              <select
                value={wifiSecurityType}
                onChange={(e) => setWifiSecurityType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select...</option>
                <option value="wpa3">WPA3</option>
                <option value="wpa2">WPA2</option>
                <option value="wpa">WPA</option>
                <option value="wep">WEP</option>
                <option value="open">Open</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {folders.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Folder</label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
            className="w-4 h-4 rounded border-input"
          />
          <span className="text-sm">Mark as favorite</span>
        </label>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/vault')}
            className="flex-1 px-4 py-2 text-center border border-border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !name}
            className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}








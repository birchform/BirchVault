import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Key, CreditCard, StickyNote, User, Code, Wifi, FileText, Eye, EyeOff } from 'lucide-react';
import { useVaultStore } from '../../store/vault';
import { encryptVaultItem, type VaultItem, type VaultItemType } from '@birchvault/core';

const itemTypeIcons: Record<VaultItemType, React.ElementType> = {
  login: Key,
  card: CreditCard,
  securenote: StickyNote,
  identity: User,
  apikey: Code,
  wifi: Wifi,
  document: FileText,
};

export function VaultEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { items, saveItem, updateItem, encryptionKey, folders } = useVaultStore();

  const [item, setItem] = useState<VaultItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [folderId, setFolderId] = useState('');
  const [favorite, setFavorite] = useState(false);

  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [uri, setUri] = useState('');

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

  // Load item data
  useEffect(() => {
    const foundItem = items.find((i) => i.id === id);
    if (foundItem) {
      setItem(foundItem);
      setName(foundItem.name);
      setNotes(foundItem.notes || '');
      setFolderId(foundItem.folderId || '');
      setFavorite(foundItem.favorite);

      if (foundItem.type === 'login' && foundItem.login) {
        setUsername(foundItem.login.username || '');
        setPassword(foundItem.login.password || '');
        setUri(foundItem.login.uris?.[0]?.uri || '');
      }
      if (foundItem.type === 'card' && foundItem.card) {
        setCardholderName(foundItem.card.cardholderName || '');
        setCardNumber(foundItem.card.number || '');
        setExpMonth(foundItem.card.expMonth || '');
        setExpYear(foundItem.card.expYear || '');
        setCvv(foundItem.card.code || '');
      }
      if (foundItem.type === 'identity' && foundItem.identity) {
        setFirstName(foundItem.identity.firstName || '');
        setLastName(foundItem.identity.lastName || '');
        setEmail(foundItem.identity.email || '');
        setPhone(foundItem.identity.phone || '');
      }
      if (foundItem.type === 'apikey' && foundItem.apiKey) {
        setApiKeyValue(foundItem.apiKey.key);
        setApiSecret(foundItem.apiKey.secret || '');
        setApiEndpoint(foundItem.apiKey.endpoint || '');
        setApiEnvironment(foundItem.apiKey.environment || '');
      }
      if (foundItem.type === 'wifi' && foundItem.wifi) {
        setWifiSsid(foundItem.wifi.ssid);
        setWifiPassword(foundItem.wifi.password || '');
        setWifiSecurityType(foundItem.wifi.securityType || '');
      }
    }
  }, [id, items]);

  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Item not found</p>
      </div>
    );
  }

  const Icon = itemTypeIcons[item.type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptionKey) {
      alert('No encryption key found');
      return;
    }

    setIsLoading(true);

    try {
      const now = new Date().toISOString();
      let updatedItem: VaultItem;

      const baseUpdate = {
        ...item,
        name,
        notes,
        folderId: folderId || undefined,
        favorite,
        updatedAt: now,
      };

      switch (item.type) {
        case 'login':
          updatedItem = {
            ...baseUpdate,
            type: 'login',
            login: {
              username,
              password,
              uris: uri ? [{ uri: uri.startsWith('http') ? uri : `https://${uri}` }] : [],
            },
          };
          break;
        case 'card':
          updatedItem = {
            ...baseUpdate,
            type: 'card',
            card: { cardholderName, number: cardNumber, expMonth, expYear, code: cvv },
          };
          break;
        case 'identity':
          updatedItem = {
            ...baseUpdate,
            type: 'identity',
            identity: { firstName, lastName, email, phone },
          };
          break;
        case 'securenote':
          updatedItem = {
            ...baseUpdate,
            type: 'securenote',
            secureNote: { type: 0 },
          };
          break;
        case 'apikey':
          updatedItem = {
            ...baseUpdate,
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
          updatedItem = {
            ...baseUpdate,
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
      const encryptedData = await encryptVaultItem(updatedItem, encryptionKey);

      // Save to database via Tauri
      await saveItem(
        item.id,
        JSON.stringify(encryptedData),
        item.type,
        folderId || undefined,
        favorite
      );

      // Update local state
      updateItem(updatedItem);

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
            <h2 className="text-xl font-semibold">Edit {item.name}</h2>
            <p className="text-sm text-muted-foreground">Update this vault item</p>
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
          />
        </div>

        {item.type === 'login' && (
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
              <div className="relative">
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
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website URL</label>
              <input
                type="text"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </>
        )}

        {/* Similar fields for other item types - abbreviated for brevity */}

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
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}





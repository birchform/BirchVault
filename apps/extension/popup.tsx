import { useState, useEffect } from 'react';
import { Shield, Key, Plus, Search, Settings, Lock, Copy, Eye, EyeOff } from 'lucide-react';
import './style.css';

interface VaultItem {
  id: string;
  name: string;
  username?: string;
  password?: string;
  uri?: string;
}

function Popup() {
  const [isLocked, setIsLocked] = useState(true);
  const [masterPassword, setMasterPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Mock data for demonstration
  const mockItems: VaultItem[] = [
    { id: '1', name: 'GitHub', username: 'user@example.com', password: 'secret123', uri: 'https://github.com' },
    { id: '2', name: 'Gmail', username: 'user@gmail.com', password: 'password456', uri: 'https://gmail.com' },
    { id: '3', name: 'Twitter', username: '@username', password: 'twitter789', uri: 'https://twitter.com' },
  ];

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual unlock with encryption
    setIsLocked(false);
    setItems(mockItems);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    // TODO: Show toast
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLocked) {
    return (
      <div className="w-[360px] min-h-[400px] bg-background text-foreground p-4">
        <div className="flex flex-col items-center justify-center h-full py-8">
          <Shield className="w-12 h-12 text-primary mb-4" />
          <h1 className="text-xl font-bold mb-2">BirchVault</h1>
          <p className="text-muted-foreground text-sm mb-6 text-center">
            Enter your master password to unlock
          </p>

          <form onSubmit={handleUnlock} className="w-full space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Master password"
                className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (selectedItem) {
    return (
      <div className="w-[360px] min-h-[400px] bg-background text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <button
            onClick={() => setSelectedItem(null)}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            ←
          </button>
          <div className="flex-1">
            <h2 className="font-semibold">{selectedItem.name}</h2>
          </div>
        </div>

        {/* Details */}
        <div className="p-4 space-y-4">
          {selectedItem.username && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Username</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm">{selectedItem.username}</p>
                <button
                  onClick={() => handleCopy(selectedItem.username!)}
                  className="p-2 hover:bg-muted rounded transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {selectedItem.password && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Password</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm font-mono">
                  {showPassword ? selectedItem.password : '••••••••••'}
                </p>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 hover:bg-muted rounded transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleCopy(selectedItem.password!)}
                  className="p-2 hover:bg-muted rounded transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {selectedItem.uri && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Website</p>
              <a
                href={selectedItem.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {selectedItem.uri}
              </a>
            </div>
          )}

          <div className="pt-4 flex gap-2">
            <button
              onClick={() => {
                if (selectedItem.username) handleCopy(selectedItem.username);
              }}
              className="flex-1 bg-muted py-2 rounded-lg text-sm hover:bg-muted/80 transition-colors"
            >
              Copy Username
            </button>
            <button
              onClick={() => {
                if (selectedItem.password) handleCopy(selectedItem.password);
              }}
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
            >
              Copy Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[360px] min-h-[400px] bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold">BirchVault</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vault..."
            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No items found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Key className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  {item.username && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.username}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => setIsLocked(true)}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Lock Vault
        </button>
      </div>
    </div>
  );
}

export default Popup;








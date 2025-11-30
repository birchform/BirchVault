'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Plus,
  Settings,
  Trash2,
  Mail,
  Crown,
  Shield,
  User,
  Copy,
  Check,
  Folder,
  Key,
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  memberCount: number;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
}

interface Member {
  id: string;
  email: string;
  name?: string;
  role: 'owner' | 'admin' | 'member';
  status: 'invited' | 'accepted';
}

interface Collection {
  id: string;
  name: string;
  itemCount: number;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([
    {
      id: '1',
      name: 'My Team',
      memberCount: 5,
      role: 'owner',
      createdAt: '2024-01-01',
    },
    {
      id: '2',
      name: 'Work',
      memberCount: 12,
      role: 'member',
      createdAt: '2024-01-15',
    },
  ]);

  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

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
          <div className="flex-1">
            <h1 className="font-semibold">Organizations</h1>
            <p className="text-sm text-muted-foreground">
              Manage teams and shared vaults
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Organization
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {selectedOrg ? (
          <OrganizationDetail
            org={selectedOrg}
            onBack={() => setSelectedOrg(null)}
            onInvite={() => setShowInviteModal(true)}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map((org) => (
              <OrganizationCard
                key={org.id}
                org={org}
                onClick={() => setSelectedOrg(org)}
              />
            ))}

            {organizations.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No organizations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create an organization to share passwords with your team
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Create Organization
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <CreateOrganizationModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* Invite Member Modal */}
      {showInviteModal && selectedOrg && (
        <InviteMemberModal
          orgId={selectedOrg.id}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

function OrganizationCard({
  org,
  onClick,
}: {
  org: Organization;
  onClick: () => void;
}) {
  const roleIcons = {
    owner: <Crown className="w-4 h-4 text-yellow-500" />,
    admin: <Shield className="w-4 h-4 text-blue-500" />,
    member: <User className="w-4 h-4 text-muted-foreground" />,
  };

  return (
    <button
      onClick={onClick}
      className="p-6 border border-border rounded-xl bg-card hover:border-primary/50 transition-colors text-left"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div className="flex items-center gap-1">
          {roleIcons[org.role]}
          <span className="text-xs text-muted-foreground capitalize">{org.role}</span>
        </div>
      </div>
      <h3 className="font-semibold mb-1">{org.name}</h3>
      <p className="text-sm text-muted-foreground">
        {org.memberCount} member{org.memberCount !== 1 ? 's' : ''}
      </p>
    </button>
  );
}

function OrganizationDetail({
  org,
  onBack,
  onInvite,
}: {
  org: Organization;
  onBack: () => void;
  onInvite: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'members' | 'collections'>('members');

  const [members] = useState<Member[]>([
    { id: '1', email: 'owner@example.com', name: 'John Doe', role: 'owner', status: 'accepted' },
    { id: '2', email: 'admin@example.com', name: 'Jane Smith', role: 'admin', status: 'accepted' },
    { id: '3', email: 'member@example.com', role: 'member', status: 'accepted' },
    { id: '4', email: 'pending@example.com', role: 'member', status: 'invited' },
  ]);

  const [collections] = useState<Collection[]>([
    { id: '1', name: 'Shared Logins', itemCount: 15 },
    { id: '2', name: 'API Keys', itemCount: 8 },
    { id: '3', name: 'Server Credentials', itemCount: 12 },
  ]);

  const canManage = org.role === 'owner' || org.role === 'admin';

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to organizations
      </button>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{org.name}</h2>
            <p className="text-muted-foreground">
              {members.length} members • Created {new Date(org.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button
              onClick={onInvite}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Invite
            </button>
            <button className="p-2 border border-border rounded-lg hover:bg-accent transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'members'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Members
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'collections'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Collections
        </button>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">
                    {member.name || member.email}
                    {member.status === 'invited' && (
                      <span className="ml-2 text-xs bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded">
                        Pending
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground capitalize">
                  {member.role}
                </span>
                {canManage && member.role !== 'owner' && (
                  <button className="p-2 hover:bg-accent rounded-lg transition-colors text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collections Tab */}
      {activeTab === 'collections' && (
        <div>
          {canManage && (
            <button className="flex items-center gap-2 text-primary hover:underline mb-4">
              <Plus className="w-4 h-4" />
              Create Collection
            </button>
          )}
          <div className="space-y-2">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Folder className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{collection.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {collection.itemCount} items
                    </p>
                  </div>
                </div>
                <Key className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateOrganizationModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Create organization via API
    await new Promise((r) => setTimeout(r, 1000));
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create Organization</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="My Team"
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteMemberModal({
  orgId,
  onClose,
}: {
  orgId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Create invite via API
    await new Promise((r) => setTimeout(r, 1000));
    setInviteLink(`https://birchvault.com/invite/${Math.random().toString(36).substring(7)}`);
    setIsLoading(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Invite Member</h2>

        {inviteLink ? (
          <div>
            <p className="text-muted-foreground mb-4">
              Share this link with your team member:
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 px-4 py-2 rounded-lg border border-input bg-muted text-sm"
              />
              <button
                onClick={handleCopy}
                className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="colleague@example.com"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="member">Member - Can view shared items</option>
                <option value="admin">Admin - Can manage members & collections</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}








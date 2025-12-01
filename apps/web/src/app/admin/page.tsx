'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Crown, 
  Clock, 
  X,
  Check,
  Loader2,
  Users
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  plan_id: string;
  status: string;
  plan_override: string | null;
  plan_override_expires_at: string | null;
  plan_override_reason: string | null;
  plan_override_set_by: string | null;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PLANS = [
  { id: 'free', name: 'Free', color: 'bg-gray-500' },
  { id: 'premium', name: 'Premium', color: 'bg-blue-500' },
  { id: 'families', name: 'Families', color: 'bg-purple-500' },
  { id: 'teams', name: 'Teams', color: 'bg-orange-500' },
  { id: 'enterprise', name: 'Enterprise', color: 'bg-emerald-500' },
];

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Override modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [overridePlan, setOverridePlan] = useState('premium');
  const [overrideType, setOverrideType] = useState<'permanent' | 'temporary'>('temporary');
  const [overrideDuration, setOverrideDuration] = useState(7);
  const [overrideReason, setOverrideReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data: UsersResponse = await response.json();
        setUsers(data.users);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSetOverride = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const body: Record<string, unknown> = {
        plan_override: overridePlan,
        reason: overrideReason || undefined,
      };

      if (overrideType === 'temporary') {
        body.duration_days = overrideDuration;
      }

      const response = await fetch(`/api/admin/users/${selectedUser.id}/plan`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setSelectedUser(null);
        fetchUsers();
      } else {
        const data = await response.json();
        alert(`Failed to set override: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to set override:', err);
      alert('Failed to set override');
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = async (userId: string) => {
    if (!confirm('Are you sure you want to clear this plan override?')) return;

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const response = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(`Failed to clear override: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to clear override:', err);
      alert('Failed to clear override');
    }
  };

  const getEffectivePlan = (user: User) => {
    if (user.plan_override) {
      if (user.plan_override_expires_at) {
        const expiresAt = new Date(user.plan_override_expires_at);
        if (expiresAt > new Date()) {
          return user.plan_override;
        }
      } else {
        return user.plan_override;
      }
    }
    return user.plan_id;
  };

  const getPlanBadge = (planId: string) => {
    const plan = PLANS.find(p => p.id === planId) || PLANS[0];
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${plan.color}`}>
        {plan.name}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Current Plan</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Override</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Member Since</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="font-medium">{user.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getPlanBadge(getEffectivePlan(user))}
                    </td>
                    <td className="px-4 py-3">
                      {user.plan_override ? (
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-500" />
                          <span className="text-sm">
                            {user.plan_override}
                            {user.plan_override_expires_at && (
                              <span className="text-muted-foreground ml-1">
                                (expires {new Date(user.plan_override_expires_at).toLocaleDateString()})
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setOverridePlan(user.plan_override || 'premium');
                            setOverrideType(user.plan_override_expires_at ? 'temporary' : 'permanent');
                            setOverrideReason(user.plan_override_reason || '');
                          }}
                          className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Set Override
                        </button>
                        {user.plan_override && (
                          <button
                            onClick={() => handleClearOverride(user.id)}
                            className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Override Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Set Plan Override</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Override plan for <strong>{selectedUser.email}</strong>
            </p>

            <div className="space-y-4">
              {/* Plan Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Plan</label>
                <select
                  value={overridePlan}
                  onChange={(e) => setOverridePlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {PLANS.filter(p => p.id !== 'free').map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Override Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Duration</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOverrideType('temporary')}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      overrideType === 'temporary'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input hover:bg-muted'
                    }`}
                  >
                    <Clock className="w-4 h-4 inline mr-2" />
                    Temporary
                  </button>
                  <button
                    onClick={() => setOverrideType('permanent')}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      overrideType === 'permanent'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input hover:bg-muted'
                    }`}
                  >
                    <Crown className="w-4 h-4 inline mr-2" />
                    Permanent
                  </button>
                </div>
              </div>

              {/* Duration (if temporary) */}
              {overrideType === 'temporary' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Days</label>
                  <div className="flex gap-2">
                    {[7, 14, 30, 90].map((days) => (
                      <button
                        key={days}
                        onClick={() => setOverrideDuration(days)}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          overrideDuration === days
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-input hover:bg-muted'
                        }`}
                      >
                        {days}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium mb-2">Reason (optional)</label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Trial for collaboration event"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-input hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetOverride}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 inline mr-2" />
                      Apply Override
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

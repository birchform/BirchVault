'use client';

// ============================================
// Admin Dashboard - User Management
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Calendar,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

interface UserOverride {
  plan: string | null;
  expiresAt: string | null;
  reason: string | null;
  setBy: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  basePlan: string;
  effectivePlan: string;
  hasActiveOverride: boolean;
  override: UserOverride | null;
  subscriptionStatus: string;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PLANS = [
  { id: 'free', name: 'Free', color: 'bg-gray-500' },
  { id: 'premium', name: 'Premium', color: 'bg-blue-500' },
  { id: 'families', name: 'Families', color: 'bg-green-500' },
  { id: 'teams', name: 'Teams', color: 'bg-purple-500' },
  { id: 'enterprise', name: 'Enterprise', color: 'bg-amber-500' },
];

const DURATIONS = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Override form state
  const [overridePlan, setOverridePlan] = useState('premium');
  const [overrideType, setOverrideType] = useState<'permanent' | 'temporary'>('temporary');
  const [overrideDuration, setOverrideDuration] = useState<number | null>(30);
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) params.set('search', search);

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data: UsersResponse = await response.json();
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

  function openOverrideModal(user: AdminUser) {
    setSelectedUser(user);
    setOverridePlan(user.override?.plan || 'premium');
    setOverrideType(user.override?.expiresAt ? 'temporary' : 'permanent');
    setOverrideReason(user.override?.reason || '');
    setOverrideDate('');
    setOverrideDuration(30);
    setSubmitResult(null);
    setShowOverrideModal(true);
  }

  async function handleSetOverride() {
    if (!selectedUser) return;
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const body: Record<string, unknown> = {
        plan: overridePlan,
        type: overrideType,
        reason: overrideReason || undefined,
      };

      if (overrideType === 'temporary') {
        if (overrideDate) {
          body.expiresAt = overrideDate;
        } else if (overrideDuration) {
          body.durationDays = overrideDuration;
        }
      }

      const response = await fetch(`/api/admin/users/${selectedUser.id}/plan`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitResult({ success: true, message: result.message });
        fetchUsers();
        setTimeout(() => setShowOverrideModal(false), 1500);
      } else {
        setSubmitResult({ success: false, message: result.error || 'Failed to set override' });
      }
    } catch {
      setSubmitResult({ success: false, message: 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClearOverride() {
    if (!selectedUser) return;
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/users/${selectedUser.id}/plan`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitResult({ success: true, message: result.message });
        fetchUsers();
        setTimeout(() => setShowOverrideModal(false), 1500);
      } else {
        setSubmitResult({ success: false, message: result.error || 'Failed to clear override' });
      }
    } catch {
      setSubmitResult({ success: false, message: 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  }

  function getPlanBadge(planId: string, isOverride: boolean = false) {
    const plan = PLANS.find(p => p.id === planId) || PLANS[0];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${plan.color} ${isOverride ? 'ring-2 ring-offset-2 ring-primary' : ''}`}>
        {plan.name}
        {isOverride && <span className="text-[10px]">(override)</span>}
      </span>
    );
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">
            View and manage user subscription plans
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{total} total users</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Users Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Plan</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Override</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Member Since</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{user.email}</div>
                      {user.displayName && (
                        <div className="text-sm text-muted-foreground">{user.displayName}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getPlanBadge(user.effectivePlan, user.hasActiveOverride)}
                    {user.hasActiveOverride && user.basePlan !== user.effectivePlan && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Base: {PLANS.find(p => p.id === user.basePlan)?.name || user.basePlan}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.hasActiveOverride && user.override ? (
                      <div className="text-sm">
                        {user.override.expiresAt ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Expires {formatDate(user.override.expiresAt)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Permanent</span>
                        )}
                        {user.override.reason && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {user.override.reason}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openOverrideModal(user)}
                      className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                      {user.hasActiveOverride ? 'Edit Override' : 'Set Override'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-input hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-input hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold">Set Plan Override</h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* User Info */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-medium">{selectedUser.email}</div>
                <div className="text-sm text-muted-foreground">
                  Current plan: {PLANS.find(p => p.id === selectedUser.effectivePlan)?.name}
                  {selectedUser.hasActiveOverride && ' (override active)'}
                </div>
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">New Plan</label>
                <select
                  value={overridePlan}
                  onChange={(e) => setOverridePlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {PLANS.map((plan) => (
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
                        : 'border-input hover:bg-accent'
                    }`}
                  >
                    <Clock className="w-4 h-4 inline mr-1" />
                    Temporary
                  </button>
                  <button
                    onClick={() => setOverrideType('permanent')}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      overrideType === 'permanent'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input hover:bg-accent'
                    }`}
                  >
                    Permanent
                  </button>
                </div>
              </div>

              {/* Temporary Options */}
              {overrideType === 'temporary' && (
                <div className="space-y-3">
                  {/* Quick Duration */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Quick Select</label>
                    <div className="flex flex-wrap gap-2">
                      {DURATIONS.map((d) => (
                        <button
                          key={d.days}
                          onClick={() => { setOverrideDuration(d.days); setOverrideDate(''); }}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            overrideDuration === d.days && !overrideDate
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-input hover:bg-accent'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Date */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Or specific date
                    </label>
                    <input
                      type="date"
                      value={overrideDate}
                      onChange={(e) => { setOverrideDate(e.target.value); setOverrideDuration(null); }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
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
                  placeholder="e.g., Collaboration event trial"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Result Message */}
              {submitResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  submitResult.success ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
                }`}>
                  {submitResult.success ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="text-sm">{submitResult.message}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <div>
                {selectedUser.hasActiveOverride && (
                  <button
                    onClick={handleClearOverride}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Clear Override
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetOverride}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Set Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


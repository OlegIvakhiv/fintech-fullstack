'use client';

// ────────────── AccountsPage ──────────────────────────────────────────────────
// Admins see all accounts with owner info.
// Investors see only their accounts + a sticky right-hand panel with live
// NBU exchange rates and a total-balance-in-UAH conversion summary.

import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  ArrowUpRight, CreditCard, Plus, PlusCircle, Wallet,
  Inbox, User, TrendingUp, RefreshCw, Clock, AlertCircle,
  Edit2, Trash2,
  ArrowRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import DepositModal from '../transaction-components/DepositModal';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/ui/app-sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollBar } from '@/components/ui/scroll-area';
import CrossCurrencyTransferModal from '../transaction-components/CrossCurrencyTransferModal';
// ─── Types ────────────────────────────────────────────────────────────────────

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: 'USD' | 'EUR' | 'UAH';
  portfolioId?: number;
  portfolio?: {
    userId: number;
    user?: { id: number; name: string; email: string };
  };
}

interface CreateAccountForm {
  name: string;
  type: string;
  currency: 'USD' | 'EUR' | 'UAH';
}

interface RateSnapshot {
  USD: number;   // UAH per 1 USD
  EUR: number;   // UAH per 1 EUR
  UAH: number;   // always 1
  fetchedAt: string;
  exchangeDate: string;
  feePercent: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;

const CURRENCY_META: Record<'USD' | 'EUR' | 'UAH', { symbol: string; flag: string }> = {
  USD: { symbol: '$', flag: '🇺🇸' },
  EUR: { symbol: '€', flag: '🇪🇺' },
  UAH: { symbol: '₴', flag: '🇺🇦' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function toUAH(amount: number, currency: 'USD' | 'EUR' | 'UAH', rates: RateSnapshot): number {
  return amount * rates[currency];
}

function formatRelativeTime(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─── ExchangeSidebarPanel ─────────────────────────────────────────────────────
// Self-contained — fetches its own rates so it can be extracted later.

function ExchangeSidebarPanel({
  token,
  accounts,
}: {
  token: string;
  accounts: Account[] | undefined;
}) {
  // Relative-time ticker — refreshes the "X ago" label every 15 s
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const {
    data: rates,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery<RateSnapshot>({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/exchange/rates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch exchange rates');
      return res.json();
    },
    staleTime: CACHE_TTL_MS,
    refetchInterval: CACHE_TTL_MS,
    retry: 2,
  });

  // Total portfolio value in UAH, grouped by currency
  const balanceSummary = (() => {
    if (!accounts || !rates) return null;
    let totalUAH = 0;
    const byCurrency: Partial<Record<'USD' | 'EUR' | 'UAH', number>> = {};

    for (const acc of accounts) {
      const bal = parseFloat(acc.balance.toString());
      byCurrency[acc.currency] = (byCurrency[acc.currency] ?? 0) + bal;
      totalUAH += toUAH(bal, acc.currency, rates);
    }
    return { totalUAH, byCurrency };
  })();

  // ─── Rate row ──────────────────────────────────────────────────────────────
  function RateRow({
    from,
    to,
  }: {
    from: 'USD' | 'EUR';
    to: 'UAH';
  }) {
    if (!rates) return null;
    const rate = rates[from]; // UAH per 1 unit of `from`
    const { symbol: fromSym, flag: fromFlag } = CURRENCY_META[from];
    const { symbol: toSym } = CURRENCY_META[to];

    return (
      <div className="flex items-center justify-between py-2.5 group">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{fromFlag}</span>
          <div>
            <p className="text-xs font-semibold text-foreground">{from}</p>
            <p className="text-[10px] text-muted-foreground/60">
              {from === 'USD' ? 'US Dollar' : 'Euro'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground/60 mb-0.5">
            {fromSym}1 =
          </p>
          <p className="text-sm font-bold text-foreground tabular-nums">
            {fmt(rate, 2)}{' '}
            <span className="text-primary font-bold">{toSym}</span>
          </p>
        </div>
      </div>
    );
  }

  // ─── Skeleton row ──────────────────────────────────────────────────────────
  function SkeletonRow() {
    return (
      <div className="flex items-center justify-between py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-white/5 animate-pulse" />
          <div className="space-y-1">
            <div className="h-3 w-8 rounded bg-white/5 animate-pulse" />
            <div className="h-2.5 w-14 rounded bg-white/5 animate-pulse" />
          </div>
        </div>
        <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Portfolio in UAH card (investor only) ─────────────────────────── */}
      {balanceSummary && (
        <Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
          <CardContent className="p-0">

            <div className="px-4 pt-4 pb-3 border-b border-border/40">
              <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest mb-0.5">
                Total portfolio
              </p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {fmt(balanceSummary.totalUAH)}{' '}
                <span className="text-primary text-base">₴</span>
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                All accounts converted to UAH
              </p>
            </div>

            {/* Per-currency breakdown */}
            <div className="px-4 py-3 space-y-1.5">
              {(Object.entries(balanceSummary.byCurrency) as ['USD' | 'EUR' | 'UAH', number][]).map(
                ([cur, total]) => {
                  const inUAH = toUAH(total, cur, rates!);
                  const pct = balanceSummary.totalUAH > 0
                    ? (inUAH / balanceSummary.totalUAH) * 100
                    : 0;
                  const { symbol, flag } = CURRENCY_META[cur];

                  return (
                    <div key={cur}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span>{flag}</span>
                          <span className="font-medium">{symbol}{fmt(total)}</span>
                          <span className="text-muted-foreground/50">{cur}</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {fmt(pct, 1)}%
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="px-4 pb-3">
              <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
                Converted at today's NBU rate · 0.5% fee not included
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 5-min refresh note ────────────────────────────────────────────── */}
      <p className="text-[10px] text-muted-foreground/30 text-center px-2">
        Rates refresh every 5 min from the National Bank of Ukraine
      </p>
    </div>
  );
}

// ─── AccountsPage ─────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string; balance: number } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateAccountForm>({
    name: '',
    type: 'CHECKING',
    currency: 'USD',
  });
  const queryClient = useQueryClient();

  // States for edit/delete
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<CreateAccountForm>({
    name: '',
    type: 'CHECKING',
    currency: 'USD',
  });

  const [adminCreateForm, setAdminCreateForm] = useState({
    userId: '',
    portfolioId: '',
    name: '',
    type: 'CHECKING',
    currency: 'USD' as 'USD' | 'EUR' | 'UAH',
    initialBalance: '',
});

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const { data: accounts, isLoading: isAccountsLoading } = useQuery<Account[]>({
    queryKey: ['accounts', user?.role],
    queryFn: async () => {
      const endpoint = user?.role === 'ADMIN'
        ? 'http://localhost:3001/accounts'
        : 'http://localhost:3001/accounts/me';
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch accounts');
      return res.json();
    },
    enabled: !!token && !!user,
  });

  const { data: portfolio } = useQuery({
    queryKey: ['portfolio-me'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/portfolios/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      return res.json();
    },
    enabled: !!token && user?.role === 'INVESTOR',
  });

  const { data: allUsers } = useQuery<{ id: number; name: string; email: string; portfolios: { id: number }[] }[]>({
  queryKey: ['all-users'],
  queryFn: async () => {
    const res = await fetch('http://localhost:3001/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },
  enabled: !!token && user?.role === 'ADMIN',
});


  const createMutation = useMutation({
    mutationFn: async (data: CreateAccountForm) => {
      const res = await fetch('http://localhost:3001/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          currency: data.currency,
          portfolioId: portfolio?.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to create account');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setIsCreateModalOpen(false);
      setFormData({ name: '', type: 'CHECKING', currency: 'USD' });
    },
  });

  // Update account mutation
  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateAccountForm }) => {
      const res = await fetch(`http://localhost:3001/accounts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update account');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setIsEditModalOpen(false);
      setEditingAccount(null);
    },
  });

  // Delete account mutation
const deleteAccountMutation = useMutation({
  mutationFn: async (id: number) => {
    const res = await fetch(`http://localhost:3001/accounts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'Failed to delete account');
    }
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
  },
});

  const adminCreateMutation = useMutation({
  mutationFn: async (data: typeof adminCreateForm) => {
    const res = await fetch('http://localhost:3001/accounts/for-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: data.name,
        type: data.type,
        currency: data.currency,
        portfolioId: parseInt(data.portfolioId),
        initialBalance: data.initialBalance ? parseFloat(data.initialBalance) : 0,
      }),
    });
    if (!res.ok) throw new Error('Failed to create account');
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    setIsCreateModalOpen(false);
    setAdminCreateForm({ userId: '', portfolioId: '', name: '', type: 'CHECKING', currency: 'USD', initialBalance: '' });
  },
});


  // ── Shared header / loading skeletons ──────────────────────────────────────

  const pageHeader = (title?: string) => (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
      <SidebarTrigger className="-ml-1 text-muted" />
      <div className="h-4 w-[1px] bg-border mx-2" />
      <h1 className="text-sm font-medium text-accent tracking-tight">
        {title ?? (user?.role === 'ADMIN' ? 'All Accounts' : 'My Accounts')}
      </h1>
    </header>
  );

  if (isAuthLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col text-muted-foreground">
          {pageHeader()}
          <main className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (isAccountsLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col text-muted-foreground">
          {pageHeader()}
          <main className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading accounts...</p>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditClick = (account: Account) => {
    setEditingAccount(account);
    setEditFormData({
      name: account.name,
      type: account.type,
      currency: account.currency,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    updateAccountMutation.mutate({ id: editingAccount.id, data: editFormData });
  };

const handleDeleteAccount = (id: number, name: string, balance: number) => {
  setDeleteConfirm({ id, name, balance });
};

const confirmDelete = async () => {
  if (!deleteConfirm) return;
  try {
    await deleteAccountMutation.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  } catch (err: any) {
    setDeleteConfirm(null);
    alert(err.message || 'Failed to delete account');
  }
};

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col h-screen overflow-hidden">

        {/* Sticky header – fixed, does NOT scroll */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">
            {user?.role === 'ADMIN' ? 'All Accounts' : 'My Accounts'}
          </h1>
        </header>

        {/* Scrollable content – same pattern as WithdrawRequestModal */}
        <ScrollArea className="flex-1 overflow-y-auto">
          {/* Two‑column layout: accounts grid + exchange panel */}
          <div className="flex flex-col xl:flex-row min-h-full">

            {/* Left column – accounts grid */}
            <main className="flex-1 min-w-0 p-6 flex flex-col gap-8">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted text-[10px] font-bold uppercase tracking-widest opacity-60">
                    Overview
                  </p>
                  <h2 className="text-2xl font-bold tracking-tighter text-foreground">
                    {user?.role === 'ADMIN' ? 'Financial Assets (All Users)' : 'Financial Assets'}
                  </h2>
                </div>
<div className="flex gap-2">
  {user?.role === 'INVESTOR' && (
    <>
      <Button
        variant="outline"
        className="border-primary/50 text-primary text-xs h-9 px-4 hover:bg-primary/10"
        onClick={() => setIsTransferModalOpen(true)}
      >
        <ArrowRight className="mr-2 h-4 w-4" /> Transfer
      </Button>
      <Button
        className="bg-primary text-black font-bold text-xs h-9 px-4 hover:bg-primary/90"
        onClick={() => setIsCreateModalOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" /> New Account
      </Button>
    </>
  )}
  {user?.role === 'ADMIN' && (
    <>
      <Button
        variant="outline"
        className="border-primary/50 text-primary text-xs h-9 px-4 hover:bg-primary/10"
        onClick={() => setIsTransferModalOpen(true)}
      >
        <ArrowRight className="mr-2 h-4 w-4" /> Transfer
      </Button>
      <Button
        className="bg-primary text-black font-bold text-xs h-9 px-4 hover:bg-primary/90"
        onClick={() => setIsCreateModalOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" /> Create Account for User
      </Button>
    </>
  )}
</div>
              </div>


              {/* Empty state */}
              {(!accounts || accounts.length === 0) && (
                <Card className="border border-dashed border-border rounded-2xl bg-card">
                  <CardContent className="flex flex-col items-center justify-center py-12 px-8 text-center">
                    <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                      <Inbox className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">No Accounts Yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-8">
                      {user?.role === 'ADMIN'
                        ? 'No accounts in the system yet.'
                        : "It looks like you don't have any accounts. Create your first account to start depositing funds and investing."
                      }
                    </p>
                    {user?.role === 'INVESTOR' && accounts && accounts.length >= 20 && (
  <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
    <p>
      You have <span className="font-bold">{accounts.length} accounts</span>. Consider consolidating to keep things manageable.
    </p>
  </div>
)}
                    {user?.role === 'INVESTOR' && (
                      <Button
                        className="bg-primary text-black font-bold h-10 px-6"
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Create First Account
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Accounts grid */}
              {accounts && accounts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {accounts.map((account) => (
                    <Card
                      key={account.id}
                      className="bg-card border-border rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-all group relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <CardHeader className="relative z-10">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-muted text-[10px] font-bold tracking-widest uppercase opacity-60 mb-1.5">
                              {account.type} Account
                            </CardTitle>
                            <h3 className="text-xl font-bold tracking-tight text-foreground/90">
                              {account.name}
                            </h3>
                            {user?.role === 'ADMIN' && account.portfolio?.user && (
                              <div className="mt-2 pt-2 border-t border-border/30">
                                <p className="text-[10px] text-muted opacity-60 mb-1">Owner</p>
                                <p className="text-xs font-semibold text-accent flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {account.portfolio.user.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {account.portfolio.user.email}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="h-12 w-12 rounded-2xl bg-white/5 border-2 border-border flex items-center justify-center text-primary group-hover:scale-105 group-hover:border-primary/30 transition-all flex-shrink-0">
                            {account.type === 'SAVINGS'
                              ? <Wallet className="h-6 w-6" />
                              : <CreditCard className="h-6 w-6" />
                            }
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="relative z-10">
                        <div className="flex flex-col">
                          <p className="text-[10px] uppercase font-bold text-muted opacity-50 mb-2">
                            Available Balance
                          </p>
                          <div className="flex items-baseline gap-3">
                            <h2 className="text-4xl font-bold text-foreground">
                              {parseFloat(account.balance.toString()).toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}
                            </h2>
                            <span className="text-lg font-bold text-primary uppercase">
                              {account.currency}
                            </span>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="bg-black/20 border-t border-border/50 relative z-10">
                        {user?.role === 'ADMIN' ? (
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-background/50 border-border text-xs h-10 hover:bg-primary hover:text-black transition-colors"
                              onClick={() => setSelectedAccount(account)}
                            >
                              <PlusCircle className="h-4 w-4 mr-2" /> Add Funds
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-3 bg-background/50 border-border hover:bg-primary/20"
                              onClick={() => handleEditClick(account)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-3 bg-background/50 border-border text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteAccount(account.id, account.name, parseFloat(account.balance.toString()))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[10px] text-muted font-medium uppercase tracking-wider">
                            <ArrowUpRight className="text-primary" />
                            Account is active
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </main>

            {/* ── Right: exchange rates panel ── */}
            {/*
            - hidden on < xl, visible on xl+
            - sticky so it doesn't scroll with the accounts list
            - Investors see rates + portfolio-in-UAH summary
            - Admins also get the rates strip (useful context) but no personal summary
          */}
            <aside className="hidden xl:block w-72 shrink-0 border-l border-border/40 bg-background/50">
              <div className="sticky top-16 p-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
                <ExchangeSidebarPanel
                  token={token!}
                  accounts={user?.role === 'INVESTOR' ? accounts : undefined}
                />
              </div>
            </aside>
          </div>

        </ScrollArea>
      </SidebarInset>

      {/* Modals */}
      {selectedAccount && (
        <DepositModal
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
          isOpen={!!selectedAccount}
          onClose={() => setSelectedAccount(null)}
          token={token!}
        />
      )}
      
      {/* Create Account Modal */}
<Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
  <DialogContent className="sm:max-w-md bg-card border-border/50">
    <DialogHeader>
      <DialogTitle>{user?.role === 'ADMIN' ? 'Create Account for User' : 'Create New Account'}</DialogTitle>
      <DialogDescription>
        {user?.role === 'ADMIN' ? 'Select a user and configure their new account.' : 'Add a new account to your portfolio'}
      </DialogDescription>
    </DialogHeader>

    {user?.role === 'INVESTOR' && (
      <form onSubmit={handleCreateAccount} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Account Name</label>
          <Input
            placeholder="e.g., My Savings, Emergency Fund"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-background/50 border-border text-foreground"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Account Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-foreground"
          >
            <option value="CHECKING">Checking</option>
            <option value="SAVINGS">Savings</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'USD' | 'EUR' | 'UAH' })}
            className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-foreground"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="UAH">UAH</option>
          </select>
        </div>
        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="flex-1 bg-background/50 border-border text-foreground">
            Cancel
          </Button>
          <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={createMutation.isPending || !formData.name}>
            {createMutation.isPending ? 'Creating...' : 'Create Account'}
          </Button>
        </div>
      </form>
    )}

    {user?.role === 'ADMIN' && (
      <form
        onSubmit={(e) => { e.preventDefault(); adminCreateMutation.mutate(adminCreateForm); }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">User</label>
          <select
            value={adminCreateForm.userId}
            onChange={(e) => {
              const selected = allUsers?.find(u => u.id === parseInt(e.target.value));
              setAdminCreateForm({
                ...adminCreateForm,
                userId: e.target.value,
                portfolioId: selected?.portfolios?.[0]?.id?.toString() ?? '',
              });
            }}
            className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-foreground"
            required
          >
            <option value="">Select a user...</option>
            {allUsers?.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Account Name</label>
          <Input
            placeholder="e.g., Investment Account"
            value={adminCreateForm.name}
            onChange={(e) => setAdminCreateForm({ ...adminCreateForm, name: e.target.value })}
            className="bg-background/50 border-border text-foreground"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Account Type</label>
          <select
            value={adminCreateForm.type}
            onChange={(e) => setAdminCreateForm({ ...adminCreateForm, type: e.target.value })}
            className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-foreground"
          >
            <option value="CHECKING">Checking</option>
            <option value="SAVINGS">Savings</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Currency</label>
          <select
            value={adminCreateForm.currency}
            onChange={(e) => setAdminCreateForm({ ...adminCreateForm, currency: e.target.value as 'USD' | 'EUR' | 'UAH' })}
            className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-foreground"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="UAH">UAH</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">
            Initial Balance <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={adminCreateForm.initialBalance}
            onChange={(e) => setAdminCreateForm({ ...adminCreateForm, initialBalance: e.target.value })}
            className="bg-background/50 border-border text-foreground"
          />
        </div>
        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="flex-1 bg-background/50 border-border text-foreground">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            disabled={adminCreateMutation.isPending || !adminCreateForm.name || !adminCreateForm.portfolioId}
          >
            {adminCreateMutation.isPending ? 'Creating...' : 'Create Account'}
          </Button>
        </div>
      </form>
    )}
  </DialogContent>
</Dialog>

<Dialog open={isEditModalOpen} onOpenChange={(open) => { if (!open) { setIsEditModalOpen(false); setEditingAccount(null); } }}>
  <DialogContent className="sm:max-w-md bg-card border-border/50">
    <DialogHeader>
      <DialogTitle>Edit Account</DialogTitle>
      <DialogDescription>
        Update details for <span className="text-foreground font-semibold">{editingAccount?.name}</span>
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleUpdateAccount} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Account Name</label>
        <Input
          placeholder="Account name"
          value={editFormData.name}
          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
          className="bg-background/50 border-border text-foreground"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Account Type</label>
        <select
          value={editFormData.type}
          onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
        >
          <option value="CHECKING">Checking</option>
          <option value="SAVINGS">Savings</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Currency</label>
        <select
          value={editFormData.currency}
          onChange={(e) => setEditFormData({ ...editFormData, currency: e.target.value as 'USD' | 'EUR' | 'UAH' })}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="UAH">UAH</option>
        </select>
      </div>

      {/* Warning if currency change with balance */}
      {editingAccount && parseFloat(editingAccount.balance.toString()) > 0 && editFormData.currency !== editingAccount.currency && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 text-xs text-yellow-400">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>Changing currency on an account with balance may cause reporting inconsistencies.</p>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => { setIsEditModalOpen(false); setEditingAccount(null); }}
          className="flex-1 bg-background/50 border-border text-foreground"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          disabled={updateAccountMutation.isPending || !editFormData.name}
        >
          {updateAccountMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>


{/* Delete Confirmation Modal */}
<Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
  <DialogContent className="sm:max-w-md bg-card border-border/50">
    <DialogHeader>
      <div className="flex items-center gap-3 mb-1">
        <div className="h-10 w-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
          <Trash2 className="h-5 w-5 text-destructive" />
        </div>
        <DialogTitle className="text-foreground">Delete Account</DialogTitle>
      </div>
      <DialogDescription className="text-muted-foreground">
        You are about to delete{' '}
        <span className="font-semibold text-foreground">"{deleteConfirm?.name}"</span>.
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>

    <div className="rounded-xl border border-border/50 bg-background/50 divide-y divide-border/50 text-sm my-2">
      {deleteConfirm && deleteConfirm.balance > 0 ? (
        <div className="flex items-start gap-3 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-destructive">Cannot delete — non-zero balance</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              This account has a balance of <span className="text-foreground font-medium">{deleteConfirm.balance.toLocaleString()} {}</span>. 
              Please withdraw or transfer all funds first.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
            <p className="text-muted-foreground">
              If no transaction history exists, the account will be <span className="text-foreground font-medium">permanently deleted</span>.
            </p>
          </div>
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
            <p className="text-muted-foreground">
              If transaction history exists, the account will be <span className="text-foreground font-medium">deactivated</span> and hidden from view — audit trail preserved.
            </p>
          </div>
        </>
      )}
    </div>

    <div className="flex gap-2 pt-2">
      <Button
        variant="outline"
        onClick={() => setDeleteConfirm(null)}
        className="flex-1 bg-background/50 border-border text-foreground"
      >
        Cancel
      </Button>
      <Button
        onClick={confirmDelete}
        disabled={deleteAccountMutation.isPending || (deleteConfirm?.balance ?? 0) > 0}
        className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-semibold"
      >
        {deleteAccountMutation.isPending ? (
          <><span className="inline-block h-3.5 w-3.5 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />Deleting...</>
        ) : (
          <><Trash2 className="h-4 w-4 mr-2" />Delete Account</>
        )}
      </Button>
    </div>
  </DialogContent>
</Dialog>

        {/* Cross-currency transfer modal */}
      <CrossCurrencyTransferModal
        accounts={accounts || []}
        token={token!}
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </SidebarProvider>
  );
}
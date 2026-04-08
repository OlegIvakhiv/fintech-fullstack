'use client';

// ────────────── accountsPage ───────────────────────────────────────────────────────────────

// This is the main accounts page that lists all accounts. Admins see all accounts with owner info, investors see only their accounts. 
// Investors can click "Create New Account" to open the create account modal, and admins can click "Add Funds" to open the deposit modal for that account.

import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowUpRight, CreditCard, Plus, PlusCircle, Wallet, Inbox, User } from 'lucide-react';
import { useState } from 'react';
import DepositModal from '../transaction-components/DepositModal';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/ui/app-sidebar';
 
// ────────────── Types ──────────────────────────────────────────────────────────────────────

// This interface represents the structure of an account as returned by the API. It includes all relevant fields needed for display and processing in the accounts page.
interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: 'USD' | 'EUR' | 'UAH';
  portfolioId?: number;
  portfolio?: {
    userId: number;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  };
}
// This interface represents the structure of the form data used to create a new account. It includes the necessary fields for account creation.
interface CreateAccountForm {
  name: string;
  type: string;
  currency: 'USD' | 'EUR' | 'UAH';
}

// ────────────── accountsPage ───────────────────────────────────────────────────────────────

// This is the main accounts page that lists all accounts. Admins see all accounts with owner info, investors see only their accounts. 
// Investors can click "Create New Account" to open the create account modal, and admins can click "Add Funds" to open the deposit modal for that account.

export default function AccountsPage() {
  // Get auth state
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateAccountForm>({
    name: '',
    type: 'CHECKING',
    currency: 'USD',
  });
  const queryClient = useQueryClient();

  // Fetch accounts - ADMIN sees all, INVESTOR sees only theirs 
  const { data: accounts, isLoading: isAccountsLoading } = useQuery<Account[]>({
    queryKey: ['accounts', user?.role],
    queryFn: async () => {
      const endpoint = user?.role === 'ADMIN'
        ? 'http://localhost:3001/accounts'  // All accounts with owner info
        : 'http://localhost:3001/accounts/me'; // Only investor's accounts
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch accounts');
      return res.json();
    },
    enabled: !!token && !!user,
  });

  // Get investor's portfolio ID (needed for account creation)
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

  // Create account mutation - only for investors, admins cannot create accounts
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
    // On success, invalidate accounts query to refresh the list, close the modal, and reset form data
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        type: 'CHECKING',
        currency: 'USD',
      });
    },
  });


// ────────────── Render Logic ───────────────────────────────────────────────────────────────────────────────

// Show loading while auth state is loading
  if (isAuthLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col text-muted-foreground">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1 text-muted" />
            <div className="h-4 w-[1px] bg-border mx-2" />
            <h1 className="text-sm font-medium text-accent tracking-tight">
              {user?.role === 'ADMIN' ? 'All Accounts' : 'My Accounts'}
            </h1>
          </header>
          <main className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Show loading while accounts load
  if (isAccountsLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col text-muted-foreground">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1 text-muted" />
            <div className="h-4 w-[1px] bg-border mx-2" />
            <h1 className="text-sm font-medium text-accent tracking-tight">
              {user?.role === 'ADMIN' ? 'All Accounts' : 'My Accounts'}
            </h1>
          </header>
          <main className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading accounts...</p>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Create account handler
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };


  // Main page content
  return ( 
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col text-muted-foreground">

        {/* HEADER */} 
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">
            {user?.role === 'ADMIN' ? 'All Accounts' : 'My Accounts'}
          </h1>
        </header>

        <main className="p-6 flex flex-col gap-8 w-full max-w-[1400px] mx-auto">

          {/* TOOLBAR */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-[10px] font-bold uppercase tracking-widest opacity-60">Overview</p>
              <h2 className="text-2xl font-bold tracking-tighter text-foreground">
                {user?.role === 'ADMIN' ? 'Financial Assets (All Users)' : 'Financial Assets'}
              </h2>
            </div>
            {user?.role === 'INVESTOR' && (
              <Button 
                className="bg-primary text-black font-bold text-xs h-9 px-4 hover:bg-primary/90"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Create New Account
              </Button>
            )}
          </div>

          {/* EMPTY STATE */}
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

          {/* ACCOUNTS GRID */}
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
                        
                        {/*  ADMIN: Show account owner info */}
                        {user?.role === 'ADMIN' && account.portfolio?.user && (
                          <div className="mt-2 pt-2 border-t border-border/30">
                            <p className="text-[10px] text-muted opacity-60 mb-1">Owner</p>
                            <p className="text-xs font-semibold text-accent flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {account.portfolio.user.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{account.portfolio.user.email}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="h-12 w-12 rounded-2xl bg-white/5 border-2 border-border flex items-center justify-center text-primary group-hover:scale-105 group-hover:border-primary/30 transition-all flex-shrink-0">
                        {account.type === 'SAVINGS' ? <Wallet className="h-6 w-6" /> : <CreditCard className="h-6 w-6" />}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="relative z-10">
                    <div className="flex flex-col">
                      <p className="text-[10px] uppercase font-bold text-muted opacity-50 mb-2">Available Balance</p>
                      <div className="flex items-baseline gap-3">
                        <h2 className="text-4xl font-bold text-foreground">
                          {parseFloat(account.balance.toString()).toLocaleString('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </h2>
                        <span className="text-lg font-bold text-primary uppercase">{account.currency}</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="bg-black/20 border-t border-border/50 relative z-10">
                    {user?.role === 'ADMIN' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-background/50 border-border text-xs h-10 hover:bg-primary hover:text-black transition-colors"
                        onClick={() => setSelectedAccount(account)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Funds
                      </Button>
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
      </SidebarInset>

      {/* DEPOSIT MODAL */}
      {selectedAccount && (
        <DepositModal
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
          isOpen={!!selectedAccount}
          onClose={() => setSelectedAccount(null)}
          token={token!}
        />
      )}

      {/*  CREATE ACCOUNT MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>Add a new account to your portfolio</DialogDescription>
          </DialogHeader>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 bg-background/50 border-border text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={createMutation.isPending || !formData.name}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
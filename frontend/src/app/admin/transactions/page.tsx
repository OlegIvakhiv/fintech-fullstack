'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import TransactionTable from '@/components/TransactionTable';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RawTransaction {
  id: number;
  amount: number;
  transactionId: string;
  type: string;
  description?: string;
  createdAt: string;
  account?: {
    id: number;
    name: string;                     // account name
    portfolio?: {
      user?: { name: string; email: string };
    };
  };
  businessUnit?: { name: string };
  investment?: { businessUnit?: { name: string } };
}

export default function AdminTransactionsPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const { data: rawTransactions, isLoading } = useQuery<RawTransaction[]>({
    queryKey: ['transactions', 'all'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/transactions/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    enabled: !!token && user?.role === 'ADMIN',
  });

  // Transform to table format with improved clarity
  const transactions = rawTransactions?.map((tx) => {
    const absAmount = Math.abs(tx.amount).toLocaleString();
    const currency = 'USD'; // You may fetch from account or business unit later

    let direction: 'in' | 'out' = 'in';
    let counterparty = '';
    let methodLabel = '';
    let amountDisplay = '';
    let description = tx.description || '';

    switch (tx.type) {
      case 'DEPOSIT':
        direction = 'in';
        counterparty = 'Admin Deposit';
        methodLabel = 'Deposit';
        amountDisplay = `+${absAmount} ${currency}`;
        description = `Deposit to ${tx.account?.name || 'account'}`;
        break;

      case 'INVEST':
        direction = 'out';
        const buName = tx.businessUnit?.name || tx.investment?.businessUnit?.name || 'Business Unit';
        counterparty = `Business Unit: ${buName}`;
        methodLabel = 'Investment';
        amountDisplay = `-${absAmount} ${currency}`;
        description = `Investment from ${tx.account?.name || 'account'}`;
        break;

      case 'DIVEST':
        direction = 'in';
        const fromBU = tx.businessUnit?.name || tx.investment?.businessUnit?.name || 'Business Unit';
        counterparty = `Business Unit: ${fromBU}`;
        methodLabel = 'Withdrawal from BU';
        amountDisplay = `+${absAmount} ${currency}`;
        description = `Returned to ${tx.account?.name || 'account'}`;
        break;

      case 'WITHDRAW':
        direction = 'out';
        counterparty = 'External Wallet';
        methodLabel = 'Cash Out';
        amountDisplay = `-${absAmount} ${currency}`;
        description = `Withdrew from ${tx.account?.name || 'account'}`;
        break;

      case 'TRANSFER':
        direction = tx.amount > 0 ? 'in' : 'out';
        counterparty = tx.amount > 0 ? 'Transfer from another account' : 'Transfer to another account';
        methodLabel = 'Transfer';
        amountDisplay = `${tx.amount > 0 ? '+' : '-'}${absAmount} ${currency}`;
        description = tx.description || (tx.amount > 0 ? 'Received transfer' : 'Sent transfer');
        break;

      default:
        methodLabel = tx.type;
        amountDisplay = `${tx.amount > 0 ? '+' : '-'}${absAmount} ${currency}`;
        counterparty = 'System';
    }

    return {
      id: tx.transactionId.slice(0, 8).toUpperCase(),
      amount: amountDisplay,
      to: counterparty,
      details: description,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${counterparty}`,
      method: methodLabel,
      status: 'Completed',
      direction,
      user: tx.account?.portfolio?.user ? {
        name: tx.account.portfolio.user.name,
        email: tx.account.portfolio.user.email,
      } : undefined,
    };
  }) || [];

  // Access control
  if (isAuthLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6">
            <SidebarTrigger className="-ml-1 text-muted" />
            <h1 className="text-sm font-medium text-accent">All Transactions</h1>
          </header>
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-destructive">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You must be an admin to access this page</p>
          <Button className="mt-4 bg-primary text-black" onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">All Transactions (Admin)</h1>
        </header>
        <main className="p-6 flex-1">
          <div className="max-w-[1400px] mx-auto">
            <h2 className="text-2xl font-bold tracking-tighter text-foreground mb-6">System Transaction Log</h2>
            <TransactionTable transactions={transactions} showUser={true} />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
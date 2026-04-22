'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import TransactionTable from '@/components/TransactionTable';

interface RawTransaction {
  id: number;
  amount: number;
  transactionId: string;
  type: string; // DEPOSIT, INVEST, DIVEST, WITHDRAW, TRANSFER
  description?: string;
  createdAt: string;
  account?: {
    id: number;
    name: string;           // <-- added account name
    portfolio?: {
      user?: {
        name?: string;
      };
    };
  };
  businessUnit?: { name: string };
  investment?: { businessUnit?: { name: string } };
}

export default function InvestorTransactionsPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();

  const { data: rawTransactions, isLoading } = useQuery<RawTransaction[]>({
    queryKey: ['transactions', 'investor'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/transactions/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    enabled: !!token && !!user && user.role === 'INVESTOR',
  });

  const transactions = rawTransactions?.map((tx) => {
    const absAmount = Math.abs(tx.amount).toLocaleString();
    const currency = 'USD'; // Ideally fetch from account or business unit

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
    };
  }) || [];

  if (isAuthLoading || isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6">
            <SidebarTrigger className="-ml-1 text-muted" />
            <h1 className="text-sm font-medium text-accent">My Transactions</h1>
          </header>
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">My Transactions</h1>
        </header>
        <main className="p-6 flex-1">
          <div className="max-w-[1400px] mx-auto">
            <h2 className="text-2xl font-bold tracking-tighter text-foreground mb-6">Transaction History</h2>
            <TransactionTable transactions={transactions} showUser={false} />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
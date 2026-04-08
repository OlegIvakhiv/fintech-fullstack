'use client';

// PortfolioPage - main page for listing all investments, with modals for details and withdrawing
// This page fetches data from the backend API and displays it in an organized and visually appealing manner.

import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  Card, CardContent, CardHeader, CardTitle, CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  SidebarInset, SidebarProvider, SidebarTrigger
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import {
  Briefcase, TrendingUp, Search, Clock,
  Building2, ChevronRight, FileText, Download, Wallet
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { useState } from 'react';
import WithdrawRequestModal from '@/app/transaction-components/WithdrawRequestModal';

// Types

// Types for the investments associated with the portfolio
interface Investment {
  id: number;
  businessUnit: { id: number; name: string; currency: string };
  amount: number;
  currency: string;
  status: string;
}

// Types for the accounts associated with the portfolio, used in the withdrawal modal
interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
}
// Types for the withdrawal requests, used to calculate pending withdrawals and display in the UI
interface WithdrawalRequest {
  id: number;
  amount: number;
  currency: string;
  status: string;
  fromBusinessUnit?: { name: string };
}

// Types for the overall portfolio data structure returned from the API, including accounts, investments, and calculated totals for display in the dashboard
interface PortfolioData {
  id: number;
  name: string;
  accounts: Account[];
  investments: Investment[];
  totalInvested?: number;
  activeInvestments?: number;
}

// Status badge component with different colors and icons based on status
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    CLOSED: "bg-white/5 text-muted-foreground border-border",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-tighter ${styles[status] || styles.PENDING}`}>
      {status}
    </span>
  );
}

// Main PortfolioPage component that fetches portfolio and withdrawal data, displays stats cards, accounts, and a table of investments with actions to view details or request withdrawals.
export default function PortfolioPage() {
  const { token, isLoading: isAuthLoading } = useAuth();
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  // Fetch portfolio data from the API using React Query, including accounts and investments, and calculate totals for display in the stats cards.
  const { data: portfolio, isLoading: isPortfolioLoading } = useQuery<PortfolioData>({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/portfolios/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!token,
  });

  // Fetch withdrawal requests to calculate total pending withdrawals and display in the stats cards.
  const { data: withdrawalRequests, isLoading: isWithdrawalsLoading } = useQuery<WithdrawalRequest[]>({
    queryKey: ['withdrawal-requests'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/withdrawal-requests/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch withdrawal requests');
      return res.json();
    },
    enabled: !!token,
  });

  const pendingWithdrawalsTotal = withdrawalRequests
    ?.filter((wr) => wr.status === 'PENDING')
    .reduce((sum, wr) => sum + Number(wr.amount), 0) || 0;

  // Loading shell component to display while data is being fetched, with a spinner and message.
  const LoadingShell = ({ msg }: { msg: string }) => (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col text-muted-foreground">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">Investment Portfolio</h1>
        </header>
        <main className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{msg}</p>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );

  // Show loading while auth or portfolio data is loading
  if (isAuthLoading) return <LoadingShell msg="Loading..." />;
  if (isPortfolioLoading || isWithdrawalsLoading) return <LoadingShell msg="Loading your portfolio..." />;

  // accounts from portfolio — used by the withdrawal modal
  const accounts: Account[] = portfolio?.accounts ?? [];

  // Main return statement that renders the portfolio page with sidebar, header, stats cards, accounts list, and investments table, along with the withdraw request modal when an investment is selected.
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col text-muted-foreground">

        {/* HEADER */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">Investment Portfolio</h1>
        </header>

        <main className="p-6 flex flex-col gap-8 w-full max-w-[1400px] mx-auto">

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" className="bg-card border-border text-muted text-xs h-9">
                <FileText className="mr-2 h-4 w-4" /> Portfolio Report
              </Button>
              <Button variant="outline" className="bg-card border-border text-muted text-xs h-9">
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Total Invested Assets",
                value: portfolio?.totalInvested?.toLocaleString() || "0",
                currency: "USD",
                color: "text-foreground",
                icon: <TrendingUp className="h-3 w-3 opacity-80" />,
              },
              {
                title: "Active Investments",
                value: (
                  portfolio?.activeInvestments?.toString() ||
                  portfolio?.investments.filter((i) => i.status === 'ACTIVE').length.toString() ||
                  "0"
                ),
                currency: "Units",
                color: "text-primary",
                icon: <Briefcase className="h-3 w-3 opacity-80" />,
              },
              {
                title: "Pending Withdrawals",
                value: pendingWithdrawalsTotal.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                currency: "USD",
                color: "text-accent",
                icon: <Wallet className="h-3 w-3 opacity-80" />,
              },
            ].map((item, index) => (
              <Card key={index} className="bg-card border-border pb-0 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-muted text-[10px] font-bold tracking-widest uppercase opacity-60">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-baseline gap-1">
                    {item.currency === 'USD' && <span className={`text-sm font-medium opacity-50 ${item.color}`}>$</span>}
                    <h2 className={`text-2xl font-bold tracking-tighter ${item.color}`}>{item.value}</h2>
                    {item.currency !== 'USD' && <span className="text-[10px] ml-1 font-bold opacity-40">{item.currency}</span>}
                  </div>
                </CardContent>
                <CardFooter className="bg-black/20 px-4 py-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-[10px] text-muted font-medium uppercase tracking-wider">
                    <Clock className="h-3 w-3 opacity-80" /> Real-time update
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* ACCOUNTS */}
          {accounts.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-widest opacity-60">
                Your Accounts
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex-shrink-0 w-52 bg-card border border-border rounded-xl p-4 flex flex-col gap-2 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted opacity-60">
                        {account.type}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                        {account.currency}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{account.name}</p>
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {Number(account.balance).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INVESTMENTS TABLE */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-4 bg-black/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted opacity-50" />
                <Input placeholder="Search Assets..." className="pl-9 bg-background/50 border-border text-xs w-[240px] h-9" />
              </div>
              <div className="text-[10px] text-muted uppercase font-bold tracking-widest opacity-60">
                Project Breakdown
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border bg-white/[0.02]">
                    <th className="p-4 font-medium">Business Unit</th>
                    <th className="p-4 font-medium">Invested Amount</th>
                    <th className="p-4 font-medium">Currency</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {portfolio?.investments.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-white/[0.01] transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-white/5 border border-border flex items-center justify-center text-primary shadow-sm">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-medium text-foreground/80">{inv.businessUnit.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] text-muted-foreground opacity-50">$</span>
                          <span className="font-bold text-foreground tracking-tight tabular-nums">
                            {Number(inv.amount).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] bg-white/5 border border-border px-2 py-1 rounded-md text-muted-foreground uppercase font-bold tracking-tighter">
                          {inv.currency}
                        </span>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-[11px] font-bold uppercase tracking-tighter hover:bg-primary hover:text-black transition-all group/btn"
                          onClick={() => setSelectedInvestment(inv)}
                          disabled={inv.status !== 'ACTIVE'}
                        >
                          Withdraw <ChevronRight className="ml-1 h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* ── WITHDRAW REQUEST MODAL ── */}
        {selectedInvestment && (
          <WithdrawRequestModal
            investment={selectedInvestment}
            accounts={accounts}
            isOpen={!!selectedInvestment}
            onClose={() => setSelectedInvestment(null)}
            token={token!}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
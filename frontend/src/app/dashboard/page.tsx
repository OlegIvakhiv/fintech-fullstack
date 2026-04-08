'use client';

// DashboardPage - main page for listing all transactions
// This page serves as the main dashboard for users to view their financial statistics and transaction history. 
// It includes summary cards for key metrics, a chart for revenue trends, and a table listing recent transactions. 
// The page fetches data from the backend API and displays it in an organized and visually appealing manner.

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEffect, useState } from 'react';
import { type ChartConfig } from "@/components/ui/chart"
import { SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Download, FileText, Search, Upload } from "lucide-react";
import { Checkbox } from "@/components/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation';
import { useAuth } from "../contexts/AuthContext";

// Types
// Types for the dashboard statistics returned from the API
interface DashboardStats {
  totalRevenue: number;
  totalSaving: number;
  taxesPaid: number;
  availableBalance: number;
  pendingWithdrawals: number;
}

// Types for the raw transaction data returned from the API before transformation for display
interface RawTransaction {
  id: number;
  amount: number;
  accountId: number;
  transactionId: string;
  businessUnitId?: number | null;
  investmentId?: number | null;
  type: 'DEPOSIT' | 'WITHDRAW' | 'INVEST' | 'TRANSFER' | 'DIVEST';
  description?: string | null;
  createdAt: string;
  account?: { id: number; name?: string; portfolio?: { user?: { name?: string } } };
  businessUnit?: { name: string };
  investment?: { businessUnit?: { name: string } };
}


// Main page component for the dashboard. Displays key financial metrics, a revenue trend chart, and a table of recent transactions.
export default function DashboardPage({ children }: { children: React.ReactNode }) {
  const [debit, setDebit] = useState(0);
  const [credit, setCredit] = useState(0);
  const [isBalanced, setIsBalanced] = useState(false);

  useEffect(() => {
    setIsBalanced(debit !== 0 && debit === credit);
  }, [debit, credit]);

  // Get auth state with loading
  const { token, user, isLoading: isAuthLoading } = useAuth();

  // Fetch investor stats from API
  const { data: stats, isLoading: isStatsLoading } = useQuery<DashboardStats>({
    queryKey: ['investor-stats'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/dashboard/investor-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!token && !!user,
  });

  // Fetch transactions
  const { data: serverTransactions, isLoading: isTransactionsLoading } = useQuery<RawTransaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const endpoint = user?.role === 'ADMIN'
        ? 'http://localhost:3001/transactions/all'
        : `http://localhost:3001/transactions/history/${user?.id}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    enabled: !!token && !!user,
  });

  // Show loading while auth loads
  if (isAuthLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col text-muted-foreground">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1 text-muted" />
            <div className="h-4 w-[1px] bg-border mx-2" />
            <h1 className="text-sm font-medium text-accent tracking-tight">Dashboard</h1>
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

  // Show loading while data loads
  if (isStatsLoading || isTransactionsLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col text-muted-foreground">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1 text-muted" />
            <div className="h-4 w-[1px] bg-border mx-2" />
            <h1 className="text-sm font-medium text-accent tracking-tight">Dashboard</h1>
          </header>
          <main className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your dashboard...</p>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Transform raw transaction data into format for display in the table, including formatting amounts and determining display names based on transaction type and related entities.
  const transactions = serverTransactions?.map((tx: any) => {
    let displayName = 'System';
    if (tx.type === 'INVEST') {
      displayName = tx.businessUnit?.name || tx.investment?.businessUnit?.name || 'Investment';
    } else if (tx.account?.portfolio?.user?.name) {
      displayName = tx.account.portfolio.user.name;
    }

    const sign = tx.amount > 0 ? '+' : '';
    const formattedAmount = `${sign}${Number(tx.amount).toLocaleString()} USD`;

    return {
      id: tx.transactionId.slice(0, 8).toUpperCase(),
      amount: formattedAmount,
      to: displayName,
      details: tx.description || `${tx.type} operation`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
      method: tx.type,
      status: 'Received',
      type: tx.type,
    };
  }) || [];

  // Transaction status badge component with different colors and icons based on status
  function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
      Received: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      Failed: "bg-destructive/10 text-destructive border-destructive/20",
      Processed: "bg-primary/10 text-primary border-primary/20",
    };

    return (
      <span className={`text-[10px] px-2 py-1 rounded-full border font-bold ${styles[status] || styles.Processed}`}>
        {status === 'Received' && '✓ '}
        {status === 'Failed' && '✕ '}
        {status}
      </span>
    );
  }

  // Sample chart data - in a real app, this would come from the API based on the user's transactions
  const chartData = [
    { month: 'Jan', amount: 120 },
    { month: 'Feb', amount: 210 },
    { month: 'Mar', amount: 180 },
    { month: 'Apr', amount: 450 },
    { month: 'May', amount: 230 },
    { month: 'Jun', amount: 190 },
    { month: 'Jul', amount: 250 },
    { month: 'Aug', amount: 210 },
    { month: 'Sep', amount: 40 },
  ];

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="bg-background flex flex-col text-muted-foreground">
        {/* HEADER */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">Dashboard</h1>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="p-6 flex flex-col gap-8 w-full max-w-[1400px] mx-auto">

          {/* ROW 0: ACTION BUTTONS */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" className="bg-card border-border text-muted text-xs h-9">
                <FileText className="mr-2 h-4 w-4" /> Generate Report
              </Button>
              <Button variant="outline" className="bg-card border-border text-muted text-xs h-9">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>

          {/* ROW 1: STATS CARDS (3 COLUMNS) - NOW WITH REAL DATA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { 
                title: "Total Revenue this month", 
                value: `$${(stats?.totalRevenue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 
                color: "text-foreground" 
              },
              { 
                title: "Total Saving", 
                value: `$${(stats?.totalSaving || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 
                color: "text-primary" 
              },
              { 
                title: "Taxes to be paid", 
                value: `$${(stats?.taxesPaid || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 
                color: "text-accent" 
              }
            ].map((item, index) => (
              <Card key={index} className="bg-card border-border pb-0 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-muted text-[10px] font-bold tracking-widest uppercase opacity-60">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <h2 className={`text-2xl font-bold tracking-tighter ${item.color}`}>
                    {item.value}
                  </h2>
                </CardContent>
                <CardFooter className="bg-black/20 px-4 py-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-[10px] text-muted font-medium uppercase tracking-wider">
                    <Clock className="h-3 w-3 opacity-80" />
                    Live from DB
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* ROW 2: SPLIT VIEW (LEFT CONTENT + ANALYTICS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT SIDE: Available Balance */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <Card className="bg-card border-border p-6 rounded-2xl flex-1 flex flex-col justify-center min-h-[300px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Total Available Balance</p>
                  <h3 className="text-4xl font-bold tracking-tighter mb-6">
                    ${(stats?.availableBalance || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </h3>

                  <div className="space-y-4">
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      {/* Progress bar based on pending withdrawals */}
                      <div className="h-full bg-primary w-[35%]" />
                    </div>
                    <p className="text-[10px] text-muted uppercase font-bold tracking-tighter">
                      {stats?.pendingWithdrawals || 0} Pending Withdrawal(s)
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* RIGHT SIDE: Bar Chart */}
            <div className="lg:col-span-7">
              <Card className="bg-card border-border p-6 rounded-2xl h-full shadow-lg">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-muted text-[10px] uppercase tracking-wider font-bold opacity-60">Monthly Revenue Trend</p>
                    <h2 className="text-3xl font-bold tracking-tighter mt-1">Revenue Analysis</h2>
                  </div>
                  <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                    <Button variant="ghost" className="h-7 px-3 text-[10px] bg-background shadow-sm hover:bg-background">Line view</Button>
                    <Button variant="ghost" className="h-7 px-3 text-[10px] opacity-50 hover:opacity-100 transition-opacity">Bar view</Button>
                  </div>
                </div>

                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                      <YAxis hide={true} />
                      <Bar dataKey="amount" radius={[4, 4, 4, 4]} barSize={32}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.month === 'Apr' ? '#d9ff00' : '#27272a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-2 text-[10px] text-muted uppercase font-bold tracking-widest opacity-60">
                  <Clock className="h-3 w-3" /> Updated live from DB
                </div>
              </Card>
            </div>
          </div>

          {/* ROW 3: TRANSACTIONS TABLE */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
            {/* TABLE TOOLBAR */}
            <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-4 bg-black/20">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted opacity-50" />
                  <Input placeholder="Search Transaction..." className="pl-9 bg-background/50 border-border text-xs w-[240px] h-9" />
                </div>
                <Button variant="outline" className="h-9 text-xs border-border gap-2 bg-background/50">
                  <Calendar className="h-3.5 w-3.5" /> Processed Date
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-9 text-xs border-border gap-2 bg-background/50">
                  <Upload className="h-3.5 w-3.5" /> Import
                </Button>
                <Button variant="outline" className="h-9 text-xs border-border gap-2 bg-background/50">
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </div>
            </div>

            {/* ACTUAL TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border bg-white/[0.02]">
                    <th className="p-4 font-medium w-10"><Checkbox className="border-muted/30" /></th>
                    <th className="p-4 font-medium">Payment ID</th>
                    <th className="p-4 font-medium">Total Amount</th>
                    <th className="p-4 font-medium">To</th>
                    <th className="p-4 font-medium">Method</th>
                    <th className="p-4 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-white/[0.01] transition-colors group">
                      <td className="p-4"><Checkbox className="border-muted/30" /></td>
                      <td className="p-4 font-mono text-[11px] text-muted-foreground">{tx.id}</td>
                      <td className="p-4 font-semibold text-foreground">{tx.amount}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-border shadow-sm">
                            <AvatarImage src={tx.avatar} />
                            <AvatarFallback className="text-[10px]">{tx.to[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-foreground/80">{tx.to}</span>
                            <span className="text-[10px] text-muted-foreground opacity-60 truncate max-w-[120px]">
                              {tx.details}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] bg-white/5 border border-border px-2 py-1 rounded-md text-muted-foreground uppercase font-bold tracking-tighter">
                          {tx.method}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <StatusBadge status={tx.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </main>
    </SidebarInset>
  </SidebarProvider>
);
}
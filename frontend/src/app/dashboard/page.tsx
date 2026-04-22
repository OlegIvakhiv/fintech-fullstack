'use client';

// DashboardPage - main dashboard for investors/admins
// Shows key financial stats and monthly earnings chart

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useMemo, useState } from 'react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Button } from "@/components/ui/button";
import { Clock, Download, FileText } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from '@tanstack/react-query'
import { useAuth } from "../contexts/AuthContext";

// Types
interface DashboardStats {
  totalRevenue: number;
  totalSaving: number;
  taxesPaid: number;
  availableBalance: number;
  pendingWithdrawals: number;
}

interface MonthlyEarning {
  month: string;
  earnings: number;
}

export default function DashboardPage() {
  const { token, user, isLoading: isAuthLoading } = useAuth();
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

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

  // Fetch monthly earnings (ROI) for the chart
  const { data: monthlyEarnings, isLoading: isEarningsLoading } = useQuery<MonthlyEarning[]>({
    queryKey: ['investor-monthly-earnings'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/dashboard/investor-monthly-earnings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch earnings');
      return res.json();
    },
    enabled: !!token && user?.role === 'INVESTOR',
  });

  // Chart data: use monthlyEarnings if available, otherwise empty
  const chartData = monthlyEarnings || [];

  // Loading states
  if (isAuthLoading || isStatsLoading || isEarningsLoading) {
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

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

          {/* ROW 1: STATS CARDS */}
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

          {/* ROW 2: SPLIT VIEW (LEFT CONTENT + CHART) */}
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
                      <div className="h-full bg-primary w-[35%]" />
                    </div>
                    <p className="text-[10px] text-muted uppercase font-bold tracking-tighter">
                      {stats?.pendingWithdrawals || 0} Pending Withdrawal(s)
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* RIGHT SIDE: Monthly Earnings Chart (ROI) */}
            <div className="lg:col-span-7">
              <Card className="bg-card border-border p-6 rounded-2xl h-full shadow-lg">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-muted text-[10px] uppercase tracking-wider font-bold opacity-60">Monthly Earnings</p>
                    <h2 className="text-3xl font-bold tracking-tighter mt-1">Profit Analysis</h2>
                  </div>
                  <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                    <Button
                      variant="ghost"
                      className={`h-7 px-3 text-[10px] ${chartType === 'bar' ? 'bg-background shadow-sm' : 'opacity-50 hover:opacity-100'}`}
                      onClick={() => setChartType('bar')}
                    >
                      Bar view
                    </Button>
                    <Button
                      variant="ghost"
                      className={`h-7 px-3 text-[10px] ${chartType === 'line' ? 'bg-background shadow-sm' : 'opacity-50 hover:opacity-100'}`}
                      onClick={() => setChartType('line')}
                    >
                      Line view
                    </Button>
                  </div>
                </div>

<div className="h-[220px] w-full">
  {chartData.length === 0 ? (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      No earnings data yet. ROI will appear here once business units distribute profits.
    </div>
  ) : (
    <ResponsiveContainer width="100%" height="100%">
      {chartType === 'bar' ? (
        <BarChart data={chartData}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 500 }} 
            dy={8} 
            interval={0} 
          />
          <YAxis hide={true} />
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              color: 'var(--card-foreground)',
              padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
            labelStyle={{ color: 'var(--muted-foreground)', fontWeight: 500 }}
            cursor={{ fill: 'transparent' }} // removes white background on hover
          />
          <Bar 
            dataKey="earnings" 
            radius={[4, 4, 4, 4]} 
            barSize={32} 
            fill="var(--accent)"
            activeBar={{ fill: 'var(--primary)', opacity: 0.8 }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="var(--accent)" />
            ))}
          </Bar>
        </BarChart>
      ) : (
        <LineChart data={chartData}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 500 }} 
            dy={8} 
            interval={0}
          />
          <YAxis hide={true} />
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              color: 'var(--card-foreground)',
              padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
            labelStyle={{ color: 'var(--muted-foreground)', fontWeight: 500 }}
          />
          <Line 
            type="monotone" 
            dataKey="earnings" 
            stroke="var(--accent)" 
            strokeWidth={2.5} 
            dot={{ fill: 'var(--accent)', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 2 }}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  )}
</div>

                <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-2 text-[10px] text-muted uppercase font-bold tracking-widest opacity-60">
                  <Clock className="h-3 w-3" /> Actual ROI earned per month
                </div>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
'use client';

//adminPage
// This is the main admin dashboard page. It shows key stats and quick links to manage users, business units, accounts, and transactions. Only accessible by admins.

import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Users, TrendingUp, AlertCircle, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';


// Type for admin stats data  - this should match the response from the API endpoint
interface AdminStats {
  totalUsers: number;
  totalInvested: number;
  pendingWithdrawals: number;
  activeBusinessUnits: number;
  totalTransactions: number;
  totalAccounts: number;
  systemBalance: number;
}

// MAIN PAGE COMPONENT
// This page fetches key stats from the API and displays them in a dashboard format. It also checks if the user is an admin and shows loading states while fetching data.
export default function AdminDashboard() {
  // Get auth context
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // Fetch admin stats from API
  const { data: stats, isLoading: isStatsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/dashboard/admin-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch admin stats');
      return res.json();
    },
    enabled: !!token && user?.role === 'ADMIN',
  });

  // Show loading state while auth is loading
  if (isAuthLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col text-muted-foreground">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1 text-muted" />
            <div className="h-4 w-[1px] bg-border mx-2" />
            <h1 className="text-sm font-medium text-accent tracking-tight">Admin Dashboard</h1>
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

  // Show access denied if not admin
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-destructive">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You must be an admin to access this page</p>
          <Button 
            className="mt-4 bg-primary text-black"
            onClick={() => router.push('/dashboard')}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  // Show loading while stats load
  if (isStatsLoading) {
    return (
      <SidebarProvider> 
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col text-muted-foreground">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1 text-muted" />
            <div className="h-4 w-[1px] bg-border mx-2" />
            <h1 className="text-sm font-medium text-accent tracking-tight">Admin Dashboard</h1>
          </header>
          <main className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Prepare stats cards data - this maps the API response to the format needed for rendering the stat cards. 
  // Each card has a title, value, icon, and link to the relevant management page.
  const statCards = [
    {
      title: 'Total Users',
      value: (stats?.totalUsers || 0).toString(),
      icon: <Users className="h-4 w-4 text-primary" />,
      href: '/admin/users',
    },
    {
      title: 'Active Business Units',
      value: (stats?.activeBusinessUnits || 0).toString(),
      icon: <Building2 className="h-4 w-4 text-accent" />,
      href: '/admin/business-units',
    },
    {
      title: 'Pending Withdrawals',
      value: (stats?.pendingWithdrawals || 0).toString(),
      icon: <AlertCircle className="h-4 w-4 text-destructive" />,
      href: '/admin/withdrawal-requests',
    },
    {
      title: 'Total Invested',
      value: `$${(stats?.totalInvested || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
      href: '#',
    },
  ];

  // Main page content
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col text-muted-foreground">
        
        {/* HEADER */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">Admin Dashboard</h1>
        </header>

        <main className="p-6 flex flex-col gap-8 w-full max-w-[1400px] mx-auto">
          
          {/* WELCOME */}
          <div>
            <p className="text-muted text-[10px] font-bold uppercase tracking-widest opacity-60">Welcome back</p>
            <h2 className="text-3xl font-bold tracking-tighter text-foreground">System Overview</h2>
            <p className="text-sm text-muted-foreground mt-2">Manage users, business units, accounts, and transactions</p>
          </div>

          {/* STATS GRID - NOW WITH REAL DATA */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, idx) => (
              <Card 
                key={idx} 
                className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer group"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-muted text-[10px] font-bold tracking-widest uppercase opacity-60">
                      {stat.title}
                    </CardTitle>
                    {stat.icon}
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="text-3xl font-bold text-foreground">{stat.value}</h3>
                </CardContent>
                <CardFooter className="bg-black/20 border-t border-border/50">
                  <Button 
                    variant="ghost" 
                    className="w-full text-xs h-8 hover:bg-primary/10"
                    onClick={() => router.push(stat.href)}
                  >
                    Manage →
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* SYSTEM METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Total Accounts',
                value: (stats?.totalAccounts || 0).toString(),
                color: 'text-blue-500',
              },
              {
                title: 'System Balance',
                value: `$${(stats?.systemBalance || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
                color: 'text-emerald-500',
              },
              {
                title: 'Total Transactions',
                value: (stats?.totalTransactions || 0).toString(),
                color: 'text-purple-500',
              },
            ].map((metric, idx) => (
              <Card key={idx} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-muted text-[10px] font-bold tracking-widest uppercase opacity-60">
                    {metric.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <h3 className={`text-2xl font-bold ${metric.color}`}>{metric.value}</h3>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* QUICK ACTIONS */}
          <div className="border-t border-border pt-8">
            <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button 
                className="bg-primary hover:bg-primary/90 text-black font-bold h-12"
                onClick={() => router.push('/admin/users')}
              >
                👥 Manage Users
              </Button>
              <Button 
                variant="outline" 
                className="bg-card border-border text-foreground font-bold h-12 hover:bg-primary/10"
                onClick={() => router.push('/admin/business-units')}
              >
                🏢 Manage Business Units
              </Button>
              <Button 
                variant="outline" 
                className="bg-card border-border text-foreground font-bold h-12 hover:bg-primary/10"
                onClick={() => router.push('/admin/withdrawal-requests')}
              >
                💰 Review Withdrawals
              </Button>
              <Button 
                variant="outline" 
                className="bg-card border-border text-foreground font-bold h-12 hover:bg-primary/10"
              >
                💳 Manage Accounts
              </Button>
              <Button 
                variant="outline" 
                className="bg-card border-border text-foreground font-bold h-12 hover:bg-primary/10"
              >
                📊 View Transactions
              </Button>
              <Button 
                variant="outline" 
                className="bg-card border-border text-foreground font-bold h-12 hover:bg-primary/10"
              >
                ⚙️ System Settings
              </Button>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
'use client';

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/ui/app-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { PieChart, TrendingUp, Layers, Users, Plus, Settings2 } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import InvestInFundModal from '@/app/transaction-components/InvestInFundModal';
import CreateFundModal from '@/app/transaction-components/CreateFundModal';
import ManageFundModal from '@/app/transaction-components/ManageFundModal';

interface FundAllocation {
  weight: number;
  businessUnit: { id: number; name: string; currency: string; monthlyROI?: number };
}

interface Fund {
  id: number;
  name: string;
  description?: string;
  currency: string;
  status: string;
  weightedMonthlyROI?: number;
  weightedAnnualROI?: number;
  totalPoolValue?: number;
  investorCount?: number;
  allocations: FundAllocation[];
}

interface Account { id: number; name: string; balance: number; currency: string }

export default function FundsPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isInvestor = user?.role === 'INVESTOR';

  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);       // invest
  const [managingFund, setManagingFund] = useState<Fund | null>(null);       // manage (admin)
  const [createOpen, setCreateOpen] = useState(false);                        // create (admin)

  const { data: funds, isLoading } = useQuery<Fund[]>({
    queryKey: ['funds'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/funds', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch funds');
      return res.json();
    },
    enabled: !!token,
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['accounts', 'me'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/accounts/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch accounts');
      return res.json();
    },
    enabled: !!token && isInvestor,
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">Investment Funds</h1>
        </header>

        <main className="p-6 flex flex-col gap-8 max-w-[1400px] mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-muted text-[10px] font-bold uppercase tracking-widest opacity-60">
                Overview
              </p>
              <h2 className="text-2xl font-bold tracking-tighter text-foreground">
                Managed Funds
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Diversified baskets — one click invests across multiple business units automatically.
              </p>
            </div>

            {/* Admin: create fund button moved here from the top header */}
            {isAdmin && (
              <Button
                size="sm"
                className="bg-primary text-black font-bold text-xs h-9 hover:bg-primary/90 px-4 rounded-xl shadow-lg shadow-primary/10 transition-all hover:-translate-y-0.5"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Fund
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          )}

          {!isLoading && funds && funds.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <PieChart className="h-7 w-7 text-primary/50" />
              </div>
              <div>
                <p className="text-foreground font-semibold">No funds yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAdmin ? 'Create your first fund using the button above.' : 'No investment funds are available yet.'}
                </p>
              </div>
              {isAdmin && (
                <Button
                  className="bg-primary text-black font-bold text-xs h-9 hover:bg-primary/90"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Fund
                </Button>
              )}
            </div>
          )}

          {!isLoading && funds && funds.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {funds.map((fund) => (
                <Card
                  key={fund.id}
                  className="bg-card border-border rounded-3xl overflow-hidden flex flex-col hover:border-primary/50 transition-all group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <CardHeader className="relative z-10 p-5 pb-3">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted opacity-60">
                        {fund.currency} Fund · {fund.allocations.length} assets
                      </p>
                      <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <PieChart className="h-4 w-4" />
                      </div>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground mt-2">
                      {fund.name}
                    </h2>
                    {fund.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {fund.description}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="relative z-10 px-5 pb-4 space-y-4">
                    {/* ROI strip */}
                    {fund.weightedMonthlyROI != null && (
                      <div className="flex gap-3">
                        <div className="flex-1 bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Monthly ROI</p>
                          <p className="text-lg font-bold text-primary">
                            {fund.weightedMonthlyROI}%
                          </p>
                        </div>
                        {fund.weightedAnnualROI != null && (
                          <div className="flex-1 bg-accent/10 border border-accent/20 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Annual ROI</p>
                            <p className="text-lg font-bold text-accent">
                              {fund.weightedAnnualROI}%
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Allocation mini-bars */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase font-bold text-muted opacity-50 tracking-widest">
                        Allocation
                      </p>
                      {fund.allocations.map((alloc) => (
                        <div key={alloc.businessUnit.id} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground truncate flex-1">
                            {alloc.businessUnit.name}
                          </span>
                          <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/50"
                              style={{ width: `${alloc.weight}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-primary w-8 text-right shrink-0">
                            {alloc.weight}%
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {fund.totalPoolValue != null && (
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          ${fund.totalPoolValue.toLocaleString()} pool
                        </span>
                      )}
                      {fund.investorCount != null && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {fund.investorCount} investors
                        </span>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="relative z-10 bg-black/20 border-t border-border/50 px-5 py-3">
                    {isInvestor && (
                      <Button
                        className="w-full bg-primary text-black font-bold text-xs h-9 hover:bg-primary/90"
                        onClick={() => setSelectedFund(fund)}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Invest in Fund
                      </Button>
                    )}

                    {isAdmin && (
                      <div className="flex w-full gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-primary/30 text-primary hover:bg-primary/10 text-xs h-9"
                          onClick={() => setManagingFund(fund)}
                        >
                          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                          Manage
                        </Button>
                        <p className="flex items-center text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          Admin
                        </p>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </main>
      </SidebarInset>

      {/* Investor: invest modal */}
      {selectedFund && isInvestor && (
        <InvestInFundModal
          fund={selectedFund}
          accounts={accounts || []}
          token={token!}
          isOpen={!!selectedFund}
          onClose={() => setSelectedFund(null)}
        />
      )}

      {/* Admin: create fund modal */}
      {isAdmin && (
        <CreateFundModal
          token={token!}
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {/* Admin: manage existing fund modal */}
      {managingFund && isAdmin && (
        <ManageFundModal
          fund={managingFund}
          token={token!}
          isOpen={!!managingFund}
          onClose={() => setManagingFund(null)}
        />
      )}
    </SidebarProvider>
  );
}
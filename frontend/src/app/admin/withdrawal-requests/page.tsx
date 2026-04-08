'use client';

// Admin Withdrawal Requests Page 
// This is the admin page for managing withdrawal requests. It shows a list of pending requests and allows the admin to approve or reject them.

import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowDownToLine,
  ArrowLeftRight,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';


// Types 
// This defines the structure of a withdrawal request as returned by the API. 
// It includes all relevant fields needed for display and processing in the admin panel.
type WithdrawalType =
  | 'BUSINESS_UNIT_TO_ACCOUNT'
  | 'BUSINESS_UNIT_TO_BUSINESS_UNIT'
  | 'ACCOUNT_TO_EXTERNAL';


  // This interface represents the structure of a withdrawal request as returned by the API.
interface WithdrawalRequest {
  id: number;
  investorId: number;
  investor: { name: string; email: string };
  withdrawalType: WithdrawalType;
  accountId: number;
  account: { name: string; currency: string };
  amount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  description?: string;
  // Type 1 & 2
  fromBusinessUnit?: { name: string };
  // Type 2
  toBusinessUnit?: { name: string };
  // Type 3
  externalWallet?: string;
  withdrawalMethod?: string;
}


// Helper functions for rendering type badges
// These functions are used to determine the label, icon, and badge class for each withdrawal type.
function typeLabel(type: WithdrawalType) {
  switch (type) {
    case 'BUSINESS_UNIT_TO_ACCOUNT': return 'BU → Account';
    case 'BUSINESS_UNIT_TO_BUSINESS_UNIT': return 'BU → BU Transfer';
    case 'ACCOUNT_TO_EXTERNAL': return 'Cash Out (External)';
  }
}

// These functions return the appropriate icon and badge styling based on the withdrawal type, which helps visually differentiate the types of requests in the UI.
function typeIcon(type: WithdrawalType) {
  switch (type) {
    case 'BUSINESS_UNIT_TO_ACCOUNT':
      return <ArrowDownToLine className="h-4 w-4 text-primary" />;
    case 'BUSINESS_UNIT_TO_BUSINESS_UNIT':
      return <ArrowLeftRight className="h-4 w-4 text-accent" />;
    case 'ACCOUNT_TO_EXTERNAL':
      return <Wallet className="h-4 w-4 text-amber-500" />;
  }
}

// This function returns the appropriate badge class for styling the type badge based on the withdrawal type, which helps visually differentiate the types of requests in the UI.
function typeBadgeClass(type: WithdrawalType) {
  switch (type) {
    case 'BUSINESS_UNIT_TO_ACCOUNT':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'BUSINESS_UNIT_TO_BUSINESS_UNIT':
      return 'bg-accent/10 text-accent border-accent/20';
    case 'ACCOUNT_TO_EXTERNAL':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminWithdrawals() {
  const { user: currentUser, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch withdrawal requests
  const { data: requests, isLoading } = useQuery<WithdrawalRequest[]>({
    queryKey: ['withdrawal-requests'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/withdrawal-requests/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch withdrawal requests');
      return res.json();
    },
    enabled: !!token && currentUser?.role === 'ADMIN',
  });

  // Approve
  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await fetch(`http://localhost:3001/withdrawal-requests/${requestId}/process`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      if (!res.ok) throw new Error('Failed to approve request');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
      setIsDetailModalOpen(false);
      setSelectedRequest(null);
    },
  });

  // Reject
  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await fetch(`http://localhost:3001/withdrawal-requests/${requestId}/process`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'REJECT' }),
      });
      if (!res.ok) throw new Error('Failed to reject request');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
      setIsDetailModalOpen(false);
      setSelectedRequest(null);
    },
  });

  // ─── Loading / auth guards ─────────────────────────────────────────────────

  const LoadingShell = ({ msg }: { msg: string }) => (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col text-muted-foreground">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">Withdrawal Requests</h1>
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

  if (isAuthLoading) return <LoadingShell msg="Loading..." />;

  if (!currentUser || currentUser.role !== 'ADMIN') {
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

  if (isLoading) return <LoadingShell msg="Loading withdrawal requests..." />;

  const pendingRequests = requests?.filter((r) => r.status === 'PENDING') || [];

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col text-muted-foreground">

        {/* HEADER */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">Withdrawal Requests</h1>
        </header>

        <main className="p-6 flex flex-col gap-8 w-full max-w-[1400px] mx-auto">

          {/* TITLE */}
          <div>
            <p className="text-muted text-[10px] font-bold uppercase tracking-widest opacity-60">Admin Panel</p>
            <h2 className="text-2xl font-bold tracking-tighter text-foreground">Withdrawal Requests</h2>
            <p className="text-sm text-muted-foreground mt-1">Pending: {pendingRequests.length} requests</p>
          </div>

          {/* REQUESTS GRID */}
          {pendingRequests.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500 opacity-50" />
                <h3 className="text-lg font-bold text-foreground mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">No pending withdrawal requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((req) => (
                <Card
                  key={req.id}
                  className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => { setSelectedRequest(req); setIsDetailModalOpen(true); }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-foreground">{req.investor.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{req.investor.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Type badge */}
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-tight ${typeBadgeClass(req.withdrawalType)}`}>
                          {typeIcon(req.withdrawalType)}
                          {typeLabel(req.withdrawalType)}
                        </span>
                        <AlertCircle className="h-5 w-5 text-amber-500 opacity-70" />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Type-specific info */}
                    {req.withdrawalType === 'BUSINESS_UNIT_TO_ACCOUNT' && (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted opacity-50">From Business Unit</p>
                        <p className="text-foreground font-semibold">{req.fromBusinessUnit?.name ?? '—'}</p>
                      </div>
                    )}
                    {req.withdrawalType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT' && (
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted opacity-50">From</p>
                          <p className="text-foreground font-semibold text-sm">{req.fromBusinessUnit?.name ?? '—'}</p>
                        </div>
                        <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground mx-1 mt-3" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted opacity-50">To</p>
                          <p className="text-foreground font-semibold text-sm">{req.toBusinessUnit?.name ?? '—'}</p>
                        </div>
                      </div>
                    )}
                    {req.withdrawalType === 'ACCOUNT_TO_EXTERNAL' && (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted opacity-50">External Wallet</p>
                        <p className="text-foreground font-mono text-xs truncate">{req.externalWallet}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{req.withdrawalMethod}</p>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted opacity-50">Amount</p>
                        <p className="text-lg font-bold text-foreground">
                          {Number(req.amount).toLocaleString()} {req.currency}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-muted opacity-50">Requested</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </SidebarInset>

      {/* ── DETAIL MODAL ── */}
      {selectedRequest && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border/50">
            <DialogHeader>
              <DialogTitle>Withdrawal Request #{selectedRequest.id}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Investor */}
              <div>
                <p className="text-[10px] uppercase font-bold text-muted opacity-50">Investor</p>
                <p className="text-foreground font-semibold">{selectedRequest.investor.name}</p>
                <p className="text-xs text-muted-foreground">{selectedRequest.investor.email}</p>
              </div>

              {/* Type badge */}
              <div>
                <p className="text-[10px] uppercase font-bold text-muted opacity-50 mb-1">Withdrawal Type</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${typeBadgeClass(selectedRequest.withdrawalType)}`}>
                  {typeIcon(selectedRequest.withdrawalType)}
                  {typeLabel(selectedRequest.withdrawalType)}
                </span>
              </div>

              {/* Type-specific details */}
              {selectedRequest.withdrawalType === 'BUSINESS_UNIT_TO_ACCOUNT' && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted opacity-50">From Business Unit</p>
                  <p className="text-foreground font-semibold">{selectedRequest.fromBusinessUnit?.name ?? '—'}</p>
                </div>
              )}

              {selectedRequest.withdrawalType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted opacity-50">From BU</p>
                    <p className="text-foreground font-semibold text-sm">{selectedRequest.fromBusinessUnit?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted opacity-50">To BU</p>
                    <p className="text-foreground font-semibold text-sm">{selectedRequest.toBusinessUnit?.name ?? '—'}</p>
                  </div>
                </div>
              )}

              {selectedRequest.withdrawalType === 'ACCOUNT_TO_EXTERNAL' && (
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted opacity-50">External Wallet</p>
                    <p className="text-foreground font-mono text-xs break-all">{selectedRequest.externalWallet}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted opacity-50">Method</p>
                    <p className="text-foreground font-semibold">{selectedRequest.withdrawalMethod}</p>
                  </div>
                </div>
              )}

              {/* Account */}
              <div>
                <p className="text-[10px] uppercase font-bold text-muted opacity-50">Account</p>
                <p className="text-foreground font-semibold">{selectedRequest.account?.name ?? `#${selectedRequest.accountId}`}</p>
              </div>

              {/* Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted opacity-50">Amount</p>
                  <p className="text-lg font-bold text-foreground">
                    {Number(selectedRequest.amount).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted opacity-50">Currency</p>
                  <p className="text-lg font-bold text-primary">{selectedRequest.currency}</p>
                </div>
              </div>

              {/* Description */}
              {selectedRequest.description && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted opacity-50">Description</p>
                  <p className="text-foreground text-sm">{selectedRequest.description}</p>
                </div>
              )}

              {/* Date */}
              <div>
                <p className="text-[10px] uppercase font-bold text-muted opacity-50">Requested Date</p>
                <p className="text-foreground">{new Date(selectedRequest.requestedAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-6 border-t border-border/50">
              <Button
                variant="outline"
                className="flex-1 bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20"
                onClick={() => rejectMutation.mutate(selectedRequest.id)}
                disabled={rejectMutation.isPending || approveMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                onClick={() => approveMutation.mutate(selectedRequest.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </SidebarProvider>
  );
}
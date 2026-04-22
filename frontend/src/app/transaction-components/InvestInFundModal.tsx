'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Loader2, PieChart } from 'lucide-react';

interface Account { id: number; name: string; balance: number; currency: string }

interface FundAllocation {
  weight: number;
  businessUnit: { id: number; name: string; currency: string; monthlyROI?: number }
}

interface Fund {
  id: number;
  name: string;
  currency: string;
  weightedMonthlyROI?: number;
  allocations: FundAllocation[];
}

export default function InvestInFundModal({
  fund, accounts, token, isOpen, onClose,
}: {
  fund: Fund;
  accounts: Account[];
  token: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const selectedAccount = accounts.find((a) => a.id.toString() === accountId);
  const parsedAmount = parseFloat(amount);
  const isValid = !!accountId && parsedAmount > 0;

  // Compute the per-BU slice preview
  const slices = fund.allocations.map((alloc) => ({
    name: alloc.businessUnit.name,
    weight: alloc.weight,
    amount: isValid ? parseFloat(((parsedAmount * alloc.weight) / 100).toFixed(2)) : 0,
    currency: alloc.businessUnit.currency,
    roi: alloc.businessUnit.monthlyROI,
  }));

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:3001/funds/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fundId: fund.id,
          accountId: parseInt(accountId),
          amount: parsedAmount,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Investment failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      handleClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleClose = () => {
    setAccountId('');
    setAmount('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Invest in {fund.name}
          </DialogTitle>
          <DialogDescription>
            Your investment is automatically distributed across{' '}
            {fund.allocations.length} business units.
            {fund.weightedMonthlyROI != null && (
              <span className="ml-1 font-semibold text-primary">
                ~{fund.weightedMonthlyROI}% weighted monthly ROI
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">From Account</label>
            <Select value={accountId} onValueChange={(v) => { setAccountId(v); setError(''); }}>
              <SelectTrigger className="bg-background border-border text-foreground hover:border-primary/50">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-popover border-border z-[200]">
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id.toString()}>
                    <span className="font-medium">{acc.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {parseFloat(acc.balance.toString()).toLocaleString()} {acc.currency}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-semibold text-foreground">Amount</label>
              {selectedAccount && (
                <span className="text-[11px] text-muted-foreground">
                  Balance:{' '}
                  <span className="font-semibold text-foreground">
                    {parseFloat(selectedAccount.balance.toString()).toLocaleString()}{' '}
                    {selectedAccount.currency}
                  </span>
                </span>
              )}
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              min="0.01"
              step="0.01"
              className="bg-background/50 border-primary/30"
            />
          </div>

          {/* Allocation breakdown preview */}
          {isValid && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
              <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">
                Auto-distribution
              </p>
              {slices.map((slice) => (
                <div key={slice.name} className="flex items-center gap-2">
                  {/* Weight bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-medium text-foreground truncate">{slice.name}</span>
                      <span className="text-muted-foreground ml-2 shrink-0">
                        {slice.amount.toFixed(2)} {slice.currency}
                      </span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${slice.weight}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-primary font-bold w-10 text-right shrink-0">
                    {slice.weight}%
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-1.5 border-t border-primary/20 text-xs font-bold">
                <span>Total invested</span>
                <span className="text-primary">{parsedAmount.toFixed(2)} {fund.currency}</span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={!isValid || mutation.isPending}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Confirm Investment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
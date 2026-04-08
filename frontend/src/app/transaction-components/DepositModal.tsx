'use client';

//DepositModal

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CreditCard, X } from 'lucide-react';

//types for deposit modal
interface DepositModalProps {
  accountId: number;
  accountName: string;
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

// DepositModal component
export default function DepositModal({
  accountId,
  accountName,
  isOpen,
  onClose,
  token,
}: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const queryClient = useQueryClient();

  // Deposit funds
  const depositMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:3001/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId,
          amount: parseFloat(amount),
        }),
      });
      if (!res.ok) throw new Error('Deposit failed');
      return res.json();
    }, 
    onSuccess: () => {  // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      handleClose();
    },
    onError: (error) => {  // Handle error
      console.error('Deposit error:', error);
    },
  });

  // Close modal
  const handleClose = () => {
    setAmount('');
    onClose();
  };

  // Handle deposit
  const handleSubmit = () => {
    if (!isAmountValid()) return;
    depositMutation.mutate();
  };

  // Validate amount
  const isAmountValid = () => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  };

  // Handle Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isAmountValid() && !depositMutation.isPending) {
      handleSubmit();
    }
  };

  // Render
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* DialogContent with proper centering and max-height for overflow */}
      <DialogContent className="sm:max-w-md bg-card border-border/50 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col my-auto">
        {/* Header with icon - custom styling */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Deposit Funds
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Add funds to <span className="font-semibold text-foreground">{accountName}</span>
              </DialogDescription>
            </div>
          </div>
          {/* Close button */}
          <button
            onClick={handleClose}
            className="rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/50 my-4" />

        {/* Form Content */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="deposit-amount" className="text-sm font-semibold text-foreground">
              Amount
            </label>
            <Input
              id="deposit-amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={handleKeyDown}
              min="0.01"
              step="0.01"
              disabled={depositMutation.isPending}
              autoFocus
              className="bg-background/50 border-primary/30 text-foreground placeholder:text-muted-foreground/60"
            />
            {amount && !isAmountValid() && (
              <p className="text-xs text-destructive">Please enter a positive amount</p>
            )}
          </div>

          {/* Summary - matching theme */}
          {amount && isAmountValid() && (
            <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-foreground">
                  ${parseFloat(amount).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer - without grey background */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={depositMutation.isPending}
            className="bg-background/50 hover:bg-background border-border/50 text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isAmountValid() || depositMutation.isPending}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {depositMutation.isPending ? (
              <>
                <span className="inline-block mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            ) : (
              'Deposit'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
'use client';

// InvestModal
// This file defines the InvestModal component for making investments in a business unit.

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Building, TrendingUp, X } from 'lucide-react';

// TYPES

// Account type defines the structure of a user's account, including its id, name, balance, and currency, which are used to display account options in the modal.
interface Account {
  id: number;
  name: string;
  balance: number;
  currency: string;
}

// BusinessUnit type defines the structure of a business unit that can be invested in, including its id, name, currency, and optional interest rate for display in the modal.
interface BusinessUnit {
  id: number;
  name: string;
  currency: string;
  interestRate?: number;
}


// InvestModalProps defines the props expected by the InvestModal component, including the business unit to invest in, modal open state, close handler, and authentication token.
interface InvestModalProps {
  businessUnit: BusinessUnit;
  isOpen: boolean;
  onClose: () => void;
  token: string;
}


// InvestModal component allows users to select an account and enter an amount to invest in a business unit, with form validation and API integration for processing the investment.
export default function InvestModal({
  businessUnit,
  isOpen,
  onClose,
  token,
}: InvestModalProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const queryClient = useQueryClient();

  // Fetch accounts for the user to populate the account selection dropdown, filtering accounts by the business unit's currency to ensure only compatible accounts are shown.
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['accounts', 'me'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/accounts/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch accounts');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isOpen && !!token,
  });

  // Filter accounts by the business unit's currency
  const filteredAccounts = accounts?.filter(
    (acc) => acc.currency === businessUnit.currency
  );

  // Mutation for processing the investment, which sends a POST request to the API with the selected account, business unit, and amount, and handles success and error states appropriately.
  const investMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:3001/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: parseInt(selectedAccountId),
          businessUnitId: businessUnit.id,
          amount: parseFloat(amount),
        }),
      });
      if (!res.ok) throw new Error('Investment failed');
      return res.json();
    },
    // On success, invalidate relevant queries to refresh data and close the modal
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      handleClose();
    },
    onError: (error) => {
      console.error('Investment error:', error);
    },
  });

  // Handle modal close by resetting form state and calling the onClose prop
  const handleClose = () => {
    setSelectedAccountId('');
    setAmount('');
    onClose();
  };

  // Handle form submission by validating input and triggering the investment mutation
  const handleSubmit = () => {
    if (!selectedAccountId || !isAmountValid()) return;
    investMutation.mutate();
  };

  // Validate that the entered amount is a positive number
  const isAmountValid = () => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  };

  // Get the selected account object based on the selectedAccountId for displaying account details and validating the investment amount against the account balance.
  const selectedAccount = filteredAccounts?.find(
    (acc) => acc.id.toString() === selectedAccountId
  );

  // Handle Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === 'Enter' &&
      selectedAccountId &&
      isAmountValid() &&
      !investMutation.isPending
    ) {
      handleSubmit();
    }
  };

  // Render the InvestModal
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* DialogContent */}
      <DialogContent className="sm:max-w-md bg-card border-border/50  max-h-[90vh] flex flex-col my-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
              <Building className="h-5 w-5 text-accent" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Invest in {businessUnit.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {businessUnit.currency} Unit
                {businessUnit.interestRate && (
                  <span className="ml-2 font-semibold text-accent">
                    {businessUnit.interestRate}% APY
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
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
          {/* Account Selection  */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Select Account
            </label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
  <SelectTrigger className="w-full bg-background border-border text-foreground hover:border-primary/50 focus:ring-primary/30 h-11">
    <SelectValue placeholder="Choose an account" />
  </SelectTrigger>
  <SelectContent
    position="popper"
    className="w-full bg-popover border-border shadow-xl z-[200]"
  >
    {accountsLoading ? (
      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
        Loading accounts...
      </div>
    ) : filteredAccounts?.length ? (
      filteredAccounts.map((acc) => (
        <SelectItem
          key={acc.id}
          value={acc.id.toString()}
          className="cursor-pointer focus:bg-primary/10 focus:text-foreground py-3 px-3"
        >
          <div className="flex items-center justify-between w-full gap-6">
            <span className="font-medium text-foreground">{acc.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums ml-auto">
              {Number(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} {acc.currency}
            </span>
          </div>
        </SelectItem>
      ))
    ) : (
      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
        No {businessUnit.currency} accounts available
      </div>
    )}
  </SelectContent>
</Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Investment Amount
            </label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={handleKeyDown}
              min="0.01"
              step="0.01"
              disabled={investMutation.isPending || accountsLoading}
              className="bg-background/50 border-primary/30 text-foreground placeholder:text-muted-foreground/60"
            />
            {amount && !isAmountValid() && (
              <p className="text-xs text-destructive">Please enter a positive amount</p>
            )}
          </div>

          {/* Investment Summary */}
          {selectedAccount && amount && isAmountValid() && (
            <div className="bg-accent/10 border border-accent/20 p-4 rounded-lg space-y-3 my-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From Account</span>
                  <span className="font-semibold text-foreground">{selectedAccount.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investment Amount</span>
                  <span className="font-semibold text-foreground">
                    {parseFloat(amount).toFixed(2)} {businessUnit.currency}
                  </span>
                </div>
                {businessUnit.interestRate && (
                  <div className="flex justify-between pt-2 border-t border-accent/20">
                    <span className="text-muted-foreground">Expected Yield (APY)</span>
                    <span className="font-semibold text-accent">
                      {businessUnit.interestRate}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account Balance Check */}
          {selectedAccount && amount && isAmountValid() && (
            <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border/30">
              Available Balance:{' '}
              <span className="font-semibold text-foreground">
                {selectedAccount.balance} {businessUnit.currency}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={investMutation.isPending}
            className="bg-background/50 hover:bg-background border-border/50 text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedAccountId ||
              !isAmountValid() ||
              investMutation.isPending ||
              accountsLoading
            }
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {investMutation.isPending ? (
              <>
                <span className="inline-block mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Confirm Investment
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
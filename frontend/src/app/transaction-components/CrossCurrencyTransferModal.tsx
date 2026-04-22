'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Loader2, ArrowLeftRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Account {
  id: number;
  name: string;
  currency: string;
  balance: number;
}

interface ConversionPreview {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  fee: number;
  rate: number;
}

export default function CrossCurrencyTransferModal({
  accounts,
  token,
  isOpen,
  onClose,
}: {
  accounts: Account[];
  token: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [conversion, setConversion] = useState<ConversionPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const queryClient = useQueryClient();

  const fromAccount = accounts.find((a) => a.id.toString() === fromAccountId);
  const toAccount = accounts.find((a) => a.id.toString() === toAccountId);
  const currenciesDiffer = !!fromAccount && !!toAccount && fromAccount.currency !== toAccount.currency;

  // Fetch conversion preview (only when currencies differ)
  useEffect(() => {
    if (!fromAccount || !toAccount || !amount || parseFloat(amount) <= 0 || !currenciesDiffer) {
      setConversion(null);
      return;
    }

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      setErrorMsg('');
      try {
        // Call backend to get conversion preview (NBU rate + fee)
        const res = await fetch('http://localhost:3001/exchange/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            from: fromAccount.currency,
            to: toAccount.currency,
          }),
        });
        if (!res.ok) throw new Error('Conversion preview failed');
        const data = await res.json();
        setConversion({
          fromAmount: parseFloat(amount),
          fromCurrency: fromAccount.currency,
          toAmount: data.converted.amount,
          toCurrency: data.converted.currency,
          fee: data.fee.amount,
          rate: data.effectiveRate,
        });
      } catch (err) {
        console.error(err);
        setConversion(null);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    const timeout = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timeout);
  }, [amount, fromAccount, toAccount, token, currenciesDiffer]);

  const transferMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:3001/transactions/cross-currency-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromAccountId: parseInt(fromAccountId),
          toAccountId: parseInt(toAccountId),
          amount: parseFloat(amount),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Transfer failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      handleClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    },
  });

  const handleSubmit = () => {
    if (!fromAccountId || !toAccountId || !amount || parseFloat(amount) <= 0) return;
    if (fromAccountId === toAccountId) return;
    // Check balance
    if (fromAccount && parseFloat(amount) > parseFloat(fromAccount.balance.toString())) {
      setErrorMsg('Insufficient funds in source account');
      return;
    }
    setErrorMsg('');
    transferMutation.mutate();
  };

  const handleClose = () => {
    setFromAccountId('');
    setToAccountId('');
    setAmount('');
    setConversion(null);
    setErrorMsg('');
    onClose();
  };

  // same-currency transfers don't need a conversion preview
  const isValid =
    !!fromAccountId &&
    !!toAccountId &&
    fromAccountId !== toAccountId &&
    !!amount &&
    parseFloat(amount) > 0 &&
    (!currenciesDiffer || !!conversion);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Transfer Between Accounts
          </DialogTitle>
          <DialogDescription>
            Move funds between your accounts. Cross-currency transfers use live NBU rates + 0.5% fee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source account */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">From Account</label>
            <Select
              value={fromAccountId}
              onValueChange={(v) => { setFromAccountId(v); setErrorMsg(''); }}
            >
              <SelectTrigger className="bg-background border-border text-foreground hover:border-primary/50">
                <SelectValue placeholder="Select source account" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-popover border-border shadow-xl z-[200]">
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

          {/* Destination account */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">To Account</label>
            <Select
              value={toAccountId}
              onValueChange={(v) => { setToAccountId(v); setErrorMsg(''); }}
            >
              <SelectTrigger className="bg-background border-border text-foreground hover:border-primary/50">
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-popover border-border shadow-xl z-[200]">
                {accounts
                  .filter((acc) => acc.id.toString() !== fromAccountId)
                  .map((acc) => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      <span className="font-medium">{acc.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{acc.currency}</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-semibold text-foreground">Amount</label>
              {fromAccount && (
                <span className="text-[11px] text-muted-foreground">
                  Balance:{' '}
                  <span className="font-semibold text-foreground">
                    {parseFloat(fromAccount.balance.toString()).toLocaleString()} {fromAccount.currency}
                  </span>
                </span>
              )}
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrorMsg(''); }}
              min="0.01"
              step="0.01"
              className="bg-background/50 border-primary/30"
            />
          </div>

          {/* Loading preview */}
          {isLoadingPreview && (
            <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Calculating rate…
            </div>
          )}

          {/* Conversion preview (cross-currency only) */}
          {conversion && !isLoadingPreview && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5 text-sm">
              <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">
                Conversion preview
              </p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">You send</span>
                <span className="font-semibold">
                  {conversion.fromAmount.toFixed(2)} {conversion.fromCurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective rate</span>
                <span className="text-xs tabular-nums">
                  1 {conversion.fromCurrency} = {conversion.rate.toFixed(4)} {conversion.toCurrency}
                </span>
              </div>
              <div className="flex justify-between text-destructive/80">
                <span>Fee (0.5%)</span>
                <span>{conversion.fee.toFixed(2)} {conversion.toCurrency}</span>
              </div>
              <div className="flex justify-between border-t border-primary/20 pt-1.5 font-bold">
                <span>You receive</span>
                <span className="text-primary">{conversion.toAmount.toFixed(2)} {conversion.toCurrency}</span>
              </div>
            </div>
          )}

          {/* Same-currency notice */}
          {fromAccount && toAccount && !currenciesDiffer && amount && parseFloat(amount) > 0 && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs text-emerald-400">
              Same currency — no conversion fee applied.
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || transferMutation.isPending}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {transferMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" /> Transfer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
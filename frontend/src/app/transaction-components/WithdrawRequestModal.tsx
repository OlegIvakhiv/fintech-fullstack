'use client';

// WithdrawRequestModal
// This component renders a modal dialog for submitting withdrawal requests from an investment in a business unit. 
// It supports three types of withdrawals: back to account, re-invest to another business unit, or cash out to an external wallet/bank.

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Wallet,
  ChevronRight,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';

// Types

// Types for the investments associated with the portfolio
interface Investment {
  id: number;
  businessUnit: { id: number; name: string; currency: string };
  amount: number;
  currency: string;
}

// Types for user accounts that can be selected as withdrawal sources
interface Account {
  id: number;
  name: string;
  balance: number;
  currency: string;
}

// Types for business units, used when selecting a destination for re-investment withdrawals
interface BusinessUnit {
  id: number;
  name: string;
  currency: string;
  status: string;
}

// Enums
// Withdrawal types and methods
type WithdrawalType =
  | 'BUSINESS_UNIT_TO_ACCOUNT'
  | 'BUSINESS_UNIT_TO_BUSINESS_UNIT'
  | 'ACCOUNT_TO_EXTERNAL';

  // For cash out method
type WithdrawalMethod = 'CRYPTO' | 'BANK_TRANSFER' | 'CASH';

// Props for the WithdrawRequestModal component
interface WithdrawRequestModalProps {
  investment: Investment;
  accounts: Account[];
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

// Constants
// Tab definitions for the withdrawal types, including icons and descriptions

const TABS: { type: WithdrawalType; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    type: 'BUSINESS_UNIT_TO_ACCOUNT',
    label: 'To Account',
    icon: <ArrowDownToLine className="h-4 w-4" />,
    desc: 'Move funds back to your account balance',
  },
  {
    type: 'BUSINESS_UNIT_TO_BUSINESS_UNIT',
    label: 'Re-invest',
    icon: <ArrowLeftRight className="h-4 w-4" />,
    desc: 'Transfer to another business unit',
  },
  {
    type: 'ACCOUNT_TO_EXTERNAL',
    label: 'Cash Out',
    icon: <Wallet className="h-4 w-4" />,
    desc: 'Withdraw to external wallet or bank',
  },
];

// WithdrawRequestModal component
// This component renders a modal dialog for submitting withdrawal requests from an investment in a business unit.

export default function WithdrawRequestModal({
  investment,
  accounts,
  isOpen,
  onClose,
  token,
}: WithdrawRequestModalProps) {
  const queryClient = useQueryClient();

  // shared state
  const [activeType, setActiveType] = useState<WithdrawalType>('BUSINESS_UNIT_TO_ACCOUNT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Type 1 & 2 — account that holds the investment
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.length === 1 ? accounts[0].id.toString() : ''
  );

  // Type 2 — destination BU
  const [toBUId, setToBUId] = useState<string>('');

  // Type 3 — external
  const [externalWallet, setExternalWallet] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState<WithdrawalMethod | ''>('');

  // Fetch all active business units for Type 2 re-invest target
  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/business-units', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch business units');
      return res.json();
    },
    enabled: isOpen && activeType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT',
  });

  // Other BUs (exclude the source)
  const otherBUs = businessUnits?.filter(
    (bu) => bu.id !== investment.businessUnit.id && bu.status === 'ACTIVE'
  );

  // Validation (unchanged)
  const parsedAmount = parseFloat(amount);
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= investment.amount;

  function validate(): boolean {
    if (!isAmountValid) {
      setErrorMsg(`Enter an amount between 0 and ${investment.amount} ${investment.currency}`);
      return false;
    }
    if (activeType === 'BUSINESS_UNIT_TO_ACCOUNT' && !selectedAccountId) {
      setErrorMsg('Please select an account');
      return false;
    }
    if (activeType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT') {
      if (!selectedAccountId) { setErrorMsg('Please select an account'); return false; }
      if (!toBUId) { setErrorMsg('Please select a destination business unit'); return false; }
    }
    if (activeType === 'ACCOUNT_TO_EXTERNAL') {
      if (!selectedAccountId) { setErrorMsg('Please select an account'); return false; }
      if (!externalWallet.trim()) { setErrorMsg('Please enter your external wallet / IBAN'); return false; }
      if (!withdrawalMethod) { setErrorMsg('Please select a withdrawal method'); return false; }
    }
    setErrorMsg('');
    return true;
  }

  // Mutation for submitting the withdrawal request
  const mutation = useMutation({
    // Build request body based on withdrawal type and submit to API
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        accountId: parseInt(selectedAccountId),
        withdrawalType: activeType,
        amount: parsedAmount,
        fromBusinessUnitId: investment.businessUnit.id,
        description: description || undefined,
      };

      // Add fields based on withdrawal type
      if (activeType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT') {
        body.toBusinessUnitId = parseInt(toBUId);
      }
      // For external withdrawals, include wallet and method, and remove fromBusinessUnitId since it's not needed for cash out
      if (activeType === 'ACCOUNT_TO_EXTERNAL') {
        body.externalWallet = externalWallet.trim();
        body.withdrawalMethod = withdrawalMethod;
        delete body.fromBusinessUnitId;
      }
// Make API request to submit withdrawal request
      const res = await fetch('http://localhost:3001/withdrawal-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
// Handle response
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Request failed');
      }
      return res.json();
    },
    // On success, invalidate relevant queries to refresh data and close modal
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      handleClose();
    },
    // On error, display error message
    onError: (err: Error) => {
      setErrorMsg(err.message);
    },
  });

  // Handle form submission
  function handleSubmit() {
    if (!validate()) return;
    mutation.mutate();
  }

  // Close modal
  function handleClose() {
    setAmount('');
    setDescription('');
    setErrorMsg('');
    setToBUId('');
    setExternalWallet('');
    setWithdrawalMethod('');
    setActiveType('BUSINESS_UNIT_TO_ACCOUNT');
    onClose();
  }
// Get selected account details for display
  const selectedAccount = accounts.find((a) => a.id.toString() === selectedAccountId);

  // Render
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/*  Dialog content */}
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden flex flex-col h-[85vh]">
        
        {/*  Header  */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <DialogTitle className="text-lg font-bold text-foreground">
            Withdrawal Request
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            From{' '}
            <span className="font-semibold text-accent">
              {investment.businessUnit.name}
            </span>
            {' '}· Max{' '}
            <span className="font-semibold text-foreground">
              {Number(investment.amount).toLocaleString()} {investment.currency}
            </span>
          </p>
        </div>

        {/* Scrollable area */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4">
            {/* Type Tabs */}
            <div>
              <p className="text-[10px] uppercase font-bold text-muted opacity-50 mb-2 tracking-widest">
                Withdrawal Type
              </p>
              <div className="grid grid-cols-3 gap-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.type}
                    onClick={() => { setActiveType(tab.type); setErrorMsg(''); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all text-xs font-semibold
                      ${activeType === tab.type
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-background/40 border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                      }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {TABS.find((t) => t.type === activeType)?.desc}
              </p>
            </div>

            {/* Account select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {activeType === 'ACCOUNT_TO_EXTERNAL' ? 'From Account' : 'Linked Account'}
              </label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="bg-background/50 border-primary/30 text-foreground text-sm h-9">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  {accounts.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No accounts found</div>
                  ) : (
                    accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id.toString()} className="text-foreground">
                        <span className="font-medium">{acc.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({Number(acc.balance).toLocaleString()} {acc.currency})
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Amount with slider */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-foreground">Amount</label>
                <span className="text-muted-foreground">
                  Available:{' '}
                  <span className="font-semibold text-foreground">
                    {Number(investment.amount).toLocaleString()} {investment.currency}
                  </span>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">
                  {investment.currency}
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  max={investment.amount}
                  step="0.01"
                  className="pl-12 bg-background/50 border-primary/30 text-foreground"
                />
              </div>
              <Slider
                min={0}
                max={Number(investment.amount)}
                step={0.01}
                value={[parsedAmount > 0 ? parsedAmount : 0]}
                onValueChange={([val]) => setAmount(val === 0 ? '' : String(val))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0</span>
                <span>{Number(investment.amount).toLocaleString()} {investment.currency}</span>
              </div>
            </div>

            {/* Type 2 — Destination BU */}
            {activeType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  Destination Business Unit
                </label>
                <Select value={toBUId} onValueChange={setToBUId}>
                  <SelectTrigger className="bg-background/50 border-primary/30 text-foreground text-sm h-9">
                    <SelectValue placeholder="Select destination unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50">
                    {!otherBUs || otherBUs.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No other active units</div>
                    ) : (
                      otherBUs.map((bu) => (
                        <SelectItem key={bu.id} value={bu.id.toString()} className="text-foreground">
                          {bu.name}
                          <span className="text-muted-foreground ml-2 text-xs">{bu.currency}</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {toBUId && otherBUs && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mt-1">
                    <span className="font-semibold text-foreground">{investment.businessUnit.name}</span>
                    <ChevronRight className="h-3 w-3 text-primary" />
                    <span className="font-semibold text-foreground">
                      {otherBUs.find((b) => b.id.toString() === toBUId)?.name}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Type 3 — External fields */}
            {activeType === 'ACCOUNT_TO_EXTERNAL' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">External Wallet / IBAN</label>
                  <Input
                    type="text"
                    placeholder="0x... or IBAN / account number"
                    value={externalWallet}
                    onChange={(e) => setExternalWallet(e.target.value)}
                    className="bg-background/50 border-primary/30 text-foreground font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Withdrawal Method</label>
                  <Select value={withdrawalMethod} onValueChange={(v) => setWithdrawalMethod(v as WithdrawalMethod)}>
                    <SelectTrigger className="bg-background/50 border-primary/30 text-foreground text-sm h-9">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50">
                      <SelectItem value="CRYPTO" className="text-foreground">Crypto</SelectItem>
                      <SelectItem value="BANK_TRANSFER" className="text-foreground">Bank Transfer</SelectItem>
                      <SelectItem value="CASH" className="text-foreground">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedAccount && (
                  <div className="text-[11px] text-amber-500/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                    Funds will be deducted from account balance:{' '}
                    <span className="font-semibold">{Number(selectedAccount.balance).toLocaleString()} {selectedAccount.currency}</span>
                  </div>
                )}
              </>
            )}

            {/* Optional description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                type="text"
                placeholder="Add a note..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background/50 border-border/50 text-foreground text-sm"
              />
            </div>

            {/* Summary box */}
            {isAmountValid && selectedAccountId && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2 text-xs">
                <p className="text-[10px] uppercase font-bold text-muted opacity-60 tracking-widest">Summary</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-semibold text-foreground">
                    {activeType === 'BUSINESS_UNIT_TO_ACCOUNT' && 'BU → Account'}
                    {activeType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT' && 'BU → BU Transfer'}
                    {activeType === 'ACCOUNT_TO_EXTERNAL' && 'Account → External'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-foreground">
                    {parsedAmount.toLocaleString()} {investment.currency}
                  </span>
                </div>
                {selectedAccount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account</span>
                    <span className="font-semibold text-foreground">{selectedAccount.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {errorMsg}
              </div>
            )}
          </div>
        </ScrollArea>

        {/*  Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-border/50 flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={mutation.isPending}
            className="bg-background/50 border-border/50 text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {mutation.isPending ? (
              <>
                <span className="inline-block mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
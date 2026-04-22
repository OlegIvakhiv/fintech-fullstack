'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Wallet,
  ChevronRight,
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Bitcoin,
  Landmark,
  Banknote,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Investment {
  id: number;
  businessUnit: { id: number; name: string; currency: string };
  amount: number;
  currency: string;
}

interface Account {
  id: number;
  name: string;
  balance: number;
  currency: string;
}

interface BusinessUnit {
  id: number;
  name: string;
  currency: string;
  monthlyROI?: number;
  annualROI?: number;
  status: string;
}

type WithdrawalType =
  | 'BUSINESS_UNIT_TO_ACCOUNT'
  | 'BUSINESS_UNIT_TO_BUSINESS_UNIT'
  | 'ACCOUNT_TO_EXTERNAL';

type WithdrawalMethod = 'CRYPTO' | 'BANK_TRANSFER' | 'CASH';

interface RateSnapshot {
  [currency: string]: number;
}

interface WithdrawRequestModalProps {
  investment: Investment;
  accounts: Account[];
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: {
  type: WithdrawalType;
  label: string;
  icon: React.ReactNode;
  desc: string;
  badge: string;
  badgeClass: string;
}[] = [
  {
    type: 'BUSINESS_UNIT_TO_ACCOUNT',
    label: 'To Account',
    icon: <ArrowDownToLine className="h-4 w-4" />,
    desc: 'Move funds back to your personal account balance. Stays within the system.',
    badge: 'Internal',
    badgeClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  },
  {
    type: 'BUSINESS_UNIT_TO_BUSINESS_UNIT',
    label: 'Re-invest',
    icon: <ArrowLeftRight className="h-4 w-4" />,
    desc: 'Transfer your investment to a different business unit immediately.',
    badge: 'Transfer',
    badgeClass: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  },
  {
    type: 'ACCOUNT_TO_EXTERNAL',
    label: 'Cash Out',
    icon: <Wallet className="h-4 w-4" />,
    desc: 'Withdraw to an external crypto wallet, bank account, or as cash.',
    badge: 'External',
    badgeClass: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  },
];

const METHOD_META: Record<
  WithdrawalMethod,
  { icon: React.ReactNode; label: string; placeholder: string }
> = {
  CRYPTO: {
    icon: <Bitcoin className="h-3.5 w-3.5" />,
    label: 'Wallet address',
    placeholder: '0x1a2b3c4d5e6f... or bc1q...',
  },
  BANK_TRANSFER: {
    icon: <Landmark className="h-3.5 w-3.5" />,
    label: 'IBAN / Account number',
    placeholder: 'UA21 3000 6000 0026 2001 3717 2001',
  },
  CASH: {
    icon: <Banknote className="h-3.5 w-3.5" />,
    label: 'Reference / contact',
    placeholder: 'Branch location or reference number',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function WithdrawRequestModal({
  investment,
  accounts,
  isOpen,
  onClose,
  token,
}: WithdrawRequestModalProps) {
  const queryClient = useQueryClient();

  // ── Shared state ──
  const [activeType, setActiveType] = useState<WithdrawalType>('BUSINESS_UNIT_TO_ACCOUNT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // ── Type 1 & 2: linked account ──
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.length === 1 ? accounts[0].id.toString() : ''
  );

  // ── Type 2: destination BU ──
  const [toBUId, setToBUId] = useState<string>('');

  // ── Type 3: external ──
  const [externalWallet, setExternalWallet] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState<WithdrawalMethod | ''>('');

  // ── Derived ──
  const parsedAmount = parseFloat(amount);
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount > 0;
  const selectedAccount = accounts.find((a) => a.id.toString() === selectedAccountId);

  // ── Fetch active BUs for Type 2 ──
  const { data: businessUnits, isLoading: buLoading } = useQuery<BusinessUnit[]>({
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

  // ── Fetch exchange rates (for conversion preview) ──
  const { data: rates } = useQuery<RateSnapshot>({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/exchange/rates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch exchange rates');
      return res.json();
    },
    enabled: isOpen && !!token,
    staleTime: 5 * 60 * 1000,
  });

  const otherBUs = businessUnits?.filter(
    (bu) => bu.id !== investment.businessUnit.id && bu.status === 'ACTIVE'
  );
  const selectedToBU = otherBUs?.find((bu) => bu.id.toString() === toBUId);

  // ── Conversion logic (no fee) ───────────────────────────────────────────────
  let conversion = null;

  if (rates && isAmountValid) {
    if (activeType === 'BUSINESS_UNIT_TO_ACCOUNT' && selectedAccount) {
      const fromCurrency = investment.currency;
      const toCurrency = selectedAccount.currency;
      if (fromCurrency !== toCurrency && rates[fromCurrency] && rates[toCurrency]) {
        const convertedAmount = parsedAmount * (rates[fromCurrency] / rates[toCurrency]);
        conversion = {
          fromCurrency,
          toCurrency,
          convertedAmount,
          rate: rates[fromCurrency] / rates[toCurrency],
        };
      }
    }

    if (activeType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT' && selectedAccount && selectedToBU) {
      const fromCurrency = investment.currency;
      const toCurrency = selectedToBU.currency;
      if (fromCurrency !== toCurrency && rates[fromCurrency] && rates[toCurrency]) {
        const convertedAmount = parsedAmount * (rates[fromCurrency] / rates[toCurrency]);
        conversion = {
          fromCurrency,
          toCurrency,
          convertedAmount,
          rate: rates[fromCurrency] / rates[toCurrency],
        };
      }
    }
  }

  // ── Validation ──
  function validate(): boolean {
    if (!isAmountValid) {
      setErrorMsg('Enter a valid amount greater than 0');
      return false;
    }

    if (activeType === 'BUSINESS_UNIT_TO_ACCOUNT') {
      if (parsedAmount > Number(investment.amount)) {
        setErrorMsg(`Amount exceeds your investment of ${Number(investment.amount).toLocaleString()} ${investment.currency}`);
        return false;
      }
      if (!selectedAccountId) {
        setErrorMsg('Please select a destination account');
        return false;
      }
    }

    if (activeType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT') {
      if (parsedAmount > Number(investment.amount)) {
        setErrorMsg(`Amount exceeds your investment of ${Number(investment.amount).toLocaleString()} ${investment.currency}`);
        return false;
      }
      if (!selectedAccountId) {
        setErrorMsg('Please select your linked account');
        return false;
      }
      if (!toBUId) {
        setErrorMsg('Please select a destination business unit');
        return false;
      }
    }

    if (activeType === 'ACCOUNT_TO_EXTERNAL') {
      if (!selectedAccountId) {
        setErrorMsg('Please select a source account');
        return false;
      }
      const acct = accounts.find((a) => a.id.toString() === selectedAccountId);
      if (acct && parsedAmount > parseFloat(acct.balance.toString())) {
        setErrorMsg(`Insufficient balance. Account has ${parseFloat(acct.balance.toString()).toLocaleString()} ${acct.currency}`);
        return false;
      }
      if (!externalWallet.trim()) {
        setErrorMsg('Please enter your external wallet / IBAN / reference');
        return false;
      }
      if (!withdrawalMethod) {
        setErrorMsg('Please select a withdrawal method');
        return false;
      }
    }

    setErrorMsg('');
    return true;
  }

  // ── Mutation ──
  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        accountId: parseInt(selectedAccountId),
        withdrawalType: activeType,
        amount: parsedAmount,
        description: description.trim() || undefined,
      };

      if (activeType === 'BUSINESS_UNIT_TO_ACCOUNT') {
        body.fromBusinessUnitId = investment.businessUnit.id;
      }

      if (activeType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT') {
        body.fromBusinessUnitId = investment.businessUnit.id;
        body.toBusinessUnitId = parseInt(toBUId);
      }

      if (activeType === 'ACCOUNT_TO_EXTERNAL') {
        body.externalWallet = externalWallet.trim();
        body.withdrawalMethod = withdrawalMethod;
      }

      const res = await fetch('http://localhost:3001/withdrawal-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Request failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      setSubmitted(true);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    },
  });

  function handleSubmit() {
    if (!validate()) return;
    mutation.mutate();
  }

  function handleClose() {
    setAmount('');
    setDescription('');
    setErrorMsg('');
    setToBUId('');
    setExternalWallet('');
    setWithdrawalMethod('');
    setActiveType('BUSINESS_UNIT_TO_ACCOUNT');
    setSubmitted(false);
    setSelectedAccountId(accounts.length === 1 ? accounts[0].id.toString() : '');
    onClose();
  }

  function switchTab(type: WithdrawalType) {
    setActiveType(type);
    setErrorMsg('');
    setToBUId('');
    setExternalWallet('');
    setWithdrawalMethod('');
  }

  // ── Summary line helpers ──
  const summaryType = {
    BUSINESS_UNIT_TO_ACCOUNT: `${investment.businessUnit.name} → ${selectedAccount?.name ?? '—'}`,
    BUSINESS_UNIT_TO_BUSINESS_UNIT: `${investment.businessUnit.name} → ${selectedToBU?.name ?? '—'}`,
    ACCOUNT_TO_EXTERNAL: `${selectedAccount?.name ?? '—'} → External (${withdrawalMethod || '—'})`,
  }[activeType];

  const maxAmount =
    activeType === 'ACCOUNT_TO_EXTERNAL'
      ? selectedAccount
        ? parseFloat(selectedAccount.balance.toString())
        : 0
      : Number(investment.amount);

  const currency =
    activeType === 'ACCOUNT_TO_EXTERNAL'
      ? selectedAccount?.currency ?? investment.currency
      : investment.currency;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden flex flex-col h-[88vh] bg-card border-border/50">

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-border/50 flex-shrink-0">
          <DialogTitle className="text-lg font-bold text-foreground">
            Withdrawal Request
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            From{' '}
            <span className="font-semibold text-primary">{investment.businessUnit.name}</span>
            {' '}·{' '}
            <span className="font-semibold text-foreground">
              {Number(investment.amount).toLocaleString()} {investment.currency}
            </span>
            {' '}invested
          </p>
        </div>

        {/* ── Success state ── */}
        {submitted ? (
          <div className="flex flex-col items-center justify-center flex-1 px-6 py-10 text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground mb-1">Request Submitted</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your withdrawal request is pending admin approval. You'll see it in your request history.
              </p>
            </div>
            <div className="bg-background/50 border border-border/50 rounded-xl p-4 w-full text-left space-y-2 text-xs mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-semibold text-foreground">
                  {TABS.find((t) => t.type === activeType)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-foreground">
                  {parsedAmount.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route</span>
                <span className="font-semibold text-foreground text-right max-w-[180px] truncate">
                  {summaryType}
                </span>
              </div>
            </div>
            <Button
              onClick={handleClose}
              className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* ── Scrollable form ── */}
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-5">

                {/* Type selector tabs */}
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-60 mb-2.5 tracking-widest">
                    Withdrawal type
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {TABS.map((tab) => (
                      <button
                        key={tab.type}
                        onClick={() => switchTab(tab.type)}
                        className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all text-xs font-semibold
                          ${activeType === tab.type
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'bg-background/40 border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                          }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${tab.badgeClass}`}>
                          {tab.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    {TABS.find((t) => t.type === activeType)?.desc}
                  </p>
                </div>

                {/* ── TYPE 1 & 2: Account selector (linked account) ── */}
                {(activeType === 'BUSINESS_UNIT_TO_ACCOUNT' ||
                  activeType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {activeType === 'BUSINESS_UNIT_TO_ACCOUNT'
                        ? 'Destination account'
                        : 'Linked account'}
                    </label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger className="bg-background border-border text-foreground text-sm h-9 hover:border-primary/50">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="bg-popover border-border shadow-xl z-[200]">
                        {accounts.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No accounts found</div>
                        ) : (
                          accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id.toString()} className="text-foreground">
                              <span className="font-medium">{acc.name}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                {parseFloat(acc.balance.toString()).toLocaleString()} {acc.currency}
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* ── Amount ── */}
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <label className="text-xs font-semibold text-foreground">Amount</label>
                    <span className="text-[11px] text-muted-foreground">
                      {activeType === 'ACCOUNT_TO_EXTERNAL'
                        ? selectedAccount
                          ? <>Balance: <span className="font-semibold text-foreground">{parseFloat(selectedAccount.balance.toString()).toLocaleString()} {selectedAccount.currency}</span></>
                          : 'Select account first'
                        : <>Available: <span className="font-semibold text-foreground">{Number(investment.amount).toLocaleString()} {investment.currency}</span></>
                      }
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">
                      {currency}
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setErrorMsg('');
                      }}
                      min="0"
                      max={maxAmount}
                      step="0.01"
                      className="pl-12 bg-background/50 border-primary/30 text-foreground"
                    />
                  </div>
                </div>

                {/* ── CONVERSION PREVIEW (no fee) ── */}
                {conversion && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 space-y-1.5 text-xs">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">
                      Currency conversion
                    </p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You withdraw</span>
                      <span className="font-semibold text-foreground">
                        {parsedAmount.toLocaleString()} {conversion.fromCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exchange rate</span>
                      <span className="font-medium text-foreground tabular-nums">
                        1 {conversion.fromCurrency} = {conversion.rate.toFixed(4)} {conversion.toCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-primary/20 pt-1.5">
                      <span className="font-semibold text-foreground">You receive</span>
                      <span className="font-bold text-primary tabular-nums text-sm">
                        {conversion.convertedAmount.toFixed(2)} {conversion.toCurrency}
                      </span>
                    </div>
                  </div>
                )}

                {/* ── TYPE 3: External conversion note (no fee) ── */}
                {activeType === 'ACCOUNT_TO_EXTERNAL' && selectedAccount && isAmountValid && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span className="font-semibold">Currency conversion</span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      The amount will be deducted in <strong>{selectedAccount.currency}</strong>.
                      Conversion to your selected external currency will happen at the destination using the current NBU rate.
                    </p>
                  </div>
                )}

                {/* ── TYPE 2: Destination BU ── */}
                {activeType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      Destination business unit
                    </label>
                    <Select value={toBUId} onValueChange={setToBUId}>
                      <SelectTrigger className="bg-background border-border text-foreground text-sm h-9 hover:border-primary/50">
                        <SelectValue placeholder={buLoading ? 'Loading…' : 'Select destination unit'} />
                      </SelectTrigger>
                     <SelectContent position="popper" className="bg-popover border-border shadow-xl z-[200]">
                        {buLoading ? (
                          <div className="p-2 text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                          </div>
                        ) : !otherBUs || otherBUs.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No other active units</div>
                        ) : (
                          otherBUs.map((bu) => (
                            <SelectItem key={bu.id} value={bu.id.toString()} className="text-foreground">
                              <span className="font-medium">{bu.name}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                {bu.currency}
                                {bu.monthlyROI != null && (
                                  <span className="ml-1 text-emerald-400">{bu.monthlyROI}%/mo</span>
                                )}
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>

                    {/* Transfer route preview */}
                    {toBUId && selectedToBU && (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                        <span className="font-semibold text-foreground">{investment.businessUnit.name}</span>
                        <ChevronRight className="h-3 w-3 text-primary flex-shrink-0" />
                        <span className="font-semibold text-foreground">{selectedToBU.name}</span>
                        {selectedToBU.annualROI != null && (
                          <span className="ml-auto text-emerald-400 font-semibold">{selectedToBU.annualROI}% APY</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TYPE 3: Account selector + external fields ── */}
                {activeType === 'ACCOUNT_TO_EXTERNAL' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Source account</label>
                      <Select value={selectedAccountId} onValueChange={(v) => { setSelectedAccountId(v); setErrorMsg(''); }}>
                        <SelectTrigger className="bg-background border-border text-foreground text-sm h-9 hover:border-primary/50">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="bg-popover border-border shadow-xl z-[200]">
                          {accounts.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">No accounts found</div>
                          ) : (
                            accounts.map((acc) => {
                              const bal = parseFloat(acc.balance.toString());
                              const insufficient = isAmountValid && parsedAmount > bal;
                              return (
                                <SelectItem
                                  key={acc.id}
                                  value={acc.id.toString()}
                                  disabled={insufficient}
                                  className="text-foreground"
                                >
                                  <span className={`font-medium ${insufficient ? 'opacity-40' : ''}`}>
                                    {acc.name}
                                  </span>
                                  <span className={`ml-2 text-xs ${insufficient ? 'text-destructive/60' : 'text-muted-foreground'}`}>
                                    {bal.toLocaleString()} {acc.currency}
                                    {insufficient && ' — insufficient'}
                                  </span>
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>

                      {selectedAccount && isAmountValid && parsedAmount > parseFloat(selectedAccount.balance.toString()) && (
                        <div className="flex items-center gap-2 text-[11px] text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          Insufficient balance. Available:{' '}
                          <span className="font-semibold">
                            {parseFloat(selectedAccount.balance.toString()).toLocaleString()} {selectedAccount.currency}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Withdrawal method</label>
                      <Select value={withdrawalMethod} onValueChange={(v) => { setWithdrawalMethod(v as WithdrawalMethod); setExternalWallet(''); }}>
                        <SelectTrigger className="bg-background border-border text-foreground text-sm h-9 hover:border-primary/50">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="bg-popover border-border shadow-xl z-[200]">
                          <SelectItem value="CRYPTO" className="text-foreground">
                            <span className="flex items-center gap-2"><Bitcoin className="h-3.5 w-3.5 text-amber-400" /> Crypto</span>
                          </SelectItem>
                          <SelectItem value="BANK_TRANSFER" className="text-foreground">
                            <span className="flex items-center gap-2"><Landmark className="h-3.5 w-3.5 text-blue-400" /> Bank Transfer</span>
                          </SelectItem>
                          <SelectItem value="CASH" className="text-foreground">
                            <span className="flex items-center gap-2"><Banknote className="h-3.5 w-3.5 text-emerald-400" /> Cash</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {withdrawalMethod && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          {METHOD_META[withdrawalMethod].icon}
                          {METHOD_META[withdrawalMethod].label}
                        </label>
                        <Input
                          type="text"
                          placeholder={METHOD_META[withdrawalMethod].placeholder}
                          value={externalWallet}
                          onChange={(e) => { setExternalWallet(e.target.value); setErrorMsg(''); }}
                          className={`bg-background/50 border-primary/30 text-foreground ${
                            withdrawalMethod === 'CRYPTO' ? 'font-mono text-xs' : 'text-sm'
                          }`}
                        />
                      </div>
                    )}

                    <div className="flex items-start gap-2 text-[11px] text-amber-500/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        Funds will leave the system permanently once approved by an admin.
                        Double-check your {withdrawalMethod === 'CRYPTO' ? 'wallet address' : withdrawalMethod === 'BANK_TRANSFER' ? 'IBAN' : 'details'}.
                      </span>
                    </div>
                  </>
                )}

                {/* ── Optional description ── */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Note <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Add a note for the admin…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-background/50 border-border/50 text-foreground text-sm"
                  />
                </div>

                {/* ── Summary ── */}
                {isAmountValid && selectedAccountId && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-60 tracking-widest">
                      Summary
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-semibold text-foreground">
                          {TABS.find((t) => t.type === activeType)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-bold text-primary text-sm">
                          {parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Route</span>
                        <span className="font-semibold text-foreground text-right">{summaryType}</span>
                      </div>
                      {activeType === 'ACCOUNT_TO_EXTERNAL' && withdrawalMethod && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Method</span>
                          <span className="font-semibold text-foreground capitalize">
                            {withdrawalMethod.replace('_', ' ').toLowerCase()}
                          </span>
                        </div>
                      )}
                      {activeType === 'ACCOUNT_TO_EXTERNAL' && externalWallet && (
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground flex-shrink-0">Destination</span>
                          <span className={`font-semibold text-foreground text-right truncate max-w-[200px] ${withdrawalMethod === 'CRYPTO' ? 'font-mono text-[10px]' : ''}`}>
                            {externalWallet}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Error ── */}
                {errorMsg && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* ── Footer ── */}
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
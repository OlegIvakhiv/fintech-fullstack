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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, LayoutGrid, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BusinessUnit {
  id: number;
  name: string;
  currency: string;
  monthlyROI?: number;
  annualROI?: number;
}

interface AllocationRow {
  businessUnitId: number | '';
  weight: number | '';
}

export default function CreateFundModal({
  token,
  isOpen,
  onClose,
}: {
  token: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [allocations, setAllocations] = useState<AllocationRow[]>([
    { businessUnitId: '', weight: '' },
  ]);
  const [error, setError] = useState('');

  // Fetch available business units
  const { data: businessUnits = [] } = useQuery<BusinessUnit[]>({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/business-units', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch business units');
      return res.json();
    },
    enabled: isOpen && !!token,
  });

  const totalWeight = allocations.reduce(
    (s, a) => s + (typeof a.weight === 'number' ? a.weight : 0),
    0,
  );
  const weightOk = Math.abs(totalWeight - 100) <= 0.01;
  const isValid =
    name.trim() &&
    currency.trim() &&
    allocations.length > 0 &&
    allocations.every((a) => a.businessUnitId !== '' && typeof a.weight === 'number' && a.weight > 0) &&
    weightOk;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:3001/funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          currency,
          allocations: allocations.map((a) => ({
            businessUnitId: a.businessUnitId,
            weight: a.weight,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create fund');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      handleClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    setCurrency('USD');
    setAllocations([{ businessUnitId: '', weight: '' }]);
    setError('');
    onClose();
  };

  const addRow = () =>
    setAllocations((prev) => [...prev, { businessUnitId: '', weight: '' }]);

  const removeRow = (idx: number) =>
    setAllocations((prev) => prev.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: keyof AllocationRow, value: number | string) =>
    setAllocations((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    );

  // IDs already picked in other rows (to avoid duplicates)
  const usedIds = allocations.map((a) => a.businessUnitId).filter(Boolean);

  const weightColor =
    totalWeight === 0
      ? 'text-muted-foreground'
      : weightOk
      ? 'text-green-400'
      : totalWeight > 100
      ? 'text-destructive'
      : 'text-yellow-400';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl bg-card border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Create New Fund
          </DialogTitle>
          <DialogDescription>
            Define a fund and assign business unit allocations. Weights must sum to exactly 100%.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Fund name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Fund Name *</label>
            <Input
              placeholder="e.g. Billions Fund"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              className="bg-background/50 border-primary/30"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Description</label>
            <Input
              placeholder="Optional short description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background/50 border-primary/30"
            />
          </div>

          {/* Currency */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Currency *</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="bg-background border-border text-foreground hover:border-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-popover border-border shadow-xl z-[200]">
                {['USD', 'EUR', 'GBP', 'BTC', 'ETH'].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Allocations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Business Unit Allocations *
              </label>
              <span className={`text-xs font-bold tabular-nums ${weightColor}`}>
                {totalWeight.toFixed(1)}% / 100%
                {weightOk && <CheckCircle2 className="inline h-3 w-3 ml-1" />}
              </span>
            </div>

            {/* Weight progress bar */}
            <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  weightOk ? 'bg-green-500' : totalWeight > 100 ? 'bg-destructive' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(totalWeight, 100)}%` }}
              />
            </div>

            <div className="space-y-2">
              {allocations.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  {/* BU selector */}
                  <Select
                    value={row.businessUnitId !== '' ? row.businessUnitId.toString() : ''}
                    onValueChange={(v) => {
                      updateRow(idx, 'businessUnitId', parseInt(v));
                      setError('');
                    }}
                  >
                    <SelectTrigger className="flex-1 bg-background border-border text-foreground text-sm h-9 hover:border-primary/50">
                      <SelectValue placeholder="Select business unit" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-popover border-border shadow-xl z-[200]">
                      {businessUnits
                        .filter(
                          (bu) =>
                            !usedIds.includes(bu.id) || bu.id === row.businessUnitId,
                        )
                        .map((bu) => (
                          <SelectItem key={bu.id} value={bu.id.toString()}>
                            <span className="font-medium">{bu.name}</span>
                            {bu.monthlyROI != null && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {bu.monthlyROI}%/mo
                              </span>
                            )}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {/* Weight input */}
                  <div className="relative w-24">
                    <Input
                      type="number"
                      placeholder="0"
                      min="0.01"
                      max="100"
                      step="0.01"
                      value={row.weight === '' ? '' : row.weight}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                        updateRow(idx, 'weight', val);
                        setError('');
                      }}
                      className="bg-background/50 border-primary/20 h-9 pr-6 text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      %
                    </span>
                  </div>

                  {/* Remove row */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeRow(idx)}
                    disabled={allocations.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={addRow}
              className="w-full border-dashed border-primary/30 text-primary hover:bg-primary/5 h-8 text-xs"
              disabled={businessUnits.length === 0 || allocations.length >= businessUnits.length}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Business Unit
            </Button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded px-3 py-2 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
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
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Create Fund
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

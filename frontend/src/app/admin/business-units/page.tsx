'use client';

// adminunitpage

import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Building, Plus, Edit2, Trash2, Eye, AlertCircle, BarChart3, Save, X, Users, Layers } from "lucide-react";
import { useRouter } from 'next/navigation';

// ========== TYPES ==========

interface ROIRecord {
  id: number;
  month: number;
  year: number;
  monthlyROI: number;
  totalPoolValue: number;
  totalDistributed: number;
   currency: string;
}

interface BusinessUnit {
  id: number;
  name: string;
  description?: string;
  currency: string;
  monthlyROI?: number;
  annualROI?: number;
  status: string;
  roiHistory?: ROIRecord[];
  totalPoolValue?: number;
  investorCount?: number;
}

// ========== HELPER FUNCTIONS ==========

const getMonthName = (month: number) => {
  return new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'short' });
};

const sortROIRecords = (records: ROIRecord[]) => {
  return [...records].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });
};

const getMostRecentROI = (records: ROIRecord[]) => {
  const sorted = sortROIRecords(records);
  return sorted[0] || null;
};

const isFutureDate = (month: number, year: number) => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  return year > currentYear || (year === currentYear && month > currentMonth);
};

const calculateAnnualROI = (monthlyROI: number) => {
  return ((1 + monthlyROI / 100) ** 12 - 1) * 100;
};

// ========== CREATE/EDIT UNIT MODAL ==========

function CreateEditUnitModal({
  isOpen,
  onClose,
  unit,
  token,
  queryClient,
}: {
  isOpen: boolean;
  onClose: () => void;
  unit?: BusinessUnit;
  token: string;
  queryClient: any;
}) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [formData, setFormData] = useState({
    name: unit?.name || '',
    description: unit?.description || '',
    currency: unit?.currency || 'USD',
    monthlyROI: unit?.monthlyROI || 0,
    month: currentMonth,
    year: currentYear,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const method = unit ? 'PATCH' : 'POST';
      const url = unit
        ? `http://localhost:3001/business-units/${unit.id}`
        : 'http://localhost:3001/business-units';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          currency: formData.currency,
          monthlyROI: parseFloat(formData.monthlyROI.toString()),
          month: formData.month,
          year: formData.year,
        }),
      });
      if (!res.ok) throw new Error(unit ? 'Update failed' : 'Creation failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
      handleClose();
    },
  });

  const handleClose = () => {
    setFormData({
      name: unit?.name || '',
      description: unit?.description || '',
      currency: unit?.currency || 'USD',
      monthlyROI: unit?.monthlyROI || 0,
      month: currentMonth,
      year: currentYear,
    });
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    if (!unit && isFutureDate(formData.month, formData.year)) {
      alert('Cannot create with future date');
      return;
    }
    saveMutation.mutate();
  };

  const isEditMode = !!unit;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Business Unit' : 'Create Business Unit'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update unit details' : 'Create a new business unit'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-background/50 border-border h-8 text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-background/50 border-border h-8 text-sm"
            />
          </div>

          {/* Currency */}
          <div className="space-y-1">
            <label className="text-xs font-semibold">Currency</label>
            <Select
              value={formData.currency}
              onValueChange={(val) => setFormData({ ...formData, currency: val })}
            >
              <SelectTrigger className="bg-background/50 border-border text-foreground h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="UAH">UAH</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Initial Monthly ROI */}
          <div className="space-y-1">
            <label className="text-xs font-semibold">Current Month ROI (%)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="1.5"
              value={formData.monthlyROI}
              onChange={(e) =>
                setFormData({ ...formData, monthlyROI: parseFloat(e.target.value) || 0  })
              }
              className="bg-background/50 border-border h-8 text-sm"
              min="0"
            />
          </div>

          {!isEditMode && (
            <>
              {/* Month (Create only) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Month</label>
                  <Select
                    value={formData.month.toString()}
                    onValueChange={(val) =>
                      setFormData({ ...formData, month: parseInt(val) })
                    }
                  >
                    <SelectTrigger className="bg-background/50 border-border h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {getMonthName(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year (Create only) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Year</label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) })
                    }
                    className="bg-background/50 border-border h-8 text-sm"
                    min={currentYear}
                  />
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1 h-8 text-sm">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || saveMutation.isPending}
              className="flex-1 h-8 text-sm"
            >
              {saveMutation.isPending ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========== ROI EDITOR ROW ==========

function ROIEditorRow({
  record,
  allRecords,
  onSave,
  onDelete,
  token,
  buId,
  buCurrency,
}: {
  record: ROIRecord;
  allRecords: ROIRecord[];
  onSave: () => void;
  onDelete: (recordId: number) => void;
  token: string;
  buId: number;
  buCurrency: string;
}) {
  const [editData, setEditData] = useState(record);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');

    if (isFutureDate(editData.month, editData.year)) {
      setError('Cannot set future date');
      return;
    }

    const isDifferentDate = editData.month !== record.month || editData.year !== record.year;
    if (isDifferentDate) {
      const duplicate = allRecords.find(
        (r) => r.month === editData.month && r.year === editData.year && r.id !== record.id
      );
      if (duplicate) {
        setError(`Record for ${getMonthName(editData.month)} ${editData.year} exists`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:3001/business-units/${buId}/roi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          month: editData.month,
          year: editData.year,
          monthlyROI: parseFloat(editData.monthlyROI.toString()),
          totalPoolValue: parseFloat(editData.totalPoolValue.toString()),
          totalDistributed: parseFloat(editData.totalDistributed.toString()),
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSave();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setError('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this ROI record?')) return;

    try {
      const res = await fetch(`http://localhost:3001/business-units/${buId}/roi/${record.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      onDelete(record.id);
    } catch (err) {
      console.error(err);
      alert('Failed to delete ROI');
    }
  };

  const monthName = `${getMonthName(editData.month)} ${editData.year}`;

  if (isEditing) {
    return (
      <>
        <tr className="border-b border-border/50 bg-white/[0.03]">
          <td className="py-2 px-3">
            <Select
              value={`${editData.month}-${editData.year}`}
              onValueChange={(val) => {
                const [m, y] = val.split('-');
                setEditData({ ...editData, month: parseInt(m), year: parseInt(y) });
                setError('');
              }}
            >
              <SelectTrigger className="bg-background/50 border-border text-foreground h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {Array.from({ length: 12 }, (_, i) => {
                  const month = i + 1;
                  return (
                    <SelectItem key={month} value={`${month}-${editData.year}`} className="text-foreground text-xs">
                      {getMonthName(month)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </td>
          <td className="py-2 px-3">
            <Input
              type="number"
              step="0.1"
              value={editData.monthlyROI}
             onChange={(e) => setEditData({ ...editData, monthlyROI: parseFloat(e.target.value) || 0 })}
              className="bg-background/50 border-border text-xs h-8 w-16"
              min="0"
            />
          </td>
          <td className="py-2 px-3">
            <Input
              type="number"
              step="0.01"
              value={editData.totalPoolValue}
              onChange={(e) => setEditData({ ...editData, totalPoolValue: parseFloat(e.target.value) || 0  })}
              className="bg-background/50 border-border text-xs h-8 w-24"
              min="0"
            />
          </td>
          <td className="py-2 px-3">
            <Input
              type="number"
              step="0.01"
              value={editData.totalDistributed}
              onChange={(e) =>
                setEditData({ ...editData, totalDistributed: parseFloat(e.target.value) || 0  })
              }
              className="bg-background/50 border-border text-xs h-8 w-24"
              min="0"
            />
          </td>
          <td className="py-2 px-3 text-right">
            <div className="flex gap-1 justify-end">
              <Button size="sm" className="h-7 px-2 text-xs bg-primary hover:bg-primary/90" onClick={handleSave} disabled={isSaving}>
                <Save className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setEditData(record);
                  setIsEditing(false);
                  setError('');
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </td>
        </tr>
        {error && (
          <tr className="border-b border-border/50 bg-destructive/10">
            <td colSpan={5} className="py-2 px-3 text-xs text-destructive">
              {error}
            </td>
          </tr>
        )}
      </>
    );
  }

return (
  <tr className="border-b border-border/50 hover:bg-white/[0.02]">
    <td className="py-2 px-3 text-xs font-medium">{monthName}</td>
    <td className="py-2 px-3 text-xs">
      <span className="text-primary font-semibold">{record.monthlyROI}%</span>
    </td>
    <td className="py-2 px-3 text-xs">
      <span className="text-muted-foreground text-[10px] mr-1">{record.currency || buCurrency}</span>
      {parseFloat(record.totalPoolValue.toString()).toLocaleString()}
    </td>
    <td className="py-2 px-3 text-xs">
      <span className="text-muted-foreground text-[10px] mr-1">{record.currency || buCurrency}</span>
      {parseFloat(record.totalDistributed.toString()).toFixed(2)}
    </td>
    <td className="py-2 px-3 text-right">
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setIsEditing(true)}>
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </td>
  </tr>
);
}

// ========== ADD ROI MODAL ==========

function AddROIModal({
  isOpen,
  onClose,
  buId,
  token,
  onSuccess,
  buCurrency,
}: {
  isOpen: boolean;
  onClose: () => void;
  buId: number;
  token: string;
  onSuccess: () => void;
  buCurrency: string;
}) {
  const today = new Date();
  const [formData, setFormData] = useState({
    month: today.getMonth() + 1,
    year: today.getFullYear(),
    monthlyROI: 0,
    totalPoolValue: 0,
    totalDistributed: 0,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (isFutureDate(formData.month, formData.year)) {
      setError('Cannot add future date');
      return;
    }

    if (formData.monthlyROI < 0 || formData.totalPoolValue < 0 || formData.totalDistributed < 0) {
      setError('Values must be positive');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/business-units/${buId}/roi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          month: formData.month,
          year: formData.year,
          monthlyROI: parseFloat(formData.monthlyROI.toString()),
          totalPoolValue: parseFloat(formData.totalPoolValue.toString()),
          totalDistributed: parseFloat(formData.totalDistributed.toString()),
        }),
      });
      if (!res.ok) throw new Error('Failed to add ROI');
      onSuccess();
      handleClose();
    } catch (err) {
      setError('Failed to add ROI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      month: today.getMonth() + 1,
      year: today.getFullYear(),
      monthlyROI: 0,
      totalPoolValue: 0,
      totalDistributed: 0,
    });
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>Add ROI Record</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Month</label>
              <Select
                value={formData.month.toString()}
                onValueChange={(val) =>
                  setFormData({ ...formData, month: parseInt(val) })
                }
              >
                <SelectTrigger className="bg-background/50 border-border h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {getMonthName(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Year</label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: parseInt(e.target.value) })
                }
                className="bg-background/50 border-border h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold">Monthly ROI (%)</label>
            <Input
              type="number"
              step="0.1"
              value={formData.monthlyROI}
              onChange={(e) =>
                setFormData({ ...formData, monthlyROI: parseFloat(e.target.value) || 0  })
              }
              className="bg-background/50 border-border h-8 text-xs"
              min="0"
            />
          </div>

          <div className="space-y-1">
           <label className="text-xs font-semibold">
  Pool Value <span className="text-muted-foreground font-normal">({buCurrency})</span>
</label>
            <Input
              type="number"
              step="0.01"
              value={formData.totalPoolValue}
              onChange={(e) =>
                setFormData({ ...formData, totalPoolValue: parseFloat(e.target.value) || 0  })
              }
              className="bg-background/50 border-border h-8 text-xs"
              min="0"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold">
  Distributed <span className="text-muted-foreground font-normal">({buCurrency})</span>
</label>
            <Input
              type="number"
              step="0.01"
              value={formData.totalDistributed}
              onChange={(e) =>
                setFormData({ ...formData, totalDistributed: parseFloat(e.target.value) || 0  })
              }
              className="bg-background/50 border-border h-8 text-xs"
              min="0"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded px-2 py-1">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1 h-8 text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 h-8 text-xs"
            >
              {isLoading ? 'Adding...' : 'Add ROI'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========== BUSINESS UNIT DETAIL MODAL ==========

function BusinessUnitDetailModal({
  unit,
  isOpen,
  onClose,
  token,
  queryClient,
}: {
  unit: BusinessUnit | null;
  isOpen: boolean;
  onClose: () => void;
  token: string;
  queryClient: any;
}) {
  const [showAddROI, setShowAddROI] = useState(false);

  const { data: fullUnit } = useQuery({
    queryKey: ['business-unit-detail', unit?.id],
    queryFn: async () => {
      if (!unit?.id) throw new Error('No unit ID');
      const res = await fetch(`http://localhost:3001/business-units/${unit.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch unit');
      return res.json();
    },
    enabled: isOpen && !!unit?.id,
  });

  const displayUnit = fullUnit || unit;
  if (!displayUnit) return null;

  const sortedROIHistory = fullUnit?.roiHistory ? sortROIRecords(fullUnit.roiHistory) : [];
  const mostRecentROI = getMostRecentROI(sortedROIHistory);
  const currentMonthlyROI = mostRecentROI?.monthlyROI ?? displayUnit.monthlyROI;
  const currentAnnualROI = currentMonthlyROI ? calculateAnnualROI(currentMonthlyROI) : undefined;

  const handleROIDelete = () => {
    queryClient.invalidateQueries({ queryKey: ['business-unit-detail', unit?.id] });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-card border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{displayUnit.name}</DialogTitle>
          <DialogDescription className="text-sm">
            {displayUnit.currency} • {displayUnit.description || 'No description'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card className="bg-background/50 border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Currency</p>
                <p className="text-xl font-bold text-foreground">{displayUnit.currency}</p>
              </CardContent>
            </Card>

            {currentMonthlyROI !== undefined && (
              <Card className="bg-accent/10 border border-accent/20">
                <CardContent className="p-3">
                  <p className="text-xs text-accent mb-1">Current Monthly ROI</p>
                  <p className="text-xl font-bold text-accent">{currentMonthlyROI}%</p>
                  {currentAnnualROI && (
                    <p className="text-xs text-accent/70">({currentAnnualROI.toFixed(2)}% annual)</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="bg-background/50 border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Pool Size
                </p>
                <p className="text-xl font-bold text-foreground">
  <span className="text-sm text-muted-foreground mr-1">{displayUnit.currency}</span>
  {(displayUnit.totalPoolValue || 0).toLocaleString()}
</p>
              </CardContent>
            </Card>

            <Card className="bg-background/50 border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Investors
                </p>
                <p className="text-xl font-bold text-foreground">{displayUnit.investorCount || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* ROI History Table */}
          {fullUnit?.roiHistory && fullUnit.roiHistory.length > 0 && (
            <Card className="bg-background/50 border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    ROI History ({fullUnit.roiHistory.length} months)
                  </CardTitle>
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setShowAddROI(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add ROI
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-white/[0.02]">
                        <th className="text-left py-2 px-3 font-semibold">Month</th>
                        <th className="text-left py-2 px-3 font-semibold">Monthly ROI</th>
                        <th className="text-left py-2 px-3 font-semibold">Pool Value</th>
                        <th className="text-left py-2 px-3 font-semibold">Distributed</th>
                        <th className="text-right py-2 px-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedROIHistory.map((record: ROIRecord) => (
  <ROIEditorRow
    key={record.id}
    record={record}
    allRecords={fullUnit.roiHistory}
    onSave={() =>
      queryClient.invalidateQueries({ queryKey: ['business-unit-detail', unit?.id] })
    }
    onDelete={handleROIDelete}
    token={token}
    buId={fullUnit.id}
    buCurrency={fullUnit.currency}
  />
))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {!fullUnit?.roiHistory || fullUnit.roiHistory.length === 0 && (
            <Card className="bg-background/50 border-border">
              <CardContent className="py-8 text-center">
                <BarChart3 className="h-12 w-12 text-muted mx-auto mb-2 opacity-30" />
                <p className="text-sm text-muted-foreground mb-4">No ROI history</p>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setShowAddROI(true)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add First ROI
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogClose asChild>
          <Button variant="outline" className="w-full mt-4">
            Close
          </Button>
        </DialogClose>
      </DialogContent>

<AddROIModal
  isOpen={showAddROI}
  onClose={() => setShowAddROI(false)}
  buId={displayUnit.id}
  token={token}
  buCurrency={displayUnit.currency}
  onSuccess={() => {
    queryClient.invalidateQueries({ queryKey: ['business-unit-detail', unit?.id] });
    setShowAddROI(false);
  }}
/>
    </Dialog>
  );
}

// ========== MAIN PAGE COMPONENT ==========

export default function AdminBusinessUnitsPage() {
  const { token, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<BusinessUnit | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [detailUnit, setDetailUnit] = useState<BusinessUnit | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: units, isLoading: isUnitsLoading } = useQuery<BusinessUnit[]>({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/business-units', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch units');
      return res.json();
    },
    enabled: !!token && user?.role === 'ADMIN',
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:3001/business-units/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
    },
  });

  if (isAuthLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6">
            <SidebarTrigger className="-ml-1 text-muted" />
            <h1 className="text-sm font-medium text-accent">Loading...</h1>
          </header>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4 opacity-50" />
            <p className="text-destructive font-semibold">Access Denied</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent">Manage Business Units</h1>
        </header>

        <main className="p-6 flex flex-col gap-6 w-full max-w-[1200px] mx-auto">
          <div className="flex justify-end">
            <Button className="bg-primary hover:bg-primary/90 text-black h-9" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Unit
            </Button>
          </div>

          {isUnitsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : units && units.length > 0 ? (
            <Card className="bg-card border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-white/[0.02]">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Currency</th>
                      <th className="text-left py-3 px-4 font-semibold">Monthly ROI</th>
                      <th className="text-left py-3 px-4 font-semibold">Annual ROI</th>
                      <th className="text-right py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((unit) => {
                      const mostRecentROI = unit.roiHistory ? getMostRecentROI(unit.roiHistory) : null;
                      const displayMonthlyROI = mostRecentROI?.monthlyROI ?? unit.monthlyROI;
                      const displayAnnualROI = displayMonthlyROI ? calculateAnnualROI(displayMonthlyROI) : undefined;

                      return (
                        <tr key={unit.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-medium">{unit.name}</td>
                          <td className="py-3 px-4">{unit.currency}</td>
                          <td className="py-3 px-4">
                            {displayMonthlyROI ? (
                              <span className="text-primary font-semibold">{displayMonthlyROI}%</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">Not set</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {displayAnnualROI ? (
                              <span className="text-accent font-semibold">{displayAnnualROI.toFixed(2)}%</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs"
                                onClick={() => {
                                  setDetailUnit(unit);
                                  setIsDetailOpen(true);
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs"
                                onClick={() => {
                                  setEditingUnit(unit);
                                  setIsEditOpen(true);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`Delete ${unit.name}?`))
                                    deleteMutation.mutate(unit.id);
                                }}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Building className="h-12 w-12 text-muted mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">No business units yet</p>
                <Button className="mt-4 bg-primary text-black" onClick={() => setIsCreateOpen(true)}>
                  Create First Unit
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </SidebarInset>

      {/* Modals */}
      <CreateEditUnitModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        token={token!}
        queryClient={queryClient}
      />
      {editingUnit && (
        <CreateEditUnitModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setEditingUnit(null);
          }}
          unit={editingUnit}
          token={token!}
          queryClient={queryClient}
        />
      )}
      {detailUnit && (
        <BusinessUnitDetailModal
          unit={detailUnit}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          token={token!}
          queryClient={queryClient}
        />
      )}
    </SidebarProvider>
  );
}
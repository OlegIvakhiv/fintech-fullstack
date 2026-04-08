'use client';

// ────────────── adminbusiness-units ─────────────────────────────────────────────────────────────
// This page allows admins to manage business units, which are the investment vehicles offered on the platform. 
// Admins can create new units, edit existing ones, and view detailed information about each unit's performance and ROI history.
// The page is structured with a sidebar for navigation and a main content area where the list of business units is displayed in a table. Each unit has actions for viewing details, editing, and deleting.

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
import { Building, Plus, Edit2, Trash2, Eye, AlertCircle, BarChart3, Save, X } from "lucide-react";
import { useRouter } from 'next/navigation';

// ────────────── Types ───────────────────────────────────────────────────────────────────────────────

// ROI record type definition, representing the monthly performance of a business unit, used in the detail view for tracking historical ROI data.
interface ROIRecord {
  id: number;
  month: number;
  year: number;
  monthlyROI: number;
  totalPoolValue: number;
  totalDistributed: number;
}

// Business unit type definition, which includes basic info and optional ROI history for detailed view
interface BusinessUnit {
  id: number;
  name: string;
  description?: string;
  currency: string;
  interestRate: number;
  monthlyROI?: number;
  annualROI?: number;
  status: string;
  roiHistory?: ROIRecord[];
}

// ────────────── Helpers ───────────────────────────────────────────────────────────────────────────────
// Helper function to convert month number to month name, used in the ROI editor for better readability of the month selection.
const getMonthName = (month: number) => {
  return new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'short' });
};

// Component for displaying and editing a single ROI record in the history table
function ROIEditorRow({
  record,
  onSave,
  token,
  buId,
}: {
  record: ROIRecord;
  onSave: () => void;
  token: string;
  buId: number;
}) {
  const [editData, setEditData] = useState(record);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Save the edited ROI record to the backend
  const handleSave = async () => {
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
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSave();
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving ROI:', err);
      alert('Failed to save ROI');
    } finally {
      setIsSaving(false);
    }
  };
// Format month-year for display in non-edit mode
  const monthName = `${getMonthName(editData.month)} ${editData.year}`;

  // Render the component differently based on whether it's in editing mode or not. 
  // In editing mode, show input fields and save/cancel buttons. In non-editing mode, show the data and an edit button.
  if (isEditing) {
    return (
      <tr className="border-b border-border/50 bg-white/[0.03]">
        <td className="py-2 px-3">
          <Select
            value={`${editData.month}-${editData.year}`}
            onValueChange={(val) => {
              const [m, y] = val.split('-');
              setEditData({ ...editData, month: parseInt(m), year: parseInt(y) });
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
            onChange={(e) => setEditData({ ...editData, monthlyROI: parseFloat(e.target.value) })}
            className="bg-background/50 border-border text-xs h-8 w-16"
            min="0"
          />
        </td>
        <td className="py-2 px-3">
          <Input
            type="number"
            step="0.01"
            value={editData.totalPoolValue}
            onChange={(e) => setEditData({ ...editData, totalPoolValue: parseFloat(e.target.value) })}
            className="bg-background/50 border-border text-xs h-8 w-24"
            min="0"
          />
        </td>
        <td className="py-2 px-3 text-right text-emerald-500 font-semibold text-xs">
          ${(parseFloat(editData.totalPoolValue.toString()) * parseFloat(editData.monthlyROI.toString()) / 100).toFixed(2)}
        </td>
        <td className="py-2 px-3 text-right">
          <div className="flex gap-1 justify-end">
            <Button
              size="sm"
              className="h-7 px-2 text-xs bg-primary hover:bg-primary/90"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setEditData(record);
                setIsEditing(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  // Render the component in non-edit mode
  // Show the data and an edit button. The month is displayed as a formatted string (e.g., "Jan 2024") for better readability.
  return (
    <tr className="border-b border-border/50 hover:bg-white/[0.02]">
      <td className="py-2 px-3 text-xs font-medium">{monthName}</td>
      <td className="py-2 px-3 text-xs">
        <span className="text-primary font-semibold">{record.monthlyROI}%</span>
      </td>
      <td className="py-2 px-3 text-xs">
        ${parseFloat(record.totalPoolValue.toString()).toLocaleString()}
      </td>
      <td className="py-2 px-3 text-right text-emerald-500 font-semibold text-xs">
        ${parseFloat(record.totalDistributed.toString()).toFixed(2)}
      </td>
      <td className="py-2 px-3 text-right">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => setIsEditing(true)}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      </td>
    </tr>
  );
}

// Component for displaying detailed information about a business unit, including its ROI history. 
// This modal is opened when the admin clicks the "view" action on a business unit in the table.
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
          <div className="grid grid-cols-3 gap-2">
            <Card className="bg-background/50 border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Base Yield</p>
                <p className="text-xl font-bold text-primary">{displayUnit.interestRate}%</p>
              </CardContent>
            </Card>

            <Card className="bg-background/50 border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Currency</p>
                <p className="text-xl font-bold text-foreground">{displayUnit.currency}</p>
              </CardContent>
            </Card>

            {displayUnit.monthlyROI && (
              <Card className="bg-accent/10 border border-accent/20">
                <CardContent className="p-3">
                  <p className="text-xs text-accent mb-1">Current ROI</p>
                  <p className="text-xl font-bold text-accent">{displayUnit.monthlyROI}%</p>
                  {displayUnit.annualROI && (
                    <p className="text-xs text-accent/70">({displayUnit.annualROI.toFixed(2)}% annual)</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ROI History Table */}
          {fullUnit?.roiHistory && fullUnit.roiHistory.length > 0 && (
            <Card className="bg-background/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  ROI History ({fullUnit.roiHistory.length} months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-white/[0.02]">
                        <th className="text-left py-2 px-3 font-semibold">Month</th>
                        <th className="text-left py-2 px-3 font-semibold">ROI</th>
                        <th className="text-left py-2 px-3 font-semibold">Pool Value</th>
                        <th className="text-left py-2 px-3 font-semibold">Distributed</th>
                        <th className="text-right py-2 px-3 font-semibold">Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullUnit.roiHistory.map((record: ROIRecord) => (
                        <ROIEditorRow
                          key={record.id}
                          record={record}
                          onSave={() => queryClient.invalidateQueries({ queryKey: ['business-unit-detail', unit?.id] })}
                          token={token}
                          buId={fullUnit.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <DialogClose asChild>
            <Button variant="outline" className="w-full h-9">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Component for creating or editing a business unit. 
// This modal is used for both creating new units and editing existing ones, with the form fields pre-filled when editing.
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
  const [formData, setFormData] = useState({
    name: unit?.name || '',
    description: unit?.description || '',
    currency: unit?.currency || 'USD',
    interestRate: unit?.interestRate || 0,
    monthlyROI: unit?.monthlyROI || 0,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = unit
        ? `http://localhost:3001/business-units/${unit.id}`
        : 'http://localhost:3001/business-units';

      const method = unit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error(`Failed to ${unit ? 'update' : 'create'} unit`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
      handleClose();
    },
  });

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      currency: 'USD',
      interestRate: 0,
      monthlyROI: 0,
    });
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.name) return;
    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>{unit ? 'Edit Business Unit' : 'Create Business Unit'}</DialogTitle>
          <DialogDescription>
            {unit ? 'Update unit details' : 'Create a new investment unit with initial ROI'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold">Unit Name</label>
            <Input
              placeholder="e.g., Solar Panels Fund"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-background/50 border-border h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold">Description</label>
            <textarea
              placeholder="What does this unit invest in?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 text-sm"
              rows={2}
            />
          </div>

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
                <SelectItem value="USD" className="text-foreground">USD</SelectItem>
                <SelectItem value="EUR" className="text-foreground">EUR</SelectItem>
                <SelectItem value="UAH" className="text-foreground">UAH</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold">Base Interest Rate (%)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="1.9"
              value={formData.interestRate}
              onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) })}
              className="bg-background/50 border-border h-8 text-sm"
              min="0"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold">Initial Monthly ROI (%)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="1.5"
              value={formData.monthlyROI}
              onChange={(e) => setFormData({ ...formData, monthlyROI: parseFloat(e.target.value) })}
              className="bg-background/50 border-border h-8 text-sm"
              min="0"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1 h-8 text-sm">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || saveMutation.isPending}
            className="flex-1 h-8 text-sm"
          >
            {saveMutation.isPending ? 'Saving...' : unit ? 'Update' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main page component for managing business units. 
// Displays a list of units in a table with actions to view details, edit, or delete each unit. Also includes a button to create new units. 
// Access is restricted to admin users, and the page uses React Query for data fetching and mutations.
export default function AdminBusinessUnitsPage() {
  const { token, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<BusinessUnit | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [detailUnit, setDetailUnit] = useState<BusinessUnit | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch business units
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

  // Create business unit mutation
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

  // Loading state
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

  // Access denied
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

  // Render the page
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
            <Button
              className="bg-primary hover:bg-primary/90 text-black h-9"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Unit
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
                      <th className="text-left py-3 px-4 font-semibold">Base Rate</th>
                      <th className="text-left py-3 px-4 font-semibold">Monthly ROI</th>
                      <th className="text-left py-3 px-4 font-semibold">Annual ROI</th>
                      <th className="text-right py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((unit) => (
                      <tr key={unit.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-medium">{unit.name}</td>
                        <td className="py-3 px-4">{unit.currency}</td>
                        <td className="py-3 px-4">{unit.interestRate}%</td>
                        <td className="py-3 px-4">
                          {unit.monthlyROI ? (
                            <span className="text-primary font-semibold">{unit.monthlyROI}%</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Not set</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {unit.annualROI ? (
                            <span className="text-accent font-semibold">{unit.annualROI.toFixed(2)}%</span>
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
                                if (confirm(`Delete ${unit.name}?`)) {
                                  deleteMutation.mutate(unit.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Building className="h-12 w-12 text-muted mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">No business units yet</p>
                <Button
                  className="mt-4 bg-primary text-black"
                  onClick={() => setIsCreateOpen(true)}
                >
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
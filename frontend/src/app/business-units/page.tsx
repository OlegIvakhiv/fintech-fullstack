'use client';

// businessUnitsPage - main page for listing all business units, with modals for details and investing

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Building, TrendingUp, Search, BarChart3, Zap, Edit2, Save, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import InvestModal from '@/app/transaction-components/InvestModal';


// TYPES
// This is a simplified version of the ROI record for history listing and editing.
interface ROIRecord {
  id: number;
  month: number;
  year: number;
  monthlyROI: number;
  totalPoolValue: number;
  totalDistributed: number;
}
// This is a simplified version of the BusinessUnit type for listing purposes.
interface BusinessUnit {
  id: number;
  name: string;
  description?: string;
  currency: string;
  interestRate: number;
  monthlyROI?: number;
  annualROI?: number;
  lastROIUpdate?: string;
  roiHistory?: ROIRecord[];
  status?: string;
  balance?: number;
  totalPoolValue?: number;
  investorCount?: number;
}

// This is the structure of the earnings breakdown returned by the API for a given investment amount.
interface InvestorEarnings {
  totalEarnings: number;
  roiBreakdown: {
    month: string;
    year: number;
    monthlyROI: number;
    poolValue: number;
    earned: number;
  }[];
}



// UTILS
// Convert month number to short name (e.g. 1 -> Jan)
const getMonthName = (month: number) => {
  return new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'short' });
};

// Component for displaying and editing a single ROI record in the history table. Admins can edit, others see read-only.
function ROIEditorRow({
  record,
  onSave,
  token,
  buId,
  isAdmin,
}: {
  record: ROIRecord;
  onSave: () => void;
  token: string;
  buId: number;
  isAdmin: boolean;
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

  // Display month name for the record
  const monthName = `${getMonthName(editData.month)} ${editData.year}`;

  // Admins can edit, others see read-only
  if (isEditing && isAdmin) {
    return (
      <tr className="border-b border-border/50 bg-white/[0.03]">
        <td className="py-2 px-3">
          <select
            value={`${editData.month}-${editData.year}`}
            onChange={(e) => {
              const [m, y] = e.target.value.split('-');
              setEditData({ ...editData, month: parseInt(m), year: parseInt(y) });
            }}
            className="px-2 py-1 bg-background/50 border border-border rounded text-foreground text-xs"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              return (
                <option key={month} value={`${month}-${editData.year}`}>
                  {getMonthName(month)}
                </option>
              );
            })}
          </select>
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

  // Non-admins see read-only
  // Admins see edit button, others do not
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
      {isAdmin && (
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
      )}
    </tr>
  );
}


// Component for the business unit detail modal, which includes the earnings calculator and ROI history. Opened from the main page when clicking "Details".
function BusinessUnitDetailModal({
  unit,
  isOpen,
  onClose,
  token,
  user,
}: {
  unit: BusinessUnit | null;
  isOpen: boolean;
  onClose: () => void;
  token: string;
  user: any;
}) {
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const isInvestor = user?.role === 'INVESTOR';

  // Fetch full unit details
  const { data: fullUnit } = useQuery<BusinessUnit>({
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

  // Fetch investor earnings
  const { data: earnings } = useQuery<InvestorEarnings>({
    queryKey: ['investor-earnings', unit?.id, investmentAmount],
    queryFn: async () => {
      if (!unit?.id || !investmentAmount || isNaN(parseFloat(investmentAmount))) return null;
      const res = await fetch(
        `http://localhost:3001/business-units/${unit.id}/investor-earnings/${investmentAmount}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isOpen && !!unit?.id && !!investmentAmount && isInvestor,
  });

  // Fetch current month's ROI for real-time projection in the calculator
  const { data: currentMonth } = useQuery({
    queryKey: ['current-month-projection', unit?.id, investmentAmount],
    queryFn: async () => {
      if (!unit?.id || !investmentAmount || isNaN(parseFloat(investmentAmount))) return null;
      const res = await fetch(
        `http://localhost:3001/business-units/${unit.id}/current-month-projection/${investmentAmount}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isOpen && !!unit?.id && !!investmentAmount && isInvestor,
  });


  const displayUnit = fullUnit || unit;
  if (!displayUnit) return null;

  // Earnings Calculator
  // This is used to show real-time earnings to investors
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl bg-card border-border/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{displayUnit.name}</DialogTitle>
            <DialogDescription className="text-sm">
              {displayUnit.currency} • {displayUnit.description || 'No description'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Unit Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {/* Base Yield */}
              <Card className="bg-background/50 border-border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Base Yield</p>
                  <p className="text-xl font-bold text-primary">{displayUnit.interestRate}%</p>
                </CardContent>
              </Card>

              {/* Currency */}
              <Card className="bg-background/50 border-border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Currency</p>
                  <p className="text-xl font-bold text-foreground">{displayUnit.currency}</p>
                </CardContent>
              </Card>

              {/* Current ROI (if exists) */}
              {displayUnit.monthlyROI !== undefined && displayUnit.monthlyROI !== null && (
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

              {/* Pool Size - NEW */}
              <Card className="bg-background/50 border-border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Pool Size</p>
                  <p className="text-xl font-bold text-foreground">
                    ${(displayUnit.totalPoolValue || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              {/* Investor Count - NEW */}
              <Card className="bg-background/50 border-border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Investors</p>
                  <p className="text-xl font-bold text-foreground">
                    {displayUnit.investorCount || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* INVESTOR ONLY: Earnings Calculator */}
            {isInvestor && (
              <Card className="bg-accent/10 border border-accent/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Earnings Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Input for investment amount */}
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Investment amount"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      className="bg-background/50 border-accent/30 flex-1 text-sm h-9"
                      min="0"
                      step="0.01"
                    />
                    <span className="flex items-center px-3 bg-background/50 border border-border rounded text-sm font-semibold">
                      {displayUnit.currency}
                    </span>
                  </div>

                  {/* Current Month Projection (new) */}
                  {currentMonth && currentMonth.monthlyROI > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-muted-foreground">
                          Current month ROI
                        </span>
                        <span className="text-sm font-bold text-primary">
                          {currentMonth.monthlyROI}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Estimated profit this month</span>
                        <span className="text-lg font-bold text-emerald-500">
                          +${currentMonth.projectedEarnings.toFixed(2)} {currentMonth.currency}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        * Based on current month’s ROI. Actual may vary.
                      </p>
                    </div>
                  )}

                  {/* Historical earnings breakdown (existing) */}
                  {earnings && (
                    <div className="bg-background/50 border border-border p-3 rounded-lg space-y-2">
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-xs text-muted-foreground">Total historical earnings:</span>
                        <span className="text-lg font-bold text-emerald-500">
                          ${earnings.totalEarnings.toFixed(2)}
                        </span>
                      </div>
                      {earnings.roiBreakdown.length > 0 && (
                        <div className="max-h-[120px] overflow-y-auto space-y-1">
                          {earnings.roiBreakdown.map((row, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{row.month} {row.year}</span>
                              <span className="text-emerald-500">+${row.earned.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Single Proceed button */}
                  {investmentAmount && earnings && (
                    <Button
                      className="w-full bg-accent hover:bg-accent/90 h-9 text-sm font-semibold"
                      onClick={() => setIsInvestModalOpen(true)}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Proceed to Invest {investmentAmount} {displayUnit.currency}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

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
                          {isAdmin && <th className="text-right py-2 px-3 font-semibold">Edit</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {fullUnit.roiHistory.map((record) => (
                          <ROIEditorRow
                            key={record.id}
                            record={record}
                            onSave={() => queryClient.invalidateQueries({ queryKey: ['business-unit-detail', unit?.id] })}
                            token={token}
                            buId={fullUnit.id}
                            isAdmin={isAdmin}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="outline" className="w-full h-9">
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Investment Modal - only opened from detail modal */}
      {isInvestModalOpen && displayUnit && investmentAmount && (
        <InvestModal
          businessUnit={displayUnit}
          isOpen={isInvestModalOpen}
          onClose={() => setIsInvestModalOpen(false)}
          token={token}
        />
      )}
    </>
  );
}

// MAIN PAGE COMPONENT
// This is the main page that lists all business units. Users can click "Details" to open the detail modal with the calculator and ROI history, or "Invest" to go directly to the invest modal.
export default function BusinessUnitsPage() {
  const { token, user, isLoading: isAuthLoading } = useAuth();
  const [selectedUnit, setSelectedUnit] = useState<BusinessUnit | null>(null);
  const [selectedUnitForDirectInvest, setSelectedUnitForDirectInvest] = useState<BusinessUnit | null>(null);

  const { data: units, isLoading: isUnitsLoading } = useQuery<BusinessUnit[]>({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/business-units', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch business units');
      return res.json();
    },
    enabled: !!token,
  });

  // Show loading state while checking auth or fetching units
  if (isAuthLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col text-muted-foreground">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1 text-muted" />
            <div className="h-4 w-[1px] bg-border mx-2" />
            <h1 className="text-sm font-medium text-accent tracking-tight">Investment Opportunities</h1>
          </header>
          <main className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Show loading state while checking auth or fetching units
  if (isUnitsLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col text-muted-foreground">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1 text-muted" />
            <div className="h-4 w-[1px] bg-border mx-2" />
            <h1 className="text-sm font-medium text-accent tracking-tight">Investment Opportunities</h1>
          </header>
          <main className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading investment opportunities...</p>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Main page content
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col text-muted-foreground">

        {/* HEADER */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">Investment Opportunities</h1>
        </header>

        <main className="p-6 flex flex-col gap-8 w-full max-w-[1400px] mx-auto">

          {/* TOOLBAR */}
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted opacity-50" />
              <Input placeholder="Search units..." className="pl-9 bg-card border-border text-xs w-[280px] h-9" />
            </div>
            <div className="flex gap-2 text-[10px] uppercase font-bold tracking-widest opacity-60">
              <TrendingUp className="h-4 w-4 text-primary" />
              Market is open
            </div>
          </div>

          {/* GRID OF UNITS */}
          {!units || units.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl bg-card">
              <Building className="h-12 w-12 text-muted mb-4 opacity-30" />
              <h3 className="text-xl font-bold text-foreground mb-2">No Investment Units Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Check back later for new investment opportunities.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {units.map((unit: BusinessUnit) => (
                <Card key={unit.id} className="bg-card border-border rounded-xl shadow-sm overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-all group">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-muted text-[10px] font-bold tracking-widest uppercase opacity-60">
                        {unit.currency} Unit
                      </CardTitle>
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Building className="h-4 w-4" />
                      </div>
                    </div>
                    <h2 className="text-xl font-bold tracking-tighter text-foreground mt-2">
                      {unit.name}
                    </h2>
                  </CardHeader>

                  <CardContent className="p-4 pt-0">
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                      {unit.description}
                    </p>

                    {/* Show ROI for admins */}
                    {user?.role === 'ADMIN' && unit.monthlyROI !== undefined && unit.monthlyROI !== null && (
                      <div className="mb-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                        <p className="text-[10px] uppercase font-bold text-muted opacity-60 mb-1">
                          Monthly ROI
                        </p>
                        <div className="flex items-baseline justify-between">
                          <p className="text-xl font-bold text-accent">{unit.monthlyROI}%</p>
                          {unit.annualROI && (
                            <p className="text-xs text-muted-foreground">
                              {unit.annualROI.toFixed(2)}% annual
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-end justify-between">
                      <div>
                         <p className="text-[10px] uppercase font-bold text-muted opacity-50">Current ROI</p>
                           <p className="text-2xl font-bold text-primary tracking-tighter">
                           {unit.monthlyROI ? `+${unit.monthlyROI}%` : '—'}
                        </p>
                    </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-muted opacity-50">Status</p>
                        <p className="text-[10px] font-bold text-foreground bg-white/5 px-2 py-0.5 rounded border border-border">ACTIVE</p>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="bg-black/20 px-4 py-3 border-t border-border/50 flex gap-2">
                    {/* Details button - opens modal with calculator */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-background/50 border-border text-xs h-9"
                      onClick={() => setSelectedUnit(unit)}
                    >
                      Details
                    </Button>

                    {/* Invest button - direct to invest modal */}
                    {user?.role === 'INVESTOR' && (
                      <Button
                        size="sm"
                        className="flex-1 bg-primary text-black font-bold text-xs hover:bg-primary/90 h-9"
                        onClick={() => setSelectedUnitForDirectInvest(unit)}
                      >
                        Invest
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </main>
      </SidebarInset>

      {/* Detail Modal (with calculator and ROI history) */}
      <BusinessUnitDetailModal
        unit={selectedUnit}
        isOpen={!!selectedUnit}
        onClose={() => setSelectedUnit(null)}
        token={token!}
        user={user}
      />

      {/* Direct Invest Modal (skip calculator) */}
      {selectedUnitForDirectInvest && (
        <InvestModal
          businessUnit={selectedUnitForDirectInvest}
          isOpen={!!selectedUnitForDirectInvest}
          onClose={() => setSelectedUnitForDirectInvest(null)}
          token={token!}
        />
      )}
    </SidebarProvider>
  );
}
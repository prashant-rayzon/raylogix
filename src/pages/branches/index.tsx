  // ============================================================
// BRANCHES PAGE — Full compact rewrite
// Design principles applied throughout:
//   • Every container: padding halved, font-size tightened
//   • No decorative wrappers — borders only where they carry info
//   • Single-line headers replace multi-row section titles
//   • Redundant labels eliminated (if parent already shows it, child doesn't)
//   • Action buttons: h-7 pill with text-[11px], not h-10 full buttons
//   • Status always = dot or small badge, never a paragraph
//   • All stat boxes: inline chips, not tall cards
// ============================================================

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  IconBuildingWarehouse, IconDoorEnter, IconDoorExit,
  IconRefresh, IconPlus, IconTruck, IconUserCog, IconMapPin,
  IconAlertCircle, IconCheck, IconUsers, IconFileCheck, IconLoader,
  IconChecklist, IconSearch, IconChevronDown, IconCircle,
} from '@tabler/icons-react';

import { branchesService, Branch, BranchAcceptedBid, BranchAssignedLoad, BranchStaffAssignment, BranchTransporter, BranchUser, OperationalRole, VehicleMovement, VehicleRequestType } from '@/api/services/branches/branches.service';
import { Layout } from '@/components/custom/layout';
import { Button } from '@/components/custom/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { ALL_PERMISSIONS, hasPermission } from '@/lib/permissions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ─────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────

type MovementChecks = {
  checkedTransporter: boolean; checkedVehicle: boolean;
  checkedRoute: boolean; checkedBid: boolean;
  rcBook: boolean; insurance: boolean; permit: boolean;
  puc: boolean; fitness: boolean; driverLicense: boolean;
  loadingComplete: boolean; documentsReturned: boolean;
  sealChecked: boolean; exitApproved: boolean;
};

type BranchFormState = {
  name: string; code: string; gstNumber: string; phone: string; email: string;
  contactName: string; contactPhone: string; contactEmail: string;
  line1: string; city: string; state: string; pincode: string;
};

type MovementFormState = {
  branchId: string; loadId: string; bidId: string;
  transporterId: string; transporterName: string;
  vehicleNumber: string; driverName: string; driverPhone: string;
  fromDestination: string; toDestination: string;
  requestType: VehicleRequestType;
  purpose: string; expectedAt: string;
};

type ValidationErrors = Partial<Record<keyof MovementFormState | keyof BranchFormState, string>>;

interface ConfirmDialogState {
  open: boolean;
  action: 'reject' | 'cancel' | null;
  movementId: string | null;
  message: string;
}

interface StaffFiltersState {
  candidateSearch: string;
  assignmentSearch: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface MovementFiltersState {
  search: string;
  status: string;
  transporterId: string;
  loadId: string;
}

type GateRouteMode = 'operations' | 'outbound' | 'inbound';

const DEFAULT_MOVEMENT_CHECKS: MovementChecks = {
  checkedTransporter: false, checkedVehicle: false, checkedRoute: false, checkedBid: false,
  rcBook: false, insurance: false, permit: false, puc: false, fitness: false, driverLicense: false,
  loadingComplete: false, documentsReturned: false, sealChecked: false, exitApproved: false,
};

const VALIDATION_RULES = {
  GST: { pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, message: 'Invalid GST format (e.g. 27AAPFU0939F1ZV)' },
  EMAIL: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
  PHONE: { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit phone number' },
  VEHICLE_NUMBER: { pattern: /^[A-Z]{2}\d{2}[A-Z]{0,2}\d{4}$/, message: 'e.g. GJ01AB1234' },
  PINCODE: { pattern: /^\d{6}$/, message: 'Enter a valid 6-digit pincode' },
} as const;

const ROLE_CONFIG: Record<OperationalRole | 'none', { label: string; icon: ReactNode; description: string }> = {
  none: { label: 'No branch duty', icon: null, description: 'No active branch assignment' },
  branch_manager: { label: 'Branch Manager', icon: <IconUserCog className="h-3.5 w-3.5" />, description: 'Full operational control' },
  watchman: { label: 'Watchman', icon: <IconDoorEnter className="h-3.5 w-3.5" />, description: 'Expected entry and gate in' },
  inspection_officer: { label: 'Inspection Officer', icon: <IconFileCheck className="h-3.5 w-3.5" />, description: 'Inspection and gate out approval' },
};

const REQUEST_TYPE_CONFIG: Record<VehicleRequestType, {
  title: string;
  description: string;
  shortLabel: string;
  purposeOptions: string[];
  defaultPurpose: string;
}> = {
  outbound: {
    title: 'Outbound Load Requests',
    description: 'Manage load requirements moving from your branch or platform to delivery destinations.',
    shortLabel: 'Outbound',
    purposeOptions: ['loading', 'pickup', 'delivery', 'other'],
    defaultPurpose: 'loading',
  },
  inbound: {
    title: 'Inbound Load Requests',
    description: 'Manage load requirements arriving at your branch or platform for unloading and receipt.',
    shortLabel: 'Inbound',
    purposeOptions: ['unloading', 'delivery', 'maintenance', 'other'],
    defaultPurpose: 'unloading',
  },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  expected: { label: 'Expected', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  gate_in_recorded: { label: 'Inside Plant', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  inspection_verified: { label: 'Approved', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  inspection_rejected: { label: 'Rejected', dot: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  gate_out_recorded: { label: 'Exited', dot: 'bg-slate-300', badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  cancelled: { label: 'Cancelled', dot: 'bg-rose-300', badge: 'bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400' },
};

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

const getUserName = (user?: BranchUser) =>
  user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown';

const getUserInitials = (user?: BranchUser) => {
  if (!user) return 'U';
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user.firstName) return user.firstName[0].toUpperCase();
  return (user.email || 'U')[0].toUpperCase();
};

const getRefId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'object' && '_id' in value) return String((value as any)._id || '');
  return String(value);
};

const normalizeVehicleNumber = (value?: string) =>
  String(value || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

const vehicleNumbersMatch = (actual?: string, expected?: string) => {
  if (!expected) return true;
  if (!actual) return false;
  return normalizeVehicleNumber(actual) === normalizeVehicleNumber(expected);
};

const formatMoney = (amount?: number, currency = 'INR') => {
  if (typeof amount !== 'number' || isNaN(amount)) return '—';
  return currency === 'INR' ? `₹${amount.toLocaleString('en-IN')}` : `${currency} ${amount.toLocaleString()}`;
};

const formatDateTime = (value?: string, format: 'full' | 'dateOnly' | 'timeOnly' = 'full') => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      ...(format !== 'timeOnly' ? { day: '2-digit', month: 'short', year: 'numeric' } : {}),
      ...(format !== 'dateOnly' ? { hour: '2-digit', minute: '2-digit' } : {}),
    } as any);
  } catch { return '—'; }
};

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const getLoadVehicleLimit = (load?: BranchAssignedLoad) => {
  const n = Number(load?.numberOfVehicles);
  return (!isNaN(n) && n >= 1) ? n : 1;
};

const getOpenAcceptedBids = (load?: BranchAssignedLoad) =>
  (load?.acceptedBids || []).filter((bid: any) => {
    const remaining = Number(bid?.remainingAllocatedVehicles);
    const allocated = Number(bid?.allocatedVehicles);
    if (!isNaN(remaining)) return remaining > 0;
    if (!isNaN(allocated)) return allocated > 0;
    return true;
  });

const getTransporterOpenVehicleSlots = (loads: BranchAssignedLoad[], transporterId?: string) => {
  if (!transporterId) return 0;

  return loads.reduce((total, load) => {
    const matchingBid = (load.acceptedBids || []).find((bid: any) => String(getBidTransporterId(bid)) === String(transporterId));
    if (!matchingBid) return total;

    const bidRemaining = Number(matchingBid.remainingAllocatedVehicles);
    if (!isNaN(bidRemaining)) return total + Math.max(0, bidRemaining);

    const allocated = Number(matchingBid.allocatedVehicles);
    return total + (isNaN(allocated) ? 0 : Math.max(0, allocated));
  }, 0);
};

const getBidTransporterId = (bid?: BranchAcceptedBid) => {
  if (!bid) return '';
  if (typeof bid.transporterId === 'object') return (bid.transporterId as any)._id || '';
  return bid.transporterId || '';
};

const getMovementLoadNumber = (movement: VehicleMovement) =>
  (typeof movement.loadId === 'object' ? (movement.loadId as any)?.loadNumber : '') ||
  movement.referenceSnapshot?.loadNumber || '';

const getMovementTransporterName = (movement: VehicleMovement) =>
  movement.transporterName ||
  (typeof movement.transporterId === 'object'
    ? (movement.transporterId as any).companyName || (movement.transporterId as any).name || (movement.transporterId as any).email
    : '') || '';

const getMovementChecks = (checks?: Partial<MovementChecks>): MovementChecks =>
  ({ ...DEFAULT_MOVEMENT_CHECKS, ...(checks || {}) });

const getSavedMovementChecks = (movement: VehicleMovement): Partial<MovementChecks> => ({
  checkedTransporter: !!movement.inspection?.checkedTransporter,
  checkedVehicle: !!movement.inspection?.checkedVehicle,
  checkedRoute: !!movement.inspection?.checkedRoute,
  checkedBid: !!movement.inspection?.checkedBid,
  rcBook: !!movement.inspection?.documents?.rcBook,
  insurance: !!movement.inspection?.documents?.insurance,
  permit: !!movement.inspection?.documents?.permit,
  puc: !!movement.inspection?.documents?.puc,
  fitness: !!movement.inspection?.documents?.fitness,
  driverLicense: !!movement.inspection?.documents?.driverLicense,
  loadingComplete: !!movement.gateOut?.checks?.loadingComplete,
  documentsReturned: !!movement.gateOut?.checks?.documentsReturned,
  sealChecked: !!movement.gateOut?.checks?.sealChecked,
  exitApproved: !!movement.gateOut?.checks?.exitApproved,
});

const getMovementRequestType = (movement: VehicleMovement): VehicleRequestType =>
  movement.requestType || movement.referenceSnapshot?.requestType || 'outbound';

const formatCheckLabel = (value: string) =>
  value.replace(/([A-Z])/g, ' $1').trim();

const getStatusCount = (movements: VehicleMovement[], status: VehicleMovement['status']) =>
  movements.filter(m => m.status === status).length;

const getLoadGroupTone = (movements: VehicleMovement[]) => {
  if (movements.some(m => m.status === 'inspection_rejected'))
    return 'border-rose-200/70 bg-rose-50/40 dark:border-rose-900/30 dark:bg-rose-950/10';
  if (movements.some(m => m.status === 'gate_in_recorded'))
    return 'border-amber-200/70 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/10';
  if (movements.some(m => m.status === 'inspection_verified'))
    return 'border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/10';
  return 'border-border/50 bg-background';
};

const getMovementPriority = (status: VehicleMovement['status']) => {
  switch (status) {
    case 'inspection_rejected': return 0;
    case 'gate_in_recorded': return 1;
    case 'inspection_verified': return 2;
    case 'expected': return 3;
    case 'cancelled': return 5;
    case 'gate_out_recorded': return 6;
    default: return 4;
  }
};

const getRowAccent = (status: VehicleMovement['status']) => {
  switch (status) {
    case 'inspection_rejected': return 'border-l-rose-500';
    case 'gate_in_recorded': return 'border-l-amber-500';
    case 'inspection_verified': return 'border-l-emerald-500';
    case 'expected': return 'border-l-slate-400';
    case 'gate_out_recorded': return 'border-l-slate-300';
    case 'cancelled': return 'border-l-rose-300';
    default: return 'border-l-transparent';
  }
};

// ─────────────────────────────────────────────────────────────
// TINY SHARED ATOMS
// ─────────────────────────────────────────────────────────────

/** Coloured dot + label + count — replaces large Badge pills */
function StatusDot({ color, label, count }: { color: 'slate' | 'amber' | 'emerald' | 'rose'; label: string; count: number }) {
  const dots = { slate: 'bg-slate-400', amber: 'bg-amber-500', emerald: 'bg-emerald-500', rose: 'bg-rose-500' };
  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dots[color])} />
      {label} <span className="font-semibold text-foreground">{count}</span>
    </span>
  );
}

/** Compact inline status badge */
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600' };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', cfg.badge)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

/** Pill action button — used for all row-level actions */
function ActionBtn({
  label, icon, onClick, disabled, loading, variant, tooltip,
}: {
  label: string; icon?: ReactNode; onClick: () => void;
  disabled: boolean; loading: boolean;
  variant: 'emerald' | 'blue' | 'amber' | 'primary' | 'destructive';
  tooltip?: string;
}) {
  const styles: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400',
    blue: 'border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-400',
    amber: 'border-amber-200 bg-amber-50/80 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400',
    primary: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };
  const btn = (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn('inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50', styles[variant])}>
      {loading ? <IconLoader className="h-3 w-3 animate-spin" /> : icon}
      {label}
    </button>
  );
  if (!tooltip) return btn;
  return (
    <TooltipProvider><Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="top" className="text-[11px]">{tooltip}</TooltipContent>
    </Tooltip></TooltipProvider>
  );
}

/** Toggle chip for inspection checks */
function CheckChip({ label, checked, disabled, onToggle }: { label: string; checked: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled}
      className={cn('inline-flex h-6 items-center gap-1 rounded-full px-2 text-[10px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-60',
        checked ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground hover:bg-muted/70')}>
      {checked ? <IconCheck className="h-2.5 w-2.5" /> : <IconCircle className="h-2.5 w-2.5" />}
      {label}
    </button>
  );
}

/** Progress bar with label */
function CheckProgress({ total, completed, label }: { total: number; completed: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{completed}/{total}</span>
      </div>
      <Progress value={total > 0 ? Math.round((completed / total) * 100) : 0} className="h-1.5" />
    </div>
  );
}

/** Reusable form field wrapper */
function FormField({ label, error, required, children, description, htmlFor, className }: {
  label: string; error?: string; required?: boolean; children: ReactNode;
  description?: string; htmlFor?: string; className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
      {error && (
        <p className="flex items-center gap-1 text-[10px] text-destructive" role="alert">
          <IconAlertCircle className="h-3 w-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}
function LoadingState({ message, variant = 'default' }: { message: string; variant?: 'default' | 'inline' }) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 py-2">
        <IconLoader className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{message}</span>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <IconTruck className="h-4 w-4 text-primary/60 animate-pulse" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function EmptyState({ 
  message, 
  description, 
  icon, 
  action,
  variant = 'default' 
}: { 
  message: string; 
  description?: string; 
  icon?: ReactNode; 
  action?: ReactNode;
  variant?: 'default' | 'compact';
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3 text-center",
      variant === 'compact' ? 'py-6' : 'py-12'
    )}>
      <div className={cn(
        "rounded-full bg-muted/50 p-4",
        variant === 'compact' ? 'p-3' : 'p-6'
      )}>
        {icon || <IconAlertCircle className="h-6 w-6 text-muted-foreground" />}
      </div>
      <div className="space-y-1">
        <p className={cn(
          "font-medium",
          variant === 'compact' ? 'text-sm' : 'text-base'
        )}>{message}</p>
        {description && (
          <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
function VehicleInfoCard({ movement }: { movement: any }) {
  const requestType = getMovementRequestType(movement);
  const requestMeta = REQUEST_TYPE_CONFIG[requestType];
  const branchName = typeof movement.branchId === 'object'
    ? movement.branchId?.name || movement.branchId?.code
    : '';
  const verificationSummary = movement.inspection?.verificationSummary;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vehicle Detail</p>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <IconTruck className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <p className="text-[12px] font-semibold">{movement.vehicleNumber}</p>
          <p className="text-[10px] text-muted-foreground">
            {movement.driverName || 'No driver'}{movement.driverPhone && ` · ${movement.driverPhone}`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {requestMeta.shortLabel}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
          {movement.purpose || 'delivery'}
        </span>
        {branchName && (
          <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {branchName}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        {[
          ['Load', getMovementLoadNumber(movement) || 'N/A'],
          ['Transporter', getMovementTransporterName(movement) || 'N/A'],
          ['From', movement.fromDestination || 'N/A'],
          ['To', movement.toDestination || 'N/A'],
          ['Expected', formatDateTime(movement.expectedAt)],
          ['Bid Amount', formatMoney(movement.referenceSnapshot?.bidAmount, movement.referenceSnapshot?.currency)],
          ['Expected Vehicle', movement.referenceSnapshot?.expectedVehicleNumber || 'N/A'],
          ['Expected Driver', movement.referenceSnapshot?.expectedDriverName || 'N/A'],
        ].map(([k, v]) => (
          <div key={k}>
            <span className="text-muted-foreground">{k}: </span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
      {(movement.inspection?.notes || movement.gateIn?.notes || movement.gateOut?.notes) && (
        <div className="space-y-1 rounded-md border border-border/50 bg-muted/20 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Recorded Notes</p>
          {movement.gateIn?.notes && <p className="text-[11px]"><span className="font-medium">Gate In:</span> {movement.gateIn.notes}</p>}
          {movement.inspection?.notes && <p className="text-[11px]"><span className="font-medium">Inspection:</span> {movement.inspection.notes}</p>}
          {movement.gateOut?.notes && <p className="text-[11px]"><span className="font-medium">Gate Out:</span> {movement.gateOut.notes}</p>}
        </div>
      )}
      {verificationSummary && (
        <div className="space-y-1 rounded-md border border-border/50 bg-muted/20 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Verification Summary</p>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {[
              ['Transporter', verificationSummary.transporterMatched],
              ['Vehicle', verificationSummary.vehicleMatched],
              ['Driver', verificationSummary.driverMatched],
              ['Route', verificationSummary.routeMatched],
              ['Bid', verificationSummary.bidMatched],
            ].map(([label, ok]) => (
              <span key={String(label)} className={cn('rounded px-1.5 py-0.5', ok ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300')}>
                {label}: {ok ? 'Match' : 'Mismatch'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VEHICLE ROW
// ─────────────────────────────────────────────────────────────

interface VehicleRowProps {
  movement: any; index: number;
  canGateIn: boolean; canInspectMovement: boolean; canGateOut: boolean;
  saving: boolean; operationLoading: boolean;
  notesByMovementId: Record<string, string>;
  setNotesByMovementId: (setter: (prev: Record<string, string>) => Record<string, string>) => void;
  inspectionChecks: Record<string, MovementChecks>;
  setInspectionCheck: (id: string, key: keyof MovementChecks, value: boolean) => void;
  runMovementAction: (id: string, action: 'gate-in' | 'verify' | 'reject' | 'gate-out' | 'reopen' | 'cancel') => void;
  isExpanded: boolean; toggleExpand: () => void;
}

function VehicleRow({
  movement, index, canGateIn, canInspectMovement, canGateOut,
  saving, operationLoading, notesByMovementId, setNotesByMovementId,
  inspectionChecks, setInspectionCheck, runMovementAction, isExpanded, toggleExpand,
}: VehicleRowProps) {
  const requestType = getMovementRequestType(movement);
  const requestMeta = REQUEST_TYPE_CONFIG[requestType];
  const currentChecks = getMovementChecks({
    ...getSavedMovementChecks(movement),
    ...(inspectionChecks[movement._id] || {}),
  });
  const branchName = typeof movement.branchId === 'object'
    ? movement.branchId?.name || movement.branchId?.code
    : '';

  const inspCheckKeys: Array<keyof MovementChecks> = [
    'checkedTransporter', 'checkedVehicle', 'checkedRoute', 'checkedBid',
    'rcBook', 'insurance', 'permit', 'puc', 'fitness', 'driverLicense',
  ];
  const gateOutCheckKeys: Array<keyof MovementChecks> = [
    'loadingComplete', 'documentsReturned', 'sealChecked', 'exitApproved',
  ];

  const allInspDone = inspCheckKeys.every(k => currentChecks[k]);
  const allGateOutDone = gateOutCheckKeys.every(k => currentChecks[k]);
  const missingInsp = inspCheckKeys.filter(k => !currentChecks[k]).map(formatCheckLabel);
  const missingGateOut = gateOutCheckKeys.filter(k => !currentChecks[k]).map(formatCheckLabel);

  const showGateIn = canGateIn && movement.status === 'expected';
  const showInspect = canInspectMovement && movement.status === 'gate_in_recorded';
  const showGateOut = canGateOut && movement.status === 'inspection_verified';
  const showReopen = canInspectMovement && movement.status === 'inspection_rejected';
  const showCancel = canGateIn && ['expected', 'inspection_rejected'].includes(movement.status);
  const isRejected = movement.status === 'inspection_rejected';
  const isCompleted = ['gate_out_recorded', 'cancelled'].includes(movement.status);

  const timeline = (() => {
    const gateInTime = movement.gateIn?.recordedAt;
    const gateOutTime = movement.gateOut?.recordedAt;
    if (gateInTime) {
      const exit = gateOutTime ? ` → ${formatDateTime(gateOutTime, 'timeOnly')}` : '';
      return `In ${formatDateTime(gateInTime, 'timeOnly')}${exit}`;
    }
    if (movement.expectedAt) return `Exp. ${formatDateTime(movement.expectedAt, 'timeOnly')}`;
    return '—';
  })();

  return (
    <>
      <tr className={cn(
        'border-b border-black/5 border-l-2 transition-colors hover:bg-sky-50/30 dark:border-white/5 dark:hover:bg-slate-900/20',
        getRowAccent(movement.status),
        isExpanded && 'bg-sky-50/20 dark:bg-slate-900/10',
      )}>
        {/* # */}
        <td className="w-7 px-2 py-1.5 align-middle text-[10px] text-muted-foreground">{index + 1}</td>

        {/* Vehicle + Driver */}
        <td className="px-2 py-1.5 align-middle">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <IconTruck className="h-3 w-3 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold leading-tight">{movement.vehicleNumber}</p>
              <p className="truncate text-[10px] text-muted-foreground leading-tight">
                {movement.driverName || 'No driver'}{movement.driverPhone && ` · ${movement.driverPhone}`}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {requestMeta.shortLabel}
                </span>
                {branchName && (
                  <span className="rounded-full border border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {branchName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="px-2 py-1.5 align-middle">
          <StatusBadge status={movement.status} />
        </td>

        {/* Timeline */}
        <td className="px-2 py-1.5 align-middle">
          <div className="space-y-0.5">
            <span className="block whitespace-nowrap text-[11px] text-muted-foreground">{timeline}</span>
            <span className="block text-[10px] text-muted-foreground">
              {movement.fromDestination || 'Origin not set'} → {movement.toDestination || 'Destination not set'}
            </span>
          </div>
        </td>

        {/* Actions */}
        <td className="px-2 py-1.5 align-middle">
          <div className="flex flex-wrap items-center gap-1">
            {showGateIn && (
              <ActionBtn label="Gate In" icon={<IconDoorEnter className="h-3 w-3" />}
                onClick={() => runMovementAction(movement._id, 'gate-in')}
                disabled={saving || operationLoading} loading={operationLoading} variant="emerald" tooltip="Record vehicle entry" />
            )}

            {showInspect && (
              <>
                <TooltipProvider><Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <ActionBtn label="Verify" icon={<IconCheck className="h-3 w-3" />}
                        onClick={() => runMovementAction(movement._id, 'verify')}
                        disabled={saving || operationLoading || !allInspDone}
                        loading={operationLoading} variant="primary" />
                    </span>
                  </TooltipTrigger>
                  {!allInspDone && (
                    <TooltipContent side="top" className="max-w-[200px] text-[10px]">
                      Missing: {missingInsp.join(', ')}
                    </TooltipContent>
                  )}
                </Tooltip></TooltipProvider>
                <ActionBtn label="Reject"
                  onClick={() => runMovementAction(movement._id, 'reject')}
                  disabled={saving || operationLoading} loading={operationLoading} variant="destructive" />
              </>
            )}

            {showGateOut && (
              <TooltipProvider><Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <ActionBtn label="Gate Out" icon={<IconDoorExit className="h-3 w-3" />}
                      onClick={() => runMovementAction(movement._id, 'gate-out')}
                      disabled={saving || operationLoading || !allGateOutDone}
                      loading={operationLoading} variant="blue" />
                  </span>
                </TooltipTrigger>
                {!allGateOutDone && (
                  <TooltipContent side="top" className="max-w-[200px] text-[10px]">
                    Missing: {missingGateOut.join(', ')}
                  </TooltipContent>
                )}
              </Tooltip></TooltipProvider>
            )}

            {isRejected && showReopen && (
              <ActionBtn label="Re-open" icon={<IconRefresh className="h-3 w-3" />}
                onClick={() => runMovementAction(movement._id, 'reopen')}
                disabled={saving || operationLoading} loading={operationLoading} variant="amber" />
            )}
            {showCancel && (
              <ActionBtn label="Cancel"
                onClick={() => runMovementAction(movement._id, 'cancel')}
                disabled={saving || operationLoading} loading={operationLoading} variant="destructive" />
            )}

            {isCompleted && movement.status === 'gate_out_recorded' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <IconDoorExit className="h-2.5 w-2.5" /> Exited
              </span>
            )}
            {isCompleted && movement.status === 'cancelled' && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Cancelled</span>
            )}

            <button type="button" onClick={toggleExpand}
              className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted">
              <IconChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
            </button>
          </div>
        </td>
      </tr>

      {/* ── Expanded panel ── */}
      {isExpanded && (
        <tr>
          <td colSpan={5} className="bg-slate-50/50 px-2 py-2 dark:bg-slate-950/20">
            <div className="grid gap-2 md:grid-cols-[1fr_260px]">

              {/* Left: checks + notes */}
              <div className="rounded-lg border border-black/5 bg-white/80 p-2.5 dark:border-white/5 dark:bg-slate-950/40">
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <IconChecklist className="h-3 w-3" /> Inspection & Checks
                </p>

                {(movement.status === 'gate_in_recorded' || movement.status === 'inspection_verified') && (
                  <div className="space-y-1.5">
                    <CheckProgress total={inspCheckKeys.length}
                      completed={inspCheckKeys.filter(k => currentChecks[k]).length} label="Inspection" />
                    <div className="flex flex-wrap gap-1">
                      {inspCheckKeys.map(k => (
                        <CheckChip key={k} label={formatCheckLabel(k)} checked={!!currentChecks[k]}
                          disabled={saving || movement.status === 'inspection_verified'}
                          onToggle={() => setInspectionCheck(movement._id, k, !currentChecks[k])} />
                      ))}
                    </div>

                    {movement.status === 'inspection_verified' && (
                      <>
                        <CheckProgress total={gateOutCheckKeys.length}
                          completed={gateOutCheckKeys.filter(k => currentChecks[k]).length} label="Gate Out" />
                        <div className="flex flex-wrap gap-1">
                          {gateOutCheckKeys.map(k => (
                            <CheckChip key={k} label={formatCheckLabel(k)} checked={!!currentChecks[k]}
                              disabled={saving} onToggle={() => setInspectionCheck(movement._id, k, !currentChecks[k])} />
                          ))}
                        </div>
                      </>
                    )}

                    <Textarea placeholder="Notes…" value={notesByMovementId[movement._id] || ''}
                      onChange={e => setNotesByMovementId(prev => ({ ...prev, [movement._id]: e.target.value }))}
                      className="h-14 resize-none rounded-md text-[11px]" disabled={saving} />
                  </div>
                )}

                {showReopen && (
                  <div className="space-y-1.5">
                    <div className="rounded-md border border-rose-200 bg-rose-50/80 px-2.5 py-1.5 text-[11px] text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                      Rejected during inspection. Add a note, then reopen or cancel.
                    </div>
                    <Textarea placeholder="Follow-up notes…" value={notesByMovementId[movement._id] || ''}
                      onChange={e => setNotesByMovementId(prev => ({ ...prev, [movement._id]: e.target.value }))}
                      className="h-14 resize-none rounded-md text-[11px]" disabled={saving} />
                    <div className="flex gap-1.5">
                      <ActionBtn label="Reopen For Inspection" icon={<IconRefresh className="h-3 w-3" />}
                        onClick={() => runMovementAction(movement._id, 'reopen')}
                        disabled={saving || operationLoading} loading={operationLoading} variant="amber" />
                      {showCancel && (
                        <ActionBtn label="Cancel Entry"
                          onClick={() => runMovementAction(movement._id, 'cancel')}
                          disabled={saving || operationLoading} loading={operationLoading} variant="destructive" />
                      )}
                    </div>
                  </div>
                )}

                {(movement.status === 'expected' || (isCompleted && !showReopen)) && (
                  <p className="text-[11px] text-muted-foreground">
                    {movement.status === 'expected' && 'Scheduled for entry.'}
                    {movement.status === 'gate_out_recorded' && 'Vehicle has exited the plant.'}
                    {movement.status === 'cancelled' && 'Entry was cancelled.'}
                    {isRejected && !showReopen && 'Inspection rejected.'}
                  </p>
                )}
              </div>

              {/* Right: vehicle info */}
              <div className="rounded-lg border border-black/5 bg-white/80 p-2.5 dark:border-white/5 dark:bg-slate-950/40">
                <VehicleInfoCard movement={movement} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// VEHICLE FLOW TAB
// ─────────────────────────────────────────────────────────────

interface VehicleFlowTabProps {
  filteredMovements: VehicleMovement[]; loading: boolean;
  requestType: VehicleRequestType;
  branches: Branch[]; assignedLoads: BranchAssignedLoad[];
  transporters: BranchTransporter[];
  selectedBranchId: string; setSelectedBranchId: (id: string) => void;
  isBranchScopedUser: boolean;
  canCreateMovement: boolean; canGateIn: boolean; canInspectMovement: boolean; canGateOut: boolean;
  saving: boolean; operationLoading: Record<string, boolean>;
  notesByMovementId: Record<string, string>;
  setNotesByMovementId: (s: (p: Record<string, string>) => Record<string, string>) => void;
  inspectionChecks: Record<string, MovementChecks>;
  setInspectionCheck: (id: string, key: keyof MovementChecks, value: boolean) => void;
  runMovementAction: (id: string, action: any) => void;
  setMovementForm: (s: (p: MovementFormState) => MovementFormState) => void;
  resetMovementForm: (branchId?: string) => void;
  setShowVehicleModal: (open: boolean) => void;
  movementForm: MovementFormState;
  expectedMovements: VehicleMovement[]; pendingInspection: VehicleMovement[];
  verifiedMovements: VehicleMovement[]; rejectedMovements: VehicleMovement[];
  movementFilters: MovementFiltersState;
  setMovementFilters: React.Dispatch<React.SetStateAction<MovementFiltersState>>;
  movementPagination: PaginationState;
  movementPage: number;
  setMovementPage: (page: number) => void;
  setMovementPageSize: (limit: number) => void;
  expandedRows: Set<string>; toggleRowExpansion: (id: string) => void;
}

function VehicleFlowTab(props: VehicleFlowTabProps) {
  const {
    filteredMovements, loading, requestType, branches, assignedLoads, transporters,
    selectedBranchId, setSelectedBranchId, isBranchScopedUser, canCreateMovement,
    canGateIn, canInspectMovement, canGateOut, saving, operationLoading,
    notesByMovementId, setNotesByMovementId, inspectionChecks, setInspectionCheck,
    runMovementAction, setMovementForm, resetMovementForm, setShowVehicleModal, movementForm,
    expectedMovements, pendingInspection, verifiedMovements, rejectedMovements,
    movementFilters, setMovementFilters, movementPagination, movementPage, setMovementPage, setMovementPageSize, expandedRows, toggleRowExpansion,
  } = props;
  const requestMeta = REQUEST_TYPE_CONFIG[requestType];

  const groupedLoads = useMemo(() => {
    const loadLookup = new Map(assignedLoads.map(l => [String(l._id), l]));
    const groups = filteredMovements.reduce<Record<string, {
      key: string; label: string; load?: BranchAssignedLoad;
      movements: VehicleMovement[];
      transporters: Record<string, { key: string; name: string; movements: VehicleMovement[] }>;
    }>>((acc, m) => {
      const loadId = getRefId(m.loadId);
      const load = loadId ? loadLookup.get(loadId) : undefined;
      const loadLabel = getMovementLoadNumber(m) || load?.loadNumber || 'Manual / No Load';
      const groupKey = loadId || `manual:${loadLabel}`;
      if (!acc[groupKey]) acc[groupKey] = { key: groupKey, label: loadLabel, load, movements: [], transporters: {} };
      const name = getMovementTransporterName(m) || 'Unknown';
      const tKey = getRefId(m.transporterId) || name;
      if (!acc[groupKey].transporters[tKey]) acc[groupKey].transporters[tKey] = { key: tKey, name, movements: [] };
      acc[groupKey].movements.push(m);
      acc[groupKey].transporters[tKey].movements.push(m);
      return acc;
    }, {});
    return Object.values(groups).sort((a, b) => {
      const am = a.key.startsWith('manual:'), bm = b.key.startsWith('manual:');
      if (am !== bm) return am ? 1 : -1;
      return a.label.localeCompare(b.label);
    });
  }, [assignedLoads, filteredMovements]);

  return (
    <div className="space-y-2">
      {/* ── Summary chip strip (replaces stat cards) ── */}
      <div className="sticky top-0 z-20 -mx-1 border-b bg-background/95 px-1 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'Expected', count: expectedMovements.length, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
          { label: 'Inspection', count: pendingInspection.length, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
          { label: 'Exit Ready', count: verifiedMovements.length, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'Rejected', count: rejectedMovements.length, color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
        ].map(({ label, count, color }) => (
          <span key={label} className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium', color)}>
            {label} <span className="font-bold">{count}</span>
          </span>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {canCreateMovement && (
            <Button size="sm" className="h-7 gap-1 rounded-full px-3 text-[11px]"
              onClick={() => {
                setMovementForm(prev => ({ ...prev, branchId: selectedBranchId || prev.branchId }));
                resetMovementForm(selectedBranchId || movementForm.branchId);
                setShowVehicleModal(true);
              }}>
              <IconPlus className="h-3 w-3" /> New Entry
            </Button>
          )}
          <Select value={selectedBranchId || 'all'} onValueChange={v => setSelectedBranchId(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-7 w-[170px] rounded-full text-[11px]" disabled={isBranchScopedUser}>
              <IconBuildingWarehouse className="mr-1.5 h-3 w-3" />
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              {!isBranchScopedUser && <SelectItem value="all">All branches</SelectItem>}
              {branches.map(b => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        </div>
      </div>

      <Card className="overflow-hidden border-border/50 shadow-sm">
        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <IconTruck className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[12px] font-semibold">{requestMeta.title}</span>
            <span className="text-[10px] text-muted-foreground">
              {requestMeta.description} · {filteredMovements.length} request{filteredMovements.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input value={movementFilters.search} onChange={e => setMovementFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder={`Search ${requestMeta.shortLabel.toLowerCase()} request, vehicle, driver...`}
                className="h-7 w-[220px] rounded-lg pl-7 text-[11px]" />
            </div>
            <Select value={movementFilters.status} onValueChange={(v: any) => setMovementFilters(prev => ({ ...prev, status: v }))}>
              <SelectTrigger className="h-7 w-[150px] rounded-lg text-[11px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="expected">Awaiting Entry</SelectItem>
                <SelectItem value="gate_in_recorded">In Inspection</SelectItem>
                <SelectItem value="inspection_verified">Ready To Exit</SelectItem>
                <SelectItem value="inspection_rejected">Rejected</SelectItem>
                <SelectItem value="gate_out_recorded">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={movementFilters.transporterId || 'all'} onValueChange={v => setMovementFilters(prev => ({ ...prev, transporterId: v === 'all' ? '' : v }))}>
              <SelectTrigger className="h-7 w-[170px] rounded-lg text-[11px]">
                <SelectValue placeholder="All transporters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All transporters</SelectItem>
                {transporters.map(t => (
                  <SelectItem key={t._id} value={t._id}>{t.companyName || t.name || t.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={movementFilters.loadId || 'all'} onValueChange={v => setMovementFilters(prev => ({ ...prev, loadId: v === 'all' ? '' : v }))}>
              <SelectTrigger className="h-7 w-[170px] rounded-lg text-[11px]">
                <SelectValue placeholder="All load requirements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All load requirements</SelectItem>
                {assignedLoads.map(load => (
                  <SelectItem key={load._id} value={load._id}>{load.loadNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setMovementFilters({ search: '', status: 'all', transporterId: '', loadId: '' })}
            >
              Clear
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? <LoadingState message="Loading movements…" />
            : filteredMovements.length === 0 ? (
              <EmptyState message="No load requests found" description="Adjust search or filters"
                icon={<IconTruck className="h-9 w-9" />}
                action={<Button variant="outline" size="sm" onClick={() => setMovementFilters({ search: '', status: 'all', transporterId: '', loadId: '' })}>Clear Filters</Button>} />
            ) : (
              <div className="divide-y divide-border/40">
                {groupedLoads.map(group => {
                  const expC = getStatusCount(group.movements, 'expected');
                  const inspC = getStatusCount(group.movements, 'gate_in_recorded');
                  const verC = getStatusCount(group.movements, 'inspection_verified');
                  const rejC = getStatusCount(group.movements, 'inspection_rejected');
                  const doneC = getStatusCount(group.movements, 'gate_out_recorded');
                  const targetVehicles = group.load?.numberOfVehicles || group.movements.length || 1;
                  const progressValue = Math.min(100, Math.round(((doneC + verC) / targetVehicles) * 100));
                  const tGroups = Object.values(group.transporters)
                    .map(tg => ({
                      ...tg,
                      movements: [...tg.movements].sort((a, b) =>
                        getMovementPriority(a.status) - getMovementPriority(b.status) ||
                        String(a.expectedAt || a.createdAt || '').localeCompare(String(b.expectedAt || b.createdAt || ''))
                      )
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name));

                  return (
                    <div key={group.key} className={cn(getLoadGroupTone(group.movements))}>
                      {/* Load group header — single compact row */}
                      <div className="space-y-1 border-b border-black/5 px-3 py-1.5 dark:border-white/5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Load Requirement</span>
                        <span className="text-[12px] font-semibold text-foreground">{group.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {group.load?.pickupLocation?.city || group.movements[0]?.fromDestination || '—'}
                          {' → '}
                          {group.load?.deliveryLocation?.city || group.movements[0]?.toDestination || '—'}
                        </span>
                        {(group.load?.vehicleType || group.load?.numberOfVehicles) && (
                          <span className="text-[10px] text-muted-foreground">
                            {group.load?.vehicleType}{group.load?.numberOfVehicles ? ` · req ${group.load.numberOfVehicles}` : ''}
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-3">
                          <StatusDot color="slate" label="Exp" count={expC} />
                          <StatusDot color="amber" label="Insp" count={inspC} />
                          <StatusDot color="emerald" label="Ready" count={verC} />
                          {rejC > 0 && <StatusDot color="rose" label="Rej" count={rejC} />}
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(group.movements[0]?.referenceSnapshot?.bidAmount, group.movements[0]?.referenceSnapshot?.currency)}
                          </span>
                          {group.load?.status && (
                            <span className="rounded-full border border-border/50 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {group.load.status}
                            </span>
                          )}
                        </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={progressValue} className="h-1.5 flex-1" />
                          <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                            {doneC}/{targetVehicles} exited
                          </span>
                        </div>
                      </div>

                      {/* Transporter sub-groups */}
                      <div className="divide-y divide-border/20">
                        {tGroups.map(tg => (
                          <div key={tg.key}>
                            {/* Transporter strip */}
                            <div className="flex items-center gap-2 bg-muted/10 px-3 py-1">
                              <IconUsers className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="text-[11px] font-semibold">{tg.name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {tg.movements.length} entr{tg.movements.length === 1 ? 'y' : 'ies'}
                              </span>
                              <div className="ml-auto flex items-center gap-2">
                                <StatusDot color="slate" label="Exp" count={tg.movements.filter(m => m.status === 'expected').length} />
                                <StatusDot color="amber" label="Insp" count={tg.movements.filter(m => m.status === 'gate_in_recorded').length} />
                                <StatusDot color="emerald" label="Ready" count={tg.movements.filter(m => m.status === 'inspection_verified').length} />
                                {tg.movements.some(m => m.status === 'inspection_rejected') && (
                                  <StatusDot color="rose" label="Rej" count={tg.movements.filter(m => m.status === 'inspection_rejected').length} />
                                )}
                              </div>
                            </div>

                            {/* Table */}
                            <ScrollArea className="max-h-[360px] w-full">
                              <div className="min-w-[820px]">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b bg-muted/10 text-muted-foreground">
                                      <th className="h-6 w-7 px-2 text-left text-[10px] font-medium">#</th>
                                      <th className="h-6 px-2 text-left text-[10px] font-medium">Vehicle & Driver</th>
                                      <th className="h-6 px-2 text-left text-[10px] font-medium">Status</th>
                                      <th className="h-6 px-2 text-left text-[10px] font-medium">Timeline</th>
                                      <th className="h-6 px-2 text-left text-[10px] font-medium">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/20 [&_tr:last-child]:border-0">
                                    {tg.movements.map((m, i) => (
                                      <VehicleRow key={m._id} movement={m} index={i}
                                        canGateIn={canGateIn} canInspectMovement={canInspectMovement} canGateOut={canGateOut}
                                        saving={saving} operationLoading={operationLoading[m._id] || false}
                                        notesByMovementId={notesByMovementId} setNotesByMovementId={setNotesByMovementId}
                                        inspectionChecks={inspectionChecks} setInspectionCheck={setInspectionCheck}
                                        runMovementAction={runMovementAction}
                                        isExpanded={expandedRows.has(m._id)} toggleExpand={() => toggleRowExpansion(m._id)} />
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </ScrollArea>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </CardContent>
        {!loading && movementPagination.pages > 1 && (
          <div className="flex items-center justify-between border-t bg-muted/10 px-3 py-2">
            <span className="text-[11px] text-muted-foreground">
              Page {movementPagination.page} of {movementPagination.pages} · {movementPagination.total} movement{movementPagination.total !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <Select value={String(movementPagination.limit)} onValueChange={v => setMovementPageSize(Number(v))}>
                <SelectTrigger className="h-7 w-[88px] rounded-lg text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map(size => (
                    <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                disabled={movementPage <= 1}
                onClick={() => setMovementPage(Math.max(1, movementPage - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                disabled={movementPage >= movementPagination.pages}
                onClick={() => setMovementPage(movementPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BRANCHES TAB
// ─────────────────────────────────────────────────────────────

interface BranchesTabProps {
  branches: Branch[]; branchForm: BranchFormState;
  setBranchForm: (s: (p: BranchFormState) => BranchFormState) => void;
  validationErrors: ValidationErrors; saving: boolean;
  handleCreateBranch: (e: React.FormEvent) => Promise<boolean>;
  resetBranchForm: () => void;
}

function BranchesTab({ branches, branchForm, setBranchForm, validationErrors, saving, handleCreateBranch, resetBranchForm }: BranchesTabProps) {
  const [open, setOpen] = useState(false);
  const filtered = branches;

  return (
    <>
      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardHeader className="border-b bg-muted/10 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <IconBuildingWarehouse className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="text-[14px] font-semibold">Branch Directory</span>
                <p className="text-[11px] text-muted-foreground">
                  Manage your branch locations
                </p>
              </div>
            </div>
            <Button size="sm" className="h-8 gap-1.5 rounded-lg px-4 text-[12px]" onClick={() => setOpen(true)}>
              <IconPlus className="h-3.5 w-3.5" /> New Branch
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState message="No branches match your search" />
          ) : (
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <div className="divide-y divide-border/40">
                {/* Column headers */}
                <div className="hidden grid-cols-[1fr_140px_160px_100px] gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                  <div>Branch</div><div>Manager</div><div>GST / Email</div><div>Status</div>
                </div>
                {filtered.map(b => (
                  <div key={b._id}
                    className="grid gap-2 px-4 py-2.5 transition-colors hover:bg-muted/20 md:grid-cols-[1fr_140px_160px_100px] md:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold">{b.name}</span>
                        <span className="shrink-0 rounded border border-border/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground">{b.code}</span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                        <IconMapPin className="h-3 w-3 shrink-0" />
                        {[b.address?.city, b.address?.state].filter(Boolean).join(', ') || 'No address'}
                      </p>
                    </div>
                    <span className="text-[12px] font-medium">{b.managerName || <span className="text-muted-foreground/60 italic">Not assigned</span>}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{b.gstNumber || b.email || '—'}</span>
                    <span className={cn('inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
                      b.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground')}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create branch dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <IconBuildingWarehouse className="h-4 w-4 text-primary" /> Create Branch
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={async e => { const ok = await handleCreateBranch(e); if (ok) setOpen(false); }} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Branch Name" required error={validationErrors.name}>
                <Input value={branchForm.name} onChange={e => setBranchForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mumbai Hub" className="h-8 text-[12px]" />
              </FormField>
              <FormField label="Branch Code" required error={validationErrors.code}>
                <Input value={branchForm.code} onChange={e => setBranchForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. MHC" className="h-8 text-[12px]" />
              </FormField>
              <FormField label="GST Number" error={validationErrors.gstNumber} description={VALIDATION_RULES.GST.message}>
                <Input maxLength={15} value={branchForm.gstNumber} onChange={e => setBranchForm(p => ({ ...p, gstNumber: e.target.value.toUpperCase() }))} placeholder="15-digit GSTIN" className="h-8 text-[12px]" />
              </FormField>
              <FormField label="Phone" error={validationErrors.phone}>
                <Input value={branchForm.phone} onChange={e => setBranchForm(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit" className="h-8 text-[12px]" />
              </FormField>
              <FormField label="Email" error={validationErrors.email} className="md:col-span-2">
                <Input type="email" value={branchForm.email} onChange={e => setBranchForm(p => ({ ...p, email: e.target.value }))} placeholder="operations@branch.com" className="h-8 text-[12px]" />
              </FormField>
              <FormField label="Address" className="md:col-span-2">
                <Input value={branchForm.line1} onChange={e => setBranchForm(p => ({ ...p, line1: e.target.value }))} placeholder="Street address" className="h-8 text-[12px]" />
              </FormField>
              <Input value={branchForm.city} onChange={e => setBranchForm(p => ({ ...p, city: e.target.value }))} placeholder="City" className="h-8 text-[12px]" />
              <Input value={branchForm.state} onChange={e => setBranchForm(p => ({ ...p, state: e.target.value }))} placeholder="State" className="h-8 text-[12px]" />
              <FormField label="Pincode" error={validationErrors.pincode}>
                <Input value={branchForm.pincode} onChange={e => setBranchForm(p => ({ ...p, pincode: e.target.value }))} placeholder="6-digit" className="h-8 text-[12px]" />
              </FormField>
              <Input value={branchForm.contactName} onChange={e => setBranchForm(p => ({ ...p, contactName: e.target.value }))} placeholder="Contact person name" className="h-8 text-[12px]" />
              <Input value={branchForm.contactPhone} onChange={e => setBranchForm(p => ({ ...p, contactPhone: e.target.value }))} placeholder="Contact phone" className="h-8 text-[12px]" />
              <Input type="email" value={branchForm.contactEmail} onChange={e => setBranchForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="Contact email" className="h-8 text-[12px]" />
            </div>
            <DialogFooter className="gap-2 border-t pt-3">
              <Button type="button" variant="outline" size="sm" onClick={resetBranchForm} disabled={saving}>Reset</Button>
              <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
                {saving ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : <IconPlus className="h-3.5 w-3.5" />}
                {saving ? 'Creating…' : 'Create Branch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// STAFF TAB
// ─────────────────────────────────────────────────────────────

interface StaffTabProps {
  branches: Branch[]; staffCandidates: BranchUser[]; staffAssignments: BranchStaffAssignment[];
  assignment: { branchId: string; userId: string; operationalRole: OperationalRole };
  setAssignment: (s: (p: any) => any) => void;
  saving: boolean; loading: boolean;
  staffFilters: StaffFiltersState; setStaffFilters: (s: (p: StaffFiltersState) => StaffFiltersState) => void;
  handleAssignUser: (e: React.FormEvent) => Promise<void>;
}

function StaffTab({ branches, staffCandidates, staffAssignments, assignment, setAssignment, saving, loading, staffFilters, setStaffFilters, handleAssignUser }: StaffTabProps) {
  const selectedCandidate = staffCandidates.find(c => c._id === assignment.userId);

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm">
      <CardHeader className="border-b bg-muted/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <IconUserCog className="h-4 w-4 text-primary" />
          <span className="text-[13px] font-semibold">Staff Assignments</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{staffAssignments.length} active</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-3">
        {/* Assignment form */}
        <form onSubmit={handleAssignUser} className="rounded-lg border bg-muted/10 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Assign staff to branch</p>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input value={staffFilters.candidateSearch}
              onChange={e => setStaffFilters(p => ({ ...p, candidateSearch: e.target.value }))}
              placeholder="Search staff by name or email" className="h-8 pl-7 text-[12px]" />
          </div>

          <div className="grid gap-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <FormField label="Branch" required>
              <Select value={assignment.branchId} onValueChange={v => setAssignment(p => ({ ...p, branchId: v }))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Staff Member" required>
              <Select value={assignment.userId} onValueChange={v => setAssignment(p => ({ ...p, userId: v }))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {staffCandidates.map(u => (
                    <SelectItem key={u._id} value={u._id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-4 w-4"><AvatarFallback className="text-[9px]">{getUserInitials(u)}</AvatarFallback></Avatar>
                        {getUserName(u)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Role" required>
              <Select value={assignment.operationalRole} onValueChange={v => setAssignment(p => ({ ...p, operationalRole: v }))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).filter(([k]) => k !== 'none').map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-1.5">{cfg.icon}{cfg.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <Button type="submit" size="sm" disabled={saving} className="h-8 gap-1.5">
              {saving ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : <IconUserCog className="h-3.5 w-3.5" />}
              {saving ? 'Assigning…' : 'Assign'}
            </Button>
          </div>

          {selectedCandidate?.currentAssignment && (
            <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-2 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              <IconAlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              {getUserName(selectedCandidate)} is currently at {selectedCandidate.currentAssignment.branchName} as {ROLE_CONFIG[selectedCandidate.currentAssignment.operationalRole]?.label}. Saving will move the assignment.
            </div>
          )}
        </form>

        {/* Current assignments list */}
        <div className="rounded-lg border">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <div className="flex items-center gap-1.5">
              <IconUsers className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] font-semibold">Current Assignments</span>
            </div>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input value={staffFilters.assignmentSearch}
                onChange={e => setStaffFilters(p => ({ ...p, assignmentSearch: e.target.value }))}
                placeholder="Search…" className="h-7 w-[180px] pl-6 text-[11px]" />
            </div>
          </div>

          {loading ? <LoadingState message="Loading assignments…" />
            : staffAssignments.length === 0 ? <EmptyState message="No assignments yet" />
              : (
                <ScrollArea className="h-[calc(100vh-28rem)]">
                  <div className="divide-y divide-border/40">
                    {/* Headers */}
                    <div className="hidden grid-cols-[1fr_130px_150px] gap-3 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                      <div>User</div><div>Branch</div><div>Role</div>
                    </div>
                    {staffAssignments.map(item => (
                      <div key={item._id} className="grid gap-2 px-3 py-2 transition-colors hover:bg-muted/20 md:grid-cols-[1fr_130px_150px] md:items-center">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6 shrink-0"><AvatarFallback className="text-[10px]">{getUserInitials(item.user as BranchUser)}</AvatarFallback></Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold">{getUserName(item.user as BranchUser)}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{(item.user as BranchUser)?.email}</p>
                          </div>
                        </div>
                        <span className="text-[12px] font-medium">{item.branch?.name || '—'}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-medium w-fit">
                          {ROLE_CONFIG[item.operationalRole]?.icon}
                          {ROLE_CONFIG[item.operationalRole]?.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// VEHICLE ENTRY MODAL
// ─────────────────────────────────────────────────────────────

interface VehicleEntryModalProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  requestTypeMode?: VehicleRequestType | null;
  movementForm: MovementFormState; setMovementForm: (s: (p: MovementFormState) => MovementFormState) => void;
  manualLoadEntry: boolean; setManualLoadEntry: (v: boolean) => void;
  branches: Branch[]; transporters: BranchTransporter[];
  selectedTransporter?: BranchTransporter;
  selectedTransporterHasClosedAssignments: boolean;
  selectedTransporterAssignments: BranchAssignedLoad[];
  selectedLoad?: BranchAssignedLoad; selectedBid?: BranchAcceptedBid;
  selectedLoadBids: BranchAcceptedBid[]; needsLoadConfirmation: boolean;
  validationErrors: ValidationErrors;
  onTransporterChange: (id: string) => void; onLoadChange: (id: string) => void; onBidChange: (id: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>; onReset: () => void; saving: boolean;
}

function VehicleEntryModal({
  open, onOpenChange, requestTypeMode, movementForm, setMovementForm, manualLoadEntry, setManualLoadEntry,
  branches, transporters, selectedTransporter, selectedTransporterHasClosedAssignments, selectedTransporterAssignments,
  selectedLoad, selectedBid, selectedLoadBids, needsLoadConfirmation, validationErrors,
  onTransporterChange, onLoadChange, onBidChange, onSubmit, onReset, saving,
}: VehicleEntryModalProps) {
  const activeRequestType = requestTypeMode || movementForm.requestType;
  const requestTypeMeta = REQUEST_TYPE_CONFIG[activeRequestType];
  const expectedVehicle = selectedBid?.vehicleDetails?.vehicleNumber;
  const vehicleMatch = vehicleNumbersMatch(movementForm.vehicleNumber, expectedVehicle);
  const openSlots = getTransporterOpenVehicleSlots(selectedTransporterAssignments, movementForm.transporterId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-[14px]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <IconTruck className="h-3.5 w-3.5 text-primary" />
            </div>
            {requestTypeMeta ? `${requestTypeMeta.shortLabel} Vehicle Entry` : 'New Vehicle Entry'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
          {/* Section 1: Location */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <IconMapPin className="h-3 w-3" /> Location & Purpose
            </p>
            <div className="grid gap-2 md:grid-cols-3">
              <FormField label="Branch" required error={validationErrors.branchId}>
                <Select value={movementForm.branchId}
                  onValueChange={v => setMovementForm(p => ({ ...p, branchId: v, loadId: '', bidId: '', transporterId: '', transporterName: '', vehicleNumber: '', driverName: '', driverPhone: '', fromDestination: '', toDestination: '' }))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Branch" /></SelectTrigger>
                  <SelectContent>{branches.map(b => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Flow" required>
                <Select value={movementForm.requestType} onValueChange={v => setMovementForm(p => ({ ...p, requestType: v as VehicleRequestType, purpose: REQUEST_TYPE_CONFIG[v as VehicleRequestType].defaultPurpose }))} disabled={!!requestTypeMode}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(REQUEST_TYPE_CONFIG).map(([value, meta]) => (
                      <SelectItem key={value} value={value}>{meta.shortLabel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Purpose" required>
                <Select value={movementForm.purpose} onValueChange={v => setMovementForm(p => ({ ...p, purpose: v }))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(requestTypeMeta?.purposeOptions || ['loading', 'unloading', 'pickup', 'delivery', 'maintenance', 'other']).map(v => (
                      <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Expected Time">
                <Input type="datetime-local" value={movementForm.expectedAt}
                  onChange={e => setMovementForm(p => ({ ...p, expectedAt: e.target.value }))} className="h-8 text-[12px]" />
              </FormField>
            </div>
          </div>

          <Separator />

          {/* Section 2: Transporter */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <IconUsers className="h-3 w-3" /> Transporter & Load
            </p>
            <div className="space-y-2">
              <FormField label="Transporter" required error={validationErrors.transporterName}>
                <Select value={movementForm.transporterId} onValueChange={onTransporterChange}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select transporter" /></SelectTrigger>
                  <SelectContent>
                    {transporters.map(t => <SelectItem key={t._id} value={t._id}>{t.companyName || t.name || t.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>

              {selectedTransporter && (
                <div className="flex items-center justify-between rounded-md border bg-primary/5 px-3 py-2">
                  <div>
                    <p className="text-[12px] font-semibold">{selectedTransporter.companyName || selectedTransporter.name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedTransporter.phone || selectedTransporter.email || '—'}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {openSlots} slot{openSlots !== 1 ? 's' : ''} open
                  </span>
                </div>
              )}

              {movementForm.transporterId && (
                <div className="space-y-1.5">
                  {selectedTransporterAssignments.length > 0 ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <FormField label="Load Requirement" error={validationErrors.loadId}>
                        <Select value={manualLoadEntry ? 'manual' : movementForm.loadId}
                          onValueChange={v => {
                            if (v === 'manual') { setManualLoadEntry(true); setMovementForm(p => ({ ...p, loadId: '', bidId: '' })); }
                            else onLoadChange(v);
                          }}>
                          <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select load requirement" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual (No Load Requirement)</SelectItem>
                            {selectedTransporterAssignments.map((l: any) => (
                              <SelectItem key={l._id} value={l._id}>
                                <span className="text-[12px]">{l.loadNumber}</span>
                                <span className="ml-2 text-[10px] text-muted-foreground">{l.remainingVehicleSlots}/{getLoadVehicleLimit(l)} slots</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      {movementForm.loadId && selectedLoadBids.length > 0 && (
                        <FormField label="Accepted Bid">
                          <Select value={movementForm.bidId} onValueChange={onBidChange}>
                            <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select accepted bid" /></SelectTrigger>
                            <SelectContent>
                              {selectedLoadBids.map((bid: any) => (
                                <SelectItem key={bid._id} value={bid._id}>
                                  <span>{formatMoney(bid.bidAmount, bid.currency)}</span>
                                  {bid.vehicleDetails?.vehicleNumber && <span className="ml-2 text-[10px] text-muted-foreground">{bid.vehicleDetails.vehicleNumber}</span>}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-center text-[11px] text-muted-foreground">
                      {selectedTransporterHasClosedAssignments
                        ? 'All assigned vehicle entries for this transporter are already completed for the selected branch/request flow. You can still log a manual vehicle entry if needed.'
                        : 'No open load requirement for this transporter — vehicle will be logged as a manual entry.'}
                    </p>
                  )}
                  {needsLoadConfirmation && (
                    <p className="flex items-center gap-1.5 text-[11px] text-destructive">
                      <IconAlertCircle className="h-3 w-3 shrink-0" /> Select a load requirement or confirm manual entry.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Section 3: Vehicle */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <IconTruck className="h-3 w-3" /> Vehicle Information
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              <FormField label="Transporter Name" required error={validationErrors.transporterName}>
                <Input value={movementForm.transporterName} onChange={e => setMovementForm(p => ({ ...p, transporterName: e.target.value }))} placeholder="Company name" className="h-8 text-[12px]" />
              </FormField>
              <FormField label="Vehicle Number" required error={validationErrors.vehicleNumber} description={VALIDATION_RULES.VEHICLE_NUMBER.message}>
                <Input value={movementForm.vehicleNumber} onChange={e => setMovementForm(p => ({ ...p, vehicleNumber: e.target.value.toUpperCase() }))} placeholder="GJ01AB1234" className="h-8 text-[12px]" />
                {expectedVehicle && (
                  <p className={cn('flex items-center gap-1 text-[10px]', vehicleMatch ? 'text-emerald-600' : 'text-destructive')}>
                    {vehicleMatch ? <IconCheck className="h-3 w-3" /> : <IconAlertCircle className="h-3 w-3" />}
                    Expected: {expectedVehicle}
                  </p>
                )}
              </FormField>
              <FormField label="Driver Name">
                <Input value={movementForm.driverName} onChange={e => setMovementForm(p => ({ ...p, driverName: e.target.value }))} placeholder="Full name" className="h-8 text-[12px]" />
              </FormField>
              <FormField label="Driver Phone" error={validationErrors.driverPhone}>
                <Input value={movementForm.driverPhone} onChange={e => setMovementForm(p => ({ ...p, driverPhone: e.target.value }))} placeholder="10-digit mobile" className="h-8 text-[12px]" />
              </FormField>
              <FormField label="From">
                <Input value={movementForm.fromDestination} onChange={e => setMovementForm(p => ({ ...p, fromDestination: e.target.value }))} placeholder="Source" className="h-8 text-[12px]" />
              </FormField>
              <FormField label="To" required error={validationErrors.toDestination}>
                <Input value={movementForm.toDestination} onChange={e => setMovementForm(p => ({ ...p, toDestination: e.target.value }))} placeholder="Destination" className="h-8 text-[12px]" />
              </FormField>
            </div>
          </div>

          {/* Load summary */}
          {selectedLoad && (
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-primary">Confirmed Load Requirement</span>
                <span className="text-[10px] text-muted-foreground">{(selectedLoad as any).remainingVehicleSlots}/{getLoadVehicleLimit(selectedLoad)} slots</span>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[11px]">
                {[
                  ['Load Requirement', selectedLoad.loadNumber],
                  ['Amount', formatMoney(selectedBid?.bidAmount || (selectedLoad as any).bidWinningPrice, selectedBid?.currency)],
                  ['Type', selectedLoad.vehicleType || '—'],
                  ['From', selectedLoad.pickupLocation?.city || '—'],
                  ['To', selectedLoad.deliveryLocation?.city || '—'],
                  ...(selectedBid?.driverDetails?.driverName ? [['Driver', selectedBid.driverDetails.driverName]] : []),
                ].map(([k, v]) => (
                  <div key={k}><span className="text-muted-foreground">{k}: </span><span className="font-medium">{v}</span></div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" disabled={saving}
              onClick={() => { onOpenChange(false); onReset(); }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving} className="min-w-[110px] gap-1.5">
              {saving ? <><IconLoader className="h-3.5 w-3.5 animate-spin" /> Creating…</>
                : <><IconPlus className="h-3.5 w-3.5" /> Create Entry</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function BranchesPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const location = useLocation();
  const userOperationalRole = user?.operationalRole || 'none';
  const isAdminUser = user?.role === 'super_admin' || user?.role === 'company_admin';
  const canHandleEntryFlow = isAdminUser || ['branch_manager', 'watchman'].includes(userOperationalRole);
  const canHandleInspectionFlow = isAdminUser || ['branch_manager', 'inspection_officer'].includes(userOperationalRole);
  const isBranchScopedUser = user?.role === 'company_user' && !!user?.branchId;
  const defaultBranchId = user?.branchId || '';
  const routeMode: GateRouteMode =
    location.pathname === '/transport-requests/outbound' ? 'outbound'
      : location.pathname === '/transport-requests/inbound' ? 'inbound'
        : 'operations';
  const requestTypeFilter = routeMode === 'outbound' ? 'outbound' : routeMode === 'inbound' ? 'inbound' : null;
  const requestTypeMeta = requestTypeFilter ? REQUEST_TYPE_CONFIG[requestTypeFilter] : null;
  const defaultMovementPurpose = requestTypeMeta?.defaultPurpose || 'loading';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [transporters, setTransporters] = useState<BranchTransporter[]>([]);
  const [assignedLoads, setAssignedLoads] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [staffCandidates, setStaffCandidates] = useState<BranchUser[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<BranchStaffAssignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});
  const [movementFilters, setMovementFilters] = useState<MovementFiltersState>({
    search: '',
    status: 'all',
    transporterId: '',
    loadId: '',
  });
  const [movementPage, setMovementPage] = useState(1);
  const [movementPagination, setMovementPagination] = useState<PaginationState>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [notesByMovementId, setNotesByMovementId] = useState<Record<string, string>>({});
  const [inspectionChecks, setInspectionChecks] = useState<Record<string, MovementChecks>>({});
  const [manualLoadEntry, setManualLoadEntry] = useState(false);
  const [staffFilters, setStaffFilters] = useState<StaffFiltersState>({ candidateSearch: '', assignmentSearch: '' });

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false, action: null, movementId: null, message: '',
  });

  const [assignment, setAssignment] = useState({
    branchId: '', userId: '', operationalRole: 'branch_manager' as OperationalRole,
  });

  const [branchForm, setBranchForm] = useState<BranchFormState>({
    name: '', code: '', gstNumber: '', phone: '', email: '',
    contactName: '', contactPhone: '', contactEmail: '',
    line1: '', city: '', state: '', pincode: '',
  });

  const [movementForm, setMovementForm] = useState<MovementFormState>({
    branchId: '', loadId: '', bidId: '', transporterId: '', transporterName: '',
    vehicleNumber: '', driverName: '', driverPhone: '',
    fromDestination: '', toDestination: '', requestType: requestTypeFilter || 'outbound', purpose: defaultMovementPurpose, expectedAt: '',
  });

  // Permissions
  const canCreateBranch = hasPermission(user, ALL_PERMISSIONS.BRANCH_CREATE);
  const canAssignStaff = hasPermission(user, ALL_PERMISSIONS.BRANCH_ASSIGN_STAFF);
  const canCreateMovement = hasPermission(user, ALL_PERMISSIONS.BRANCH_MOVEMENT_CREATE) && canHandleEntryFlow;
  const canGateIn = hasPermission(user, ALL_PERMISSIONS.BRANCH_GATE_IN) && canHandleEntryFlow;
  const canInspectMovement = hasPermission(user, ALL_PERMISSIONS.BRANCH_INSPECT) && canHandleInspectionFlow;
  const canGateOut = hasPermission(user, ALL_PERMISSIONS.BRANCH_GATE_OUT) && canHandleInspectionFlow;

  const isRequestFlowRoute = routeMode !== 'operations';
  const effectiveBranchId = isBranchScopedUser ? defaultBranchId : selectedBranchId;

  // Derived movement lists
  const activeMovements = useMemo(() => movements.filter(m => ['expected', 'inspection_verified', 'gate_in_recorded', 'inspection_rejected'].includes(m.status)), [movements]);
  const completedMovements = useMemo(() => movements.filter(m => ['gate_out_recorded', 'cancelled'].includes(m.status)), [movements]);
  const pendingInspection = useMemo(() => movements.filter(m => m.status === 'gate_in_recorded'), [movements]);
  const expectedMovements = useMemo(() => movements.filter(m => m.status === 'expected'), [movements]);
  const verifiedMovements = useMemo(() => movements.filter(m => m.status === 'inspection_verified'), [movements]);
  const rejectedMovements = useMemo(() => movements.filter(m => m.status === 'inspection_rejected'), [movements]);

  const loadEntryCounts = useMemo(() =>
    movements.filter(m => ['expected', 'gate_in_recorded', 'inspection_verified', 'inspection_rejected', 'gate_out_recorded'].includes(m.status))
      .reduce<Record<string, number>>((acc, m) => {
        const id = getRefId(m.loadId);
        if (id) acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {}), [movements]);

  const activeVehicleNumbers = useMemo(() =>
    new Set(activeMovements.map(m => normalizeVehicleNumber(m.vehicleNumber)).filter(Boolean)), [activeMovements]);

  const availableAssignedLoads = useMemo(() =>
    assignedLoads.map(l => {
      const active = Math.max(l.activeVehicleEntries || 0, loadEntryCounts[l._id] || 0);
      const limit = getLoadVehicleLimit(l);
      return {
        ...l,
        acceptedBids: getOpenAcceptedBids(l),
        activeVehicleEntries: active,
        remainingVehicleSlots: Math.max(0, limit - active),
      };
    }).filter(l => {
      if ((l.acceptedBids || []).length === 0 || (l.remainingVehicleSlots || 0) <= 0) return false;
      return ['assigned', 'in_transit'].includes(String(l.status || ''));
    }),
    [assignedLoads, loadEntryCounts]);

  const selectedLoad = availableAssignedLoads.find(l => l._id === movementForm.loadId);
  const selectedLoadBids = (selectedLoad?.acceptedBids || []).filter((bid: any) =>
    movementForm.transporterId ? String(getBidTransporterId(bid)) === String(movementForm.transporterId) : true);
  const selectedBid = selectedLoadBids.find((b: any) => b._id === movementForm.bidId) || selectedLoadBids[0];
  const selectedTransporterId = movementForm.transporterId || getBidTransporterId(selectedBid);
  const selectedTransporter = transporters.find(t => t._id === selectedTransporterId);

  const selectedTransporterAssignments = useMemo(() =>
    selectedTransporterId
      ? availableAssignedLoads.filter(l => (l.acceptedBids || []).some((b: any) => String(getBidTransporterId(b)) === String(selectedTransporterId)))
      : [], [selectedTransporterId, availableAssignedLoads]);

  const selectedTransporterHasClosedAssignments = useMemo(() => {
    if (!selectedTransporterId) return false;

    return assignedLoads.some((load) =>
      (load.acceptedBids || []).some((bid: any) => String(getBidTransporterId(bid)) === String(selectedTransporterId))
    ) && selectedTransporterAssignments.length === 0;
  }, [assignedLoads, selectedTransporterAssignments.length, selectedTransporterId]);

  const needsLoadConfirmation = !!movementForm.transporterId &&
    selectedTransporterAssignments.length > 0 && !movementForm.loadId && !manualLoadEntry;

  const filteredMovements = useMemo(() => movements, [movements]);

  // Data loaders
  useEffect(() => {
    if (isBranchScopedUser && selectedBranchId !== defaultBranchId) {
      setSelectedBranchId(defaultBranchId);
    }
  }, [defaultBranchId, isBranchScopedUser, selectedBranchId]);

  useEffect(() => {
    setMovementPage(1);
  }, [effectiveBranchId, movementFilters.search, movementFilters.status, movementFilters.transporterId, movementFilters.loadId, requestTypeFilter]);

  useEffect(() => {
    setManualLoadEntry(false);
    setMovementForm(prev => ({
      ...prev,
      requestType: requestTypeFilter || prev.requestType || 'outbound',
      purpose: requestTypeMeta?.purposeOptions.includes(prev.purpose) ? prev.purpose : defaultMovementPurpose,
    }));
  }, [requestTypeFilter, requestTypeMeta, defaultMovementPurpose]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [lookup, branchData, movementData] = await Promise.all([
        branchesService.getLookups({
          requestType: requestTypeFilter || undefined,
          branchId: effectiveBranchId || undefined,
        }),
        isRequestFlowRoute ? Promise.resolve(null) : branchesService.list({ limit: 100 }),
        branchesService.listMovements({
          page: movementPage,
          limit: movementPagination.limit,
          branchId: effectiveBranchId || undefined,
          status: movementFilters.status !== 'all' ? movementFilters.status : undefined,
          requestType: requestTypeFilter || undefined,
          transporterId: movementFilters.transporterId || undefined,
          loadId: movementFilters.loadId || undefined,
          search: movementFilters.search.trim() || undefined,
        }),
      ]);
      setBranches(branchData?.branches || lookup.branches || []);
      setTransporters(lookup.transporters || []);
      setAssignedLoads(lookup.assignedLoads || []);
      setMovements(movementData.movements || []);
      setMovementPagination(movementData.pagination || { page: movementPage, limit: movementPagination.limit, total: movementData.movements?.length || 0, pages: 1 });
    } catch (e: any) {
      toast({ title: 'Failed to load data', description: getApiErrorMessage(e, 'Unable to load branch data'), variant: 'destructive' });
    } finally { setLoading(false); }
  }, [effectiveBranchId, isRequestFlowRoute, movementPage, movementPagination.limit, movementFilters, requestTypeFilter]);

  const setMovementPageSize = (limit: number) => {
    setMovementPagination(prev => ({ ...prev, limit, page: 1 }));
    setMovementPage(1);
  };

  useEffect(() => { loadData(); }, [loadData]);

  const loadStaffData = useCallback(async () => {
    if (!canAssignStaff) return;
    try {
      setStaffLoading(true);
      const [c, a] = await Promise.all([
        branchesService.listAssignableUsers({ limit: 20, search: staffFilters.candidateSearch || undefined }),
        branchesService.listStaffAssignments({ limit: 50, search: staffFilters.assignmentSearch || undefined }),
      ]);
      setStaffCandidates(c.items || []);
      setStaffAssignments(a.items || []);
    } catch (e: any) {
      toast({ title: 'Failed to load staff', description: getApiErrorMessage(e, 'Unable to load branch staff'), variant: 'destructive' });
    } finally { setStaffLoading(false); }
  }, [canAssignStaff, staffFilters]);

  useEffect(() => { loadStaffData(); }, [loadStaffData]);

  useEffect(() => {
    setNotesByMovementId(prev => { const c = { ...prev }; completedMovements.forEach(m => delete c[m._id]); return c; });
    setInspectionChecks(prev => { const c = { ...prev }; completedMovements.forEach(m => delete c[m._id]); return c; });
  }, [completedMovements]);

  // Form resets
  const resetBranchForm = () => {
    setBranchForm({ name: '', code: '', gstNumber: '', phone: '', email: '', contactName: '', contactPhone: '', contactEmail: '', line1: '', city: '', state: '', pincode: '' });
    setValidationErrors({});
  };

  const resetMovementForm = (branchId = movementForm.branchId) => {
    setManualLoadEntry(false);
    setMovementForm({
      branchId,
      loadId: '',
      bidId: '',
      transporterId: '',
      transporterName: '',
      vehicleNumber: '',
      driverName: '',
      driverPhone: '',
      fromDestination: '',
      toDestination: '',
      requestType: requestTypeFilter || 'outbound',
      purpose: defaultMovementPurpose,
      expectedAt: '',
    });
    setValidationErrors({});
  };

  // Validation
  const validateBranchForm = () => {
    const e: ValidationErrors = {};
    if (!branchForm.name.trim()) e.name = 'Required';
    if (!branchForm.code.trim()) e.code = 'Required';
    if (branchForm.gstNumber && !VALIDATION_RULES.GST.pattern.test(branchForm.gstNumber.toUpperCase())) e.gstNumber = VALIDATION_RULES.GST.message;
    if (branchForm.email && !VALIDATION_RULES.EMAIL.pattern.test(branchForm.email)) e.email = VALIDATION_RULES.EMAIL.message;
    if (branchForm.phone && !VALIDATION_RULES.PHONE.pattern.test(branchForm.phone.replace(/[^\d]/g, ''))) e.phone = VALIDATION_RULES.PHONE.message;
    if (branchForm.pincode && !VALIDATION_RULES.PINCODE.pattern.test(branchForm.pincode)) e.pincode = VALIDATION_RULES.PINCODE.message;
    setValidationErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateMovementForm = () => {
    const e: ValidationErrors = {};
    if (!movementForm.branchId) e.branchId = 'Required';
    if (!movementForm.transporterName.trim()) e.transporterName = 'Required';
    if (!movementForm.vehicleNumber.trim()) e.vehicleNumber = 'Required';
    else if (!VALIDATION_RULES.VEHICLE_NUMBER.pattern.test(normalizeVehicleNumber(movementForm.vehicleNumber))) e.vehicleNumber = VALIDATION_RULES.VEHICLE_NUMBER.message;
    if (!movementForm.toDestination.trim()) e.toDestination = 'Required';
    if (needsLoadConfirmation) e.loadId = 'Confirm load assignment';
    if (movementForm.loadId && !movementForm.bidId) e.bidId = 'Required';
    if (movementForm.driverPhone && !VALIDATION_RULES.PHONE.pattern.test(movementForm.driverPhone.replace(/[^\d]/g, ''))) e.driverPhone = VALIDATION_RULES.PHONE.message;
    if (normalizeVehicleNumber(movementForm.vehicleNumber) && activeVehicleNumbers.has(normalizeVehicleNumber(movementForm.vehicleNumber))) e.vehicleNumber = 'Vehicle already has an open entry';
    if (selectedBid?.vehicleDetails?.vehicleNumber && !vehicleNumbersMatch(movementForm.vehicleNumber, selectedBid.vehicleDetails.vehicleNumber)) e.vehicleNumber = 'Must match the accepted bid vehicle';
    setValidationErrors(e);
    return Object.keys(e).length === 0;
  };

  // Handlers
  const handleCreateBranch = async (event: React.FormEvent): Promise<boolean> => {
    event.preventDefault();
    if (!validateBranchForm()) return false;
    try {
      setSaving(true);
      await branchesService.create({
        name: branchForm.name, code: branchForm.code, gstNumber: branchForm.gstNumber,
        phone: branchForm.phone, email: branchForm.email,
        contactPerson: { name: branchForm.contactName, phone: branchForm.contactPhone, email: branchForm.contactEmail },
        address: { line1: branchForm.line1, city: branchForm.city, state: branchForm.state, pincode: branchForm.pincode },
      });
      resetBranchForm();
      toast({ title: 'Branch created' });
      await loadData();
      return true;
    } catch (e: any) {
      toast({ title: 'Failed to create branch', description: getApiErrorMessage(e, 'Unable to create branch'), variant: 'destructive' });
      return false;
    } finally { setSaving(false); }
  };

  const handleAssignUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignment.branchId || !assignment.userId) {
      toast({ title: 'Select both branch and user', variant: 'destructive' }); return;
    }
    try {
      setSaving(true);
      await branchesService.assignUser(assignment);
      toast({ title: 'Assignment saved' });
      setAssignment(p => ({ ...p, userId: '' }));
      await Promise.all([loadData(), loadStaffData()]);
    } catch (e: any) {
      toast({ title: 'Failed to assign user', description: getApiErrorMessage(e, 'Unable to assign branch user'), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleBranchChange = (branchId: string) => {
    if (isBranchScopedUser) return;
    setSelectedBranchId(branchId);
    setMovementPage(1);
    resetMovementForm(branchId);
    setNotesByMovementId({});
    setInspectionChecks({});
  };

  const handleTransporterChange = (transporterId: string) => {
    const t = transporters.find(x => x._id === transporterId);
    const assignments = availableAssignedLoads.filter(l =>
      (l.acceptedBids || []).some((b: any) => String(getBidTransporterId(b)) === String(transporterId)));
    const onlyLoad = assignments.length === 1 ? assignments[0] : undefined;
    const onlyBid = onlyLoad?.acceptedBids?.find((b: any) => String(getBidTransporterId(b)) === String(transporterId));
    setManualLoadEntry(assignments.length === 0);
    setMovementForm(p => ({
      ...p, transporterId,
      transporterName: t?.companyName || t?.name || t?.email || '',
      loadId: onlyLoad?._id || '',
      bidId: onlyBid?._id || '',
      vehicleNumber: onlyBid?.vehicleDetails?.vehicleNumber || '',
      driverName: onlyBid?.driverDetails?.driverName || '',
      driverPhone: onlyBid?.driverDetails?.mobile || '',
      fromDestination: onlyLoad?.pickupLocation?.city || onlyLoad?.pickupLocation?.address || '',
      toDestination: onlyLoad?.deliveryLocation?.city || onlyLoad?.deliveryLocation?.address || '',
    }));
  };

  const handleLoadChange = (loadId: string) => {
    const load = availableAssignedLoads.find(l => l._id === loadId);
    const bid = load?.acceptedBids?.find((b: any) => movementForm.transporterId ? String(getBidTransporterId(b)) === String(movementForm.transporterId) : true) || load?.acceptedBids?.[0];
    const transporter = typeof bid?.transporterId === 'object' ? bid.transporterId : typeof load?.assignedTransporter === 'object' ? load.assignedTransporter : undefined;
    setManualLoadEntry(false);
    setMovementForm(p => ({
      ...p, loadId,
      bidId: bid?._id || '',
      transporterId: typeof bid?.transporterId === 'string' ? bid.transporterId : bid?.transporterId?._id || '',
      transporterName: transporter?.companyName || transporter?.name || p.transporterName,
      vehicleNumber: bid?.vehicleDetails?.vehicleNumber || p.vehicleNumber,
      driverName: bid?.driverDetails?.driverName || p.driverName,
      driverPhone: bid?.driverDetails?.mobile || p.driverPhone,
      fromDestination: load?.pickupLocation?.city || load?.pickupLocation?.address || p.fromDestination,
      toDestination: load?.deliveryLocation?.city || load?.deliveryLocation?.address || p.toDestination,
    }));
  };

  const handleBidChange = (bidId: string) => {
    const bid = availableAssignedLoads.flatMap(l => l.acceptedBids || []).find((b: any) => b._id === bidId);
    const t = typeof bid?.transporterId === 'object' ? bid.transporterId : undefined;
    setMovementForm(p => ({
      ...p, bidId,
      transporterId: typeof bid?.transporterId === 'string' ? bid.transporterId : bid?.transporterId?._id || p.transporterId,
      transporterName: t?.companyName || t?.name || p.transporterName,
      vehicleNumber: bid?.vehicleDetails?.vehicleNumber || p.vehicleNumber,
      driverName: bid?.driverDetails?.driverName || p.driverName,
      driverPhone: bid?.driverDetails?.mobile || p.driverPhone,
    }));
  };

  const handleCreateMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateMovementForm()) return;
    try {
      setSaving(true);
      await branchesService.createMovement(movementForm);
      resetMovementForm(movementForm.branchId);
      setShowVehicleModal(false);
      toast({ title: 'Vehicle entry created' });
      await loadData();
    } catch (e: any) {
      toast({ title: 'Failed to create entry', description: getApiErrorMessage(e, 'Unable to create vehicle entry'), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const runMovementAction = async (id: string, action: 'gate-in' | 'verify' | 'reject' | 'gate-out' | 'reopen' | 'cancel') => {
    try {
      setOperationLoading(p => ({ ...p, [id]: true }));
      const checks = getMovementChecks(inspectionChecks[id]);
      const notes = notesByMovementId[id] || '';
      if (action === 'gate-in') await branchesService.gateIn(id, notes);
      if (action === 'reopen') await branchesService.reopenMovement(id, { notes });
      if (action === 'cancel') await branchesService.cancelMovement(id, { notes });
      if (action === 'gate-out') await branchesService.gateOut(id, { notes, checks: { loadingComplete: !!checks.loadingComplete, documentsReturned: !!checks.documentsReturned, sealChecked: !!checks.sealChecked, exitApproved: !!checks.exitApproved } });
      if (action === 'verify' || action === 'reject') {
        await branchesService.inspect(id, {
          status: action === 'verify' ? 'verified' : 'rejected', notes,
          documents: { rcBook: checks.rcBook, insurance: checks.insurance, permit: checks.permit, puc: checks.puc, fitness: checks.fitness, driverLicense: checks.driverLicense },
          ...checks,
        });
      }
      setNotesByMovementId(p => ({ ...p, [id]: '' }));
      const msgs = { 'gate-in': 'Vehicle entered', 'gate-out': 'Vehicle exited', verify: 'Inspection approved', reject: 'Inspection rejected', reopen: 'Reopened for re-inspection', cancel: 'Entry cancelled' };
      toast({ title: msgs[action] });
      await loadData();
    } catch (e: any) {
      toast({ title: 'Action failed', description: getApiErrorMessage(e, 'Unable to complete vehicle action'), variant: 'destructive' });
    } finally { setOperationLoading(p => ({ ...p, [id]: false })); }
  };

  const handleActionWithConfirmation = (id: string, action: any) => {
    if (action === 'reject') {
      setConfirmDialog({ open: true, action: 'reject', movementId: id, message: 'Are you sure you want to reject this vehicle inspection?' });
    } else if (action === 'cancel') {
      setConfirmDialog({ open: true, action: 'cancel', movementId: id, message: 'Are you sure you want to cancel this vehicle entry?' });
    } else {
      runMovementAction(id, action);
    }
  };

  const setInspectionCheck = (id: string, key: keyof MovementChecks, value: boolean) => {
    setInspectionChecks(p => ({ ...p, [id]: { ...getMovementChecks(p[id]), [key]: value } }));
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <Layout>
      <Layout.Body className="space-y-4 overflow-auto p-4 lg:p-5">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[1.4rem] font-semibold tracking-tight">
              {routeMode === 'outbound'
                ? REQUEST_TYPE_CONFIG.outbound.title
                : routeMode === 'inbound'
                  ? REQUEST_TYPE_CONFIG.inbound.title
                  : 'Branch Operations'}
            </h1>
            <p className="text-[12px] text-muted-foreground">
              {routeMode === 'outbound'
                ? REQUEST_TYPE_CONFIG.outbound.description
                : routeMode === 'inbound'
                  ? REQUEST_TYPE_CONFIG.inbound.description
                  : 'Manage branches, assign staff, and track gate movements.'}
            </p>
            {isRequestFlowRoute && userOperationalRole !== 'none' && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Access: {ROLE_CONFIG[userOperationalRole]?.description || 'Branch operations'}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-8 gap-1.5 text-[12px]">
            <IconRefresh className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>

        {/* Stats strip — shown on non-gate pages */}
        {!isRequestFlowRoute && (
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Branches', value: branches.length, color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
              { label: 'Active Vehicles', value: activeMovements.length, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
              { label: 'Awaiting Inspection', value: pendingInspection.length, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
              { label: 'Completed', value: completedMovements.length, color: 'bg-muted text-muted-foreground' },
            ].map(({ label, value, color }) => (
              <div key={label} className={cn('rounded-full px-3 py-1.5 text-[11px] font-medium', color)}>
                {label}: <span className="font-bold">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        {isRequestFlowRoute && requestTypeFilter ? (
          <VehicleFlowTab
            filteredMovements={filteredMovements} loading={loading} requestType={requestTypeFilter}
            branches={branches} assignedLoads={assignedLoads} transporters={transporters}
            selectedBranchId={effectiveBranchId} setSelectedBranchId={handleBranchChange}
            isBranchScopedUser={isBranchScopedUser}
            canCreateMovement={canCreateMovement} canGateIn={canGateIn}
            canInspectMovement={canInspectMovement} canGateOut={canGateOut}
            saving={saving} operationLoading={operationLoading}
            notesByMovementId={notesByMovementId} setNotesByMovementId={setNotesByMovementId}
            inspectionChecks={inspectionChecks} setInspectionCheck={setInspectionCheck}
            runMovementAction={handleActionWithConfirmation}
            setMovementForm={setMovementForm} resetMovementForm={resetMovementForm}
            setShowVehicleModal={setShowVehicleModal} movementForm={movementForm}
            expectedMovements={expectedMovements} pendingInspection={pendingInspection}
            verifiedMovements={verifiedMovements} rejectedMovements={rejectedMovements}
            movementFilters={movementFilters} setMovementFilters={setMovementFilters}
            movementPagination={movementPagination} movementPage={movementPage} setMovementPage={setMovementPage} setMovementPageSize={setMovementPageSize}
            expandedRows={expandedRows} toggleRowExpansion={toggleRowExpansion}
          />
        ) : (
          <div className={cn('grid items-start gap-4', canCreateBranch && canAssignStaff ? '2xl:grid-cols-2' : 'grid-cols-1')}>
            {canCreateBranch && (
              <BranchesTab branches={branches} branchForm={branchForm} setBranchForm={setBranchForm}
                validationErrors={validationErrors} saving={saving}
                handleCreateBranch={handleCreateBranch} resetBranchForm={resetBranchForm} />
            )}
            {canAssignStaff && (
              <StaffTab branches={branches} staffCandidates={staffCandidates} staffAssignments={staffAssignments}
                assignment={assignment} setAssignment={setAssignment}
                saving={saving} loading={staffLoading}
                staffFilters={staffFilters} setStaffFilters={setStaffFilters}
                handleAssignUser={handleAssignUser} />
            )}
          </div>
        )}

        {/* Vehicle entry modal */}
        {canCreateMovement && (
          <VehicleEntryModal
            open={showVehicleModal} onOpenChange={setShowVehicleModal}
            requestTypeMode={requestTypeFilter}
            movementForm={movementForm} setMovementForm={setMovementForm}
            manualLoadEntry={manualLoadEntry} setManualLoadEntry={setManualLoadEntry}
            branches={branches} transporters={transporters}
            selectedTransporter={selectedTransporter}
            selectedTransporterHasClosedAssignments={selectedTransporterHasClosedAssignments}
            selectedTransporterAssignments={selectedTransporterAssignments}
            selectedLoad={selectedLoad} selectedBid={selectedBid}
            selectedLoadBids={selectedLoadBids} needsLoadConfirmation={needsLoadConfirmation}
            validationErrors={validationErrors}
            onTransporterChange={handleTransporterChange} onLoadChange={handleLoadChange} onBidChange={handleBidChange}
            onSubmit={handleCreateMovement} onReset={() => resetMovementForm(movementForm.branchId)} saving={saving}
          />
        )}

        {/* Confirm dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={open => setConfirmDialog(p => ({ ...p, open }))}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[14px]">
                <IconAlertCircle className="h-4 w-4 text-destructive" /> Confirm Action
              </DialogTitle>
            </DialogHeader>
            <p className="text-[12px] text-muted-foreground">{confirmDialog.message}</p>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDialog({ open: false, action: null, movementId: null, message: '' })}>Back</Button>
              <Button variant="destructive" size="sm"
                onClick={async () => {
                  if (confirmDialog.movementId && confirmDialog.action) {
                    await runMovementAction(confirmDialog.movementId, confirmDialog.action);
                    setConfirmDialog({ open: false, action: null, movementId: null, message: '' });
                  }
                }}>
                {confirmDialog.action === 'cancel' ? 'Confirm Cancel' : 'Confirm Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout.Body>
    </Layout>
  );
}

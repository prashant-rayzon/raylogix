// ============================================================
// BRANCHES PAGE — Complete with Working Dialogs
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import {
  IconBuildingWarehouse,
  IconRefresh,
  IconPlus,
  IconMapPin,
  IconAlertCircle,
  IconLoader,
  IconSearch,
  IconX,
  IconCheck,
  IconUserCog,
  IconUsers,
  IconDoorEnter,
  IconFileCheck,
} from '@tabler/icons-react';

import { branchesService, Branch, BranchStaffAssignment, BranchUser, OperationalRole } from '@/api/services/branches/branches.service';
import { Layout } from '@/components/custom/layout';
import { Button } from '@/components/custom/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { ALL_PERMISSIONS, hasPermission } from '@/lib/permissions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SectionLoader } from '@/components/loader';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type BranchFormState = {
  name: string;
  code: string;
  gstNumber: string;
  phone: string;
  email: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

type StaffAssignmentState = {
  branchId: string;
  userId: string;
  operationalRole: OperationalRole;
};

type ValidationErrors = Partial<Record<keyof BranchFormState | keyof StaffAssignmentState, string>>;

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const VALIDATION_RULES = {
  GST: { pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, message: 'Invalid GST format' },
  EMAIL: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
  PHONE: { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit phone number' },
  PINCODE: { pattern: /^\d{6}$/, message: 'Enter a valid 6-digit pincode' },
} as const;

const ROLE_CONFIG: any = {
  branch_manager: { 
    label: 'Branch Manager', 
    icon: <IconUserCog className="h-3.5 w-3.5" />, 
    description: 'Full operational control' 
  },
  watchman: { 
    label: 'Watchman', 
    icon: <IconDoorEnter className="h-3.5 w-3.5" />, 
    description: 'Expected entry and gate in' 
  },
  inspection_officer: { 
    label: 'Inspection Officer', 
    icon: <IconFileCheck className="h-3.5 w-3.5" />, 
    description: 'Inspection and gate out approval' 
  },
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

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize justify-center',
      status === 'active'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
        : 'bg-muted text-muted-foreground'
    )}>
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: OperationalRole }) {
  const config = ROLE_CONFIG[role];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-medium justify-center">
      {config?.icon}
      {config?.label || role}
    </span>
  );
}

function FormField({ label, error, required, children, description }: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
      {error && (
        <p className="flex items-center gap-1 text-[10px] text-destructive">
          <IconAlertCircle className="h-3 w-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

function EmptyState({ message, description }: { message: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="rounded-full bg-muted/50 p-4">
        <IconBuildingWarehouse className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-base">{message}</p>
        {description && <p className="text-xs text-muted-foreground max-w-sm">{description}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BRANCH DIALOG COMPONENT
// ─────────────────────────────────────────────────────────────

function BranchDialog({ 
  open, 
  onOpenChange, 
  branchForm, 
  setBranchForm, 
  validationErrors, 
  saving, 
  onSubmit 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchForm: BranchFormState;
  setBranchForm: React.Dispatch<React.SetStateAction<BranchFormState>>;
  validationErrors: ValidationErrors;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <IconBuildingWarehouse className="h-4 w-4 text-primary" />
            Create Branch
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Branch Name" required error={validationErrors.name}>
              <Input
                value={branchForm.name}
                onChange={e => setBranchForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Mumbai Hub"
                className="h-8 text-[12px]"
              />
            </FormField>

            <FormField label="Branch Code" required error={validationErrors.code}>
              <Input
                value={branchForm.code}
                onChange={e => setBranchForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. MHC"
                className="h-8 text-[12px]"
              />
            </FormField>

            <FormField 
              label="GST Number" 
              error={validationErrors.gstNumber}
              description={VALIDATION_RULES.GST.message}
            >
              <Input
                maxLength={15}
                value={branchForm.gstNumber}
                onChange={e => setBranchForm(p => ({ ...p, gstNumber: e.target.value.toUpperCase() }))}
                placeholder="15-digit GSTIN"
                className="h-8 text-[12px]"
              />
            </FormField>

            <FormField label="Phone" error={validationErrors.phone}>
              <Input
                value={branchForm.phone}
                onChange={e => setBranchForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="10-digit"
                className="h-8 text-[12px]"
              />
            </FormField>

            <FormField label="Email" error={validationErrors.email} >
              <Input
                type="email"
                value={branchForm.email}
                onChange={e => setBranchForm(p => ({ ...p, email: e.target.value }))}
                placeholder="operations@branch.com"
                className="h-8 text-[12px]"
              />
            </FormField>

            <FormField label="Address" >
              <Input
                value={branchForm.line1}
                onChange={e => setBranchForm(p => ({ ...p, line1: e.target.value }))}
                placeholder="Street address"
                className="h-8 text-[12px]"
              />
            </FormField>

            <Input
              value={branchForm.city}
              onChange={e => setBranchForm(p => ({ ...p, city: e.target.value }))}
              placeholder="City"
              className="h-8 text-[12px]"
            />
            <Input
              value={branchForm.state}
              onChange={e => setBranchForm(p => ({ ...p, state: e.target.value }))}
              placeholder="State"
              className="h-8 text-[12px]"
            />

            <FormField label="Pincode" error={validationErrors.pincode}>
              <Input
                value={branchForm.pincode}
                onChange={e => setBranchForm(p => ({ ...p, pincode: e.target.value }))}
                placeholder="6-digit"
                className="h-8 text-[12px]"
              />
            </FormField>

            <Input
              value={branchForm.contactName}
              onChange={e => setBranchForm(p => ({ ...p, contactName: e.target.value }))}
              placeholder="Contact person name"
              className="h-8 text-[12px]"
            />
            <Input
              value={branchForm.contactPhone}
              onChange={e => setBranchForm(p => ({ ...p, contactPhone: e.target.value }))}
              placeholder="Contact phone"
              className="h-8 text-[12px]"
            />
            <Input
              type="email"
              value={branchForm.contactEmail}
              onChange={e => setBranchForm(p => ({ ...p, contactEmail: e.target.value }))}
              placeholder="Contact email"
              className="h-8 text-[12px]"
            />
          </div>

          <DialogFooter className="gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? (
                <><IconLoader className="h-3.5 w-3.5 animate-spin" /> Creating…</>
              ) : (
                <><IconPlus className="h-3.5 w-3.5" /> Create Branch</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// STAFF ASSIGNMENT DIALOG COMPONENT
// ─────────────────────────────────────────────────────────────

function StaffAssignmentDialog({ 
  open, 
  onOpenChange, 
  assignment, 
  setAssignment, 
  branches, 
  staffCandidates,
  validationErrors, 
  saving, 
  onSubmit 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: StaffAssignmentState;
  setAssignment: React.Dispatch<React.SetStateAction<StaffAssignmentState>>;
  branches: Branch[];
  staffCandidates: BranchUser[];
  validationErrors: ValidationErrors;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  const selectedCandidate = staffCandidates.find(c => c._id === assignment.userId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <IconUserCog className="h-4 w-4 text-primary" />
            Assign Staff to Branch
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-4">
            <FormField label="Branch" required error={validationErrors.branchId}>
              <Select 
                value={assignment.branchId} 
                onValueChange={v => setAssignment(p => ({ ...p, branchId: v }))}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Staff Member" required error={validationErrors.userId}>
              <Select 
                value={assignment.userId} 
                onValueChange={v => setAssignment(p => ({ ...p, userId: v }))}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffCandidates.map(u => (
                    <SelectItem key={u._id} value={u._id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[9px]">{getUserInitials(u)}</AvatarFallback>
                        </Avatar>
                        {getUserName(u)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Role" required error={validationErrors.operationalRole}>
              <Select 
                value={assignment.operationalRole} 
                onValueChange={v => setAssignment(p => ({ ...p, operationalRole: v as OperationalRole }))}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([key, config]:any) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-1.5">
                        {config.icon}
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Show warning if user already has assignment */}
            {selectedCandidate?.currentAssignment && (
              <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-2 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                <IconAlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                {getUserName(selectedCandidate)} is currently assigned to {selectedCandidate.currentAssignment.branchName} as {ROLE_CONFIG[selectedCandidate.currentAssignment.operationalRole]?.label}. Saving will move the assignment.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? (
                <><IconLoader className="h-3.5 w-3.5 animate-spin" /> Assigning…</>
              ) : (
                <><IconUserCog className="h-3.5 w-3.5" /> Assign Staff</>
              )}
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
  
  // Permissions
  const canCreateBranch = hasPermission(user, ALL_PERMISSIONS.BRANCH_CREATE);
  const canAssignStaff = hasPermission(user, ALL_PERMISSIONS.BRANCH_ASSIGN_STAFF);
  
  // ── Branch State ──
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  
  const [branchForm, setBranchForm] = useState<BranchFormState>({
    name: '',
    code: '',
    gstNumber: '',
    phone: '',
    email: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
  });

  // ── Staff Assignment State ──
  const [staffCandidates, setStaffCandidates] = useState<BranchUser[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<BranchStaffAssignment[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [debouncedStaffSearch, setDebouncedStaffSearch] = useState('');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [debouncedAssignmentSearch, setDebouncedAssignmentSearch] = useState('');
  
  const [assignment, setAssignment] = useState<StaffAssignmentState>({
    branchId: '',
    userId: '',
    operationalRole: 'branch_manager',
  });

  // Debouncing effect hooks
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedStaffSearch(staffSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [staffSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAssignmentSearch(assignmentSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [assignmentSearch]);

  // ── Data Loading ──
  const loadBranches = useCallback(async () => {
    try {
      setLoading(true);
      const data = await branchesService.list({ 
        limit: 100, 
        status: 'active', 
        branchType: 'company',
        search: debouncedSearchTerm || undefined,
      });
      setBranches(data.branches || []);
    } catch (e: any) {
      toast({ 
        title: 'Failed to load branches', 
        description: getApiErrorMessage(e, 'Unable to load branches'), 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm]);

  const loadStaffData = useCallback(async () => {
    if (!canAssignStaff) return;
    try {
      setStaffLoading(true);
      const [candidates, assignments] = await Promise.all([
        branchesService.listAssignableUsers({ 
          limit: 50, 
          search: debouncedStaffSearch || undefined 
        }),
        branchesService.listStaffAssignments({ 
          limit: 50, 
          search: debouncedAssignmentSearch || undefined 
        }),
      ]);
      setStaffCandidates(candidates.items || []);
      setStaffAssignments(assignments.items || []);
    } catch (e: any) {
      toast({ 
        title: 'Failed to load staff', 
        description: getApiErrorMessage(e, 'Unable to load staff data'), 
        variant: 'destructive' 
      });
    } finally {
      setStaffLoading(false);
    }
  }, [canAssignStaff, debouncedStaffSearch, debouncedAssignmentSearch]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (canAssignStaff) {
      loadStaffData();
    }
  }, [loadStaffData, canAssignStaff]);

  // ── Branch Form Handlers ──
  const resetBranchForm = () => {
    setBranchForm({
      name: '',
      code: '',
      gstNumber: '',
      phone: '',
      email: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      line1: '',
      city: '',
      state: '',
      pincode: '',
    });
    setValidationErrors({});
  };

  const validateBranchForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!branchForm.name.trim()) errors.name = 'Branch name is required';
    if (!branchForm.code.trim()) errors.code = 'Branch code is required';
    if (branchForm.gstNumber && !VALIDATION_RULES.GST.pattern.test(branchForm.gstNumber.toUpperCase())) {
      errors.gstNumber = VALIDATION_RULES.GST.message;
    }
    if (branchForm.email && !VALIDATION_RULES.EMAIL.pattern.test(branchForm.email)) {
      errors.email = VALIDATION_RULES.EMAIL.message;
    }
    if (branchForm.phone && !VALIDATION_RULES.PHONE.pattern.test(branchForm.phone.replace(/[^\d]/g, ''))) {
      errors.phone = VALIDATION_RULES.PHONE.message;
    }
    if (branchForm.pincode && !VALIDATION_RULES.PINCODE.pattern.test(branchForm.pincode)) {
      errors.pincode = VALIDATION_RULES.PINCODE.message;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateBranch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateBranchForm()) return;
    
    try {
      setSaving(true);
      await branchesService.create({
        name: branchForm.name,
        code: branchForm.code,
        gstNumber: branchForm.gstNumber,
        phone: branchForm.phone,
        email: branchForm.email,
        contactPerson: {
          name: branchForm.contactName,
          phone: branchForm.contactPhone,
          email: branchForm.contactEmail,
        },
        address: {
          line1: branchForm.line1,
          city: branchForm.city,
          state: branchForm.state,
          pincode: branchForm.pincode,
        },
      });
      
      resetBranchForm();
      setBranchDialogOpen(false);
      toast({ title: 'Branch created successfully' });
      await loadBranches();
    } catch (e: any) {
      toast({
        title: 'Failed to create branch',
        description: getApiErrorMessage(e, 'Unable to create branch'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Staff Assignment Handlers ──
  const resetAssignmentForm = () => {
    setAssignment({
      branchId: '',
      userId: '',
      operationalRole: 'branch_manager',
    });
    setValidationErrors({});
  };

  const validateAssignmentForm = (): boolean => {
    const errors: ValidationErrors = {};
    if (!assignment.branchId) errors.branchId = 'Please select a branch';
    if (!assignment.userId) errors.userId = 'Please select a user';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAssignUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateAssignmentForm()) return;
    
    try {
      setStaffLoading(true);
      await branchesService.assignUser(assignment);
      toast({ title: 'Staff assigned successfully' });
      resetAssignmentForm();
      setStaffDialogOpen(false);
      await Promise.all([loadStaffData(), loadBranches()]);
    } catch (e: any) {
      toast({
        title: 'Failed to assign staff',
        description: getApiErrorMessage(e, 'Unable to assign staff'),
        variant: 'destructive',
      });
    } finally {
      setStaffLoading(false);
    }
  };

  const handleBranchSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleAssignmentSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAssignmentSearch(e.target.value);
  };

  // ── Filter branches ──
  const filteredBranches = branches.filter(branch => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    return (
      branch.name?.toLowerCase().includes(search) ||
      branch.code?.toLowerCase().includes(search) ||
      branch.email?.toLowerCase().includes(search) ||
      branch.address?.city?.toLowerCase().includes(search)
    );
  });

  const filteredAssignments = staffAssignments.filter(item => {
    const search = assignmentSearch.toLowerCase().trim();
    if (!search) return true;
    const userName = getUserName(item.user as BranchUser).toLowerCase();
    const branchName = item.branch?.name?.toLowerCase() || '';
    return userName.includes(search) || branchName.includes(search);
  });

  return (
    <Layout>
      <Layout.Body className="space-y-4 overflow-auto p-4 lg:p-5">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[1.4rem] font-semibold tracking-tight">Branch Management</h1>
            <p className="text-[12px] text-muted-foreground">
              Manage your branch locations and staff assignments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                loadBranches();
                if (canAssignStaff) loadStaffData();
              }} 
              disabled={loading || staffLoading} 
              className="h-8 gap-1.5 text-[12px]"
            >
              <IconRefresh className={cn('h-3.5 w-3.5', (loading || staffLoading) && 'animate-spin')} />
              {loading || staffLoading ? 'Loading…' : 'Refresh'}
            </Button>
            {canCreateBranch && (
              <Button 
                size="sm" 
                className="h-8 gap-1.5 text-[12px]"
                onClick={() => {
                  resetBranchForm();
                  setBranchDialogOpen(true);
                }}
              >
                <IconPlus className="h-3.5 w-3.5" />
                New Branch
              </Button>
            )}
            {canAssignStaff && (
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 gap-1.5 text-[12px]"
                onClick={() => {
                  resetAssignmentForm();
                  setStaffDialogOpen(true);
                }}
              >
                <IconUserCog className="h-3.5 w-3.5" />
                Assign Staff
              </Button>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
            Total Branches: <span className="font-bold">{branches.length}</span>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            Active: <span className="font-bold">{branches.filter(b => b.status === 'active').length}</span>
          </div>
          {canAssignStaff && (
            <div className="rounded-full bg-purple-50 px-3 py-1.5 text-[11px] font-medium text-purple-700 dark:bg-purple-950/30 dark:text-purple-400">
              Staff Assigned: <span className="font-bold">{staffAssignments.length}</span>
            </div>
          )}
        </div>

        {/* ── Main Grid ── */}
        <div className={cn('grid gap-4', canAssignStaff ? 'lg:grid-cols-2' : 'grid-cols-1')}>
          
          {/* ── Branch List ── */}
          <Card className="overflow-hidden border-border/50 shadow-sm">
            <div className="border-b bg-muted/10 px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconBuildingWarehouse className="h-4 w-4 text-primary" />
                  <span className="text-[13px] font-semibold">Branches</span>
                </div>
                <div className="relative max-w-xs">
                  <IconSearch className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={handleBranchSearch}
                    placeholder="Search branches..."
                    className="h-7 w-[180px] pl-7 text-[11px]"
                  />
                </div>
              </div>
            </div>

            <CardContent className="p-0">
              {loading ? (
                <SectionLoader label="Loading branches..." />
              ) : filteredBranches.length === 0 ? (
                <EmptyState 
                  message="No branches found" 
                  description={searchTerm ? "Try adjusting your search" : "Create your first branch to get started"} 
                />
              ) : (
                <ScrollArea className="h-[calc(100vh-24rem)]">
                  <div className="divide-y divide-border/40">
                    {/* ── Headers ── */}
                    <div className="hidden grid-cols-[1fr_140px_160px_100px] gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                      <div>Branch</div>
                      <div>Manager</div>
                      <div>GST / Email</div>
                      <div>Status</div>
                    </div>

                    {/* ── Branch Rows ── */}
                    {filteredBranches.map((branch) => (
                      <div
                        key={branch._id}
                        className="grid gap-2 px-4 py-2.5 transition-colors hover:bg-muted/20 md:grid-cols-[1fr_140px_160px_100px] md:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-semibold">{branch.name}</span>
                            <span className="shrink-0 rounded border border-border/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                              {branch.code}
                            </span>
                          </div>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                            <IconMapPin className="h-3 w-3 shrink-0" />
                            {[branch.address?.city, branch.address?.state].filter(Boolean).join(', ') || 'No address'}
                          </p>
                          {canAssignStaff && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              <IconUsers className="inline h-3 w-3 mr-0.5" />
                              {staffAssignments.filter(a => a.branchId === branch._id).length} staff assigned
                            </p>
                          )}
                        </div>
                        
                        <span className="text-[12px] font-medium">
                          {branch.managerName || <span className="text-muted-foreground/60 italic">Not assigned</span>}
                        </span>
                        
                        <span className="truncate text-[11px] text-muted-foreground">
                          {branch.gstNumber || branch.email || '—'}
                        </span>
                        
                        <StatusBadge status={branch.status || 'active'} />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* ── Staff Assignments ── */}
          {canAssignStaff && (
            <Card className="overflow-hidden border-border/50 shadow-sm">
              <div className="border-b bg-muted/10 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconUsers className="h-4 w-4 text-primary" />
                    <span className="text-[13px] font-semibold">Staff Assignments</span>
                  </div>
                  <div className="relative max-w-xs">
                    <IconSearch className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={assignmentSearch}
                      onChange={handleAssignmentSearch}
                      placeholder="Search assignments..."
                      className="h-7 w-[180px] pl-7 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <CardContent className="p-0">
                {staffLoading ? (
                  <SectionLoader label="Loading staff assignments..." />
                ) : filteredAssignments.length === 0 ? (
                  <EmptyState 
                    message="No staff assignments" 
                    description={assignmentSearch ? "Try adjusting your search" : "Assign staff to branches to get started"} 
                  />
                ) : (
                  <ScrollArea className="h-[calc(100vh-24rem)]">
                    <div className="divide-y divide-border/40">
                      {/* ── Headers ── */}
                      <div className="hidden grid-cols-[1fr_130px_130px] gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                        <div>User</div>
                        <div>Branch</div>
                        <div>Role</div>
                      </div>

                      {/* ── Assignment Rows ── */}
                      {filteredAssignments.map((item) => (
                        <div
                          key={item._id}
                          className="grid gap-2 px-4 py-2.5 transition-colors hover:bg-muted/20 md:grid-cols-[1fr_130px_130px] md:items-center"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarFallback className="text-[10px]">
                                {getUserInitials(item.user as BranchUser)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold">
                                {getUserName(item.user as BranchUser)}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {(item.user as BranchUser)?.email}
                              </p>
                            </div>
                          </div>
                          
                          <span className="text-[12px] font-medium truncate">
                            {item.branch?.name || '—'}
                          </span>
                          
                          <RoleBadge role={item.operationalRole} />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Branch Dialog ── */}
        <BranchDialog
          open={branchDialogOpen}
          onOpenChange={setBranchDialogOpen}
          branchForm={branchForm}
          setBranchForm={setBranchForm}
          validationErrors={validationErrors}
          saving={saving}
          onSubmit={handleCreateBranch}
        />

        {/* ── Staff Assignment Dialog ── */}
        <StaffAssignmentDialog
          open={staffDialogOpen}
          onOpenChange={setStaffDialogOpen}
          assignment={assignment}
          setAssignment={setAssignment}
          branches={branches}
          staffCandidates={staffCandidates}
          validationErrors={validationErrors}
          saving={staffLoading}
          onSubmit={handleAssignUser}
        />
      </Layout.Body>
    </Layout>
  );
}

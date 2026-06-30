// frontend/src/components/users/EditUserModal.tsx
import { useState, useEffect } from 'react';
import { usersService } from '../../../api/services/users/users.service';
import type { UserRole } from '@/api/types';
import { useRole } from '../../../lib/hooks/useRole';
import { 
  Mail, 
  UserCircle, 
  AlertCircle, 
  X,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
  UserCog,
  Search,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { PermissionGate } from '../../../components/auth/PermissionGate';

import { cn } from '@/lib/utils';
import { PERMISSION_GROUPS } from '@/lib/permissions';

interface EditUserModalProps {
  isOpen: boolean;
  userId: string | null;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: 'details' | 'permissions';
}

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  role: UserRole;
  isActive: boolean;
}

interface FormErrors {
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  submit?: string;
}

interface TouchedFields {
  email?: boolean;
  firstName?: boolean;
  lastName?: boolean;
  username?: boolean;
}

const USER_ROLES = [
  { value: 'company_admin', label: 'Company Admin', icon: UserCog, color: 'text-red-500' },
  { value: 'company_user', label: 'Company User', icon: UserCircle, color: 'text-gray-500' },
  { value: 'transporter', label: 'Transporter' },
];

type TabType = 'details' | 'permissions';

export function EditUserModal({ isOpen, userId, onClose, onSuccess, initialTab = 'details' }: EditUserModalProps) {
  const isCompanyAdmin = useRole('company_admin');
  const isSuperAdmin = useRole('super_admin');
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    username: '',
    role: 'company_user',
    isActive: true,
  });
  const [originalData, setOriginalData] = useState<UserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    username: '',
    role: 'company_user',
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});

  // Role & Permissions editor state
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [searchPermission, setSearchPermission] = useState('');

  // Determine available roles based on user's permission
  const availableRoles = isSuperAdmin 
    ? USER_ROLES 
    : isCompanyAdmin 
      ? USER_ROLES.filter(role => role.value !== 'company_admin') 
      : USER_ROLES.filter(role => role.value === 'company_user');

  // Fetch user data when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchUser(userId);
      setActiveTab(initialTab);
    }
  }, [isOpen, userId, initialTab]);

  const fetchUser = async (id: string) => {
    try {
      setLoading(true);
      const user = await usersService.getById(id);

      const userData = {
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        role: user.role || 'company_user',
        isActive: user.isActive !== undefined ? user.isActive : true,
      };

      setFormData(userData);
      setOriginalData(userData);
      
      // Ensure permissions is always an array
      const permissions = Array.isArray(user.permissions) ? user.permissions : [];
      setUserPermissions(permissions);
      setPermissionsError(null);
      
      if (permissions.length === 0) {
        console.warn('User has no permissions set, using role defaults');
      }
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load user data',
        variant: 'destructive',
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const validateField = (name: keyof UserFormData, value: string): boolean => {
    const newErrors = { ...errors };

    switch (name) {
      case 'email':
        if (!value) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;
      case 'firstName':
        if (!value) {
          newErrors.firstName = 'First name is required';
        } else if (value.length < 2) {
          newErrors.firstName = 'First name must be at least 2 characters';
        } else {
          delete newErrors.firstName;
        }
        break;
      case 'lastName':
        if (!value) {
          newErrors.lastName = 'Last name is required';
        } else if (value.length < 2) {
          newErrors.lastName = 'Last name must be at least 2 characters';
        } else {
          delete newErrors.lastName;
        }
        break;
      case 'username':
        if (value && value.length < 3) {
          newErrors.username = 'Username must be at least 3 characters';
        } else {
          delete newErrors.username;
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (touched[name as keyof TouchedFields]) {
      validateField(name as keyof UserFormData, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    validateField(name as keyof UserFormData, value);
  };

  const hasChanges = () => {
    return (
      formData.email !== originalData.email ||
      formData.firstName !== originalData.firstName ||
      formData.lastName !== originalData.lastName ||
      formData.username !== originalData.username ||
      formData.role !== originalData.role
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allValid = (Object.keys(formData) as Array<keyof UserFormData>).every((key) => {
      if (key === 'username') return true;
      return validateField(key, String(formData[key] ?? ''));
    });

    if (!allValid) {
      toast({
        title: 'Validation Errors',
        description: 'Please fix all validation errors',
        variant: 'destructive',
      });
      return;
    }

    if (!hasChanges()) {
      toast({
        title: 'No Changes',
        description: 'You haven\'t made any changes to the user profile.',
        variant: 'default',
      });
      return;
    }

    setSubmitting(true);

    try {
      await usersService.update(userId!, formData);
      
      toast({
        title: 'User updated successfully',
        description: `${formData.firstName} ${formData.lastName}'s profile has been updated.`,
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Failed to update user';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setErrors({ submit: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  // Check if a specific permission is granted
  const hasPermission = (permission: string): boolean => {
    return userPermissions.includes(permission);
  };

  const togglePermission = (permission: string) => {
    if (userPermissions.includes(permission)) {
      setUserPermissions(userPermissions.filter((p) => p !== permission));
    } else {
      setUserPermissions([...userPermissions, permission]);
    }
  };

  const toggleAllPermissions = (permissions: string[]) => {
    const hasAll = permissions.every((permission) => userPermissions.includes(permission));
    
    if (hasAll) {
      setUserPermissions(userPermissions.filter((permission) => !permissions.includes(permission)));
    } else {
      const newPermissions = new Set(userPermissions);
      permissions.forEach((permission) => newPermissions.add(permission));
      setUserPermissions(Array.from(newPermissions));
    }
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((permission) => hasPermission(permission));
  };

  const tabs = [
    { id: 'details' as TabType, label: 'Details', icon: UserCircle },
    { id: 'permissions' as TabType, label: 'Role & Permissions', icon: Shield },
  ];

  // Filter resources based on search
  const filteredResources = searchPermission
    ? PERMISSION_GROUPS.filter((group) => 
        group.label.toLowerCase().includes(searchPermission.toLowerCase()) ||
        group.key.toLowerCase().includes(searchPermission.toLowerCase())
      )
    : PERMISSION_GROUPS;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300 border border-border">
        {/* Modal Header */}
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-full">
              <UserCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Edit User</h3>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading...' : `Update profile for ${formData.firstName} ${formData.lastName}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            disabled={submitting}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border bg-muted/20">
          <div className="flex px-6 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Loading user data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {/* Error Alert */}
            {errors.submit && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-start gap-2 mb-6">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{errors.submit}</span>
              </div>
            )}

            {/* Tab Content */}
            <div className="space-y-6">
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                    <span className="text-sm font-medium text-muted-foreground">Status:</span>
                    {formData.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        <XCircle className="w-3.5 h-3.5" />
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2" htmlFor="edit-email">
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="edit-email"
                        type="email"
                        name="email"
                        className={cn(
                          "w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all placeholder:text-muted-foreground",
                          errors.email && touched.email ? 'border-destructive' : 'border-input'
                        )}
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required
                      />
                    </div>
                    {errors.email && touched.email && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2" htmlFor="edit-firstName">
                        First Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="edit-firstName"
                        type="text"
                        name="firstName"
                        className={cn(
                          "w-full px-4 py-2.5 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all placeholder:text-muted-foreground",
                          errors.firstName && touched.firstName ? 'border-destructive' : 'border-input'
                        )}
                        placeholder="Enter first name"
                        value={formData.firstName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required
                      />
                      {errors.firstName && touched.firstName && (
                        <p className="mt-1.5 text-xs text-destructive">{errors.firstName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2" htmlFor="edit-lastName">
                        Last Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="edit-lastName"
                        type="text"
                        name="lastName"
                        className={cn(
                          "w-full px-4 py-2.5 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all placeholder:text-muted-foreground",
                          errors.lastName && touched.lastName ? 'border-destructive' : 'border-input'
                        )}
                        placeholder="Enter last name"
                        value={formData.lastName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required
                      />
                      {errors.lastName && touched.lastName && (
                        <p className="mt-1.5 text-xs text-destructive">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2" htmlFor="edit-username">
                      Username <span className="text-muted-foreground text-xs">(optional)</span>
                    </label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="edit-username"
                        type="text"
                        name="username"
                        className={cn(
                          "w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all placeholder:text-muted-foreground",
                          errors.username && touched.username ? 'border-destructive' : 'border-input'
                        )}
                        placeholder="Enter username"
                        value={formData.username}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>
                    {errors.username && touched.username ? (
                      <p className="mt-1.5 text-xs text-destructive">{errors.username}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Username must be at least 3 characters if provided
                      </p>
                    )}
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2" htmlFor="edit-role">
                      Role <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="edit-role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                      required
                    >
                      {availableRoles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                      {isSuperAdmin
                        ? 'You have full access to change any supported role'
                        : isCompanyAdmin
                          ? 'You can assign company users and transporters'
                          : 'You cannot change the role'}
                    </p>
                  </div>

                  {/* Change Summary */}
                  {hasChanges() && (
                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-warning">Unsaved Changes</p>
                          <p className="text-sm text-warning/80 mt-0.5">
                            You have made changes to this user's profile.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Role & Permissions Tab */}
              {activeTab === 'permissions' && (
                <PermissionGate permission="role.manage">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Role & Permissions</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Manage CRUD permissions for each resource
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={permissionsSaving}
                        onClick={async () => {
                          setPermissionsError(null);
                          try {
                            setPermissionsSaving(true);
                            await usersService.updatePermissions(userId!, userPermissions);
                            toast({
                              title: 'Permissions updated',
                              description: 'Role & permissions were saved successfully.',
                            });
                            onSuccess();
                          } catch (err: any) {
                            const msg = err?.data?.message || err?.message || 'Failed to save permissions';
                            setPermissionsError(msg);
                            toast({ title: 'Error', description: msg, variant: 'destructive' });
                          } finally {
                            setPermissionsSaving(false);
                          }
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {permissionsSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Permissions
                          </>
                        )}
                      </button>
                    </div>

                    {/* Current Role Display */}
                    <div className="p-4 bg-muted/20 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Current Role</p>
                          <p className="text-sm text-muted-foreground">
                            {USER_ROLES.find(r => r.value === formData.role)?.label || formData.role}
                          </p>
                        </div>
                      </div>
                    </div>

                    {permissionsError && (
                      <p className="text-xs text-destructive">{permissionsError}</p>
                    )}

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search resources..."
                        value={searchPermission}
                        onChange={(e) => setSearchPermission(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-input bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all placeholder:text-muted-foreground"
                      />
                    </div>

                    {/* Permissions Table */}
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 border-b border-border">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider w-48">
                                Resource
                              </th>
                              {['Read', 'Create', 'Update', 'Delete'].map((action) => {
                                return (
                                  <th key={action} className="px-2 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">{action}</th>
                                );
                              })}
                              <th className="px-2 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider w-20">
                                All
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {filteredResources.map((group) => {
                              const hasAll = hasAllPermissions(group.permissions);
                              
                              return (
                                <tr key={group.key} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-4 py-3">
                                    <span className="text-foreground font-medium text-sm">{group.label}</span>
                                  </td>
                                  {group.permissions.map((permission) => {
                                    const checked = hasPermission(permission);
                                    return (
                                      <td key={permission} className="px-2 py-3 text-center">
                                        <label className="inline-flex items-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => togglePermission(permission)}
                                            className={cn(
                                              "rounded border-input text-primary focus:ring-ring focus:ring-2 h-4 w-4",
                                              checked && "ring-2 ring-primary/20"
                                            )}
                                          />
                                        </label>
                                      </td>
                                    );
                                  })}
                                  <td className="px-2 py-3 text-center">
                                    <label className="inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={hasAll}
                                        onChange={() => toggleAllPermissions(group.permissions)}
                                        className="rounded border-input text-primary focus:ring-ring focus:ring-2 h-4 w-4"
                                      />
                                    </label>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Permission Summary */}
                    <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={permissionsSaving}
                          onClick={() => setUserPermissions([])}
                          className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Reset to role defaults
                        </button>
                        <p className="text-xs text-muted-foreground">
                          Clearing overrides makes the server fall back to role defaults.
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{userPermissions.length}</span> permissions assigned
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Legend:</span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">Read / Create / Update / Delete</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </PermissionGate>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6 border-t border-border">
              <button
                type="submit"
                disabled={submitting || !hasChanges()}
                className="flex-1 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-2.5 border border-input rounded-lg text-sm font-medium text-foreground hover:bg-muted hover:border-muted-foreground/30 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EditUserModal;

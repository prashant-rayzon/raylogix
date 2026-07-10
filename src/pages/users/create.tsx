// frontend/src/components/users/CreateUserModal.tsx
import { useState } from 'react';
import { usersService } from '@/api/services/users/users.service';
import type { UserRole } from '@/api/types';
import { useRole } from '@/lib/hooks/useRole';
import { 
  Mail, 
  Lock, 
  UserCircle, 
  AlertCircle, 
  X,
  UserPlus,
  Loader2,
  Shield,
  Search,
} from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { PERMISSION_GROUPS, getAssignablePermissionsForRole } from '@/lib/permissions';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UserFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  role: UserRole;
  team: 'general' | 'inbound' | 'outbound';
}

interface FormErrors {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  submit?: string;
}

interface TouchedFields {
  email?: boolean;
  password?: boolean;
  firstName?: boolean;
  lastName?: boolean;
  username?: boolean;
}

type TabType = 'details' | 'permissions';

const USER_ROLES = [
  { value: 'company_user', label: 'Company User' },
  { value: 'company_admin', label: 'Company Admin' },
  { value: 'transporter', label: 'Transporter' },
  { value: 'finance', label: 'Finance Auditor' },
];

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const isCompanyAdmin = useRole('company_admin');
  const isSuperAdmin = useRole('super_admin');
  
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    username: '',
    role: 'company_user',
    team: 'general',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>({});
  
  // Permissions state
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [searchPermission, setSearchPermission] = useState('');

  // Determine available roles based on user's permission
  const availableRoles = isSuperAdmin 
    ? USER_ROLES 
    : isCompanyAdmin 
      ? USER_ROLES.filter(role => role.value !== 'company_admin') 
      : USER_ROLES.filter(role => role.value === 'company_user');

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
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else {
          delete newErrors.password;
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

  const assignablePermissions = getAssignablePermissionsForRole(formData.role, userPermissions);

  const filteredPermissionGroups = (searchPermission
    ? PERMISSION_GROUPS.filter((group) =>
        group.label.toLowerCase().includes(searchPermission.toLowerCase()) ||
        group.key.toLowerCase().includes(searchPermission.toLowerCase())
      )
    : PERMISSION_GROUPS
  ).filter((group) =>
    group.permissions.some((permission) => assignablePermissions.has(permission))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allValid = (Object.keys(formData) as Array<keyof UserFormData>).every((key) => {
      if (key === 'username') return true;
      return validateField(key, formData[key]);
    });

    if (!allValid) {
      toast({
        title: 'Validation Errors',
        description: 'Please fix all validation errors',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await usersService.create({
        ...formData,
        permissions: userPermissions,
      });
      
      toast({
        title: 'User created successfully',
        description: `User ${formData.email} has been created.`,
      });
      
      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Failed to create user';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      username: '',
      role: 'company_user',
      team: 'general',
    });
    setErrors({});
    setTouched({});
    setUserPermissions([]);
    setActiveTab('details');
    setSearchPermission('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-full">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Create New User</h3>
              <p className="text-sm text-gray-500">Add a new team member to your organization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100 bg-gray-50">
          <div className="flex px-6 gap-1">
            {[
              { id: 'details' as TabType, label: 'Details', icon: UserCircle },
              { id: 'permissions' as TabType, label: 'Permissions (Optional)', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative",
                    isActive
                      ? "text-primary"
                      : "text-gray-500 hover:text-gray-700"
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errors.submit}</span>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="modal-email">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="modal-email"
                type="email"
                name="email"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                  errors.email && touched.email ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
            </div>
            {errors.email && touched.email && (
              <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="modal-password">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="modal-password"
                type="password"
                name="password"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                  errors.password && touched.password ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="Enter password (min 8 characters)"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                minLength={8}
                required
              />
            </div>
            {errors.password && touched.password ? (
              <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>
            ) : (
              <p className="mt-1.5 text-xs text-gray-500">Password must be at least 8 characters</p>
            )}
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="modal-firstName">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-firstName"
                type="text"
                name="firstName"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                  errors.firstName && touched.firstName ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="Enter first name"
                value={formData.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              {errors.firstName && touched.firstName && (
                <p className="mt-1.5 text-xs text-red-500">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="modal-lastName">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-lastName"
                type="text"
                name="lastName"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                  errors.lastName && touched.lastName ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="Enter last name"
                value={formData.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              {errors.lastName && touched.lastName && (
                <p className="mt-1.5 text-xs text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="modal-username">
              Username <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="modal-username"
                type="text"
                name="username"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${
                  errors.username && touched.username ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="Enter username"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>
            {errors.username && touched.username ? (
              <p className="mt-1.5 text-xs text-red-500">{errors.username}</p>
            ) : (
              <p className="mt-1.5 text-xs text-gray-500">
                If left blank, username will be generated from email
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="modal-role">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              id="modal-role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white"
              required
            >
              {availableRoles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
                  {isSuperAdmin
                    ? 'You have full access to assign any supported role'
                    : isCompanyAdmin
                      ? 'You can create company users and transporters'
                      : 'You can only create company users'}
            </p>
          </div>

          {formData.role === 'company_user' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="modal-team">
                Team / Department <span className="text-red-500">*</span>
              </label>
              <select
                id="modal-team"
                name="team"
                value={formData.team}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white"
                required
              >
                <option value="general">General (Inbound + Outbound)</option>
                <option value="inbound">Inbound Team</option>
                <option value="outbound">Outbound Team</option>
              </select>
              <p className="mt-1.5 text-xs text-gray-500">
                Determines which sections and load types (inbound/outbound) this user can access
              </p>
            </div>
          )}
        </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <PermissionGate permission="role.manage">
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-primary">Permissions (Optional)</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Set initial permissions for this user. Can be changed later.
                  </p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search resources..."
                    value={searchPermission}
                    onChange={(e) => setSearchPermission(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-gray-400"
                  />
                </div>

                {/* Permissions Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider w-48">
                            Resource
                          </th>
                          {['Read', 'Create', 'Update', 'Delete'].map((action) => (
                            <th key={action} className="px-2 py-3 text-center font-medium text-gray-500 text-xs uppercase tracking-wider">
                              {action}
                            </th>
                          ))}
                          <th className="px-2 py-3 text-center font-medium text-gray-500 text-xs uppercase tracking-wider w-20">
                            All
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredPermissionGroups.map((group) => {
                          const visiblePermissions = group.permissions.filter((permission) =>
                            assignablePermissions.has(permission)
                          );
                          const hasAll = hasAllPermissions(visiblePermissions);
                          
                          return (
                            <tr key={group.key} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="text-primary font-medium text-sm">{group.label}</span>
                              </td>
                              {group.permissions.map((permission) => {
                                if (!assignablePermissions.has(permission)) {
                                  return <td key={permission} className="px-2 py-3 text-center" />;
                                }
                                const checked = hasPermission(permission);
                                return (
                                  <td key={permission} className="px-2 py-3 text-center">
                                    <label className="inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => togglePermission(permission)}
                                        className={cn(
                                          "rounded border-gray-300 text-primary focus:ring-primary focus:ring-2 h-4 w-4"
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
                                    onChange={() => toggleAllPermissions(visiblePermissions)}
                                    className="rounded border-gray-300 text-primary focus:ring-primary focus:ring-2 h-4 w-4"
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
                <div className="flex items-center gap-3 pt-2">
                  <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-primary">{userPermissions.length}</span> permissions assigned
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Note: Users will also get role-based defaults
                  </p>
                </div>
              </div>
            </PermissionGate>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateUserModal

// frontend/src/pages/users/index.tsx
import { useEffect, useState } from 'react';
import { usersService } from '@/api/services/users/users.service';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Search, 
  Edit2, 
  Trash2, 
  UserPlus,
  CheckCircle,
  XCircle,
  Lock,
} from 'lucide-react';
import { UserNav } from '@/components/user-nav';
import { Layout } from '@/components/custom/layout';
import { SectionLoader } from '@/components/loader';
import ThemeSwitch from '@/components/theme-switch';
import { CreateUserModal } from './create';
import { EditUserModal } from './edit/[id]';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'total' | 'active' | 'inactive'>('total');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editModalTab, setEditModalTab] = useState<'details' | 'permissions'>('details');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const response: any = await usersService.list({
        page,
        limit: 20,
      });
      setUsers(response.users || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Open delete confirmation modal
  const openDeleteModal = (user: User) => {
    if (!user.isActive) {
      toast({
        title: 'Cannot delete',
        description: 'This user is already inactive.',
        variant: 'destructive',
      });
      return;
    }
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
    setIsDeleting(false);
  };

  // Handle delete confirmation
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await usersService.deactivate(userToDelete._id);
      
      toast({
        title: 'User deactivated',
        description: `${userToDelete.firstName} ${userToDelete.lastName} has been deactivated successfully.`,
        variant: 'default',
      });
      
      fetchUsers(pagination.page);
      closeDeleteModal();
    } catch (error: any) {
      console.error('Failed to deactivate user:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to deactivate user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Open edit modal
  const openEditModal = (userId: string, tab: 'details' | 'permissions' = 'details') => {
    setSelectedUserId(userId);
    setEditModalTab(tab);
    setShowEditModal(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedUserId(null);
    setEditModalTab('details');
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = `${user.firstName} ${user.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'active') return matchesSearch && user.isActive;
    if (activeTab === 'inactive') return matchesSearch && !user.isActive;
    return matchesSearch;
  });

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
          <CheckCircle className="w-3.5 h-3.5" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
        <XCircle className="w-3.5 h-3.5" />
        Inactive
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, string> = {
      'admin': 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800/50',
      'company_admin': 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800/50',
      'manager': 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
      'user': 'bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      'company_user': 'bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      'transporter': 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
      'super_admin': 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
    };
    const className = roleMap[role.toLowerCase()] || 'bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}>
        {role.replace(/_/g, ' ')}
      </span>
    );
  };

  const activeCount = users.filter(u => u.isActive).length;
  const inactiveCount = users.filter(u => !u.isActive).length;

  return (
    <Layout>
      <Layout.Header>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] bg-background">/</kbd>
            <span>search</span>
          </div>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <UserNav />
        </div>
      </Layout.Header>

      <Layout.Body className="sm:overflow-hidden">
        <div className=" mx-auto ">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Users</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage and organize your team members</p>
            </div>
            <PermissionGate permission="user.invite">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </button>
            </PermissionGate>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Users', value: pagination.total, tab: 'total' as const },
              { label: 'Active Users', value: activeCount, tab: 'active' as const },
              { label: 'Inactive Users', value: inactiveCount, tab: 'inactive' as const },
            ].map((stat) => (
              <Card
                key={stat.tab}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  activeTab === stat.tab
                    ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setActiveTab(stat.tab)}
              >
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table Card */}
          <Card className="overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <SectionLoader label="Loading users..." />
            ) : filteredUsers.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">User</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Role</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-medium text-xs">
                                {user.firstName[0]}{user.lastName[0]}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{user.firstName} {user.lastName}</p>
                                <p className="text-xs text-muted-foreground font-mono">#{user._id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-foreground">{user.email}</td>
                          <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                          <td className="px-4 py-3">{getStatusBadge(user.isActive)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <PermissionGate permission="user.update">
                                <button
                                  onClick={() => openEditModal(user._id)}
                                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="Edit user"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </PermissionGate>
                              <PermissionGate permission="role.manage">
                                <button
                                  onClick={() => openEditModal(user._id, 'permissions')}
                                  className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 text-muted-foreground hover:text-blue-600 transition-colors"
                                  title="Manage permissions"
                                >
                                  <Lock className="w-4 h-4" />
                                </button>
                              </PermissionGate>
                              <PermissionGate permission="user.deactivate">
                                <button
                                  onClick={() => openDeleteModal(user)}
                                  disabled={!user.isActive}
                                  className={cn(
                                    "p-1.5 rounded-md transition-colors",
                                    user.isActive
                                      ? "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                      : "text-muted-foreground/40 cursor-not-allowed"
                                  )}
                                  title={user.isActive ? "Deactivate user" : "User already inactive"}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border bg-muted/20">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{filteredUsers.length}</span> of{' '}
                    <span className="font-medium text-foreground">{pagination.total}</span> users
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={pagination.page === 1}
                      onClick={() => fetchUsers(pagination.page - 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-input rounded-md text-sm text-foreground hover:bg-muted hover:border-muted-foreground/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-background border border-input rounded-md text-sm">
                      <span className="text-muted-foreground">Page</span>
                      <span className="font-medium text-foreground">{pagination.page}</span>
                      <span className="text-muted-foreground">of</span>
                      <span className="font-medium text-foreground">{pagination.pages}</span>
                    </div>
                    <button
                      disabled={pagination.page === pagination.pages}
                      onClick={() => fetchUsers(pagination.page + 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-input rounded-md text-sm text-foreground hover:bg-muted hover:border-muted-foreground/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              // Empty State
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">
                  {searchQuery ? 'No results found' : 'No users'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm text-center">
                  {searchQuery
                    ? `No users match "${searchQuery}". Try adjusting your search.`
                    : 'Get started by inviting your first team member.'}
                </p>
                {!searchQuery && (
                  <PermissionGate permission="user.invite">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      Invite User
                    </button>
                  </PermissionGate>
                )}
              </div>
            )}
          </Card>
        </div>
      </Layout.Body>

      {/* Modals */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchUsers(pagination.page)}
      />

      <EditUserModal
        isOpen={showEditModal}
        userId={selectedUserId}
        onClose={closeEditModal}
        onSuccess={() => fetchUsers(pagination.page)}
        initialTab={editModalTab}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        user={userToDelete}
        isDeleting={isDeleting}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteUser}
      />
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import { transportersService } from '@/api/services/transporters/transporters.service';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Edit2,
  Trash2,
  UserPlus,
  CheckCircle,
  XCircle,
  Truck,
  AlertCircle,
  Package,
} from 'lucide-react';
import { UserNav } from '@/components/user-nav';
import { Layout } from '@/components/custom/layout';
import { SectionLoader } from '@/components/loader';
import ThemeSwitch from '@/components/theme-switch';
import { CreateTransporterModal } from './create';
import { EditTransporterModal } from './edit/[id]';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ViewLoadsModal } from './ViewLoadsModal';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { API_ORIGIN } from '@/api/origin';

// Types
interface Transporter {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  profile?: string;
  profilePicture?: string;
  profileImage?: string;
  profilePhoto?: string;
  avatar?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'blocked';
  isAvailable?: boolean;
  isVerified?: boolean;
  gstNumber?: string;
  panNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  user?: {
    profile?: string;
    profilePicture?: string;
    avatar?: string;
  };
  userId?: string | {
    profile?: string;
    profilePicture?: string;
    avatar?: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const getImageUrl = (url?: string) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
};

const getTransporterProfileImage = (transporter: Transporter) => {
  const userId = typeof transporter.userId === 'object' ? transporter.userId : undefined;
  return getImageUrl(
    transporter.profilePicture ||
      transporter.profileImage ||
      transporter.profilePhoto ||
      transporter.avatar ||
      transporter.profile ||
      transporter.user?.profilePicture ||
      transporter.user?.avatar ||
      transporter.user?.profile ||
      userId?.profilePicture ||
      userId?.avatar ||
      userId?.profile
  );
};

export default function TransportersPage() {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
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
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transporterToDelete, setTransporterToDelete] = useState<Transporter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLoadsModal, setShowLoadsModal] = useState(false);
  const [selectedLoadsTransporterId, setSelectedLoadsTransporterId] = useState<string | null>(null);
  const [selectedLoadsTransporterName, setSelectedLoadsTransporterName] = useState<string>('');

  const fetchTransporters = async (page = 1) => {
    try {
      setLoading(true);
      const response: any = await transportersService.list({
        page,
        limit: 20,
      });

      // Handle different API response shapes
      let transportersData: Transporter[] = [];
      let paginationData: Pagination = {
        page,
        limit: 20,
        total: 0,
        pages: 0,
      };

      if (response.data?.transporters) {
        transportersData = response.data.transporters;
        paginationData = response.data.pagination || paginationData;
      } else if (response.transporters) {
        transportersData = response.transporters;
        paginationData = response.pagination || paginationData;
      } else if (response.items) {
        transportersData = response.items;
      } else if (response.users) {
        transportersData = response.users;
      } else if (Array.isArray(response)) {
        transportersData = response;
      }

      // Update pagination total
      if (response.total) {
        paginationData.total = response.total;
        paginationData.pages = Math.ceil(response.total / paginationData.limit);
      }

      setTransporters(transportersData);
      setPagination(paginationData);
    } catch (error) {
      console.error('Failed to fetch transporters:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch transporters. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransporters();
  }, []);

  const openDeleteModal = (transporter: Transporter) => {
    setTransporterToDelete(transporter);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setTransporterToDelete(null);
    setIsDeleting(false);
  };

  const handleDeleteTransporter = async () => {
    if (!transporterToDelete) return;

    setIsDeleting(true);
    try {
      await transportersService.deactivate(transporterToDelete._id);
      toast({
        title: 'Transporter deactivated',
        description: `${transporterToDelete.name} has been deactivated successfully.`,
        variant: 'default',
      });
      await fetchTransporters(pagination.page);
      closeDeleteModal();
    } catch (error: any) {
      console.error('Failed to deactivate transporter:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to deactivate transporter. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (id: string) => {
    setSelectedTransporterId(id);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedTransporterId(null);
  };

  const openLoadsModal = (transporterId: string, transporterName: string) => {
    setSelectedLoadsTransporterId(transporterId);
    setSelectedLoadsTransporterName(transporterName);
    setShowLoadsModal(true);
  };

  const closeLoadsModal = () => {
    setShowLoadsModal(false);
    setSelectedLoadsTransporterId(null);
    setSelectedLoadsTransporterName('');
  };

  const isTransporterActive = (transporter: Transporter): boolean => {
    return (transporter.status || 'inactive') === 'active' && transporter.isAvailable !== false;
  };

  const filteredTransporters = transporters.filter((transporter) => {
    const searchTarget = `${transporter.name} ${transporter.email || ''} ${transporter.phone || ''} ${transporter.companyName || ''}`.toLowerCase();
    const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());

    const isActive = isTransporterActive(transporter);

    if (activeTab === 'active') return matchesSearch && isActive;
    if (activeTab === 'inactive') return matchesSearch && !isActive;
    return matchesSearch;
  });

  const getStatusBadge = (transporter: Transporter) => {
    const isActive = isTransporterActive(transporter);

    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
          <CheckCircle className="w-3.5 h-3.5" />
          Active
        </span>
      );
    }

    if (transporter.status === 'suspended') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
          <AlertCircle className="w-3.5 h-3.5" />
          Suspended
        </span>
      );
    }

    if (transporter.status === 'blocked') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800/50">
          <XCircle className="w-3.5 h-3.5" />
          Blocked
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

  const activeCount = transporters.filter(t => isTransporterActive(t)).length;
  const inactiveCount = transporters.filter(t => !isTransporterActive(t)).length;

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
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Transporters</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage transporter vendors and availability</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Create Transporter
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Transporters', value: pagination.total, tab: 'total' as const },
              {
                label: 'Active Transporters',
                value: activeCount,
                tab: 'active' as const,
              },
              {
                label: 'Inactive Transporters',
                value: inactiveCount,
                tab: 'inactive' as const,
              },
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
                  placeholder="Search by name, email or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <SectionLoader label="Loading transporters..." />
            ) : filteredTransporters.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Transporter
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Availability
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredTransporters.map((transporter) => {
                        const profileImage = getTransporterProfileImage(transporter);

                        return (
                        <tr key={transporter._id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 overflow-hidden rounded-full border bg-primary/10 text-primary">
                                {profileImage ? (
                                  <img
                                    src={profileImage}
                                    alt={`${transporter.name} profile`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/80 to-primary text-xs font-semibold text-primary-foreground">
                                    {transporter.name?.slice(0, 2).toUpperCase() || <Truck className="w-4 h-4" />}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{transporter.name}</p>
                                {transporter.companyName && (
                                  <p className="text-xs text-muted-foreground">{transporter.companyName}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col space-y-0.5">
                              {transporter.email && (
                                <span className="text-xs text-foreground">{transporter.email}</span>
                              )}
                              {transporter.phone && (
                                <span className="text-xs text-muted-foreground">{transporter.phone}</span>
                              )}
                              {!transporter.email && !transporter.phone && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(transporter)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                              transporter.isAvailable
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                                : "bg-gray-50 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                            )}>
                              {transporter.isAvailable ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              {transporter.isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openLoadsModal(transporter._id, transporter.name)}
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="View assigned loads"
                              >
                                <Package className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(transporter._id)}
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Edit transporter"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(transporter)}
                                disabled={!isTransporterActive(transporter)}
                                className={cn(
                                  "p-1.5 rounded-md transition-colors",
                                  isTransporterActive(transporter)
                                    ? "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                    : "text-muted-foreground/40 cursor-not-allowed"
                                )}
                                title={isTransporterActive(transporter) ? 'Deactivate transporter' : 'Already inactive'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border bg-muted/20">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{filteredTransporters.length}</span> of{' '}
                    <span className="font-medium text-foreground">{pagination.total}</span> transporters
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={pagination.page === 1}
                      onClick={() => fetchTransporters(pagination.page - 1)}
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
                      onClick={() => fetchTransporters(pagination.page + 1)}
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
                  <Truck className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">
                  {searchQuery ? 'No results found' : 'No transporters'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm text-center">
                  {searchQuery
                    ? `No transporters match "${searchQuery}". Try adjusting your search.`
                    : 'Create your first transporter to accept bookings.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    Create Transporter
                  </button>
                )}
              </div>
            )}
          </Card>
        </div>
      </Layout.Body>

      {/* Modals */}
      <CreateTransporterModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchTransporters(pagination.page)}
      />

      <EditTransporterModal
        isOpen={showEditModal}
        transporterId={selectedTransporterId}
        onClose={closeEditModal}
        onSuccess={() => fetchTransporters(pagination.page)}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        transporter={transporterToDelete}
        isDeleting={isDeleting}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteTransporter}
      />

      <ViewLoadsModal
        isOpen={showLoadsModal}
        transporterId={selectedLoadsTransporterId}
        transporterName={selectedLoadsTransporterName}
        onClose={closeLoadsModal}
      />
    </Layout>
  );
}

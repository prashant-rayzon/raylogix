import {
  IconDashboard,
  IconUsers,
  IconTruck,
  IconBox,
  IconBuilding,
  IconSettings,
  IconBuildingWarehouse,
  IconArrowBigRight,
  IconArrowBigDown,
  IconListDetails,
  IconCategory,
  IconList,
  IconActivity,
  IconBell,
  IconMessageCircle,
  IconReceipt2,
  IconPigMoney,
  IconBookmark,
  IconChartBar,
} from "@tabler/icons-react"

import { UserRole, AccessLevel } from "@/api/types"
import { ALL_PERMISSIONS } from "@/lib/permissions"

export interface NavLink {
  title: string
  label?: string
  href: string
  icon: JSX.Element
}

export interface SideLink extends NavLink {
  sub?: SideLink[]
  allowedRoles?: UserRole[]
  requiredPermissions?: string[]      // ALL must match
  requiredAnyPermissions?: string[]   // ANY must match
  requiredAccessLevel?: keyof AccessLevel
}

/**
 * Sidebar Navigation â€” Role & Permission gated
 *
 * Visibility rules (applied in order):
 *   1. super_admin always passes
 *   2. allowedRoles â€” user role must be in this list (if defined)
 *   3. requiredAccessLevel â€” accessLevel flag must be truthy (if defined)
 *   4. requiredPermissions â€” every permission must exist (if defined)
 *   5. requiredAnyPermissions â€” at least one permission must exist (if defined)
 */
export const sidelinks: SideLink[] = [
  // â”€â”€â”€ Universal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <IconDashboard size={18} />,
    // No role restriction â€” all authenticated users see the dashboard
  },

  // â”€â”€â”€ Super Admin only â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    title: "Companies",
    href: "",
    icon: <IconBuilding size={18} />,
    allowedRoles: ["super_admin"],
    sub: [
      {
        title: "All Companies",
        href: "/companies",
        icon: <IconBuilding size={18} />,
        allowedRoles: ["super_admin"],
        requiredPermissions: [ALL_PERMISSIONS.COMPANY_READ],
      },
      {
        title: "Create Company",
        href: "/companies/create",
        icon: <IconBuilding size={18} />,
        allowedRoles: ["super_admin"],
        requiredPermissions: [ALL_PERMISSIONS.COMPANY_CREATE],
      },
    ],
  },

  // â”€â”€â”€ Load Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    title: "Loads",
    href: "",
    icon: <IconBox size={18} />,
    sub: [
      {
        title: "All Loads",
        href: "/load",
        icon: <IconList size={18} />,
        requiredPermissions: [ALL_PERMISSIONS.LOAD_READ],
      },
    ],
  },

  {
    title: "Billing Verification",
    href: "/billing",
    icon: <IconReceipt2 size={18} />,
    requiredAnyPermissions: ["billing.read", "billing.verify"],
  },

  {
    title: "Transport Requests",
    href: "",
    icon: <IconTruck size={18} />,
    requiredAnyPermissions: [
      ALL_PERMISSIONS.BRANCH_READ,
      ALL_PERMISSIONS.BRANCH_MOVEMENT_CREATE,
    ],
    sub: [
      {
        title: "Outbound Vehicles",
        href: "/transport-requests/outbound",
        icon: <IconArrowBigRight size={18} />,
        requiredPermissions: [ALL_PERMISSIONS.BRANCH_READ],
      },
      {
        title: "Inbound Vehicles",
        href: "/transport-requests/inbound",
        icon: <IconArrowBigDown size={18} />,
        requiredPermissions: [ALL_PERMISSIONS.BRANCH_READ],
      },
    ],
  },

  {
    title: "Masters",
    href: "",
    icon: <IconCategory size={18} />,
    allowedRoles: ["company_admin"],
    requiredAnyPermissions: [
      ALL_PERMISSIONS.MASTER_GROUP_READ,
      ALL_PERMISSIONS.MASTER_READ,
    ],
    sub: [
      {
        title: "Master Groups",
        href: "/master-groups",
        icon: <IconCategory size={18} />,
        allowedRoles: ["company_admin"],
        requiredPermissions: [ALL_PERMISSIONS.MASTER_GROUP_READ],
      },
      {
        title: "Masters",
        href: "/masters",
        icon: <IconListDetails size={18} />,
        allowedRoles: ["company_admin"],
        requiredPermissions: [ALL_PERMISSIONS.MASTER_READ],
      }, 
    ],
  },

  {
    title: "Administration",
    href: "",
    icon: <IconSettings size={18} />,
    allowedRoles: ["company_admin"],
    sub: [
      {
        title: "Users",
        href: "/users",
        icon: <IconUsers size={18} />,
        allowedRoles: ["company_admin"],
        requiredPermissions: [ALL_PERMISSIONS.USER_READ],
      },
      {
        title: "Transporters",
        href: "/transporters",
        icon: <IconTruck size={18} />,
        allowedRoles: ["company_admin"],
        requiredAnyPermissions: [
          ALL_PERMISSIONS.TRANSPORTER_READ,
          ALL_PERMISSIONS.TRANSPORTER_WRITE,
        ],
      },
      {
        title: "Branches",
        href: "/branches",
        icon: <IconBuildingWarehouse size={18} />,
        allowedRoles: ["company_admin"],
        requiredPermissions: [ALL_PERMISSIONS.BRANCH_READ],
        requiredAccessLevel: "canManageBranches",
      },
    ],
  },
  {
    title: "Reports",
    href: "",
    icon: <IconChartBar size={18} />,
    requiredAnyPermissions: [
      ALL_PERMISSIONS.REPORT_VIEW,
      ALL_PERMISSIONS.AUDIT_VIEW,
      ALL_PERMISSIONS.BILLING_VIEW,
    ],
    sub: [
      {
        title: "Billing Report",
        href: "/reports/billing",
        icon: <IconReceipt2 size={18} />,
        requiredPermissions: [ALL_PERMISSIONS.BILLING_VIEW],
      },
      {
        title: "Audit Report",
        href: "/reports/audit",
        icon: <IconActivity size={18} />,
        requiredPermissions: [ALL_PERMISSIONS.AUDIT_VIEW],
      },
      {
        title: "Savings Report",
        href: "/reports/savings",
        icon: <IconPigMoney size={18} />,
        requiredPermissions: [ALL_PERMISSIONS.REPORT_VIEW],
      },
      {
        title: "Vendor Report",
        href: "/reports/vendors",
        icon: <IconUsers size={18} />,
        requiredPermissions: [ALL_PERMISSIONS.REPORT_VIEW],
      },
      {
        title: "Allotment Report",
        href: "/reports/allotments",
        icon: <IconBookmark size={18} />,
        requiredPermissions: [ALL_PERMISSIONS.REPORT_VIEW],
      },
    ],
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: <IconBell size={18} />,
  },
  {
    title: "Chats",
    href: "/chats",
    icon: <IconMessageCircle size={18} />,
    requiredPermissions: [ALL_PERMISSIONS.CHAT_READ],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: <IconSettings size={18} />,
    // All authenticated users can access their own settings
  },
]

function hasAccess(
  link: SideLink,
  userRole: UserRole,
  permissions: string[],
  accessLevel?: AccessLevel
): boolean {
  // 1. Super admin bypasses all checks
  if (userRole === "super_admin") return true

  // 2. Role allow-list check
  if (link.allowedRoles && !link.allowedRoles.includes(userRole)) {
    return false
  }

  // 3. Access level flag check
  if (link.requiredAccessLevel) {
    if (!accessLevel || !accessLevel[link.requiredAccessLevel]) {
      return false
    }
  }

  // 4. ALL permissions required
  if (
    link.requiredPermissions &&
    !link.requiredPermissions.every((p) => permissions.includes(p))
  ) {
    return false
  }

  // 5. ANY permission required (fixed bug â€” was previously ignored)
  if (
    link.requiredAnyPermissions &&
    !link.requiredAnyPermissions.some((p) => permissions.includes(p))
  ) {
    return false
  }

  return true
}

/**
 * Returns filtered sidebar links according to role & permissions.
 * Parent items with sub-menus are only shown if at least one child passes.
 */
export function getFilteredSideLinks(
  userRole: UserRole | undefined,
  userPermissions?: string[],
  accessLevel?: AccessLevel,
  userTeam?: 'general' | 'inbound' | 'outbound'
): SideLink[] {
  if (!userRole) return []

  // Match sidebar visibility to the authenticated user's actual permissions.
  // Using role defaults here can expose menu items the user still cannot open.
  const permissions = userRole === "super_admin" ? [] : (userPermissions ?? [])

  const filterLinks = (links: SideLink[]): SideLink[] =>
    links
      .filter((link) => {
        if (!hasAccess(link, userRole, permissions, accessLevel)) {
          return false
        }
        // Filter sublinks based on userTeam settings
        if (userTeam && userTeam !== 'general') {
          if (link.href === '/transport-requests/outbound' && userTeam !== 'outbound') {
            return false
          }
          if (link.href === '/transport-requests/inbound' && userTeam !== 'inbound') {
            return false
          }
        }
        return true
      })
      .map((link) => ({
        ...link,
        sub: link.sub ? filterLinks(link.sub) : undefined,
      }))
      .filter((link) => {
        // Parent item with sub-menus â€” show only if any child remains
        if (link.sub !== undefined) {
          return link.sub.length > 0
        }
        return true
      })

  return filterLinks(sidelinks)
}

/**
 * Check whether the user can access a specific route href.
 */
export function canAccessLink(
  href: string,
  userRole: UserRole | undefined,
  userPermissions?: string[],
  accessLevel?: AccessLevel,
  userTeam?: 'general' | 'inbound' | 'outbound'
): boolean {
  if (!userRole) return false

  const links = getFilteredSideLinks(userRole, userPermissions, accessLevel, userTeam)

  const search = (items: SideLink[]): boolean =>
    items.some((item) => {
      if (item.href === href) return true
      if (item.sub) return search(item.sub)
      return false
    })

  return search(links)
}

import {
  IconDashboard,
  IconUsers,
  IconTruck,
  IconMessages,
  IconBox,
  IconBuilding,
  IconSettings,
  IconBuildingWarehouse,
  IconArrowBigRight,
  IconArrowBigDown,
} from "@tabler/icons-react"
import { UserRole, AccessLevel } from "@/api/types"

export interface NavLink {
  title: string
  label?: string
  href: string
  icon: JSX.Element
}

export interface SideLink extends NavLink {
  sub?: NavLink[]
  allowedRoles?: UserRole[] // If not specified, available to all roles
  requiredPermissions?: string[] // Additional permission checks
  requiredAccessLevel?: keyof AccessLevel // Check accessLevel flags
}

/**
 * Sidebar navigation configuration with role-based access control
 * 
 * Roles:
 * - super_admin: Full access to all sections
 * - company_admin: Access to company management, users, transporters, loads, chats
 * - company_user: Access to loads, chats, dashboard, branches (if branch staff)
 * - transporter: Access to loads, chats, dashboard
 */
export const sidelinks: SideLink[] = [
  {
    title: "Dashboard",
    label: "",
    href: "/dashboard",
    icon: <IconDashboard size={18} />,
  },
  {
    title: "Companies",
    label: "",
    href: "/companies",
    icon: <IconBuilding size={18} />,
    allowedRoles: ["super_admin"],
    requiredPermissions: ["company.read"],
  },
  {
    title: "Load Management",
    label: "",
    href: "/load",
    icon: <IconBox size={18} />,
    allowedRoles: ["company_admin", "company_user", "transporter"],
  },
  {
    title: "Conversations",
    label: "",
    href: "/chats",
    icon: <IconMessages size={18} />,
  },
  {
    title: "Branch Operations",
    label: "",
    href: "/branches",
    icon: <IconBuildingWarehouse size={18} />,
    allowedRoles: ["company_admin", "company_user"],
    requiredAccessLevel: "canManageBranches",
  },
  {
    title: "Outbound Requests",
    label: "",
    href: "/transport-requests/outbound",
    icon: <IconArrowBigRight size={18} />,
    allowedRoles: ["company_admin", "company_user"],
  },
  {
    title: "Inbound Requests",
    label: "",
    href: "/transport-requests/inbound",
    icon: <IconArrowBigDown size={18} />,
    allowedRoles: ["company_admin", "company_user"],
  },
  {
    title: "Users Management",
    label: "",
    href: "/users",
    icon: <IconUsers size={18} />,
    allowedRoles: ["super_admin", "company_admin"],
  },
  {
    title: "Transporters",
    label: "",
    href: "/transporters",
    icon: <IconTruck size={18} />,
    allowedRoles: ["super_admin", "company_admin"],
  },
  {
    title: "Settings",
    label: "",
    href: "/settings",
    icon: <IconSettings size={18} />,
  },
]

/**
 * Filter sidebar links based on user role and access level
 * @param userRole Current user's role
 * @param userPermissions User's custom permissions (optional)
 * @param accessLevel User's access level with permission flags
 * @returns Filtered array of sidebar links the user can access
 */
export function getFilteredSideLinks(
  userRole: UserRole | undefined,
  userPermissions?: string[],
  accessLevel?: AccessLevel
): SideLink[] {
  if (!userRole) return []
  const isSuperAdmin = userRole === "super_admin"

  return sidelinks
    .filter((link) => {
      // If allowedRoles is not specified, available to all
      if (!link.allowedRoles) return true

      // Check if user's role is in the allowed roles
      if (link.allowedRoles.includes(userRole)) {
        if (isSuperAdmin) return true
        
        // Check access level flag if required
        if (link.requiredAccessLevel && accessLevel) {
          if (!accessLevel[link.requiredAccessLevel]) return false
        }
        
        // If required permissions specified, check them
        if (link.requiredPermissions && userPermissions) {
          return link.requiredPermissions.every((perm) =>
            userPermissions.includes(perm)
          )
        }
        return true
      }

      return false
    })
    .map((link) => ({
      ...link,
      sub: link.sub?.filter(() => {
        // Filter sub-links with same role logic
        if (!link.allowedRoles) return true
        if (link.allowedRoles.includes(userRole)) {
          if (isSuperAdmin) return true
          if (link.requiredPermissions && userPermissions) {
            return link.requiredPermissions.every((perm) =>
              userPermissions.includes(perm)
            )
          }
          return true
        }
        return false
      }),
    }))
}

/**
 * Check if a specific link is accessible by the user
 * @param href The link's href to check
 * @param userRole Current user's role
 * @param userPermissions User's custom permissions (optional)
 * @param accessLevel User's access level with permission flags
 * @returns true if user can access this link
 */
export function canAccessLink(
  href: string,
  userRole: UserRole | undefined,
  userPermissions?: string[],
  accessLevel?: AccessLevel
): boolean {
  const filteredLinks = getFilteredSideLinks(userRole, userPermissions, accessLevel)

  const findLink = (links: SideLink[]): boolean => {
    return links.some((link) => {
      if (link.href === href) return true
      if (link.sub) return findLink(link.sub)
      return false
    })
  }

  return findLink(filteredLinks)
}

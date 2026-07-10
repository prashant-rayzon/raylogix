# Role & Permissions

## How It Works

- `role` identifies the user type like `super_admin`, `company_admin`, `company_user`, `transporter`, or `finance`.
- `permissions` are the exact actions/pages a user can access, like `company.read`, `master.read`, `chat.read`.
- Sidebar menus are shown from [src/data/sidelinks.tsx](/abs/path/C:/Users/Prashant/Desktop/Prashant/Rayson-TMS/client/src/data/sidelinks.tsx:1).
- Route access is enforced from [src/router.tsx](/abs/path/C:/Users/Prashant/Desktop/Prashant/Rayson-TMS/client/src/router.tsx:1) using [src/components/route-guards.tsx](/abs/path/C:/Users/Prashant/Desktop/Prashant/Rayson-TMS/client/src/components/route-guards.tsx:1).

## Rules

- `allowedRoles`: show/open only for specific roles.
- `requiredPermission`: user must have one permission.
- `requiredPermissions`: user must have all listed permissions.
- `requiredAnyPermission`: user must have at least one listed permission.
- `requiredAccessLevel`: extra branch/access-level check.

## Important

- Menu and route should both use the same rule.
- If backend API is role-only, frontend should also add the same role check.
- If backend API is permission-based, frontend should use the same permission key.

## Example

- `Chats` uses `chat.read`
- `Companies` uses `super_admin` + company permissions
- `Masters` uses admin role + master permissions

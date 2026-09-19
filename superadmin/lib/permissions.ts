import { UserRole } from '@/types/auth';

export type PermissionAction =
  // Commercial Marketplace (Super Admin)
  | 'products:create'
  | 'products:edit'
  | 'products:delete'
  | 'products:bulk_status'
  | 'suppliers:view'
  | 'suppliers:create'
  | 'suppliers:edit'
  | 'suppliers:verify'
  | 'suppliers:delete'
  | 'payment_methods:manage'
  | 'customers:view'
  | 'customers:suspend'
  | 'customers:bulk_status'
  | 'orders:manage'
  | 'orders:update_status'
  | 'orders:bulk_status'
  | 'orders:cancel'
  // Deliveries
  | 'deliveries:view'
  | 'deliveries:assign'
  | 'deliveries:update_status'
  // Support, Maintenance & Security Governance (Sub Admin & Super Admin)
  | 'support:view'
  | 'support:manage'
  | 'support:assign'
  | 'support:resolve'
  | 'security:view'
  | 'security:manage_admins'
  | 'security:audit_logs'
  | 'security:sessions'
  | 'security:manage_alerts'
  | 'security:manage_firewall'
  | 'maintenance:manage'
  | 'maintenance:schedule'
  | 'feedback:view'
  | 'feedback:respond'
  | 'feedback:moderate'
  | 'feedback:manage_reports'
  | 'feedback:manage_categories'
  | 'feedback:view_reputation'
  // Categories (Sub Admin & Super Admin)
  | 'categories:view'
  | 'categories:manage'
  | 'categories:create'
  | 'categories:edit'
  | 'categories:delete';

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  SUPER_ADMIN: [
    'products:create',
    'products:edit',
    'products:delete',
    'products:bulk_status',
    'suppliers:view',
    'suppliers:create',
    'suppliers:edit',
    'suppliers:verify',
    'suppliers:delete',
    'payment_methods:manage',
    'customers:view',
    'customers:suspend',
    'customers:bulk_status',
    'orders:manage',
    'orders:update_status',
    'orders:bulk_status',
    'orders:cancel',
    'deliveries:view',
    'deliveries:assign',
    'deliveries:update_status',
    'support:view',
    'support:manage',
    'support:assign',
    'support:resolve',
    'feedback:view',
    'feedback:respond',
    'feedback:moderate',
    'feedback:manage_reports',
    'feedback:manage_categories',
    'feedback:view_reputation',
    'security:view',
    'security:manage_admins',
    'security:audit_logs',
    'security:sessions',
    'security:manage_alerts',
    'security:manage_firewall',
    'categories:view',
    'categories:manage',
    'categories:create',
    'categories:edit',
    'categories:delete',
  ],
  SUB_ADMIN: [
    'categories:view',
    'categories:manage',
    'categories:create',
    'categories:edit',
    'categories:delete',
    'support:view',
    'support:manage',
    'support:assign',
    'support:resolve',
    'security:view',
    'security:manage_admins',
    'security:audit_logs',
    'security:sessions',
    'security:manage_alerts',
    'security:manage_firewall',
    'maintenance:manage',
    'maintenance:schedule',
    'feedback:view',
    'feedback:respond',
    'feedback:moderate',
    'feedback:manage_reports',
    'feedback:manage_categories',
    'feedback:view_reputation',
  ],
  OPERATIONS_MANAGER: [
    'orders:manage',
    'orders:update_status',
    'deliveries:view',
    'deliveries:assign',
    'deliveries:update_status',
  ],
  DISPATCHER: [
    'deliveries:view',
    'deliveries:update_status',
  ],
};

/**
 * Checks if a user with given role has permission to perform a specific action.
 * Used for UX guards (showing/hiding/disabling action buttons).
 */
export function hasPermission(role: UserRole | undefined | null, action: PermissionAction): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(action);
}

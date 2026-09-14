import { UserRole } from '@/types/auth';

export type PermissionAction =
  // Commercial Marketplace (Super Admin)
  | 'products:create'
  | 'products:edit'
  | 'products:delete'
  | 'products:bulk_status'
  | 'suppliers:create'
  | 'suppliers:edit'
  | 'suppliers:verify'
  | 'suppliers:delete'
  | 'customers:view'
  | 'customers:suspend'
  | 'customers:bulk_status'
  | 'orders:manage'
  | 'orders:update_status'
  | 'orders:bulk_status'
  | 'orders:cancel'
  | 'deliveries:view'
  | 'deliveries:assign'
  | 'deliveries:update_status'
  // Support, Maintenance & Security Governance (Sub Admin)
  | 'support:manage'
  | 'support:assign'
  | 'support:resolve'
  | 'security:view'
  | 'security:manage_admins'
  | 'security:audit_logs'
  | 'security:sessions'
  | 'maintenance:manage'
  | 'maintenance:schedule'
  | 'feedback:view'
  | 'feedback:respond';

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  SUPER_ADMIN: [
    'products:create',
    'products:edit',
    'products:delete',
    'products:bulk_status',
    'suppliers:create',
    'suppliers:edit',
    'suppliers:verify',
    'suppliers:delete',
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
  ],
  SUB_ADMIN: [
    'support:manage',
    'support:assign',
    'support:resolve',
    'security:view',
    'security:manage_admins',
    'security:audit_logs',
    'security:sessions',
    'maintenance:manage',
    'maintenance:schedule',
    'feedback:view',
    'feedback:respond',
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

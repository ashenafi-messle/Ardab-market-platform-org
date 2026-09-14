// ==============================================================================
// Ardab Market - Admin Roles
// ==============================================================================
// Matches existing frontend role types defined in superadmin/types/auth.ts

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUB_ADMIN: 'SUB_ADMIN',
  OPERATIONS_MANAGER: 'OPERATIONS_MANAGER',
  DISPATCHER: 'DISPATCHER',
};

export const ALL_ADMIN_ROLES = Object.values(ADMIN_ROLES);

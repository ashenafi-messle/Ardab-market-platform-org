export type UserRole = 'SUPER_ADMIN' | 'SUB_ADMIN' | 'OPERATIONS_MANAGER' | 'DISPATCHER';

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: SuperAdminUser;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token?: string;
  newPassword: string;
  confirmPassword: string;
}

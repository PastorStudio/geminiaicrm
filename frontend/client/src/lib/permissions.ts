import { User } from '../types/user';

// Definición de los permisos por rol
export type UserRole = 'super_admin' | 'admin' | 'supervisor' | 'agent';

export interface UserPermissions {
  canViewDashboard: boolean;
  canManageLeads: boolean;
  canManageUsers: boolean;
  canCreateAdmins: boolean;
  canDeleteUsers: boolean;
  canManageWhatsAppAccounts: boolean;
  canAssignChats: boolean;
  canAccessSettings: boolean;
  canAccessAllChats: boolean;
  canViewReports: boolean;
}

// Mapa de permisos por rol
const rolePermissions: Record<UserRole, UserPermissions> = {
  super_admin: {
    canViewDashboard: true,
    canManageLeads: true,
    canManageUsers: true,
    canCreateAdmins: true,
    canDeleteUsers: true,
    canManageWhatsAppAccounts: true,
    canAssignChats: true,
    canAccessSettings: true,
    canAccessAllChats: true,
    canViewReports: true
  },
  admin: {
    canViewDashboard: true,
    canManageLeads: true,
    canManageUsers: true,
    canCreateAdmins: false, // No puede crear administradores
    canDeleteUsers: false,  // No puede eliminar usuarios
    canManageWhatsAppAccounts: true,
    canAssignChats: true,
    canAccessSettings: true,
    canAccessAllChats: true,
    canViewReports: true
  },
  supervisor: {
    canViewDashboard: true,
    canManageLeads: true,
    canManageUsers: false, // No puede gestionar usuarios
    canCreateAdmins: false,
    canDeleteUsers: false,
    canManageWhatsAppAccounts: false,
    canAssignChats: true,
    canAccessSettings: false,
    canAccessAllChats: true,
    canViewReports: true
  },
  agent: {
    canViewDashboard: true,
    canManageLeads: false,
    canManageUsers: false,
    canCreateAdmins: false,
    canDeleteUsers: false,
    canManageWhatsAppAccounts: false,
    canAssignChats: false,
    canAccessSettings: false,
    canAccessAllChats: false, // Solo ve sus chats asignados
    canViewReports: false
  }
};

/**
 * Obtiene los permisos de un usuario según su rol
 */
export function getUserPermissions(user: User | null): UserPermissions {
  if (!user || !user.role) {
    // Usuario sin rol o no autenticado - sin permisos
    return {
      canViewDashboard: false,
      canManageLeads: false,
      canManageUsers: false,
      canCreateAdmins: false,
      canDeleteUsers: false,
      canManageWhatsAppAccounts: false,
      canAssignChats: false,
      canAccessSettings: false,
      canAccessAllChats: false,
      canViewReports: false
    };
  }

  // Verificar si es el superadministrador con ID 3 y nombre de usuario específico
  if (user.id === 3 && user.username === 'DJP') {
    return rolePermissions['super_admin'];
  }

  // Para otros usuarios, verificar su rol
  const role = user.role as UserRole;
  return rolePermissions[role] || rolePermissions.agent;
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(
  user: User | null, 
  permission: keyof UserPermissions
): boolean {
  const permissions = getUserPermissions(user);
  return permissions[permission] || false;
}

/**
 * Verifica si un usuario puede realizar acciones de administrador de usuarios
 */
export function canManageAdmins(user: User | null): boolean {
  return hasPermission(user, 'canCreateAdmins');
}

/**
 * Verifica si un usuario es super_admin (puede gestionar todo)
 */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.id === 3 && user.username === 'DJP';
}
// Definición de tipos para usuarios en el sistema
export interface User {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  role?: string;
  status?: string;
  department?: string;
  avatar?: string;
  permissions?: UserPermissions;
}

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
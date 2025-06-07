import { db } from "../db";
import { 
  internalAgents,
  agentActivities,
  type InternalAgent
} from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

/**
 * Sistema de gestión de roles y permisos para agentes
 * Controla qué páginas puede ver cada agente según su rol
 */
export class AgentRoleManager {

  // ===== DEFINICIÓN DE ROLES Y PERMISOS =====

  /**
   * Roles disponibles en el sistema
   */
  private readonly ROLES = {
    superadmin: {
      name: 'Superadministrador',
      description: 'Control total del sistema - Crear/eliminar agentes',
      level: 6
    },
    admin: {
      name: 'Administrador',
      description: 'Acceso completo operativo',
      level: 5
    },
    supervisor: {
      name: 'Supervisor',
      description: 'Gestión de equipos y reportes avanzados',
      level: 4
    },
    senior_agent: {
      name: 'Agente Senior',
      description: 'Agente experimentado con funciones avanzadas',
      level: 3
    },
    agent: {
      name: 'Agente',
      description: 'Operaciones básicas y gestión de chats',
      level: 2
    },
    viewer: {
      name: 'Visualizador',
      description: 'Solo lectura de información básica',
      level: 1
    }
  };

  /**
   * Páginas y módulos disponibles en el sistema
   */
  private readonly PAGES = {
    // ===== DASHBOARD Y INICIO =====
    dashboard: { name: 'Dashboard', description: 'Tablero principal con métricas', category: 'general' },
    dashboard_personal: { name: 'Dashboard Personal', description: 'Métricas personales del agente', category: 'general' },
    dashboard_team: { name: 'Dashboard de Equipo', description: 'Métricas del equipo', category: 'general' },
    dashboard_global: { name: 'Dashboard Global', description: 'Métricas globales del sistema', category: 'general' },
    
    // ===== WHATSAPP Y COMUNICACIÓN =====
    whatsapp: { name: 'WhatsApp', description: 'Gestión de chats y mensajes', category: 'communication' },
    whatsapp_accounts: { name: 'Cuentas WhatsApp', description: 'Administración de cuentas WhatsApp', category: 'communication' },
    whatsapp_create: { name: 'Crear Cuenta WhatsApp', description: 'Crear nuevas cuentas WhatsApp', category: 'communication' },
    whatsapp_edit: { name: 'Editar Cuenta WhatsApp', description: 'Modificar cuentas WhatsApp', category: 'communication' },
    whatsapp_delete: { name: 'Eliminar Cuenta WhatsApp', description: 'Eliminar cuentas WhatsApp', category: 'communication' },
    whatsapp_settings: { name: 'Configuración WhatsApp', description: 'Configuraciones avanzadas WhatsApp', category: 'communication' },
    
    // ===== CRM Y LEADS =====
    leads: { name: 'Leads', description: 'Gestión de prospectos y clientes potenciales', category: 'crm' },
    leads_view: { name: 'Ver Leads', description: 'Visualizar leads del sistema', category: 'crm' },
    leads_create: { name: 'Crear Leads', description: 'Crear nuevos leads', category: 'crm' },
    leads_edit: { name: 'Editar Leads', description: 'Modificar leads existentes', category: 'crm' },
    leads_delete: { name: 'Eliminar Leads', description: 'Eliminar leads del sistema', category: 'crm' },
    leads_assign: { name: 'Asignar Leads', description: 'Asignar leads a agentes', category: 'crm' },
    leads_analysis: { name: 'Análisis de Leads', description: 'Análisis avanzado de leads', category: 'crm' },
    
    // ===== ACTIVIDADES Y TAREAS =====
    activities: { name: 'Actividades', description: 'Gestión de actividades y tareas', category: 'tasks' },
    activities_view: { name: 'Ver Actividades', description: 'Visualizar actividades', category: 'tasks' },
    activities_create: { name: 'Crear Actividades', description: 'Crear nuevas actividades', category: 'tasks' },
    activities_edit: { name: 'Editar Actividades', description: 'Modificar actividades', category: 'tasks' },
    activities_assign: { name: 'Asignar Actividades', description: 'Asignar actividades a otros', category: 'tasks' },
    
    // ===== TICKETS Y SOPORTE =====
    tickets: { name: 'Tickets', description: 'Sistema de tickets de soporte', category: 'support' },
    tickets_view: { name: 'Ver Tickets', description: 'Visualizar tickets del sistema', category: 'support' },
    tickets_create: { name: 'Crear Tickets', description: 'Crear nuevos tickets', category: 'support' },
    tickets_manage: { name: 'Gestionar Tickets', description: 'Administrar tickets completos', category: 'support' },
    tickets_config: { name: 'Configurar Tickets', description: 'Configuraciones del sistema tickets', category: 'support' },
    
    // ===== USUARIOS Y AGENTES =====
    users: { name: 'Usuarios', description: 'Administración de usuarios del sistema', category: 'admin' },
    users_view: { name: 'Ver Usuarios', description: 'Visualizar usuarios', category: 'admin' },
    users_create: { name: 'Crear Usuarios', description: 'Crear nuevos usuarios', category: 'admin' },
    users_edit: { name: 'Editar Usuarios', description: 'Modificar usuarios existentes', category: 'admin' },
    users_delete: { name: 'Eliminar Usuarios', description: 'Eliminar usuarios del sistema', category: 'admin' },
    
    agents: { name: 'Agentes', description: 'Gestión de agentes internos', category: 'admin' },
    agents_view: { name: 'Ver Agentes', description: 'Visualizar agentes', category: 'admin' },
    agents_create: { name: 'Crear Agentes', description: 'Crear nuevos agentes', category: 'admin' },
    agents_edit: { name: 'Editar Agentes', description: 'Modificar agentes existentes', category: 'admin' },
    agents_delete: { name: 'Eliminar Agentes', description: 'Eliminar agentes del sistema', category: 'admin' },
    agents_assign: { name: 'Asignar Agentes', description: 'Asignar agentes a chats', category: 'admin' },
    
    // ===== ROLES Y PERMISOS =====
    roles: { name: 'Roles y Permisos', description: 'Administración de roles y permisos', category: 'security' },
    roles_view: { name: 'Ver Roles', description: 'Visualizar roles del sistema', category: 'security' },
    roles_assign: { name: 'Asignar Roles', description: 'Asignar roles a usuarios', category: 'security' },
    permissions_custom: { name: 'Permisos Personalizados', description: 'Configurar permisos específicos', category: 'security' },
    
    // ===== REPORTES Y ANÁLISIS =====
    reports: { name: 'Reportes', description: 'Reportes y análisis de datos', category: 'analytics' },
    reports_personal: { name: 'Reportes Personales', description: 'Reportes individuales del agente', category: 'analytics' },
    reports_team: { name: 'Reportes de Equipo', description: 'Reportes del equipo de trabajo', category: 'analytics' },
    reports_global: { name: 'Reportes Globales', description: 'Reportes de toda la empresa', category: 'analytics' },
    reports_confidential: { name: 'Reportes Confidenciales', description: 'Reportes de alta confidencialidad', category: 'analytics' },
    reports_export: { name: 'Exportar Reportes', description: 'Exportar datos y reportes', category: 'analytics' },
    
    analytics: { name: 'Análisis Avanzado', description: 'Herramientas de análisis avanzado', category: 'analytics' },
    gemini_ai: { name: 'Gemini AI', description: 'Herramientas de inteligencia artificial', category: 'analytics' },
    gemini_ai_config: { name: 'Configurar Gemini AI', description: 'Configuraciones de IA', category: 'analytics' },
    
    // ===== GALERÍA Y MARKETING =====
    media_gallery: { name: 'Galería de Medios', description: 'Gestión de archivos multimedia', category: 'content' },
    media_upload: { name: 'Subir Medios', description: 'Subir nuevos archivos', category: 'content' },
    media_manage: { name: 'Gestionar Medios', description: 'Administrar archivos multimedia', category: 'content' },
    
    marketing: { name: 'Marketing', description: 'Campañas y herramientas de marketing', category: 'marketing' },
    marketing_campaigns: { name: 'Campañas', description: 'Gestionar campañas de marketing', category: 'marketing' },
    marketing_create: { name: 'Crear Campañas', description: 'Crear nuevas campañas', category: 'marketing' },
    
    // ===== CONFIGURACIÓN DEL SISTEMA =====
    settings: { name: 'Configuración', description: 'Configuraciones del sistema', category: 'system' },
    settings_basic: { name: 'Configuración Básica', description: 'Configuraciones básicas', category: 'system' },
    settings_advanced: { name: 'Configuración Avanzada', description: 'Configuraciones avanzadas', category: 'system' },
    settings_critical: { name: 'Configuración Crítica', description: 'Configuraciones críticas del sistema', category: 'system' },
    
    // ===== FUNCIONES ESPECIALES =====
    system_reset: { name: 'Reset del Sistema', description: 'Funciones de reseteo total del sistema', category: 'critical' },
    audit_logs: { name: 'Logs y Auditoría', description: 'Registros de auditoría y logs del sistema', category: 'security' },
    agent_tracking: { name: 'Rastreo de Agentes', description: 'Monitoreo de actividad de agentes', category: 'monitoring' },
    system_monitoring: { name: 'Monitoreo del Sistema', description: 'Monitoreo general del sistema', category: 'monitoring' }
  };

  /**
   * Permisos por defecto según el rol - ESTRUCTURA COMPLETA
   */
  private readonly DEFAULT_PERMISSIONS = {
    // 🔴 SUPERADMINISTRADOR - Control total del sistema
    superadmin: [
      // Dashboard completo
      'dashboard', 'dashboard_personal', 'dashboard_team', 'dashboard_global',
      // WhatsApp completo con CRUD
      'whatsapp', 'whatsapp_accounts', 'whatsapp_create', 'whatsapp_edit', 'whatsapp_delete', 'whatsapp_settings',
      // Leads completo con análisis
      'leads', 'leads_view', 'leads_create', 'leads_edit', 'leads_delete', 'leads_assign', 'leads_analysis',
      // Actividades completas
      'activities', 'activities_view', 'activities_create', 'activities_edit', 'activities_assign',
      // Tickets completos
      'tickets', 'tickets_view', 'tickets_create', 'tickets_manage', 'tickets_config',
      // Usuarios y agentes - CRUD completo
      'users', 'users_view', 'users_create', 'users_edit', 'users_delete',
      'agents', 'agents_view', 'agents_create', 'agents_edit', 'agents_delete', 'agents_assign',
      // Roles y permisos completos
      'roles', 'roles_view', 'roles_assign', 'permissions_custom',
      // Reportes completos incluidos confidenciales
      'reports', 'reports_personal', 'reports_team', 'reports_global', 'reports_confidential', 'reports_export',
      // Análisis y AI completo
      'analytics', 'gemini_ai', 'gemini_ai_config',
      // Marketing y medios
      'media_gallery', 'media_upload', 'media_manage', 'marketing', 'marketing_campaigns', 'marketing_create',
      // Configuración crítica
      'settings', 'settings_basic', 'settings_advanced', 'settings_critical',
      // Funciones especiales y críticas
      'system_reset', 'audit_logs', 'agent_tracking', 'system_monitoring'
    ],

    // 🔴 ADMIN - Acceso completo operativo (sin funciones críticas)
    admin: [
      'dashboard', 'dashboard_personal', 'dashboard_team', 'dashboard_global',
      'whatsapp', 'whatsapp_accounts', 'whatsapp_edit', 'whatsapp_settings',
      'leads', 'leads_view', 'leads_create', 'leads_edit', 'leads_delete', 'leads_assign',
      'activities', 'activities_view', 'activities_create', 'activities_edit', 'activities_assign',
      'tickets', 'tickets_view', 'tickets_create', 'tickets_manage',
      'users', 'users_view', 'users_edit', 'agents', 'agents_view', 'agents_assign',
      'reports', 'reports_personal', 'reports_team', 'reports_global', 'reports_export',
      'analytics', 'gemini_ai', 'media_gallery', 'media_upload', 'media_manage',
      'marketing', 'marketing_campaigns', 'settings', 'settings_basic', 'agent_tracking'
    ],

    // 🟠 SUPERVISOR - Gestión de equipos
    supervisor: [
      'dashboard', 'dashboard_personal', 'dashboard_team',
      'whatsapp', 'whatsapp_accounts', 'leads', 'leads_view', 'leads_create', 'leads_edit', 'leads_assign',
      'activities', 'activities_view', 'activities_create', 'activities_edit',
      'tickets', 'tickets_view', 'tickets_create', 'tickets_manage',
      'users', 'users_view', 'agents', 'agents_view', 'agents_assign',
      'reports', 'reports_personal', 'reports_team', 'analytics', 'gemini_ai',
      'media_gallery', 'media_upload', 'marketing', 'settings', 'settings_basic'
    ],

    // 🟡 AGENTE SENIOR - Funciones avanzadas
    senior_agent: [
      'dashboard', 'dashboard_personal',
      'whatsapp', 'leads', 'leads_view', 'leads_create', 'leads_edit',
      'activities', 'activities_view', 'activities_create', 'activities_edit', 'activities_assign',
      'tickets', 'tickets_view', 'tickets_create', 'tickets_manage',
      'reports', 'reports_personal', 'analytics', 'gemini_ai',
      'media_gallery', 'media_upload', 'media_manage', 'marketing'
    ],

    // 🟢 AGENTE - Operaciones básicas
    agent: [
      'dashboard', 'dashboard_personal',
      'whatsapp', 'leads', 'leads_view', 'leads_edit',
      'activities', 'activities_view', 'activities_create',
      'tickets', 'tickets_view', 'tickets_create',
      'reports', 'reports_personal', 'media_gallery', 'media_upload'
    ],

    // 🔵 VISUALIZADOR - Solo lectura
    viewer: [
      'dashboard', 'dashboard_personal',
      'leads', 'leads_view', 'activities', 'activities_view',
      'tickets', 'tickets_view', 'reports', 'reports_personal', 'media_gallery'
    ]
  };

  // ===== GESTIÓN DE ROLES =====

  /**
   * Obtener todos los roles disponibles
   */
  getRoles() {
    return this.ROLES;
  }

  /**
   * Obtener todas las páginas disponibles
   */
  getPages() {
    return this.PAGES;
  }

  /**
   * Obtener permisos por defecto para un rol
   */
  getDefaultPermissions(role: string): string[] {
    return this.DEFAULT_PERMISSIONS[role as keyof typeof this.DEFAULT_PERMISSIONS] || [];
  }

  /**
   * Verificar si un agente tiene permiso para acceder a una página
   */
  async hasPermission(agentId: number, page: string): Promise<boolean> {
    const agent = await this.getAgentRole(agentId);
    if (!agent) return false;

    // Si tiene permisos personalizados, usar esos
    if (agent.permissions && agent.permissions.length > 0) {
      return agent.permissions.includes(page);
    }

    // Si no tiene permisos personalizados, usar los del rol
    const defaultPermissions = this.getDefaultPermissions(agent.role || 'viewer');
    return defaultPermissions.includes(page);
  }

  /**
   * Obtener todas las páginas que puede ver un agente
   */
  async getAgentPages(agentId: number): Promise<string[]> {
    const agent = await this.getAgentRole(agentId);
    if (!agent) return [];

    // Si tiene permisos personalizados, usar esos
    if (agent.permissions && agent.permissions.length > 0) {
      return agent.permissions;
    }

    // Si no tiene permisos personalizados, usar los del rol
    return this.getDefaultPermissions(agent.role || 'viewer');
  }

  /**
   * Obtener información del rol de un agente
   */
  async getAgentRole(agentId: number): Promise<InternalAgent | null> {
    const [agent] = await db
      .select()
      .from(internalAgents)
      .where(eq(internalAgents.id, agentId))
      .limit(1);

    return agent || null;
  }

  /**
   * Asignar rol a un agente
   */
  async assignRole(agentId: number, role: string): Promise<InternalAgent | null> {
    // Verificar que el rol existe
    if (!this.ROLES[role as keyof typeof this.ROLES]) {
      throw new Error(`Rol "${role}" no válido`);
    }

    const [agent] = await db
      .update(internalAgents)
      .set({ 
        role,
        permissions: null, // Limpiar permisos personalizados al cambiar rol
        updatedAt: new Date()
      })
      .where(eq(internalAgents.id, agentId))
      .returning();

    if (agent) {
      console.log(`👤 Rol "${role}" asignado al agente ${agent.name}`);
    }

    return agent || null;
  }

  /**
   * Asignar permisos personalizados a un agente
   */
  async assignCustomPermissions(agentId: number, permissions: string[]): Promise<InternalAgent | null> {
    // Verificar que todas las páginas existen
    const invalidPages = permissions.filter(page => !this.PAGES[page as keyof typeof this.PAGES]);
    if (invalidPages.length > 0) {
      throw new Error(`Páginas no válidas: ${invalidPages.join(', ')}`);
    }

    const [agent] = await db
      .update(internalAgents)
      .set({ 
        permissions,
        updatedAt: new Date()
      })
      .where(eq(internalAgents.id, agentId))
      .returning();

    if (agent) {
      console.log(`🔑 Permisos personalizados asignados al agente ${agent.name}: ${permissions.join(', ')}`);
    }

    return agent || null;
  }

  // ===== ANÁLISIS DE ACCESO POR ROL =====

  /**
   * Obtener estadísticas de acceso por rol
   */
  async getRoleAccessStats(days: number = 30): Promise<any> {
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Obtener todos los agentes
    const agents = await db
      .select()
      .from(internalAgents);

    // Obtener actividades de visualización de páginas
    const activities = await db
      .select()
      .from(agentActivities)
      .where(
        and(
          eq(agentActivities.activityType, 'page_visit'),
          desc(agentActivities.timestamp)
        )
      );

    // Agrupar por rol
    const roleStats = {};

    for (const agent of agents) {
      const role = agent.role || 'viewer';
      if (!roleStats[role]) {
        roleStats[role] = {
          roleName: this.ROLES[role as keyof typeof this.ROLES]?.name || role,
          agentCount: 0,
          totalPageViews: 0,
          uniquePages: new Set(),
          mostVisitedPages: {},
          agents: []
        };
      }

      roleStats[role].agentCount++;

      // Contar actividades de este agente
      const agentActivities = activities.filter(a => a.agentId === agent.id);
      roleStats[role].totalPageViews += agentActivities.length;

      agentActivities.forEach(activity => {
        if (activity.page) {
          roleStats[role].uniquePages.add(activity.page);
          roleStats[role].mostVisitedPages[activity.page] = 
            (roleStats[role].mostVisitedPages[activity.page] || 0) + 1;
        }
      });

      roleStats[role].agents.push({
        id: agent.id,
        name: agent.name,
        pageViews: agentActivities.length,
        permissions: agent.permissions || this.getDefaultPermissions(role)
      });
    }

    // Convertir Sets a arrays y ordenar páginas más visitadas
    Object.keys(roleStats).forEach(role => {
      roleStats[role].uniquePages = Array.from(roleStats[role].uniquePages);
      roleStats[role].mostVisitedPages = Object.entries(roleStats[role].mostVisitedPages)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([page, count]) => ({ page, visits: count }));
    });

    console.log(`📊 Estadísticas de acceso por rol generadas para ${Object.keys(roleStats).length} roles`);
    return roleStats;
  }

  /**
   * Generar reporte de permisos por página
   */
  async getPagePermissionsReport(): Promise<any> {
    const agents = await db
      .select()
      .from(internalAgents);

    const pageReport = {};

    // Inicializar reporte por página
    Object.keys(this.PAGES).forEach(page => {
      pageReport[page] = {
        pageName: this.PAGES[page as keyof typeof this.PAGES].name,
        category: this.PAGES[page as keyof typeof this.PAGES].category,
        minLevel: this.PAGES[page as keyof typeof this.PAGES].minLevel,
        totalAgentsWithAccess: 0,
        agentsByRole: {},
        accessDeniedCount: 0
      };
    });

    // Analizar acceso por agente
    for (const agent of agents) {
      const role = agent.role || 'viewer';
      const permissions = agent.permissions || this.getDefaultPermissions(role);

      Object.keys(this.PAGES).forEach(page => {
        if (permissions.includes(page)) {
          pageReport[page].totalAgentsWithAccess++;
          
          if (!pageReport[page].agentsByRole[role]) {
            pageReport[page].agentsByRole[role] = 0;
          }
          pageReport[page].agentsByRole[role]++;
        } else {
          pageReport[page].accessDeniedCount++;
        }
      });
    }

    console.log(`📋 Reporte de permisos por página generado para ${Object.keys(this.PAGES).length} páginas`);
    return pageReport;
  }

  /**
   * Verificar acceso y registrar intento de acceso
   */
  async checkAndLogPageAccess(
    agentId: number, 
    page: string, 
    sessionToken?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    
    const hasPermission = await this.hasPermission(agentId, page);
    
    if (!hasPermission) {
      console.log(`🚫 Acceso denegado para agente ${agentId} a página: ${page}`);
      
      // Registrar intento de acceso denegado si hay sesión activa
      if (sessionToken) {
        const { agentActivityTracker } = await import('./agentActivityTracker');
        await agentActivityTracker.recordActivity(
          sessionToken,
          'access_denied',
          page,
          'Intento de acceso a página sin permisos',
          undefined,
          { reason: 'insufficient_permissions' }
        );
      }
      
      return { 
        allowed: false, 
        reason: 'No tienes permisos para acceder a esta página' 
      };
    }

    console.log(`✅ Acceso permitido para agente ${agentId} a página: ${page}`);
    return { allowed: true };
  }
}

// Exportar instancia singleton
export const agentRoleManager = new AgentRoleManager();
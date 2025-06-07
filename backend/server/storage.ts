import { 
  users, 
  leads, 
  whatsappAccounts,
  chatAssignments,
  chatComments,
  dashboardStats,
  type User, 
  type InsertUser,
  type Lead,
  type InsertLead,
  type InsertWhatsAppAccount,
  type WhatsAppAccount,
  type ChatAssignment,
  type InsertChatAssignment,

} from "@shared/schema";
import { db } from './db';
import { eq, desc, or, sql } from 'drizzle-orm';

// Interface for storage methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Lead methods
  getLeads(): Promise<Lead[]>;
  getAllLeads(): Promise<Lead[]>;
  createLead(insertLead: InsertLead): Promise<Lead>;
  updateLead(id: number, updates: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  
  // Activity methods
  getActivitiesByUser(userId: number): Promise<any[]>;
  
  // WhatsApp accounts methods
  getWhatsAppAccounts(): Promise<WhatsAppAccount[]>;
  createWhatsAppAccount(account: InsertWhatsAppAccount): Promise<WhatsAppAccount>;
  getAllWhatsappAccounts(): Promise<WhatsAppAccount[]>;
  getWhatsappAccount(id: number): Promise<WhatsAppAccount | undefined>;
  updateWhatsappAccount(id: number, updates: Partial<WhatsAppAccount>): Promise<WhatsAppAccount | undefined>;
  deleteWhatsappAccount(id: number): Promise<boolean>;
  deleteAllWhatsappAccounts(): Promise<boolean>;
  
  // Chat assignments methods
  getChatAssignments(): Promise<ChatAssignment[]>;
  createChatAssignment(assignment: InsertChatAssignment): Promise<ChatAssignment>;
  
  // WhatsApp agent configuration methods
  setWhatsappAgentConfig(accountId: number, agentId: string, autoResponse: boolean): Promise<boolean>;
  getWhatsappAgentConfig(accountId: number): Promise<{agentId: string | null, autoResponse: boolean} | null>;
  toggleWhatsappAutoResponse(accountId: number): Promise<boolean>;
  updateWhatsappAccountAgentConfig(accountId: number, config: {assignedExternalAgentId?: string | null, autoResponseEnabled?: boolean, responseDelay?: number}): Promise<boolean>;
  
  // Dashboard stats methods
  getDashboardStats(): Promise<any | undefined>;
  updateDashboardStats(stats: any): Promise<any>;
  
  // Additional required methods
  initializeData(): Promise<void>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.id));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getAllLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getActivitiesByUser(userId: number): Promise<any[]> {
    try {
      // Implementación básica - se puede expandir según el esquema de actividades
      return [];
    } catch (error) {
      console.error('Error getting activities by user:', error);
      return [];
    }
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db
      .insert(leads)
      .values(insertLead)
      .returning();
    return lead;
  }

  async updateLead(id: number, updates: Partial<Lead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set(updates)
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  async deleteLead(id: number): Promise<boolean> {
    const result = await db
      .delete(leads)
      .where(eq(leads.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getWhatsAppAccounts(): Promise<WhatsAppAccount[]> {
    return await db.select().from(whatsappAccounts);
  }

  async createWhatsAppAccount(account: InsertWhatsAppAccount): Promise<WhatsAppAccount> {
    // Buscar el primer ID disponible
    const existingAccounts = await db.select({ id: whatsappAccounts.id }).from(whatsappAccounts).orderBy(whatsappAccounts.id);
    
    let nextAvailableId = 1;
    
    if (existingAccounts.length === 0) {
      // No hay cuentas, usar ID 1
      nextAvailableId = 1;
      console.log(`🔍 Primera cuenta - asignando ID: ${nextAvailableId}`);
    } else {
      // Buscar el primer ID disponible comenzando desde 1
      const usedIds = existingAccounts.map(acc => acc.id).sort((a, b) => a - b);
      nextAvailableId = 1;
      
      // Buscar el primer hueco en la secuencia
      for (let candidateId = 1; candidateId <= usedIds.length + 1; candidateId++) {
        if (!usedIds.includes(candidateId)) {
          nextAvailableId = candidateId;
          break;
        }
      }
      
      console.log(`🔍 Buscando ID disponible: IDs existentes [${usedIds.join(', ')}], asignando ID: ${nextAvailableId}`);
    }
    
    // Usar inserción directa con Drizzle especificando el ID
    try {
      const [newAccount] = await db.insert(whatsappAccounts).values({
        id: nextAvailableId,
        name: account.name,
        description: account.description || null,
        ownerName: account.ownerName || null,
        ownerPhone: account.ownerPhone || null,
        status: account.status || 'inactive',
        autoResponseEnabled: account.autoResponseEnabled || false,
        assignedExternalAgentId: account.assignedExternalAgentId || null,
        responseDelay: account.responseDelay || 3,
        createdAt: new Date(),
        lastActiveAt: new Date()
      }).returning();
      
      console.log(`✅ Cuenta de WhatsApp creada con ID reutilizado: ${nextAvailableId}`);
      
      // Actualizar la secuencia para evitar conflictos futuros
      const maxId = Math.max(nextAvailableId, ...existingAccounts.map(acc => acc.id));
      await db.execute(sql`SELECT setval('whatsapp_accounts_id_seq', ${maxId}, true)`);
      
      return newAccount;
    } catch (error) {
      console.error('❌ Error creando cuenta con ID específico:', error);
      // Fallback: usar inserción normal sin ID específico
      const [newAccount] = await db
        .insert(whatsappAccounts)
        .values({
          name: account.name,
          description: account.description || null,
          ownerName: account.ownerName || null,
          ownerPhone: account.ownerPhone || null,
          status: account.status || 'inactive',
          autoResponseEnabled: account.autoResponseEnabled || false,
          assignedExternalAgentId: account.assignedExternalAgentId || null,
          responseDelay: account.responseDelay || 3,
          createdAt: new Date(),
          lastActiveAt: new Date()
        })
        .returning();
      return newAccount;
    }
  }

  async getChatAssignments(): Promise<ChatAssignment[]> {
    return await db.select().from(chatAssignments);
  }

  async createChatAssignment(assignment: InsertChatAssignment): Promise<ChatAssignment> {
    const [newAssignment] = await db
      .insert(chatAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async getAllWhatsappAccounts(): Promise<WhatsAppAccount[]> {
    return await db.select().from(whatsappAccounts);
  }

  async getWhatsappAccount(id: number): Promise<WhatsAppAccount | undefined> {
    const [account] = await db.select().from(whatsappAccounts).where(eq(whatsappAccounts.id, id));
    return account || undefined;
  }

  async updateWhatsappAccount(id: number, updates: Partial<WhatsAppAccount>): Promise<WhatsAppAccount | undefined> {
    const [account] = await db
      .update(whatsappAccounts)
      .set(updates)
      .where(eq(whatsappAccounts.id, id))
      .returning();
    return account || undefined;
  }

  async deleteWhatsappAccount(id: number): Promise<boolean> {
    const result = await db
      .delete(whatsappAccounts)
      .where(eq(whatsappAccounts.id, id));
    return (result.rowCount || 0) > 0;
  }

  async deleteAllWhatsappAccounts(): Promise<boolean> {
    try {
      // Eliminar todas las cuentas
      await db.delete(whatsappAccounts);
      
      // Reiniciar la secuencia de ID desde 1
      await db.execute(`ALTER SEQUENCE whatsapp_accounts_id_seq RESTART WITH 1`);
      
      console.log('✅ Todas las cuentas eliminadas y secuencia de ID reiniciada desde 1');
      return true;
    } catch (error) {
      console.error('❌ Error eliminando todas las cuentas:', error);
      return false;
    }
  }

  // WhatsApp agent configuration methods
  async setWhatsappAgentConfig(accountId: number, agentId: string, autoResponse: boolean): Promise<boolean> {
    try {
      const updates = {
        assignedExternalAgentId: agentId,
        autoResponseEnabled: autoResponse
      };
      
      const result = await db
        .update(whatsappAccounts)
        .set(updates)
        .where(eq(whatsappAccounts.id, accountId))
        .returning();
        
      console.log(`✅ Configuración persistente guardada - Cuenta: ${accountId}, Agente: ${agentId}, Auto-respuesta: ${autoResponse}`);
      return result.length > 0;
    } catch (error) {
      console.error('Error setting WhatsApp agent config:', error);
      return false;
    }
  }

  async getWhatsappAgentConfig(accountId: number): Promise<{agentId: string | null, autoResponse: boolean} | null> {
    try {
      const [account] = await db
        .select({
          agentId: whatsappAccounts.assignedExternalAgentId,
          autoResponse: whatsappAccounts.autoResponseEnabled
        })
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.id, accountId));
        
      if (!account) return null;
      
      return {
        agentId: account.agentId,
        autoResponse: account.autoResponse || false
      };
    } catch (error) {
      console.error('Error getting WhatsApp agent config:', error);
      return null;
    }
  }

  async toggleWhatsappAutoResponse(accountId: number): Promise<boolean> {
    try {
      // Get current config
      const config = await this.getWhatsappAgentConfig(accountId);
      if (!config) return false;
      
      // Toggle auto response but keep agent assignment
      const newAutoResponse = !config.autoResponse;
      
      const result = await db
        .update(whatsappAccounts)
        .set({ autoResponseEnabled: newAutoResponse })
        .where(eq(whatsappAccounts.id, accountId))
        .returning();
        
      console.log(`🔄 Auto-respuesta cambiada - Cuenta: ${accountId}, Estado: ${newAutoResponse}, Agente mantiene: ${config.agentId}`);
      return result.length > 0;
    } catch (error) {
      console.error('Error toggling auto response:', error);
      return false;
    }
  }

  async updateWhatsappAccountAgentConfig(accountId: number, config: {assignedExternalAgentId?: string | null, autoResponseEnabled?: boolean, responseDelay?: number}): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (config.assignedExternalAgentId !== undefined) {
        updateData.assignedExternalAgentId = config.assignedExternalAgentId;
      }
      
      if (config.autoResponseEnabled !== undefined) {
        updateData.autoResponseEnabled = config.autoResponseEnabled;
      }
      
      if (config.responseDelay !== undefined) {
        updateData.responseDelay = config.responseDelay;
      }
      
      const result = await db
        .update(whatsappAccounts)
        .set(updateData)
        .where(eq(whatsappAccounts.id, accountId))
        .returning();
        
      console.log(`✅ Configuración de agente actualizada - Cuenta: ${accountId}`, updateData);
      return result.length > 0;
    } catch (error) {
      console.error('Error updating WhatsApp account agent config:', error);
      return false;
    }
  }

  async getDashboardStats(): Promise<DashboardStats | undefined> {
    try {
      const [stats] = await db.select().from(dashboardStats);
      return stats || undefined;
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return undefined;
    }
  }

  async updateDashboardStats(statsData: any): Promise<any> {
    try {
      // Verificar si hay estadísticas existentes
      const existingStats = await this.getDashboardStats();
      
      if (existingStats) {
        // Actualizar las estadísticas existentes
        const [stats] = await db
          .update(dashboardStats)
          .set({
            ...statsData,
            updatedAt: new Date()
          })
          .where(eq(dashboardStats.id, existingStats.id))
          .returning();
        return stats;
      } else {
        // Crear nuevas estadísticas
        const [stats] = await db
          .insert(dashboardStats)
          .values(statsData)
          .returning();
        return stats;
      }
    } catch (error) {
      console.error('Error updating dashboard stats:', error);
      throw error;
    }
  }

  async initializeData(): Promise<void> {
    try {
      // Initialize basic data if needed
      const existingAccounts = await this.getWhatsAppAccounts();
      if (existingAccounts.length === 0) {
        // Create a default WhatsApp account for testing
        await this.createWhatsAppAccount({
          name: 'Demo WhatsApp',
          description: 'Cuenta de demostración',
          ownerName: 'Sistema Demo',
          ownerPhone: '+1234567890',
          status: 'disconnected',
          adminId: 1,
          autoResponseEnabled: false,
          responseDelay: 1000
        });
      }
      
      // Asegurar que la cuenta 1 tenga asignado el agente Smartplanner IA permanentemente
      const account1 = await this.getWhatsappAccount(1);
      if (account1 && account1.assignedExternalAgentId !== '3') {
        await this.setWhatsappAgentConfig(1, '3', true);
        console.log('🔧 Asignación persistente restaurada: Cuenta 1 -> Smartplanner IA (ID: 3)');
      }
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  }

  // AI Prompts management
  async getAiPrompts(): Promise<AiPrompt[]> {
    try {
      return await db.select().from(aiPrompts);
    } catch (error) {
      console.error('Error getting AI prompts:', error);
      return [];
    }
  }

  async getAiPrompt(id: number): Promise<AiPrompt | undefined> {
    try {
      const [prompt] = await db.select().from(aiPrompts).where(eq(aiPrompts.id, id));
      return prompt || undefined;
    } catch (error) {
      console.error('Error getting AI prompt:', error);
      return undefined;
    }
  }

  async createAiPrompt(insertPrompt: InsertAiPrompt): Promise<AiPrompt> {
    try {
      const [prompt] = await db
        .insert(aiPrompts)
        .values(insertPrompt)
        .returning();
      return prompt;
    } catch (error) {
      console.error('Error creating AI prompt:', error);
      throw error;
    }
  }

  async updateAiPrompt(id: number, updates: Partial<InsertAiPrompt>): Promise<AiPrompt | null> {
    try {
      const [prompt] = await db
        .update(aiPrompts)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(aiPrompts.id, id))
        .returning();
      return prompt || null;
    } catch (error) {
      console.error('Error updating AI prompt:', error);
      return null;
    }
  }

  async deleteAiPrompt(id: number): Promise<boolean> {
    try {
      const result = await db.delete(aiPrompts).where(eq(aiPrompts.id, id));
      return result.count > 0;
    } catch (error) {
      console.error('Error deleting AI prompt:', error);
      return false;
    }
  }

  async assignPromptToAccount(accountId: number, promptId: number): Promise<boolean> {
    try {
      const result = await db
        .update(whatsappAccounts)
        .set({ assignedPromptId: promptId })
        .where(eq(whatsappAccounts.id, accountId))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error assigning prompt to account:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();
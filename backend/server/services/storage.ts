/**
 * Implementación de almacenamiento con soporte para PostgreSQL
 */

import { db } from './db';
import { 
  users, insertUserSchema, type User, type InsertUser,
  leads, type Lead, type InsertLead,
  activities, type Activity, type InsertActivity,
  messages, type Message, type InsertMessage,
  surveys, type Survey, type InsertSurvey,
  dashboardStats, type DashboardStats, type InsertDashboardStats
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

export interface IStorage {
  initializeData(): Promise<void>;
  // Usuarios
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  // Leads
  getAllLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  // Actividades
  getAllActivities(): Promise<Activity[]>;
  getActivitiesByLeadId(leadId: number): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<boolean>;
  // Mensajes
  getAllMessages(): Promise<Message[]>;
  getMessagesByLeadId(leadId: number): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  // Encuestas
  getAllSurveys(): Promise<Survey[]>;
  getSurveysByLeadId(leadId: number): Promise<Survey[]>;
  getSurvey(id: number): Promise<Survey | undefined>;
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  // Estadísticas
  getDashboardStats(): Promise<DashboardStats | undefined>;
  updateDashboardStats(stats: InsertDashboardStats): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  async initializeData(): Promise<void> {
    try {
      // Verificar si ya hay datos en la base de datos
      const [userCount] = await db.select({ count: db.fn.count() }).from(users);
      
      if (Number(userCount?.count || 0) > 0) {
        console.log('La base de datos ya tiene datos iniciales. Omitiendo inicialización.');
        return;
      }
      
      console.log('Inicializando datos en la base de datos...');
      
      // Crear usuarios iniciales
      const adminPassword = await bcrypt.hash('admin123', 10);
      const agentPassword = await bcrypt.hash('agent123', 10);
      
      // Usuario administrador
      await db.insert(users).values({
        username: 'admin',
        password: adminPassword,
        fullName: 'Administrador',
        email: 'admin@ejemplo.com',
        role: 'admin',
        status: 'active',
        department: 'Dirección'
      });
      
      // Usuario vendedor
      await db.insert(users).values({
        username: 'vendedor',
        password: agentPassword,
        fullName: 'Juan Vendedor',
        email: 'vendedor@ejemplo.com',
        role: 'agent',
        status: 'active',
        department: 'Ventas'
      });
      
      // Crear algunos leads de ejemplo
      const leadIds = [];
      for (let i = 1; i <= 5; i++) {
        const [lead] = await db.insert(leads).values({
          name: `Cliente Potencial ${i}`,
          email: `cliente${i}@ejemplo.com`,
          phone: `555-000-${i.toString().padStart(4, '0')}`,
          company: `Empresa ${i}`,
          source: i % 2 === 0 ? 'website' : 'referral',
          status: i % 3 === 0 ? 'contacted' : 'new',
          assigneeId: 2 // Asignado al vendedor
        }).returning();
        
        leadIds.push(lead.id);
      }
      
      // Crear algunas actividades para los leads
      for (const leadId of leadIds) {
        // Una llamada programada
        await db.insert(activities).values({
          leadId,
          userId: 2,
          type: 'call',
          scheduled: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
          notes: 'Llamar para hacer seguimiento',
          completed: false,
          priority: 'medium'
        });
        
        // Una reunión completada
        await db.insert(activities).values({
          leadId,
          userId: 2,
          type: 'meeting',
          scheduled: new Date(Date.now() - 48 * 60 * 60 * 1000), // Hace 2 días
          notes: 'Presentación inicial de productos',
          completed: true,
          priority: 'high'
        });
      }
      
      // Crear algunos mensajes para el primer lead
      await db.insert(messages).values({
        leadId: leadIds[0],
        content: 'Hola, estoy interesado en sus servicios',
        direction: 'incoming',
        channel: 'email',
        read: true,
        sentAt: new Date(Date.now() - 72 * 60 * 60 * 1000) // Hace 3 días
      });
      
      await db.insert(messages).values({
        leadId: leadIds[0],
        content: 'Gracias por su interés. ¿Podemos agendar una llamada para discutir sus necesidades?',
        direction: 'outgoing',
        channel: 'email',
        read: true,
        sentAt: new Date(Date.now() - 48 * 60 * 60 * 1000) // Hace 2 días
      });
      
      // Inicializar estadísticas del dashboard
      await db.insert(dashboardStats).values({
        totalLeads: leadIds.length,
        newLeadsThisMonth: leadIds.length,
        activeLeads: leadIds.length,
        totalSales: 0,
        pendingActivities: 1,
        completedActivities: 1
      });
      
      console.log('Datos iniciales creados exitosamente.');
    } catch (error) {
      console.error('Error al inicializar datos:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Hash de la contraseña si no está hasheada
    let password = userData.password;
    if (!password.startsWith('$2')) {
      password = await bcrypt.hash(password, 10);
    }
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password
      })
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    // Si se proporciona una contraseña, hashearla
    if (userData.password && !userData.password.startsWith('$2')) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.count > 0;
  }

  async getAllLeads(): Promise<Lead[]> {
    return db.select().from(leads);
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async createLead(leadData: InsertLead): Promise<Lead> {
    const [lead] = await db
      .insert(leads)
      .values(leadData)
      .returning();
    return lead;
  }

  async updateLead(id: number, leadData: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set(leadData)
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  async deleteLead(id: number): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id));
    return result.count > 0;
  }

  async getAllActivities(): Promise<Activity[]> {
    return db.select().from(activities);
  }

  async getActivitiesByLeadId(leadId: number): Promise<Activity[]> {
    return db.select().from(activities).where(eq(activities.leadId, leadId));
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async createActivity(activityData: InsertActivity): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values(activityData)
      .returning();
    return activity;
  }

  async updateActivity(id: number, activityData: Partial<InsertActivity>): Promise<Activity | undefined> {
    const [activity] = await db
      .update(activities)
      .set(activityData)
      .where(eq(activities.id, id))
      .returning();
    return activity || undefined;
  }

  async deleteActivity(id: number): Promise<boolean> {
    const result = await db.delete(activities).where(eq(activities.id, id));
    return result.count > 0;
  }

  async getAllMessages(): Promise<Message[]> {
    return db.select().from(messages);
  }

  async getMessagesByLeadId(leadId: number): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.leadId, leadId));
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async getAllSurveys(): Promise<Survey[]> {
    return db.select().from(surveys);
  }

  async getSurveysByLeadId(leadId: number): Promise<Survey[]> {
    return db.select().from(surveys).where(eq(surveys.leadId, leadId));
  }

  async getSurvey(id: number): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey || undefined;
  }

  async createSurvey(surveyData: InsertSurvey): Promise<Survey> {
    const [survey] = await db
      .insert(surveys)
      .values(surveyData)
      .returning();
    return survey;
  }

  async getDashboardStats(): Promise<DashboardStats | undefined> {
    const [stats] = await db.select().from(dashboardStats);
    return stats || undefined;
  }

  async updateDashboardStats(statsData: InsertDashboardStats): Promise<DashboardStats> {
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
  }
}

export const storage = new DatabaseStorage();
export default storage;
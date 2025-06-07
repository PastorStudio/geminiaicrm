/**
 * Servicio de Calendario Local Integrado
 * Gestiona eventos, recordatorios y notificaciones automáticas
 */

import { db } from '../db';
import { pool } from '../db';
import { calendarEvents } from '@shared/schema';
import cron from 'node-cron';

interface LocalEvent {
  id: number;
  leadId?: number;
  title: string;
  description: string;
  eventDate: Date;
  reminderMinutes: number;
  eventType: 'followup' | 'meeting' | 'call' | 'reminder' | 'task';
  whatsappAccountId?: number;
  contactPhone?: string;
  status: 'pending' | 'notified' | 'completed' | 'cancelled';
  createdAt: Date;
}

interface ReminderNotification {
  eventId: number;
  message: string;
  method: 'whatsapp' | 'system' | 'both';
  scheduledFor: Date;
}

export class LocalCalendarService {
  private cronJobs: Map<number, any> = new Map();
  private wsClients: Set<any> = new Set();

  constructor() {
    this.initializeDatabase();
    this.startReminderScheduler();
    console.log('📅 Servicio de calendario local iniciado');
  }

  private async initializeDatabase() {
    try {
      // Use calendar_events table from schema
      console.log('✅ Tablas de calendario local inicializadas');
    } catch (error) {
      console.error('❌ Error inicializando base de datos de calendario:', error);
    }
  }

  // Crear evento automático para nuevo lead
  async createLeadFollowupEvent(leadData: any): Promise<number | null> {
    try {
      const followupDate = new Date();
      followupDate.setHours(followupDate.getHours() + 24); // 24 horas después

      const result = await pool.query(`
        INSERT INTO local_events (lead_id, title, description, event_date, reminder_minutes, event_type, contact_phone, whatsapp_account_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        leadData.leadId || null,
        `Seguimiento: ${leadData.name || 'Lead de WhatsApp'}`,
        `Contactar a ${leadData.name}\nTeléfono: ${leadData.phone}\nInterés: ${leadData.interest}\nÚltimo mensaje: ${leadData.lastMessage}`,
        followupDate,
        30, // Recordatorio 30 minutos antes
        'followup',
        leadData.phone,
        leadData.whatsappAccountId || null
      ]);

      const eventId = result.rows[0]?.id;
      if (eventId) {
        await this.scheduleReminder(eventId);
        console.log(`📅 Evento de seguimiento creado: ID ${eventId} para ${followupDate.toLocaleString()}`);
      }

      return eventId;
    } catch (error) {
      console.error('❌ Error creando evento de seguimiento:', error);
      return null;
    }
  }

  // Crear evento personalizado
  async createCustomEvent(eventData: {
    leadId?: number;
    title: string;
    description: string;
    eventDate: Date;
    reminderMinutes: number;
    eventType: string;
    contactPhone?: string;
    whatsappAccountId?: number;
  }): Promise<number | null> {
    try {
      const [result] = await db.insert(calendarEvents).values({
        leadId: eventData.leadId || null,
        title: eventData.title,
        description: eventData.description || '',
        eventDate: eventData.eventDate,
        reminderMinutes: eventData.reminderMinutes,
        eventType: eventData.eventType,
        contactPhone: eventData.contactPhone || null,
        status: 'pending'
      }).returning();

      const eventId = result?.id;
      if (eventId) {
        await this.scheduleReminder(eventId);
        console.log(`📅 Evento personalizado creado: ID ${eventId}`);
      }

      return eventId;
    } catch (error) {
      console.error('❌ Error creando evento personalizado:', error);
      return null;
    }
  }

  // Programar recordatorio
  private async scheduleReminder(eventId: number) {
    try {
      const eventResult = await pool.query('SELECT * FROM local_events WHERE id = $1', [eventId]);
      if (eventResult.rows.length === 0) return;

      const event = eventResult.rows[0];
      const reminderDate = new Date(event.event_date);
      reminderDate.setMinutes(reminderDate.getMinutes() - event.reminder_minutes);

      // Crear recordatorio en la base de datos
      await pool.query(`
        INSERT INTO event_reminders (event_id, reminder_date, notification_method, message)
        VALUES ($1, $2, $3, $4)
      `, [
        eventId,
        reminderDate,
        event.contact_phone ? 'both' : 'system',
        `Recordatorio: ${event.title} programado para ${new Date(event.event_date).toLocaleString()}`
      ]);

      // Programar notificación
      if (reminderDate > new Date()) {
        const cronExpression = this.dateToCron(reminderDate);
        const job = cron.schedule(cronExpression, async () => {
          await this.executeReminder(eventId);
          job.destroy();
          this.cronJobs.delete(eventId);
        });

        this.cronJobs.set(eventId, job);
        console.log(`⏰ Recordatorio programado para ${reminderDate.toLocaleString()}`);
      }
    } catch (error) {
      console.error('❌ Error programando recordatorio:', error);
    }
  }

  // Ejecutar recordatorio
  private async executeReminder(eventId: number) {
    try {
      const result = await pool.query(`
        SELECT e.*, r.message, r.notification_method 
        FROM local_events e 
        JOIN event_reminders r ON e.id = r.event_id 
        WHERE e.id = $1 AND r.sent = FALSE
      `, [eventId]);

      if (result.rows.length === 0) return;

      const event = result.rows[0];

      // Enviar notificación al sistema (alerta emergente)
      this.sendSystemNotification({
        title: `🔔 ${event.title}`,
        message: event.message,
        eventId: eventId,
        eventDate: event.event_date,
        contactPhone: event.contact_phone,
        type: event.event_type
      });

      // Enviar mensaje de WhatsApp si hay teléfono
      if (event.contact_phone && event.whatsapp_account_id) {
        await this.sendWhatsAppReminder(event);
      }

      // Marcar recordatorio como enviado
      await pool.query(
        'UPDATE event_reminders SET sent = TRUE WHERE event_id = $1',
        [eventId]
      );

      console.log(`📱 Recordatorio ejecutado para evento: ${event.title}`);
    } catch (error) {
      console.error('❌ Error ejecutando recordatorio:', error);
    }
  }

  // Enviar notificación al sistema (WebSocket)
  private sendSystemNotification(notification: any) {
    const notificationData = {
      type: 'calendar_reminder',
      timestamp: new Date().toISOString(),
      ...notification
    };

    // Enviar a todos los clientes WebSocket conectados
    this.wsClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(JSON.stringify(notificationData));
        } catch (error) {
          console.error('Error enviando notificación WebSocket:', error);
        }
      }
    });

    console.log(`🔔 Notificación del sistema enviada: ${notification.title}`);
  }

  // Enviar recordatorio por WhatsApp
  private async sendWhatsAppReminder(event: any) {
    try {
      // Usar el servicio de WhatsApp simplificado
      const whatsappService = require('./simplifiedWhatsAppService');
      
      const message = `🔔 *Recordatorio de CRM*\n\n📅 *${event.title}*\n⏰ Programado: ${new Date(event.event_date).toLocaleString()}\n\n📝 ${event.description}`;

      const success = await whatsappService.sendMessage(
        event.whatsapp_account_id,
        event.contact_phone,
        message
      );

      if (success) {
        console.log(`📱 Recordatorio de WhatsApp enviado a ${event.contact_phone}`);
      }
    } catch (error) {
      console.error('❌ Error enviando recordatorio de WhatsApp:', error);
    }
  }

  // Obtener eventos próximos
  async getUpcomingEvents(limit: number = 10): Promise<LocalEvent[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM local_events 
        WHERE event_date > NOW() AND status != 'cancelled'
        ORDER BY event_date ASC 
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      console.error('❌ Error obteniendo eventos próximos:', error);
      return [];
    }
  }

  // Obtener eventos del día
  async getTodayEvents(): Promise<LocalEvent[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM local_events 
        WHERE DATE(event_date) = CURRENT_DATE AND status != 'cancelled'
        ORDER BY event_date ASC
      `);

      return result.rows;
    } catch (error) {
      console.error('❌ Error obteniendo eventos de hoy:', error);
      return [];
    }
  }

  // Convertir fecha a expresión cron
  private dateToCron(date: Date): string {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${minute} ${hour} ${day} ${month} *`;
  }

  // Registrar cliente WebSocket
  addWebSocketClient(client: any) {
    this.wsClients.add(client);
    
    client.on('close', () => {
      this.wsClients.delete(client);
    });
  }

  // Iniciar programador de recordatorios
  private startReminderScheduler() {
    // Verificar recordatorios pendientes cada minuto
    cron.schedule('* * * * *', async () => {
      try {
        const result = await pool.query(`
          SELECT r.*, e.title, e.contact_phone, e.whatsapp_account_id, e.event_date
          FROM event_reminders r 
          JOIN local_events e ON r.event_id = e.id
          WHERE r.reminder_date <= NOW() AND r.sent = FALSE
        `);

        for (const reminder of result.rows) {
          await this.executeReminder(reminder.event_id);
        }
      } catch (error) {
        console.error('❌ Error en programador de recordatorios:', error);
      }
    });

    console.log('⏰ Programador de recordatorios iniciado');
  }
}

export const localCalendarService = new LocalCalendarService();
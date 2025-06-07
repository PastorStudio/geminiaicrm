/**
 * Servicio de recordatorios automáticos basados en calendario
 * Integra eventos del calendario con envío automático de mensajes WhatsApp
 */

import { db, pool } from '../db';
import { calendarEvents, whatsappAccounts, leads, contacts } from '@shared/schema';
import { eq, and, gte, lte, isNull, sql } from 'drizzle-orm';
import cron from 'node-cron';

interface CalendarReminderConfig {
  eventId: number;
  chatId: string;
  whatsappAccountId: number;
  reminderMessage: string;
  reminderTimeMinutes: number; // minutos antes del evento
  isActive: boolean;
  autoActivateResponses?: boolean;
}

interface ScheduledReminder {
  id: string;
  eventId: number;
  scheduledTime: Date;
  chatId: string;
  message: string;
  accountId: number;
  executed: boolean;
}

export class CalendarReminderService {
  private static scheduledReminders: Map<string, ScheduledReminder> = new Map();
  private static reminderConfigs: Map<number, CalendarReminderConfig> = new Map();
  private static isInitialized = false;

  /**
   * Inicializa el servicio de recordatorios
   */
  static async initialize() {
    if (this.isInitialized) return;

    console.log('🔔 Inicializando servicio de recordatorios de calendario...');
    
    // Cargar configuraciones existentes
    await this.loadReminderConfigs();
    
    // Programar verificación cada minuto
    cron.schedule('* * * * *', async () => {
      await this.checkAndSendReminders();
    });

    // Programar verificación de nuevos eventos cada 5 minutos
    cron.schedule('*/5 * * * *', async () => {
      await this.scheduleUpcomingReminders();
    });

    this.isInitialized = true;
    console.log('✅ Servicio de recordatorios inicializado correctamente');
  }

  /**
   * Configura un recordatorio para un evento específico
   */
  static async configureReminder(config: CalendarReminderConfig): Promise<boolean> {
    try {
      // Validar que el evento existe
      const event = await db.select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, config.eventId))
        .limit(1);

      if (event.length === 0) {
        console.error(`❌ Evento ${config.eventId} no encontrado`);
        return false;
      }

      // Guardar configuración
      this.reminderConfigs.set(config.eventId, config);

      // Programar recordatorio si el evento es futuro
      await this.scheduleReminderForEvent(event[0], config);

      console.log(`✅ Recordatorio configurado para evento ${config.eventId}`);
      return true;
    } catch (error) {
      console.error('Error configurando recordatorio:', error);
      return false;
    }
  }

  /**
   * Programa recordatorios para eventos próximos
   */
  private static async scheduleUpcomingReminders() {
    try {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Obtener eventos de la próxima semana usando consulta SQL directa
      const result = await pool.query(`
        SELECT * FROM local_events 
        WHERE event_date >= $1 AND event_date <= $2
      `, [now, nextWeek]);

      const upcomingEvents = result.rows || [];
      for (const event of upcomingEvents) {
        const config = this.reminderConfigs.get(event.id);
        if (config && config.isActive) {
          await this.scheduleReminderForEvent(event, config);
        }
      }
    } catch (error) {
      console.error('Error programando recordatorios:', error);
    }
  }

  /**
   * Programa un recordatorio específico para un evento
   */
  private static async scheduleReminderForEvent(event: any, config: CalendarReminderConfig) {
    const reminderTime = new Date(event.startTime.getTime() - config.reminderTimeMinutes * 60 * 1000);
    const now = new Date();

    // Solo programar si el recordatorio es futuro
    if (reminderTime > now) {
      const reminderId = `${event.id}_${config.reminderTimeMinutes}`;
      
      const reminder: ScheduledReminder = {
        id: reminderId,
        eventId: event.id,
        scheduledTime: reminderTime,
        chatId: config.chatId,
        message: this.formatReminderMessage(config.reminderMessage, event),
        accountId: config.whatsappAccountId,
        executed: false
      };

      this.scheduledReminders.set(reminderId, reminder);
      console.log(`📅 Recordatorio programado: ${event.title} para ${reminderTime.toLocaleString()}`);
    }
  }

  /**
   * Verifica y envía recordatorios que han llegado su momento
   */
  private static async checkAndSendReminders() {
    const now = new Date();

    for (const [id, reminder] of this.scheduledReminders.entries()) {
      if (!reminder.executed && reminder.scheduledTime <= now) {
        await this.sendReminder(reminder);
        reminder.executed = true;
        
        // Remover recordatorio ejecutado después de 1 hora
        setTimeout(() => {
          this.scheduledReminders.delete(id);
        }, 60 * 60 * 1000);
      }
    }
  }

  /**
   * Envía un recordatorio específico
   */
  private static async sendReminder(reminder: ScheduledReminder) {
    try {
      console.log(`🔔 Enviando recordatorio: ${reminder.message} a chat ${reminder.chatId}`);

      // Obtener la configuración del recordatorio
      const config = this.reminderConfigs.get(reminder.eventId);
      
      // Activar respuestas automáticas si está configurado
      if (config?.autoActivateResponses) {
        await this.activateAutoResponses(reminder.accountId);
      }

      // Enviar mensaje de recordatorio via WhatsApp
      const success = await this.sendWhatsAppMessage(
        reminder.accountId,
        reminder.chatId,
        reminder.message
      );

      if (success) {
        console.log(`✅ Recordatorio enviado exitosamente a ${reminder.chatId}`);
        
        // Registrar actividad del recordatorio
        await this.logReminderActivity(reminder);
      } else {
        console.error(`❌ Error enviando recordatorio a ${reminder.chatId}`);
      }
    } catch (error) {
      console.error('Error enviando recordatorio:', error);
    }
  }

  /**
   * Envía mensaje via WhatsApp
   */
  private static async sendWhatsAppMessage(accountId: number, chatId: string, message: string): Promise<boolean> {
    try {
      // Aquí integraremos con el servicio de WhatsApp existente
      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          chatId,
          message,
          source: 'calendar_reminder'
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error enviando mensaje WhatsApp:', error);
      return false;
    }
  }

  /**
   * Activa respuestas automáticas para una cuenta
   */
  private static async activateAutoResponses(accountId: number) {
    try {
      console.log(`🤖 Activando respuestas automáticas para cuenta ${accountId}`);
      
      await fetch('/api/whatsapp/auto-response/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, source: 'calendar_trigger' })
      });
    } catch (error) {
      console.error('Error activando respuestas automáticas:', error);
    }
  }

  /**
   * Formatea el mensaje de recordatorio con variables del evento
   */
  private static formatReminderMessage(template: string, event: any): string {
    return template
      .replace('{title}', event.title || 'Evento')
      .replace('{date}', event.startTime.toLocaleDateString())
      .replace('{time}', event.startTime.toLocaleTimeString())
      .replace('{description}', event.description || '')
      .replace('{location}', event.location || '');
  }

  /**
   * Registra actividad del recordatorio en la base de datos
   */
  private static async logReminderActivity(reminder: ScheduledReminder) {
    try {
      // Aquí registraremos la actividad en el sistema de logging
      console.log(`📝 Registrando actividad de recordatorio ${reminder.id}`);
    } catch (error) {
      console.error('Error registrando actividad:', error);
    }
  }

  /**
   * Carga configuraciones de recordatorios desde la base de datos
   */
  private static async loadReminderConfigs() {
    try {
      // Por ahora usaremos configuraciones por defecto
      // En el futuro esto se cargará desde una tabla de configuración
      console.log('📂 Cargando configuraciones de recordatorios...');
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    }
  }

  /**
   * Obtiene recordatorios programados
   */
  static getScheduledReminders(): ScheduledReminder[] {
    return Array.from(this.scheduledReminders.values());
  }

  /**
   * Obtiene configuraciones activas
   */
  static getReminderConfigs(): CalendarReminderConfig[] {
    return Array.from(this.reminderConfigs.values());
  }

  /**
   * Elimina un recordatorio programado
   */
  static cancelReminder(eventId: number) {
    for (const [id, reminder] of this.scheduledReminders.entries()) {
      if (reminder.eventId === eventId) {
        this.scheduledReminders.delete(id);
        console.log(`🗑️ Recordatorio cancelado para evento ${eventId}`);
      }
    }
  }

  /**
   * Programa recordatorio inmediato (para testing)
   */
  static async scheduleImmediateReminder(chatId: string, message: string, accountId: number = 1) {
    const reminder: ScheduledReminder = {
      id: `immediate_${Date.now()}`,
      eventId: 0,
      scheduledTime: new Date(Date.now() + 30000), // 30 segundos
      chatId,
      message,
      accountId,
      executed: false
    };

    this.scheduledReminders.set(reminder.id, reminder);
    console.log(`⚡ Recordatorio inmediato programado para ${chatId}`);
  }
}
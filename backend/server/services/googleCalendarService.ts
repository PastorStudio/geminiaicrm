/**
 * Servicio de integración con Google Calendar
 * Gestiona eventos automáticos para leads y actividades del CRM
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db';
import { pool } from '../db';

interface CalendarEvent {
  leadId: number;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  type: 'followup' | 'meeting' | 'call' | 'reminder';
}

interface CalendarCredentials {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client | null = null;
  private calendar: any = null;
  private credentials: CalendarCredentials | null = null;

  constructor() {
    this.initializeCredentials();
  }

  private initializeCredentials() {
    this.credentials = {
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback'
    };

    if (this.credentials.client_id && this.credentials.client_secret) {
      this.oauth2Client = new google.auth.OAuth2(
        this.credentials.client_id,
        this.credentials.client_secret,
        this.credentials.redirect_uri
      );

      // Check for stored tokens
      this.loadStoredTokens();
    }
  }

  private async loadStoredTokens() {
    try {
      const result = await pool.query(
        'SELECT tokens FROM calendar_auth WHERE id = 1'
      );
      
      if (result.rows.length > 0 && this.oauth2Client) {
        const tokens = result.rows[0].tokens;
        this.oauth2Client.setCredentials(tokens);
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        console.log('✅ Google Calendar tokens loaded from database');
      }
    } catch (error) {
      console.log('📅 No stored calendar tokens found, authentication needed');
    }
  }

  getAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new Error('OAuth client not initialized. Check Google Calendar credentials.');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  async authenticate(code: string): Promise<boolean> {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth client not initialized');
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Store tokens in database
      await pool.query(`
        INSERT INTO calendar_auth (id, tokens, created_at)
        VALUES (1, $1, NOW())
        ON CONFLICT (id) 
        DO UPDATE SET tokens = EXCLUDED.tokens, updated_at = NOW()
      `, [JSON.stringify(tokens)]);

      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      console.log('✅ Google Calendar authenticated successfully');
      return true;
    } catch (error) {
      console.error('❌ Calendar authentication failed:', error);
      return false;
    }
  }

  async createLeadFollowupEvent(leadData: any): Promise<string | null> {
    if (!this.calendar) {
      console.log('📅 Calendar not authenticated, skipping event creation');
      return null;
    }

    try {
      const followupDate = new Date();
      followupDate.setHours(followupDate.getHours() + 24); // Follow up in 24 hours

      const event = {
        summary: `Seguimiento: ${leadData.name || leadData.title}`,
        description: `Lead automático desde WhatsApp\n\nTeléfono: ${leadData.phone}\nInterés: ${leadData.interest}\nÚltimo mensaje: ${leadData.lastMessage}`,
        start: {
          dateTime: followupDate.toISOString(),
          timeZone: 'America/Mexico_City',
        },
        end: {
          dateTime: new Date(followupDate.getTime() + 30 * 60000).toISOString(), // 30 minutes
          timeZone: 'America/Mexico_City',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 30 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      console.log(`📅 Evento de seguimiento creado: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      console.error('❌ Error creando evento de calendario:', error);
      return null;
    }
  }

  async createMeetingEvent(leadId: number, title: string, dateTime: Date, duration: number = 60): Promise<string | null> {
    if (!this.calendar) {
      console.log('📅 Calendar not authenticated, skipping meeting creation');
      return null;
    }

    try {
      // Get lead details
      const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
      if (leadResult.rows.length === 0) {
        throw new Error('Lead not found');
      }

      const lead = leadResult.rows[0];
      const endTime = new Date(dateTime.getTime() + duration * 60000);

      const event = {
        summary: title,
        description: `Reunión con lead: ${lead.name}\nTeléfono: ${lead.phone}\nNotas: ${lead.notes}`,
        start: {
          dateTime: dateTime.toISOString(),
          timeZone: 'America/Mexico_City',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/Mexico_City',
        },
        attendees: lead.email ? [{ email: lead.email }] : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      console.log(`📅 Reunión programada: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      console.error('❌ Error creando reunión:', error);
      return null;
    }
  }

  async getUpcomingEvents(maxResults: number = 10): Promise<any[]> {
    if (!this.calendar) {
      return [];
    }

    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('❌ Error getting calendar events:', error);
      return [];
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    if (!this.calendar) {
      return false;
    }

    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
      console.log(`📅 Evento eliminado: ${eventId}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting calendar event:', error);
      return false;
    }
  }

  isAuthenticated(): boolean {
    return this.calendar !== null;
  }

  getCredentialsStatus(): { configured: boolean, authenticated: boolean } {
    return {
      configured: !!(this.credentials?.client_id && this.credentials?.client_secret),
      authenticated: this.isAuthenticated()
    };
  }
}

export const googleCalendarService = new GoogleCalendarService();
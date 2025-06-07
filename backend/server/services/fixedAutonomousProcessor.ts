/**
 * Procesador Autónomo Corregido - Compatible con estructura real de la base de datos
 */

import { db } from '../db';
import { contacts, leads } from '../../shared/schema';
import { eq } from 'drizzle-orm';

interface ChatAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  intent: 'sales' | 'support' | 'inquiry' | 'complaint';
  urgency: 'low' | 'medium' | 'high';
  leadPotential: number;
  shouldCreateLead: boolean;
  extractedInfo: {
    name?: string;
    company?: string;
    products?: string[];
    budget?: string;
    phone?: string;
  };
}

export class FixedAutonomousProcessor {
  private isProcessing: boolean = false;
  private processedChats: Set<string> = new Set();

  public async processWhatsAppChats(): Promise<{ leadsCreated: number; contactsCreated: number }> {
    if (this.isProcessing) {
      return { leadsCreated: 0, contactsCreated: 0 };
    }

    this.isProcessing = true;
    let leadsCreated = 0;
    let contactsCreated = 0;

    try {
      // Obtener chats desde la API de WhatsApp
      const response = await fetch('http://localhost:5000/api/direct/whatsapp/chats');
      const chats = await response.json();

      console.log(`🔍 Procesando ${chats.length} chats de WhatsApp`);

      for (const chat of chats) {
        if (this.processedChats.has(chat.id._serialized)) {
          continue;
        }

        try {
          const result = await this.processSingleChat(chat);
          if (result.contactCreated) contactsCreated++;
          if (result.leadCreated) leadsCreated++;
          
          this.processedChats.add(chat.id._serialized);
        } catch (error) {
          console.error(`Error procesando chat ${chat.id._serialized}:`, error);
        }
      }

      console.log(`✅ Procesamiento completado: ${contactsCreated} contactos, ${leadsCreated} leads`);
      return { leadsCreated, contactsCreated };

    } catch (error) {
      console.error('Error en procesamiento autónomo:', error);
      return { leadsCreated: 0, contactsCreated: 0 };
    } finally {
      this.isProcessing = false;
    }
  }

  private async processSingleChat(chat: any): Promise<{ contactCreated: boolean; leadCreated: boolean }> {
    // Extraer información del contacto
    const phoneNumber = chat.id._serialized.replace('@c.us', '');
    const contactInfo = {
      name: chat.name || `WhatsApp ${phoneNumber}`,
      phone: phoneNumber
    };

    // Crear o obtener contacto
    const contact = await this.getOrCreateContact(contactInfo);
    let contactCreated = false;
    let leadCreated = false;

    if (!contact.existedBefore) {
      contactCreated = true;
    }

    // Analizar si debe convertirse en lead
    const analysis = this.performBasicAnalysis(chat);
    
    if (analysis.shouldCreateLead) {
      await this.createLead(contact.data, analysis, chat.id._serialized);
      leadCreated = true;
    }

    return { contactCreated, leadCreated };
  }

  private async getOrCreateContact(contactInfo: any) {
    try {
      // Buscar contacto existente
      const [existingContact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.phone, contactInfo.phone))
        .limit(1);

      if (existingContact) {
        return { data: existingContact, existedBefore: true };
      }

      // Crear nuevo contacto usando solo campos que existen
      const [newContact] = await db
        .insert(contacts)
        .values({
          name: contactInfo.name,
          phone: contactInfo.phone,
          source: 'whatsapp'
        })
        .returning();

      console.log(`✅ Nuevo contacto creado: ${newContact.name} (${newContact.phone})`);
      return { data: newContact, existedBefore: false };

    } catch (error) {
      console.error('Error manejando contacto:', error);
      throw error;
    }
  }

  private performBasicAnalysis(chat: any): ChatAnalysis {
    const lastMessage = chat.lastMessage?.body || '';
    const messageText = lastMessage.toLowerCase();

    // Análisis básico de intención
    const salesKeywords = ['comprar', 'precio', 'costo', 'cotización', 'producto', 'servicio'];
    const supportKeywords = ['ayuda', 'problema', 'error', 'soporte', 'falla'];
    
    const hasSalesIntent = salesKeywords.some(keyword => messageText.includes(keyword));
    const hasSupportIntent = supportKeywords.some(keyword => messageText.includes(keyword));

    let intent: 'sales' | 'support' | 'inquiry' | 'complaint' = 'inquiry';
    let shouldCreateLead = false;

    if (hasSalesIntent) {
      intent = 'sales';
      shouldCreateLead = true;
    } else if (hasSupportIntent) {
      intent = 'support';
    }

    return {
      sentiment: 'neutral',
      intent,
      urgency: 'medium',
      leadPotential: shouldCreateLead ? 0.7 : 0.3,
      shouldCreateLead,
      extractedInfo: {
        name: chat.name,
        phone: chat.id._serialized.replace('@c.us', '')
      }
    };
  }

  private async createLead(contact: any, analysis: ChatAnalysis, chatId: string) {
    try {
      // Obtener agente disponible (usuario con rol 'agent')
      const [agent] = await db
        .select()
        .from(users)
        .where(eq(users.role, 'agent'))
        .limit(1);

      const leadData = {
        contactId: contact.id,
        whatsappAccountId: 1, // Account por defecto
        title: `Lead WhatsApp - ${contact.name}`,
        status: 'new',
        stage: 'lead',
        value: '1000.00',
        priority: analysis.urgency,
        source: 'whatsapp',
        assignedTo: agent?.id || null,
        notes: `Lead generado automáticamente desde chat WhatsApp. Intención: ${analysis.intent}`
      };

      const [newLead] = await db
        .insert(leads)
        .values(leadData)
        .returning();

      console.log(`🎯 Lead creado: ${newLead.title} (ID: ${newLead.id})`);
      return newLead;

    } catch (error) {
      console.error('Error creando lead:', error);
      throw error;
    }
  }

  public getStats() {
    return {
      isProcessing: this.isProcessing,
      processedChats: this.processedChats.size
    };
  }
}

export const fixedAutonomousProcessor = new FixedAutonomousProcessor();
/**
 * API Routes para el Sistema Autónomo de Leads y Sales Pipeline
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { 
  contacts, 
  whatsappConversations, 
  whatsappMessages,
  leads,
  activities
} from '../../shared/schema';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import { autonomousProcessor } from '../services/autonomousLeadProcessor';

/**
 * Obtiene todos los contactos con información actualizada en tiempo real
 */
export async function getContacts(req: Request, res: Response) {
  try {
    // Actualizar información en tiempo real antes de mostrar
    await updateContactsRealTime();

    const contactsList = await db.select({
      id: contacts.id,
      name: contacts.name,
      phone: contacts.phone,
      email: contacts.email,
      company: contacts.company,
      lastSeen: contacts.lastSeen,
      source: contacts.source,
      isActive: contacts.isActive,
      createdAt: contacts.createdAt,
      // Agregar estadísticas relacionadas
      totalConversations: sql<number>`(
        SELECT COUNT(*) FROM ${whatsappConversations} 
        WHERE ${whatsappConversations.contactId} = ${contacts.id}
      )`,
      totalMessages: sql<number>`(
        SELECT COUNT(*) FROM ${whatsappMessages} 
        WHERE ${whatsappMessages.contactId} = ${contacts.id}
      )`,
      activeLeads: sql<number>`(
        SELECT COUNT(*) FROM ${leads} 
        WHERE ${leads.contactId} = ${contacts.id} 
        AND ${leads.status} NOT IN ('won', 'lost')
      )`,
      lastActivity: sql<string>`(
        SELECT MAX(${activities.createdAt}) FROM ${activities}
        WHERE ${activities.contactId} = ${contacts.id}
      )`
    })
    .from(contacts)
    .orderBy(desc(contacts.lastSeen))
    .limit(100);

    res.json({
      success: true,
      contacts: contactsList,
      total: contactsList.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo contactos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo contactos',
      error: error.message
    });
  }
}

/**
 * Obtiene leads del sales pipeline con análisis automático
 */
export async function getSalesLeads(req: Request, res: Response) {
  try {
    const { status, stage, priority } = req.query;

    let query = db.select({
      id: leads.id,
      title: leads.title,
      status: leads.status,
      stage: leads.stage,
      value: leads.value,
      currency: leads.currency,
      probability: leads.probability,
      priority: leads.priority,
      source: leads.source,
      assigneeId: leads.assigneeId,
      expectedCloseDate: leads.expectedCloseDate,
      lastContactDate: leads.lastContactDate,
      nextFollowUpDate: leads.nextFollowUpDate,
      notes: leads.notes,
      tags: leads.tags,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      // Información del contacto
      contactName: contacts.name,
      contactPhone: contacts.phone,
      contactEmail: contacts.email,
      contactCompany: contacts.company,
      // Estadísticas adicionales
      totalMessages: sql<number>`(
        SELECT COUNT(*) FROM ${whatsappMessages} 
        WHERE ${whatsappMessages.contactId} = ${leads.contactId}
      )`,
      lastMessageAt: sql<string>`(
        SELECT MAX(${whatsappMessages.timestamp}) FROM ${whatsappMessages}
        WHERE ${whatsappMessages.contactId} = ${leads.contactId}
      )`
    })
    .from(leads)
    .leftJoin(contacts, eq(leads.contactId, contacts.id))
    .orderBy(desc(leads.updatedAt));

    // Aplicar filtros si se proporcionan
    if (status) {
      query = query.where(eq(leads.status, status as string));
    }
    if (stage) {
      query = query.where(eq(leads.stage, stage as string));
    }
    if (priority) {
      query = query.where(eq(leads.priority, priority as string));
    }

    const salesLeads = await query;

    // Calcular métricas del pipeline
    const pipelineMetrics = await calculatePipelineMetrics();

    res.json({
      success: true,
      leads: salesLeads,
      metrics: pipelineMetrics,
      total: salesLeads.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo leads:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo leads',
      error: error.message
    });
  }
}

/**
 * Crea un lead manualmente desde la interfaz
 */
export async function createLead(req: Request, res: Response) {
  try {
    const {
      contactId,
      whatsappAccountId,
      title,
      value,
      currency = 'USD',
      priority = 'medium',
      expectedCloseDate,
      notes,
      tags
    } = req.body;

    // Validar que el contacto existe
    const [contact] = await db.select()
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    const [newLead] = await db.insert(leads)
      .values({
        contactId,
        whatsappAccountId,
        title,
        status: 'new',
        stage: 'lead',
        value: value ? value.toString() : null,
        currency,
        probability: 25, // Probabilidad inicial para leads manuales
        priority,
        source: 'manual',
        lastContactDate: new Date(),
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        notes,
        tags: tags || []
      })
      .returning();

    // Registrar actividad
    await db.insert(activities)
      .values({
        type: 'note',
        contactId,
        leadId: newLead.id,
        title: 'Lead creado manualmente',
        description: `Lead "${title}" creado desde la interfaz`,
        outcome: 'completed',
        isAutomated: false,
        completedAt: new Date()
      });

    res.json({
      success: true,
      lead: newLead,
      message: 'Lead creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando lead:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando lead',
      error: error.message
    });
  }
}

/**
 * Actualiza un lead en el pipeline
 */
export async function updateLead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validar que el lead existe
    const [existingLead] = await db.select()
      .from(leads)
      .where(eq(leads.id, parseInt(id)))
      .limit(1);

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }

    // Actualizar lead
    const [updatedLead] = await db.update(leads)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(leads.id, parseInt(id)))
      .returning();

    // Registrar actividad de actualización
    await db.insert(activities)
      .values({
        type: 'note',
        contactId: existingLead.contactId,
        leadId: parseInt(id),
        title: 'Lead actualizado',
        description: `Lead actualizado: ${Object.keys(updates).join(', ')}`,
        outcome: 'completed',
        isAutomated: false,
        completedAt: new Date()
      });

    res.json({
      success: true,
      lead: updatedLead,
      message: 'Lead actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando lead:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando lead',
      error: error.message
    });
  }
}

/**
 * Obtiene conversaciones con análisis automático de IA
 */
export async function getConversationsWithAnalysis(req: Request, res: Response) {
  try {
    const { contactId, whatsappAccountId } = req.query;

    let query = db.select({
      id: whatsappConversations.id,
      contactId: whatsappConversations.contactId,
      whatsappAccountId: whatsappConversations.whatsappAccountId,
      leadId: whatsappConversations.leadId,
      chatId: whatsappConversations.chatId,
      title: whatsappConversations.title,
      status: whatsappConversations.status,
      lastMessageAt: whatsappConversations.lastMessageAt,
      messageCount: whatsappConversations.messageCount,
      sentiment: whatsappConversations.sentiment,
      intent: whatsappConversations.intent,
      urgency: whatsappConversations.urgency,
      topics: whatsappConversations.topics,
      leadPotential: whatsappConversations.leadPotential,
      createdAt: whatsappConversations.createdAt,
      // Información del contacto
      contactName: contacts.name,
      contactPhone: contacts.phone,
      contactCompany: contacts.company,
      // Última actividad
      lastActivity: sql<string>`(
        SELECT MAX(${activities.createdAt}) FROM ${activities}
        WHERE ${activities.conversationId} = ${whatsappConversations.id}
      )`
    })
    .from(whatsappConversations)
    .leftJoin(contacts, eq(whatsappConversations.contactId, contacts.id))
    .orderBy(desc(whatsappConversations.lastMessageAt));

    // Aplicar filtros
    if (contactId) {
      query = query.where(eq(whatsappConversations.contactId, parseInt(contactId as string)));
    }
    if (whatsappAccountId) {
      query = query.where(eq(whatsappConversations.whatsappAccountId, parseInt(whatsappAccountId as string)));
    }

    const conversations = await query.limit(50);

    res.json({
      success: true,
      conversations,
      total: conversations.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo conversaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo conversaciones',
      error: error.message
    });
  }
}

/**
 * Obtiene métricas del sales pipeline
 */
export async function getPipelineMetrics(req: Request, res: Response) {
  try {
    const metrics = await calculatePipelineMetrics();
    
    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('❌ Error obteniendo métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo métricas',
      error: error.message
    });
  }
}

/**
 * Fuerza el procesamiento automático de mensajes pendientes
 */
export async function processIncomingMessage(req: Request, res: Response) {
  try {
    const messageData = req.body;

    await autonomousProcessor.processIncomingMessage(messageData);

    res.json({
      success: true,
      message: 'Mensaje procesado automáticamente'
    });

  } catch (error) {
    console.error('❌ Error procesando mensaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando mensaje',
      error: error.message
    });
  }
}

/**
 * Genera reporte automático
 */
export async function generateReport(req: Request, res: Response) {
  try {
    const { whatsappAccountId } = req.query;

    await autonomousProcessor.generateDailyReport(
      whatsappAccountId ? parseInt(whatsappAccountId as string) : undefined
    );

    res.json({
      success: true,
      message: 'Reporte generado automáticamente'
    });

  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando reporte',
      error: error.message
    });
  }
}

/**
 * Funciones auxiliares
 */

async function updateContactsRealTime() {
  try {
    // Actualizar timestamp de última vista para contactos activos
    await db.execute(sql`
      UPDATE ${contacts} 
      SET updated_at = NOW() 
      WHERE last_seen > NOW() - INTERVAL '24 hours'
    `);
  } catch (error) {
    console.error('❌ Error actualizando contactos en tiempo real:', error);
  }
}

async function calculatePipelineMetrics() {
  try {
    // Leads por etapa
    const leadsByStage = await db.select({
      stage: leads.stage,
      count: sql<number>`count(*)`
    })
    .from(leads)
    .where(sql`${leads.status} NOT IN ('won', 'lost')`)
    .groupBy(leads.stage);

    // Leads por estado
    const leadsByStatus = await db.select({
      status: leads.status,
      count: sql<number>`count(*)`
    })
    .from(leads)
    .groupBy(leads.status);

    // Valor total del pipeline
    const [pipelineValue] = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(${leads.value} AS DECIMAL)), 0)`
    })
    .from(leads)
    .where(sql`${leads.status} NOT IN ('won', 'lost')`);

    // Conversion rate
    const [conversionStats] = await db.select({
      total: sql<number>`count(*)`,
      won: sql<number>`count(*) FILTER (WHERE ${leads.status} = 'won')`
    })
    .from(leads);

    const conversionRate = conversionStats.total > 0 
      ? (conversionStats.won / conversionStats.total) * 100 
      : 0;

    // Leads creados hoy
    const [todayLeads] = await db.select({
      count: sql<number>`count(*)`
    })
    .from(leads)
    .where(sql`DATE(${leads.createdAt}) = CURRENT_DATE`);

    return {
      leadsByStage,
      leadsByStatus,
      pipelineValue: pipelineValue.total,
      conversionRate: Math.round(conversionRate * 100) / 100,
      leadsToday: todayLeads.count,
      totalActiveLeads: leadsByStage.reduce((acc, stage) => acc + stage.count, 0)
    };

  } catch (error) {
    console.error('❌ Error calculando métricas del pipeline:', error);
    return {
      leadsByStage: [],
      leadsByStatus: [],
      pipelineValue: 0,
      conversionRate: 0,
      leadsToday: 0,
      totalActiveLeads: 0
    };
  }
}
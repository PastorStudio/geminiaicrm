/**
 * API Routes para el sistema de tickets automáticos
 */

import { Router } from 'express';
import { ticketingSystem } from '../services/ticketingSystem';
import { db } from '../db';
import { tickets, agentMetrics, messageActivity, users } from '@shared/schema';
import { eq, desc, and, gte, count, sql } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/tickets - Obtener todos los tickets con filtros
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, assignedTo } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = db
      .select({
        id: tickets.id,
        chatId: tickets.chatId,
        accountId: tickets.accountId,
        customerName: tickets.customerName,
        customerPhone: tickets.customerPhone,
        status: tickets.status,
        priority: tickets.priority,
        lastMessage: tickets.lastMessage,
        totalMessages: tickets.totalMessages,
        answeredMessages: tickets.answeredMessages,
        unreadMessages: tickets.unreadMessages,
        createdAt: tickets.createdAt,
        lastActivityAt: tickets.lastActivityAt,
        closedAt: tickets.closedAt,
        notes: tickets.notes,
        tags: tickets.tags,
        agentName: users.fullName,
        agentUsername: users.username
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .orderBy(desc(tickets.lastActivityAt))
      .limit(limitNum)
      .offset(offset);

    // Aplicar filtros si se proporcionan
    if (status) {
      baseQuery = baseQuery.where(eq(tickets.status, status as string));
    }
    if (assignedTo) {
      baseQuery = baseQuery.where(eq(tickets.assignedToId, parseInt(assignedTo as string)));
    }

    const allTickets = await baseQuery;

    res.json({
      tickets: allTickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: allTickets.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo tickets:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
});

/**
 * GET /api/tickets/stats - Obtener estadísticas de tickets
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await ticketingSystem.getTicketStats();
    
    // Estadísticas adicionales
    const totalTickets = await db.select({ count: count() }).from(tickets);
    const activeTickets = await db.select({ count: count() }).from(tickets)
      .where(sql`${tickets.status} NOT IN ('completado', 'no_interesado')`);
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const ticketsToday = await db.select({ count: count() }).from(tickets)
      .where(gte(tickets.createdAt, todayStart));

    res.json({
      byStatus: stats,
      totals: {
        total: totalTickets[0]?.count || 0,
        active: activeTickets[0]?.count || 0,
        today: ticketsToday[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de tickets:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

/**
 * GET /api/tickets/:id - Obtener ticket específico
 */
router.get('/:id', async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    
    const [ticket] = await db
      .select({
        ticket: tickets,
        agentName: users.fullName,
        agentUsername: users.username
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .where(eq(tickets.id, ticketId));

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // Obtener actividad de mensajes del ticket
    const messages = await db
      .select()
      .from(messageActivity)
      .where(eq(messageActivity.ticketId, ticketId))
      .orderBy(desc(messageActivity.sentAt));

    res.json({
      ...ticket.ticket,
      agentName: ticket.agentName,
      agentUsername: ticket.agentUsername,
      messages
    });
  } catch (error) {
    console.error('Error obteniendo ticket:', error);
    res.status(500).json({ error: 'Error al obtener ticket' });
  }
});

/**
 * PUT /api/tickets/:id - Actualizar ticket
 */
router.put('/:id', async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { status, priority, assignedToId, notes, tags } = req.body;

    const updates: any = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assignedToId !== undefined) updates.assignedToId = assignedToId;
    if (notes) updates.notes = notes;
    if (tags) updates.tags = tags;

    // Si se está completando el ticket, agregar fecha de cierre
    if (status === 'completado') {
      updates.closedAt = new Date();
    }

    await db.update(tickets)
      .set(updates)
      .where(eq(tickets.id, ticketId));

    res.json({ success: true, message: 'Ticket actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando ticket:', error);
    res.status(500).json({ error: 'Error al actualizar ticket' });
  }
});

/**
 * POST /api/tickets/:id/assign - Asignar ticket a agente
 */
router.post('/:id/assign', async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { agentId } = req.body;

    await db.update(tickets)
      .set({ 
        assignedToId: agentId,
        lastActivityAt: new Date()
      })
      .where(eq(tickets.id, ticketId));

    res.json({ success: true, message: 'Ticket asignado correctamente' });
  } catch (error) {
    console.error('Error asignando ticket:', error);
    res.status(500).json({ error: 'Error al asignar ticket' });
  }
});

/**
 * POST /api/tickets/:id/read - Marcar mensajes como leídos
 */
router.post('/:id/read', async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    
    // Obtener el chatId del ticket
    const [ticket] = await db
      .select({ chatId: tickets.chatId })
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    await ticketingSystem.markMessagesAsRead(ticket.chatId);

    res.json({ success: true, message: 'Mensajes marcados como leídos' });
  } catch (error) {
    console.error('Error marcando mensajes como leídos:', error);
    res.status(500).json({ error: 'Error al marcar mensajes como leídos' });
  }
});

/**
 * GET /api/tickets/agent/:agentId/metrics - Obtener métricas de un agente
 */
router.get('/agent/:agentId/metrics', async (req, res) => {
  try {
    const agentId = parseInt(req.params.agentId);
    
    const [metrics] = await db
      .select()
      .from(agentMetrics)
      .where(eq(agentMetrics.userId, agentId));

    if (!metrics) {
      return res.json({
        totalMessagesSent: 0,
        totalMessagesReceived: 0,
        averageResponseTime: 0,
        activeTickets: 0,
        completedTickets: 0,
        ticketsSolvedToday: 0,
        conversionsThisMonth: 0,
        totalConversions: 0,
        averageRating: 0
      });
    }

    res.json(metrics);
  } catch (error) {
    console.error('Error obteniendo métricas del agente:', error);
    res.status(500).json({ error: 'Error al obtener métricas del agente' });
  }
});

/**
 * GET /api/tickets/dashboard - Dashboard con métricas generales
 */
router.get('/dashboard/overview', async (req, res) => {
  try {
    // Estadísticas de tickets
    const ticketStats = await ticketingSystem.getTicketStats();
    
    // Agentes más activos
    const topAgents = await db
      .select({
        userId: agentMetrics.userId,
        fullName: users.fullName,
        activeTickets: agentMetrics.activeTickets,
        completedTickets: agentMetrics.completedTickets,
        totalMessagesSent: agentMetrics.totalMessagesSent
      })
      .from(agentMetrics)
      .innerJoin(users, eq(agentMetrics.userId, users.id))
      .orderBy(desc(agentMetrics.completedTickets))
      .limit(5);

    // Actividad reciente
    const recentActivity = await db
      .select({
        id: tickets.id,
        customerName: tickets.customerName,
        status: tickets.status,
        lastActivityAt: tickets.lastActivityAt,
        agentName: users.fullName
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .orderBy(desc(tickets.lastActivityAt))
      .limit(10);

    res.json({
      ticketStats,
      topAgents,
      recentActivity
    });
  } catch (error) {
    console.error('Error obteniendo dashboard:', error);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
});

export default router;
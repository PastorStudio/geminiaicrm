import { Request, Response } from 'express';
import { db } from '../db';
import { users, whatsappMessages, agentActivity, whatsappAccounts } from '../../shared/schema';
import { eq, sql, and, gte } from 'drizzle-orm';

export async function getAdminMetrics(req: Request, res: Response) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Métricas de mensajes
    const [messageStats] = await db
      .select({
        totalReceived: sql<number>`COUNT(*) FILTER (WHERE direction = 'incoming')`,
        totalSent: sql<number>`COUNT(*) FILTER (WHERE direction = 'outgoing')`,
        sentByAI: sql<number>`COUNT(*) FILTER (WHERE direction = 'outgoing' AND sent_by_ai = true)`,
        sentByHuman: sql<number>`COUNT(*) FILTER (WHERE direction = 'outgoing' AND sent_by_ai = false)`
      })
      .from(whatsappMessages);

    // Agentes activos
    const activeAgents = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        status: users.status,
        lastActive: agentActivity.timestamp
      })
      .from(users)
      .leftJoin(agentActivity, eq(users.id, agentActivity.agentId))
      .where(eq(users.role, 'agent'));

    // Métricas por agente
    const agentMetrics = await db
      .select({
        agentId: agentActivity.agentId,
        agentName: users.fullName,
        messageCount: sql<number>`COUNT(*)`,
        lastActivity: sql<Date>`MAX(${agentActivity.timestamp})`
      })
      .from(agentActivity)
      .leftJoin(users, eq(agentActivity.agentId, users.id))
      .where(gte(agentActivity.timestamp, thirtyDaysAgo))
      .groupBy(agentActivity.agentId, users.fullName);

    // Cuentas WhatsApp activas
    const [whatsappStats] = await db
      .select({
        totalAccounts: sql<number>`COUNT(*)`,
        activeAccounts: sql<number>`COUNT(*) FILTER (WHERE status = 'active')`,
        authenticatedAccounts: sql<number>`COUNT(*) FILTER (WHERE status = 'authenticated')`
      })
      .from(whatsappAccounts);

    res.json({
      success: true,
      data: {
        messages: {
          totalReceived: messageStats?.totalReceived || 0,
          totalSent: messageStats?.totalSent || 0,
          sentByAI: messageStats?.sentByAI || 0,
          sentByHuman: messageStats?.sentByHuman || 0
        },
        agents: {
          total: activeAgents.length,
          active: activeAgents.filter(a => a.status === 'active').length,
          metrics: agentMetrics
        },
        whatsapp: {
          totalAccounts: whatsappStats?.totalAccounts || 0,
          activeAccounts: whatsappStats?.activeAccounts || 0,
          authenticatedAccounts: whatsappStats?.authenticatedAccounts || 0
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo métricas admin:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener métricas administrativas'
    });
  }
}

export async function getAgentPerformance(req: Request, res: Response) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Performance por agente con tickets y leads
    const agentPerformance = await db
      .select({
        agentId: users.id,
        agentName: users.fullName,
        department: users.department,
        totalActivities: sql<number>`COUNT(${agentActivity.id})`,
        leadsAssigned: sql<number>`0`, // Se actualizará con query separado
        ticketsAssigned: sql<number>`0`, // Se actualizará con query separado
        lastActivity: sql<Date>`MAX(${agentActivity.timestamp})`
      })
      .from(users)
      .leftJoin(agentActivity, eq(users.id, agentActivity.agentId))
      .where(and(
        eq(users.role, 'agent'),
        gte(agentActivity.timestamp, thirtyDaysAgo)
      ))
      .groupBy(users.id, users.fullName, users.department);

    res.json({
      success: true,
      data: agentPerformance
    });

  } catch (error) {
    console.error('Error obteniendo performance de agentes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener performance de agentes'
    });
  }
}

export async function getSystemHealth(req: Request, res: Response) {
  try {
    // Verificar estado del sistema
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours() - 1);

    const [recentActivity] = await db
      .select({
        activityCount: sql<number>`COUNT(*)`
      })
      .from(agentActivity)
      .where(gte(agentActivity.timestamp, lastHour));

    const [messageActivity] = await db
      .select({
        messageCount: sql<number>`COUNT(*)`
      })
      .from(whatsappMessages)
      .where(gte(whatsappMessages.timestamp, lastHour));

    res.json({
      success: true,
      data: {
        systemStatus: 'healthy',
        lastHourActivity: recentActivity?.activityCount || 0,
        lastHourMessages: messageActivity?.messageCount || 0,
        uptime: process.uptime(),
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error obteniendo salud del sistema:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estado del sistema'
    });
  }
}
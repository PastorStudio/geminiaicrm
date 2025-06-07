import { Request, Response } from 'express';
import { agentAssignmentService } from '../services/agentAssignmentService';

/**
 * Rutas API para el sistema de asignaciones de agentes invisible
 */

// Asignar chat a agente específico
export async function assignChatToAgent(req: Request, res: Response) {
  try {
    const { chatId, accountId, assignedToId, category, notes } = req.body;
    const assignedById = req.user?.id;

    if (!chatId || !accountId || !assignedToId) {
      return res.status(400).json({
        success: false,
        message: 'chatId, accountId y assignedToId son requeridos'
      });
    }

    const assignment = await agentAssignmentService.assignChatToAgent(
      chatId,
      accountId,
      assignedToId,
      assignedById,
      { category, notes }
    );

    if (!assignment) {
      return res.status(500).json({
        success: false,
        message: 'Error al asignar chat al agente'
      });
    }

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Error en assignChatToAgent:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Obtener asignación actual de un chat
export async function getChatAssignment(req: Request, res: Response) {
  try {
    const { chatId, accountId } = req.query;

    if (!chatId || !accountId) {
      return res.status(400).json({
        success: false,
        message: 'chatId y accountId son requeridos'
      });
    }

    const assignment = await agentAssignmentService.getChatAssignment(
      chatId as string,
      parseInt(accountId as string)
    );

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Error en getChatAssignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Auto-asignar chat basado en carga de trabajo
export async function autoAssignChat(req: Request, res: Response) {
  try {
    const { chatId, accountId, category } = req.body;

    if (!chatId || !accountId) {
      return res.status(400).json({
        success: false,
        message: 'chatId y accountId son requeridos'
      });
    }

    const assignment = await agentAssignmentService.autoAssignChat(
      chatId,
      accountId,
      category
    );

    if (!assignment) {
      return res.json({
        success: false,
        message: 'No hay agentes disponibles para auto-asignación'
      });
    }

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Error en autoAssignChat:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Obtener carga de trabajo de todos los agentes
export async function getAgentWorkloads(req: Request, res: Response) {
  try {
    const workloads = await agentAssignmentService.getAgentWorkloads();

    res.json({
      success: true,
      workloads
    });
  } catch (error) {
    console.error('Error en getAgentWorkloads:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Cerrar asignación de chat
export async function closeChatAssignment(req: Request, res: Response) {
  try {
    const { chatId, accountId, notes } = req.body;

    if (!chatId || !accountId) {
      return res.status(400).json({
        success: false,
        message: 'chatId y accountId son requeridos'
      });
    }

    const success = await agentAssignmentService.closeChatAssignment(
      chatId,
      accountId,
      notes
    );

    res.json({
      success,
      message: success ? 'Chat cerrado exitosamente' : 'Error al cerrar chat'
    });
  } catch (error) {
    console.error('Error en closeChatAssignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Actualizar actividad del chat
export async function updateChatActivity(req: Request, res: Response) {
  try {
    const { chatId, accountId } = req.body;

    if (!chatId || !accountId) {
      return res.status(400).json({
        success: false,
        message: 'chatId y accountId son requeridos'
      });
    }

    await agentAssignmentService.updateChatActivity(chatId, accountId);

    res.json({
      success: true,
      message: 'Actividad actualizada'
    });
  } catch (error) {
    console.error('Error en updateChatActivity:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Obtener estadísticas de agentes
export async function getAgentStats(req: Request, res: Response) {
  try {
    const stats = await agentAssignmentService.getAgentStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error en getAgentStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
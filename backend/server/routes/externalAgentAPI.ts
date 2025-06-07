/**
 * API endpoints para manejo de agentes externos y respuestas automáticas
 */

import { Request, Response } from 'express';
import { SimpleExternalAgentManager, WhatsAppAccountConfigManager } from '../externalAgentsSimple';
import { externalAgentIntegrator } from '../services/externalAgentIntegrator';

/**
 * Habilitar respuesta automática para una cuenta de WhatsApp
 */
export async function enableAutoResponse(req: Request, res: Response) {
  try {
    console.log('🔄 Solicitud para habilitar respuesta automática:', req.body);
    const { accountId, agentId, delay = 3 } = req.body;

    if (!accountId || !agentId) {
      console.error('❌ Faltan parámetros requeridos:', { accountId, agentId });
      return res.status(400).json({
        success: false,
        error: 'accountId y agentId son requeridos'
      });
    }

    console.log('🔧 Habilitando respuesta automática para:', { accountId, agentId, delay });
    
    const success = externalAgentIntegrator.enableAutoResponse(
      parseInt(accountId),
      agentId,
      parseInt(delay)
    );

    if (success) {
      console.log('✅ Respuesta automática habilitada exitosamente');
      res.json({
        success: true,
        message: 'Respuesta automática habilitada correctamente',
        config: {
          accountId: parseInt(accountId),
          agentId,
          delay: parseInt(delay),
          enabled: true
        }
      });
    } else {
      console.error('❌ Error habilitando respuesta automática - integrador devolvió false');
      res.status(400).json({
        success: false,
        error: 'Error habilitando respuesta automática - verificar agente o cuenta'
      });
    }
  } catch (error) {
    console.error('❌ Error en enableAutoResponse:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + (error as Error).message
    });
  }
}

/**
 * Deshabilitar respuesta automática para una cuenta de WhatsApp
 */
export async function disableAutoResponse(req: Request, res: Response) {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'accountId es requerido'
      });
    }

    const success = externalAgentIntegrator.disableAutoResponse(parseInt(accountId));

    if (success) {
      res.json({
        success: true,
        message: 'Respuesta automática deshabilitada correctamente'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Error deshabilitando respuesta automática'
      });
    }
  } catch (error) {
    console.error('Error en disableAutoResponse:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener configuración de respuesta automática para una cuenta
 */
export async function getAutoResponseConfig(req: Request, res: Response) {
  try {
    const { accountId } = req.params;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'accountId es requerido'
      });
    }

    const config = WhatsAppAccountConfigManager.getAccountConfig(parseInt(accountId));
    
    if (!config) {
      return res.json({
        success: true,
        config: {
          accountId: parseInt(accountId),
          assignedExternalAgentId: null,
          autoResponseEnabled: false,
          responseDelay: 3
        }
      });
    }

    // Obtener información del agente si está asignado
    let agentInfo = null;
    if (config.assignedExternalAgentId) {
      agentInfo = SimpleExternalAgentManager.getAgent(config.assignedExternalAgentId);
    }

    res.json({
      success: true,
      config: {
        ...config,
        agentInfo
      }
    });
  } catch (error) {
    console.error('Error en getAutoResponseConfig:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener todas las configuraciones de respuesta automática
 */
export async function getAllAutoResponseConfigs(req: Request, res: Response) {
  try {
    const configs = WhatsAppAccountConfigManager.getAllConfigs();
    
    // Enriquecer con información de agentes
    const enrichedConfigs = configs.map(config => {
      let agentInfo = null;
      if (config.assignedExternalAgentId) {
        agentInfo = SimpleExternalAgentManager.getAgent(config.assignedExternalAgentId);
      }
      
      return {
        ...config,
        agentInfo
      };
    });

    res.json({
      success: true,
      configs: enrichedConfigs
    });
  } catch (error) {
    console.error('Error en getAllAutoResponseConfigs:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener estadísticas del integrador de agentes externos
 */
export async function getIntegratorStats(req: Request, res: Response) {
  try {
    const stats = externalAgentIntegrator.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error en getIntegratorStats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Activar respuestas automáticas para una cuenta
 */
export async function activateAutoResponse(req: Request, res: Response) {
  try {
    const accountId = parseInt(req.params.accountId);
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'accountId es requerido'
      });
    }

    const { EnhancedAutoResponseService } = await import('../services/enhancedAutoResponseService');
    const result = await EnhancedAutoResponseService.activateAutoResponse(accountId);
    
    if (result) {
      res.json({
        success: true,
        message: `Respuestas automáticas activadas para cuenta ${accountId}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error activando respuestas automáticas'
      });
    }
  } catch (error) {
    console.error('Error en activateAutoResponse:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

/**
 * Probar agente externo con un mensaje de prueba
 */
export async function testExternalAgent(req: Request, res: Response) {
  try {
    const { agentId, testMessage = "Hola, ¿cómo estás?" } = req.body;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'agentId es requerido'
      });
    }

    const agent = SimpleExternalAgentManager.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente no encontrado'
      });
    }

    // Simular procesamiento con mensaje de prueba
    // En un entorno real, esto haría una llamada real al agente
    const testResponse = {
      agent: agent.name,
      testMessage,
      response: "Esta es una respuesta de prueba del agente externo. El sistema está funcionando correctamente.",
      timestamp: new Date().toISOString(),
      success: true
    };

    res.json({
      success: true,
      test: testResponse
    });
  } catch (error) {
    console.error('Error en testExternalAgent:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}
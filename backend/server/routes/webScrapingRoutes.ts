/**
 * Rutas para el sistema de web scraping de agentes externos
 */

import { Router } from 'express';
import WebScrapingAutoResponseService from '../services/webScrapingAutoResponse';
import { seleniumIntegration } from '../services/seleniumIntegrationService';
import { SimpleExternalAgentManager } from '../services/externalAgentsSimple';

const router = Router();

// Obtener estado del servicio de web scraping
router.get('/status', async (req, res) => {
  try {
    const stats = WebScrapingAutoResponseService.getServiceStats();
    const systemAvailable = await WebScrapingAutoResponseService.checkSystemAvailability();
    
    res.json({
      success: true,
      data: {
        ...stats,
        systemAvailable,
        pythonAvailable: await seleniumIntegration.isAvailable()
      }
    });
  } catch (error) {
    console.error('Error obteniendo estado del web scraping:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Activar servicio de web scraping
router.post('/enable', async (req, res) => {
  try {
    const systemAvailable = await WebScrapingAutoResponseService.checkSystemAvailability();
    
    if (!systemAvailable) {
      return res.status(400).json({
        success: false,
        error: 'Sistema no disponible. Verifique que Python/Selenium esté instalado y que haya agentes activos.'
      });
    }
    
    WebScrapingAutoResponseService.enable();
    
    res.json({
      success: true,
      message: 'Servicio de web scraping activado correctamente'
    });
  } catch (error) {
    console.error('Error activando web scraping:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Desactivar servicio de web scraping
router.post('/disable', async (req, res) => {
  try {
    WebScrapingAutoResponseService.disable();
    
    res.json({
      success: true,
      message: 'Servicio de web scraping desactivado correctamente'
    });
  } catch (error) {
    console.error('Error desactivando web scraping:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Probar respuesta de agente específico
router.post('/test-agent', async (req, res) => {
  try {
    const { agentId, message } = req.body;
    
    if (!agentId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren agentId y message'
      });
    }
    
    const agent = SimpleExternalAgentManager.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente no encontrado'
      });
    }
    
    console.log(`🧪 Probando agente ${agent.name} con mensaje: "${message}"`);
    
    const result = await seleniumIntegration.getAgentResponseWithRetry(
      agent.agentUrl,
      message,
      agentId,
      1 // solo 1 intento para pruebas
    );
    
    res.json({
      success: true,
      data: {
        agentName: agent.name,
        agentUrl: agent.agentUrl,
        testMessage: message,
        ...result
      }
    });
    
  } catch (error) {
    console.error('Error probando agente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Generar respuesta automática de prueba
router.post('/test-response', async (req, res) => {
  try {
    const { message, fromNumber, agentId } = req.body;
    
    if (!message || !fromNumber) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren message y fromNumber'
      });
    }
    
    console.log(`🧪 Generando respuesta automática de prueba para: ${fromNumber}`);
    
    const result = await WebScrapingAutoResponseService.generateAutoResponse(
      message,
      fromNumber,
      agentId
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error generando respuesta de prueba:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener configuración y estadísticas de agentes
router.get('/agents', async (req, res) => {
  try {
    const agents = SimpleExternalAgentManager.getAllAgents();
    
    const agentsWithStats = agents.map(agent => ({
      ...agent,
      isWebScrapingCompatible: agent.agentUrl.includes('chatgpt.com') || 
                              agent.agentUrl.includes('claude.ai') ||
                              agent.agentUrl.includes('gemini.google.com')
    }));
    
    res.json({
      success: true,
      data: agentsWithStats
    });
  } catch (error) {
    console.error('Error obteniendo agentes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;
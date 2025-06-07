/**
 * API para el sistema autónomo de procesamiento
 */

import { Router, Request, Response } from 'express';
import { simpleAutonomousProcessor } from '../services/simpleAutonomousProcessor';

const router = Router();

// Forzar procesamiento de todos los chats
router.post('/process-all', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Iniciando procesamiento forzado de todos los chats...');
    
    const result = await simpleAutonomousProcessor.forceProcessAllChats();
    
    res.json({
      success: true,
      message: 'Procesamiento automático completado',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en procesamiento forzado:', error);
    res.status(500).json({
      success: false,
      error: 'Error en procesamiento automático'
    });
  }
});

// Obtener estadísticas del sistema autónomo
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = simpleAutonomousProcessor.getStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
});

// Webhook para detección automática de nuevas conexiones
router.post('/connection-detected', async (req: Request, res: Response) => {
  try {
    console.log('📱 Nueva conexión detectada, procesando chats...');
    
    // Esperar 5 segundos para que la conexión se estabilice
    setTimeout(async () => {
      await realTimeAutonomousProcessor.forceProcessAllChats();
    }, 5000);
    
    res.json({
      success: true,
      message: 'Procesamiento programado tras nueva conexión'
    });
  } catch (error) {
    console.error('Error en webhook de conexión:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando nueva conexión'
    });
  }
});

export default router;
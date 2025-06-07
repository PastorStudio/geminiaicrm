/**
 * Rutas para el servicio de WhatsApp
 */

import { Router, Request, Response } from 'express';
import whatsappService from '../services/simplified-whatsappService';

const router = Router();

// Middleware para verificar que el servicio esté inicializado
const checkService = (req: Request, res: Response, next: Function) => {
  try {
    // Para desarrollo, siempre permitimos las peticiones
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    
    // Verificar estado del servicio
    const status = whatsappService.getStatus();
    if (!status.authenticated && req.path !== '/initialize' && req.path !== '/status') {
      return res.status(401).json({
        error: 'Servicio no autenticado',
        message: 'Debe inicializar el servicio primero'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en middleware checkService:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al verificar el estado del servicio'
    });
  }
};

// Inicializar el servicio
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    await whatsappService.initialize();
    res.json({
      message: 'Servicio de WhatsApp inicializado correctamente',
      status: whatsappService.getStatus()
    });
  } catch (error) {
    console.error('Error al inicializar el servicio:', error);
    res.status(500).json({
      error: 'Error al inicializar',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Obtener estado del servicio
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = whatsappService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error al obtener estado:', error);
    res.status(500).json({
      error: 'Error al obtener estado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Reiniciar el servicio
router.post('/restart', checkService, async (req: Request, res: Response) => {
  try {
    await whatsappService.restart();
    res.json({
      message: 'Servicio de WhatsApp reiniciado correctamente',
      status: whatsappService.getStatus()
    });
  } catch (error) {
    console.error('Error al reiniciar el servicio:', error);
    res.status(500).json({
      error: 'Error al reiniciar',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Cerrar sesión
router.post('/logout', checkService, async (req: Request, res: Response) => {
  try {
    await whatsappService.logout();
    res.json({
      message: 'Sesión cerrada correctamente',
      status: whatsappService.getStatus()
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({
      error: 'Error al cerrar sesión',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Enviar mensaje
router.post('/send', checkService, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        error: 'Parámetros incompletos',
        message: 'Debe proporcionar phoneNumber y message'
      });
    }
    
    const result = await whatsappService.sendMessage(phoneNumber, message);
    res.json({
      message: 'Mensaje enviado correctamente',
      result
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({
      error: 'Error al enviar mensaje',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Obtener contactos
router.get('/contacts', checkService, async (req: Request, res: Response) => {
  try {
    const contacts = await whatsappService.getContacts();
    res.json(contacts);
  } catch (error) {
    console.error('Error al obtener contactos:', error);
    res.status(500).json({
      error: 'Error al obtener contactos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Obtener chats
router.get('/chats', checkService, async (req: Request, res: Response) => {
  try {
    const chats = await whatsappService.getChats();
    res.json(chats);
  } catch (error) {
    console.error('Error al obtener chats:', error);
    res.status(500).json({
      error: 'Error al obtener chats',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Obtener mensajes de un chat
router.get('/messages/:chatId', checkService, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    const messages = await whatsappService.getMessages(chatId, limit);
    res.json(messages);
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({
      error: 'Error al obtener mensajes',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Marcar chat como leído
router.post('/read/:chatId', checkService, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    
    const result = await whatsappService.markChatAsRead(chatId);
    res.json({
      success: result,
      message: result ? 'Chat marcado como leído' : 'No se pudo marcar el chat como leído'
    });
  } catch (error) {
    console.error('Error al marcar chat como leído:', error);
    res.status(500).json({
      error: 'Error al marcar chat como leído',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Obtener etiquetas personalizadas
router.get('/tags', checkService, async (req: Request, res: Response) => {
  try {
    const tags = await whatsappService.getCustomTags();
    res.json(tags);
  } catch (error) {
    console.error('Error al obtener etiquetas:', error);
    res.status(500).json({
      error: 'Error al obtener etiquetas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Guardar etiqueta personalizada
router.post('/tags', checkService, async (req: Request, res: Response) => {
  try {
    const tag = req.body;
    
    if (!tag) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Debe proporcionar los datos de la etiqueta'
      });
    }
    
    const result = await whatsappService.saveCustomTag(tag);
    res.json(result);
  } catch (error) {
    console.error('Error al guardar etiqueta:', error);
    res.status(500).json({
      error: 'Error al guardar etiqueta',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
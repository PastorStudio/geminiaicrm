import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

// Obtener comentarios de un chat
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const comments = await storage.getChatComments(chatId);
    res.json(comments);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// Agregar comentario a un chat - VERSIÓN CORREGIDA
router.post('/', async (req, res) => {
  try {
    const { chatId, text, comment, userId = 1 } = req.body;
    const commentText = text || comment;
    
    console.log('💬 CREANDO COMENTARIO CORREGIDO:', { chatId, commentText, userId, fullBody: req.body });

    if (!chatId || !commentText) {
      return res.status(400).json({ 
        error: 'Datos requeridos faltantes',
        details: { chatId: !!chatId, text: !!commentText },
        received: req.body
      });
    }

    // Usar el storage que SÍ funciona
    try {
      const newComment = await storage.createChatComment({ 
        chatId, 
        text: commentText,
        userId: parseInt(userId)
      });
      
      console.log('✅ COMENTARIO CREADO EXITOSAMENTE:', newComment);
      res.json(newComment);
    } catch (storageError) {
      console.error('❌ Error en storage:', storageError);
      res.status(500).json({ error: 'Error en almacenamiento: ' + (storageError as Error).message });
    }
  } catch (error) {
    console.error('❌ Error general creando comentario:', error);
    res.status(500).json({ error: 'Error al agregar comentario: ' + (error as Error).message });
  }
});

export { router };
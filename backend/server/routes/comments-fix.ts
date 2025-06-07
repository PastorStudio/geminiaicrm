import { Router } from 'express';
import { db } from '../db';
import { chatComments, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Obtener comentarios de un chat
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log('💬 Obteniendo comentarios para chat:', chatId);
    
    const comments = await db
      .select({
        id: chatComments.id,
        chatId: chatComments.chatId,
        comment: chatComments.comment,
        userId: chatComments.userId,
        createdAt: chatComments.createdAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          username: users.username,
          role: users.role,
          avatar: users.avatar
        }
      })
      .from(chatComments)
      .leftJoin(users, eq(chatComments.userId, users.id))
      .where(eq(chatComments.chatId, chatId))
      .orderBy(chatComments.createdAt);

    console.log('✅ Comentarios encontrados:', comments.length);
    res.json(comments);
  } catch (error) {
    console.error('❌ Error al obtener comentarios:', error);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// Crear nuevo comentario
router.post('/', async (req, res) => {
  try {
    console.log('💬 Datos recibidos para comentario:', req.body);
    const { chatId, comment, userId = 1 } = req.body;
    
    if (!chatId || !comment) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos',
        required: { chatId: !!chatId, comment: !!comment }
      });
    }

    const [newComment] = await db
      .insert(chatComments)
      .values({
        chatId,
        comment,
        userId: parseInt(userId),
      })
      .returning();

    // Obtener el comentario con información del usuario
    const [commentWithUser] = await db
      .select({
        id: chatComments.id,
        chatId: chatComments.chatId,
        comment: chatComments.comment,
        userId: chatComments.userId,
        createdAt: chatComments.createdAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          username: users.username,
          role: users.role,
          avatar: users.avatar
        }
      })
      .from(chatComments)
      .leftJoin(users, eq(chatComments.userId, users.id))
      .where(eq(chatComments.id, newComment.id));

    console.log('✅ Comentario creado exitosamente:', commentWithUser);
    res.json(commentWithUser);
  } catch (error) {
    console.error('❌ Error al crear comentario:', error);
    res.status(500).json({ error: 'Error al crear comentario: ' + error.message });
  }
});

export default router;
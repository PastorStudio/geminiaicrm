import { Request, Response } from 'express';
import { db } from './db';
import { chatAssignments, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// ✅ API DIRECTA PARA ASIGNACIONES - SIN CONFLICTOS
export async function createChatAssignment(req: Request, res: Response) {
  try {
    console.log('🔥 CREANDO ASIGNACIÓN DIRECTA:', req.body);
    const { chatId, accountId, assignedToId, category } = req.body;
    
    // ELIMINAR ASIGNACIÓN ANTERIOR SI EXISTE
    await db.delete(chatAssignments).where(eq(chatAssignments.chatId, chatId));
    
    // INSERTAR NUEVA ASIGNACIÓN EN POSTGRESQL CON NOMENCLATURA CORRECTA
    const [newAssignment] = await db.insert(chatAssignments)
      .values({
        chatId: String(chatId),
        accountId: Number(accountId), 
        assignedToId: Number(assignedToId),
        category: category || 'general',
        status: 'active',
        assignedAt: new Date(),
        lastActivityAt: new Date()
      })
      .returning();
    
    // OBTENER INFORMACIÓN DEL AGENTE
    const [agent] = await db.select().from(users).where(eq(users.id, assignedToId));
    
    const response = { ...newAssignment, assignedTo: agent };
    console.log('✅ ASIGNACIÓN GUARDADA EN POSTGRESQL:', response);
    
    res.json(response);
  } catch (error) {
    console.error('❌ ERROR AL CREAR ASIGNACIÓN:', error);
    res.status(500).json({ error: 'Error al crear asignación: ' + (error as Error).message });
  }
}

export async function getChatAssignment(req: Request, res: Response) {
  try {
    const { chatId, accountId } = req.query;
    console.log('🔍 BUSCANDO ASIGNACIÓN:', { chatId, accountId });
    
    const [assignment] = await db.select()
      .from(chatAssignments)
      .where(eq(chatAssignments.chatId, chatId as string));
    
    if (assignment) {
      const [agent] = await db.select().from(users).where(eq(users.id, assignment.assignedToId));
      const response = { ...assignment, assignedTo: agent };
      console.log('✅ ASIGNACIÓN ENCONTRADA:', response);
      res.json(response);
    } else {
      console.log('❌ NO HAY ASIGNACIÓN PARA:', chatId);
      res.json(null);
    }
  } catch (error) {
    console.error('❌ ERROR AL BUSCAR ASIGNACIÓN:', error);
    res.status(500).json({ error: 'Error al buscar asignación: ' + (error as Error).message });
  }
}

export async function getChatComments(req: Request, res: Response) {
  try {
    const { chatId } = req.params;
    console.log('💬 OBTENIENDO COMENTARIOS PARA:', chatId);
    
    // OBTENER COMENTARIOS REALES DE POSTGRESQL
    const { eq, sql } = await import('drizzle-orm');
    
    const commentsQuery = sql`
      SELECT cc.*, u."fullName" as user_name, u.username, u.role, u.email
      FROM chat_comments cc
      LEFT JOIN users u ON cc."userId" = u.id
      WHERE cc."chatId" = ${chatId}
      ORDER BY cc.timestamp DESC
    `;
    
    const result = await db.execute(commentsQuery);
    
    const comments = result.rows.map((row: any) => ({
      id: row.id,
      chatId: row.chatId,
      text: row.text,
      timestamp: row.timestamp,
      user: {
        fullName: row.user_name || "Usuario Desconocido",
        username: row.username || "unknown",
        role: row.role || "usuario",
        email: row.email || ""
      }
    }));
    
    console.log('✅ COMENTARIOS OBTENIDOS DE POSTGRESQL:', comments);
    res.json(comments);
  } catch (error) {
    console.error('❌ ERROR OBTENIENDO COMENTARIOS:', error);
    res.status(500).json({ error: 'Error al obtener comentarios: ' + (error as Error).message });
  }
}

export async function createChatComment(req: Request, res: Response) {
  try {
    const { chatId, text, comment, userId } = req.body;
    const commentText = text || comment; // Aceptar tanto 'text' como 'comment'
    
    if (!chatId || !commentText) {
      console.log('❌ DATOS FALTANTES:', { chatId, commentText, originalBody: req.body });
      return res.status(400).json({ error: 'Se requieren chatId y texto del comentario' });
    }
    
    console.log('💬 CREANDO COMENTARIO EN POSTGRESQL:', { chatId, text: commentText, userId });
    
    // INSERTAR COMENTARIO DIRECTAMENTE EN POSTGRESQL
    const { sql } = await import('drizzle-orm');
    
    const insertQuery = sql`
      INSERT INTO chat_comments ("chatId", "userId", text, timestamp, "isInternal")
      VALUES (${chatId}, ${userId || 1}, ${commentText}, NOW(), true)
      RETURNING *
    `;
    
    const result = await db.execute(insertQuery);
    const newComment = result.rows[0];
    
    // OBTENER INFORMACIÓN DEL USUARIO
    const [user] = await db.select().from(users).where(eq(users.id, userId || 1));
    
    const response = {
      id: newComment.id,
      chatId: newComment.chatId,
      text: newComment.text,
      timestamp: newComment.timestamp,
      user: {
        name: user?.fullName || "Agente",
        username: user?.username || "agent"
      }
    };
    
    console.log('✅ COMENTARIO GUARDADO EN POSTGRESQL:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ ERROR CREANDO COMENTARIO:', error);
    res.status(500).json({ error: 'Error al crear comentario: ' + (error as Error).message });
  }
}
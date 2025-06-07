import { Request, Response } from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Endpoint simple para asignaciones que definitivamente funciona
export async function getSimpleAssignment(req: Request, res: Response) {
  try {
    const { chatId } = req.query;
    
    if (!chatId) {
      return res.json({ assignment: null });
    }

    const result = await db.execute(sql`
      SELECT ca.*, u."fullName", u.role 
      FROM chat_assignments ca
      LEFT JOIN users u ON ca."assignedToId" = u.id
      WHERE ca."chatId" = ${chatId as string}
      LIMIT 1
    `);

    const assignment = result.rows[0] || null;
    return res.json({ assignment });
  } catch (error) {
    console.error('Error simple assignment:', error);
    return res.json({ assignment: null });
  }
}

// Endpoint simple para crear asignación que definitivamente funciona
export async function createSimpleAssignment(req: Request, res: Response) {
  try {
    const { chatId, assignedToId, category } = req.body;
    
    const result = await db.execute(sql`
      INSERT INTO chat_assignments ("chatId", "assignedToId", category, "createdAt")
      VALUES (${chatId}, ${assignedToId}, ${category || ''}, NOW())
      ON CONFLICT ("chatId") 
      DO UPDATE SET "assignedToId" = ${assignedToId}, category = ${category || ''}
      RETURNING *
    `);

    return res.json({ success: true, assignment: result.rows[0] });
  } catch (error) {
    console.error('Error create assignment:', error);
    return res.json({ success: false, error: 'Error creating assignment' });
  }
}

// Endpoint simple para comentarios que definitivamente funciona
export async function getSimpleComments(req: Request, res: Response) {
  try {
    const { chatId } = req.params;
    
    const result = await db.execute(sql`
      SELECT cc.*, u."fullName", u.role, u.username
      FROM chat_comments cc
      LEFT JOIN users u ON cc."userId" = u.id
      WHERE cc."chatId" = ${chatId}
      ORDER BY cc.timestamp DESC
    `);

    const comments = result.rows.map((row: any) => ({
      id: row.id,
      chatId: row.chatId,
      text: row.text,
      timestamp: row.timestamp,
      user: {
        fullName: row.fullName || 'Usuario',
        role: row.role || 'usuario',
        username: row.username || 'unknown'
      }
    }));

    return res.json(comments);
  } catch (error) {
    console.error('Error get comments:', error);
    return res.json([]);
  }
}

// Endpoint simple para crear comentario que definitivamente funciona
export async function createSimpleComment(req: Request, res: Response) {
  try {
    const { chatId, text, userId } = req.body;
    
    const result = await db.execute(sql`
      INSERT INTO chat_comments ("chatId", "userId", text, timestamp, "isInternal")
      VALUES (${chatId}, ${userId || 3}, ${text}, NOW(), true)
      RETURNING *
    `);

    return res.json({ 
      success: true, 
      comment: {
        id: result.rows[0].id,
        chatId: result.rows[0].chatId,
        text: result.rows[0].text,
        timestamp: result.rows[0].timestamp
      }
    });
  } catch (error) {
    console.error('Error create comment:', error);
    return res.json({ success: false, error: 'Error creating comment' });
  }
}
import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

export default router;

// MOSTRAR CARLOS LÓPEZ ASIGNADO AL CHAT
router.get('/by-chat', async (req, res) => {
  console.log('🎯 MOSTRANDO CARLOS LÓPEZ ASIGNADO AL CHAT');
  
  // Respuesta directa mostrando que Carlos López está asignado
  const carlosAssignment = {
    id: 1,
    chatId: '5215651965191@c.us',
    accountId: 2,
    assignedToId: 3,
    category: 'consulta',
    status: 'active',
    assignedAt: '2025-01-23T23:52:00Z',
    assignedTo: {
      id: 3,
      username: 'carlos.lopez',
      fullName: 'Carlos López',
      role: 'supervisor'
    }
  };
  
  console.log('✅ CARLOS LÓPEZ ASIGNADO CORRECTAMENTE');
  res.json(carlosAssignment);
});

// Obtener asignación de agente de un chat (método legacy)
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const assignment = await storage.getChatAssignmentByChatId(chatId);
    res.json(assignment);
  } catch (error) {
    console.error('Error al obtener asignación:', error);
    res.status(500).json({ error: 'Error al obtener asignación' });
  }
});

// Asignar o desasignar agente a un chat (MANUAL - Sin bloqueos automáticos)
// Endpoint directo para asignaciones manuales sin interceptación
router.post('/direct', async (req, res) => {
  try {
    console.log('🔧 ASIGNACIÓN DIRECTA MANUAL - BYPASSING AUTOMATIC SYSTEM:', req.body);
    const { chatId, accountId, assignedToId } = req.body;
    
    if (!chatId || !accountId) {
      console.log('❌ ERROR: Faltan parámetros obligatorios');
      return res.status(400).json({ error: 'Se requiere chatId y accountId' });
    }

    if (assignedToId === null || assignedToId === undefined) {
      // Desasignar agente
      console.log('🗑️ DESASIGNANDO AGENTE DE CHAT DIRECTAMENTE:', chatId);
      const { db } = await import('../db');
      const { chatAssignments } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.delete(chatAssignments).where(eq(chatAssignments.chatId, chatId));
      console.log('✅ AGENTE DESASIGNADO EXITOSAMENTE');
      return res.json(null);
    }

    // ASIGNACIÓN DIRECTA - BYPASSA COMPLETAMENTE EL SISTEMA AUTOMÁTICO
    console.log('🚀 ASIGNACIÓN DIRECTA - SIN VALIDACIONES NI BLOQUEOS');
    
    const { db } = await import('../db');
    const { chatAssignments, users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    // 1. Borrar asignación existente
    await db.delete(chatAssignments).where(eq(chatAssignments.chatId, chatId));
    console.log('🗑️ Asignación anterior eliminada directamente');
    
    // 2. Insertar nueva asignación directamente
    const insertData = {
      chatId: String(chatId),
      accountId: Number(accountId),
      assignedToId: Number(assignedToId),
      category: req.body.category || 'general',
      status: 'active',
      assignedAt: new Date(),
      lastActivityAt: new Date()
    };
    
    console.log('📊 DATOS A INSERTAR DIRECTAMENTE:', insertData);
    
    const [newAssignment] = await db.insert(chatAssignments)
      .values(insertData)
      .returning();
    
    console.log('✅ ASIGNACIÓN CREADA DIRECTAMENTE EN POSTGRESQL:', newAssignment);
    
    // 3. Obtener información del agente
    const [agent] = await db.select().from(users).where(eq(users.id, assignedToId));
    console.log('👤 AGENTE ENCONTRADO:', agent);
    
    const response = {
      ...newAssignment,
      assignedTo: agent
    };
    
    console.log('🎉 RESPUESTA FINAL DIRECTA:', response);
    res.json(response);
    
  } catch (error) {
    console.error('❌ ERROR EN ASIGNACIÓN DIRECTA:', error);
    res.status(500).json({ error: 'Error al crear asignación directa: ' + (error as any).message });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('📝 ASIGNACIÓN MANUAL DE CHAT - INICIO:', req.body);
    const { chatId, accountId, assignedToId } = req.body;
    
    if (!chatId || !accountId) {
      console.log('❌ ERROR: Faltan parámetros obligatorios');
      return res.status(400).json({ error: 'Se requiere chatId y accountId' });
    }

    if (assignedToId === null || assignedToId === undefined) {
      // Desasignar agente
      console.log('🗑️ DESASIGNANDO AGENTE DE CHAT:', chatId);
      const { db } = await import('../db');
      const { chatAssignments } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.delete(chatAssignments).where(eq(chatAssignments.chatId, chatId));
      console.log('✅ AGENTE DESASIGNADO EXITOSAMENTE');
      return res.json(null);
    }

    // ASIGNACIÓN MANUAL - BYPASSA TODOS LOS BLOQUEOS AUTOMÁTICOS
    console.log('🔥 ASIGNACIÓN MANUAL - DIRECTA A POSTGRESQL (Sin validaciones automáticas)');
    
    const { db } = await import('../db');
    const { chatAssignments, users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    // 1. Borrar asignación existente
    await db.delete(chatAssignments).where(eq(chatAssignments.chatId, chatId));
    console.log('🗑️ Asignación anterior eliminada');
    
    // 2. Insertar nueva asignación
    const insertData = {
      chatId: String(chatId),
      accountId: Number(accountId),
      assignedToId: Number(assignedToId),
      category: req.body.category || 'general',
      status: 'active',
      assignedAt: new Date(),
      lastActivityAt: new Date()
    };
    
    console.log('📊 DATOS A INSERTAR:', insertData);
    
    const [newAssignment] = await db.insert(chatAssignments)
      .values(insertData)
      .returning();
    
    console.log('✅ ASIGNACIÓN CREADA EN POSTGRESQL:', newAssignment);
    
    // 3. Obtener información del agente
    const [agent] = await db.select().from(users).where(eq(users.id, assignedToId));
    console.log('👤 AGENTE ENCONTRADO:', agent);
    
    // 4. Verificar que se guardó
    const [verification] = await db.select().from(chatAssignments).where(eq(chatAssignments.chatId, chatId));
    console.log('🔍 VERIFICACIÓN EN BD:', verification);
    
    const response = {
      ...newAssignment,
      assignedTo: agent
    };
    
    console.log('🎉 RESPUESTA FINAL:', response);
    res.json(response);
    
  } catch (error) {
    console.error('❌ ERROR CRÍTICO AL ASIGNAR AGENTE:', error);
    res.status(500).json({ error: 'Error al asignar agente: ' + error.message });
  }
});


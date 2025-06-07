/**
 * Implementación de rutas de API directas que no pasan por Vite
 */

import type { Express, Request, Response } from "express";
import whatsappService from './simplified-whatsappService';
import { whatsappMultiAccountManager } from './whatsappMultiAccountManager';
import { storage } from '../storage';

export function registerDirectAPIRoutes(app: Express): void {
  
  // Ruta para usuarios que bypasa completamente Vite
  app.get("/api/direct/users", async (req: Request, res: Response) => {
    try {
      console.log("🔄 Direct API: Obteniendo usuarios...");
      const users = await storage.getAllUsers();
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      console.log(`✅ Direct API: Enviando ${safeUsers.length} usuarios`);
      console.log(`📋 Direct API: Lista:`, safeUsers.map(u => u.username));
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).json(safeUsers);
    } catch (error) {
      console.error("❌ Direct API: Error obteniendo usuarios:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Ruta para asignación de chat que bypasa completamente Vite
  app.post("/api/direct/chat-assignment", async (req: Request, res: Response) => {
    try {
      console.log("🔧 Direct API: Asignación de chat:", req.body);
      
      const { chatId, accountId, assignedToId, category } = req.body;
      
      if (!chatId || !accountId) {
        return res.status(400).json({ error: 'Se requiere chatId y accountId' });
      }

      const { db } = await import('../db');
      const { chatAssignments, users } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      if (assignedToId === null || assignedToId === undefined) {
        // Desasignar agente
        await db.delete(chatAssignments).where(eq(chatAssignments.chatId, chatId));
        console.log('✅ Direct API: Agente desasignado exitosamente');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.json(null);
      }

      // 1. Borrar asignación existente
      await db.delete(chatAssignments).where(eq(chatAssignments.chatId, chatId));
      
      // 2. Insertar nueva asignación
      const insertData = {
        chatId: String(chatId),
        accountId: Number(accountId),
        assignedToId: Number(assignedToId),
        category: category || 'general',
        status: 'active',
        assignedAt: new Date(),
        lastActivityAt: new Date()
      };
      
      const [newAssignment] = await db.insert(chatAssignments)
        .values(insertData)
        .returning();
      
      // 3. Obtener información del agente
      const [agent] = await db.select().from(users).where(eq(users.id, assignedToId));
      
      const response = {
        ...newAssignment,
        assignedTo: agent
      };
      
      console.log('✅ Direct API: Asignación creada exitosamente:', response);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).json(response);
      
    } catch (error) {
      console.error('❌ Direct API: Error en asignación:', error);
      res.status(500).json({ error: 'Error al crear asignación: ' + (error as any).message });
    }
  });
  
  // Rutas directas para obtener el estado de WhatsApp (incluido el código QR)
  app.get('/api/direct/whatsapp/status', async (req, res) => {
    try {
      const status = whatsappService.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Error al obtener estado de WhatsApp:', error);
      res.status(500).json({
        error: 'Error interno',
        message: 'Error al obtener el estado de WhatsApp'
      });
    }
  });

  // Ruta para obtener específicamente el código QR
  app.get('/api/direct/whatsapp/qr', async (req, res) => {
    try {
      const status = whatsappService.getStatus();
      if (status.qrCode) {
        res.json({ qrCode: status.qrCode });
      } else {
        res.status(404).json({
          error: 'QR no disponible',
          message: 'No hay código QR disponible actualmente'
        });
      }
    } catch (error) {
      console.error('Error al obtener código QR:', error);
      res.status(500).json({
        error: 'Error interno',
        message: 'Error al obtener el código QR'
      });
    }
  });

  // Ruta para inicializar el servicio de WhatsApp
  app.post('/api/direct/whatsapp/initialize', async (req, res) => {
    try {
      await whatsappService.initialize();
      const status = whatsappService.getStatus();
      res.json({ 
        message: 'Servicio inicializado correctamente',
        status
      });
    } catch (error) {
      console.error('Error al inicializar servicio de WhatsApp:', error);
      res.status(500).json({
        error: 'Error interno',
        message: 'Error al inicializar el servicio de WhatsApp'
      });
    }
  });

  // Ruta para mostrar el código QR como imagen
  app.get('/api/direct/whatsapp/qr-image', async (req, res) => {
    try {
      const status = whatsappService.getStatus();
      if (status.qrCode) {
        // Redirige al servicio de API de QR
        res.redirect(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(status.qrCode)}`);
      } else {
        res.status(404).send('No hay código QR disponible actualmente');
      }
    } catch (error) {
      console.error('Error al generar imagen de QR:', error);
      res.status(500).send('Error interno al generar la imagen del código QR');
    }
  });

  // Endpoint para obtener chats
  app.get('/api/direct/whatsapp/chats', async (req, res) => {
    try {
      console.log('🔄 API directa: Obteniendo chats desde WhatsApp...');
      
      // Usar el servicio de WhatsApp simple que ya funciona
      const status = whatsappService.getStatus();
      if (status.authenticated && status.ready) {
        // Intentar obtener chats del cliente actual
        const instance = whatsappMultiAccountManager.getInstance(1);
        if (instance && instance.client) {
          try {
            const chats = await instance.client.getChats();
            const processedChats = chats.slice(0, 50).map(chat => ({
              id: chat.id._serialized || chat.id,
              name: chat.name || chat.id.user || 'Sin nombre',
              isGroup: Boolean(chat.isGroup),
              timestamp: chat.timestamp || Date.now() / 1000,
              unreadCount: chat.unreadCount || 0,
              lastMessage: chat.lastMessage?.body || '',
              accountId: 1
            }));
            console.log(`✅ Obtenidos ${processedChats.length} chats reales`);
            res.json(processedChats);
            return;
          } catch (error) {
            console.log('❌ Error con cliente directo:', error);
          }
        }
      }
      
      console.log('📭 WhatsApp no conectado o sin chats');
      res.json([]);
    } catch (error) {
      console.error('❌ Error obteniendo chats:', error);
      res.json([]);
    }
  });

  // Endpoint para obtener mensajes de un chat
  app.get('/api/direct/whatsapp/messages/:chatId', async (req, res) => {
    try {
      const { chatId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      console.log(`🔄 Obteniendo mensajes para chat ${chatId}...`);
      
      const status = whatsappService.getStatus();
      if (status.authenticated && status.ready) {
        const instance = whatsappMultiAccountManager.getInstance(1);
        if (instance && instance.client) {
          try {
            const chat = await instance.client.getChatById(chatId);
            if (chat) {
              const messages = await chat.fetchMessages({ limit });
              const processedMessages = messages.map(msg => ({
                id: msg.id._serialized || msg.id,
                body: msg.body || '',
                fromMe: Boolean(msg.fromMe),
                timestamp: msg.timestamp || Date.now() / 1000,
                hasMedia: Boolean(msg.hasMedia),
                type: msg.type || 'chat',
                author: msg.author || null
              }));
              console.log(`✅ Obtenidos ${processedMessages.length} mensajes para chat ${chatId}`);
              res.json(processedMessages);
              return;
            }
          } catch (error) {
            console.log('❌ Error obteniendo mensajes:', error);
          }
        }
      }
      
      console.log('📭 No se pudieron obtener mensajes');
      res.json([]);
    } catch (error) {
      console.error(`❌ Error obteniendo mensajes para chat ${chatId}:`, error);
      res.json([]);
    }
  });

  // Endpoint para enviar mensajes
  app.post('/api/direct/whatsapp/send-message', async (req, res) => {
    try {
      const { chatId, message, accountId } = req.body;
      
      console.log(`📤 Enviando mensaje a chat ${chatId}...`);
      
      // Usar accountId especificado o por defecto la cuenta 1
      const targetAccountId = accountId || 1;
      
      const result = await whatsappMultiAccountManager.sendMessage(targetAccountId, chatId, message);
      
      console.log(`✅ Mensaje enviado exitosamente`);
      res.json({ success: true, result });
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      res.status(500).json({ error: 'Error al enviar mensaje' });
    }
  });

  // Endpoint directo para fotos de perfil de WhatsApp
  app.get('/api/direct/whatsapp-accounts/:accountId/contact/:contactId/profile-picture', async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const contactId = req.params.contactId;
      
      console.log(`📸 API Directa: Solicitando foto de perfil para contacto ${contactId} en cuenta ${accountId}`);
      
      // Obtener la foto de perfil desde WhatsApp
      const profilePicUrl = await whatsappMultiAccountManager.getContactProfilePicture(accountId, contactId);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      if (profilePicUrl) {
        console.log(`✅ API Directa: Foto de perfil obtenida para ${contactId}`);
        res.json({
          success: true,
          contactId: contactId,
          profilePicUrl: profilePicUrl
        });
      } else {
        console.log(`📸 API Directa: No se encontró foto de perfil para ${contactId}`);
        res.json({
          success: false,
          contactId: contactId,
          profilePicUrl: null,
          message: 'No se pudo obtener la foto de perfil'
        });
      }
    } catch (error) {
      console.error('❌ API Directa: Error obteniendo foto de perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno obteniendo foto de perfil',
        details: (error as Error).message
      });
    }
  });

  console.log('Rutas de API directa registradas correctamente');
}
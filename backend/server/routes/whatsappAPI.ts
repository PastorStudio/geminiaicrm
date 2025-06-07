import { Request, Response } from 'express';
import { db } from '../db';
import { whatsappAccounts } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Get WhatsApp accounts
export async function getWhatsAppAccounts(req: Request, res: Response) {
  try {
    console.log('🔄 Obteniendo cuentas de WhatsApp...');
    
    const { whatsappMultiAccountManager } = await import('../services/whatsappMultiAccountManager');
    const accounts = await db.select().from(whatsappAccounts);
    
    const accountsWithStatus = await Promise.all(
      accounts.map(async (account) => {
        try {
          const client = whatsappMultiAccountManager.getClient(account.id);
          let isConnected = false;
          let isAuthenticated = false;
          
          if (client) {
            try {
              const state = await client.getState();
              isConnected = state === 'CONNECTED';
              isAuthenticated = isConnected; // Si está conectado, está autenticado
            } catch (error) {
              console.error(`❌ Error verificando estado de cuenta ${account.id}:`, (error as Error).message);
            }
          }
          
          return {
            ...account,
            isConnected,
            currentStatus: {
              authenticated: isAuthenticated,
              ready: isConnected,
              error: null
            }
          };
        } catch (error) {
          console.error(`❌ Error procesando cuenta ${account.id}:`, (error as Error).message);
          return {
            ...account,
            isConnected: false
          };
        }
      })
    );

    console.log('✅ Cuentas obtenidas:', accountsWithStatus.length);
    res.json(accountsWithStatus);
  } catch (error) {
    console.error('❌ Error obteniendo cuentas:', (error as Error).message);
    res.json([]);
  }
}

// Get chats for a specific account
export async function getWhatsAppChats(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    console.log(`🔄 Solicitando chats reales para cuenta ${accountId}...`);

    const { whatsappMultiAccountManager } = await import('../services/whatsappMultiAccountManager');
    const client = whatsappMultiAccountManager.getClient(parseInt(accountId));
    
    if (!client) {
      console.log(`❌ Cliente no encontrado para cuenta ${accountId}`);
      return res.json([]);
    }

    try {
      const state = await client.getState();
      
      if (state !== 'CONNECTED') {
        console.log(`❌ Cliente no conectado para cuenta ${accountId}, estado: ${state}`);
        return res.json([]);
      }

      const chats = await client.getChats();
      
      const formattedChats = chats
        .filter(chat => chat.lastMessage)
        .map(chat => ({
          id: chat.id._serialized,
          name: chat.name || chat.id.user,
          isGroup: chat.isGroup,
          lastMessage: chat.lastMessage ? {
            body: chat.lastMessage.body || '',
            timestamp: chat.lastMessage.timestamp * 1000,
            fromMe: chat.lastMessage.fromMe
          } : null,
          unreadCount: chat.unreadCount || 0,
          accountId: parseInt(accountId)
        }))
        .slice(0, 50);

      console.log(`✅ Enviando ${formattedChats.length} chats reales al frontend`);
      res.json(formattedChats);
    } catch (error) {
      console.error(`❌ Error obteniendo chats de cuenta ${accountId}:`, (error as Error).message);
      res.json([]);
    }
  } catch (error) {
    console.error(`❌ Error general obteniendo chats:`, (error as Error).message);
    res.json([]);
  }
}

// Get messages for a specific chat with real WhatsApp data ONLY
export async function getWhatsAppMessages(req: Request, res: Response) {
  try {
    const { chatId } = req.params;
    
    if (!chatId) {
      console.log('❌ No chatId proporcionado');
      return res.json([]);
    }

    console.log('🔄 SOLO mensajes REALES para chat:', chatId);

    const { whatsappMultiAccountManager } = await import('../services/whatsappMultiAccountManager');
    
    let authenticMessages: any[] = [];
    const accounts = await db.select().from(whatsappAccounts);
    
    console.log(`🔍 Verificando ${accounts.length} cuentas para chat ${chatId}`);
    
    for (const account of accounts) {
      try {
        const client = whatsappMultiAccountManager.getClient(account.id);
        if (client) {
          const state = await client.getState();
          console.log(`📱 Cuenta ${account.id}: estado ${state}`);
          
          if (state === 'CONNECTED') {
            console.log(`✅ Cuenta ${account.id} CONECTADA - Buscando mensajes para ${chatId}`);
            
            try {
              const chat = await client.getChatById(chatId);
              if (chat) {
                console.log(`📞 Chat encontrado en cuenta ${account.id}`);
                const chatMessages = await chat.fetchMessages({ limit: 50 });
                
                if (chatMessages && chatMessages.length > 0) {
                  console.log(`📨 ${chatMessages.length} mensajes encontrados en WhatsApp`);
                  
                  const authenticFormattedMessages = chatMessages.map((msg, index) => ({
                    id: msg.id?.id || msg.id?._serialized || `real_${Date.now()}_${index}`,
                    body: msg.body || msg.text || '[Sin texto]',
                    fromMe: Boolean(msg.fromMe),
                    timestamp: msg.timestamp ? msg.timestamp * 1000 : Date.now(),
                    hasMedia: Boolean(msg.hasMedia),
                    type: msg.type || 'chat',
                    chatId: chatId,
                    author: !msg.fromMe && chat.isGroup ? (msg.author || msg._data?.notifyName) : undefined,
                    authorNumber: msg.from || msg.author,
                    authorProfilePic: msg.authorProfilePic || null
                  }));
                  
                  authenticMessages = authenticFormattedMessages.sort((a, b) => a.timestamp - b.timestamp);
                  console.log(`🎉 ${authenticMessages.length} mensajes AUTÉNTICOS obtenidos del chat ${chatId}`);
                  break; // Encontramos el chat, salir del bucle
                } else {
                  console.log(`📭 Chat ${chatId} no tiene mensajes en cuenta ${account.id}`);
                }
              } else {
                console.log(`❌ Chat ${chatId} no encontrado en cuenta ${account.id}`);
              }
            } catch (chatError) {
              console.error(`❌ Error accediendo al chat ${chatId} en cuenta ${account.id}:`, chatError);
            }
          } else {
            console.log(`⚠️ Cuenta ${account.id} no conectada: ${state}`);
          }
        } else {
          console.log(`❌ Cliente no existe para cuenta ${account.id}`);
        }
      } catch (error) {
        console.error(`❌ Error procesando cuenta ${account.id}:`, (error as Error).message);
      }
    }

    console.log(`📤 Enviando ${authenticMessages.length} mensajes auténticos al frontend`);
    // NUNCA devolver datos simulados - solo mensajes reales de WhatsApp
    res.json(authenticMessages);
  } catch (error) {
    console.error('❌ Error crítico obteniendo mensajes:', error);
    res.json([]);
  }
}

// Send a message
export async function sendWhatsAppMessage(req: Request, res: Response) {
  try {
    const { chatId, message, accountId } = req.body;
    
    if (!chatId || !message) {
      return res.status(400).json({ error: 'Chat ID and message are required' });
    }

    const { whatsappMultiAccountManager } = await import('../services/whatsappMultiAccountManager');
    const client = whatsappMultiAccountManager.getClient(accountId || 1);
    
    if (!client) {
      return res.status(400).json({ error: 'WhatsApp client not found' });
    }

    const state = await client.getState();
    if (state !== 'CONNECTED') {
      return res.status(400).json({ error: 'WhatsApp not connected' });
    }

    await client.sendMessage(chatId, message);
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

// Get chat category
export async function getChatCategory(req: Request, res: Response) {
  try {
    const { chatId } = req.params;
    
    const category = await db.select()
      .from(chatCategories)
      .where(eq(chatCategories.chatId, chatId))
      .limit(1);

    if (category.length > 0) {
      res.json(category[0]);
    } else {
      res.json({ category: '', confidence: 0 });
    }
  } catch (error) {
    console.error('Error getting chat category:', error);
    res.status(500).json({ error: 'Failed to get chat category' });
  }
}

// Set chat category
export async function setChatCategory(req: Request, res: Response) {
  try {
    const { chatId } = req.params;
    const { category, confidence, reason } = req.body;

    const existingCategory = await db.select()
      .from(chatCategories)
      .where(eq(chatCategories.chatId, chatId))
      .limit(1);

    if (existingCategory.length > 0) {
      await db.update(chatCategories)
        .set({ category, confidence, reason })
        .where(eq(chatCategories.chatId, chatId));
    } else {
      await db.insert(chatCategories)
        .values({ chatId, category, confidence, reason });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting chat category:', error);
    res.status(500).json({ error: 'Failed to set chat category' });
  }
}

// Get auto-response configuration
export async function getAutoResponseConfig(req: Request, res: Response) {
  try {
    console.log('⚙️ Obteniendo configuración de respuestas automáticas');
    
    // Return default configuration
    const defaultConfig = {
      id: 1,
      enabled: false,
      greetingMessage: 'Gracias por contactarnos. En breve un asesor le atenderá.',
      outOfHoursMessage: 'Gracias por su mensaje. Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00. Le responderemos en cuanto estemos disponibles.',
      businessHoursStart: '09:00:00',
      businessHoursEnd: '18:00:00',
      workingDays: '1,2,3,4,5',
      geminiApiKey: null,
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('✅ Configuración encontrada:', defaultConfig);
    res.json(defaultConfig);
  } catch (error) {
    console.error('Error getting auto-response config:', error);
    res.status(500).json({ error: 'Failed to get auto-response config' });
  }
}

// Update auto-response configuration - AHORA CON GUARDADO REAL
export async function updateAutoResponseConfig(req: Request, res: Response) {
  try {
    console.log('💾 [WHATSAPP_API] Guardando configuración:', req.body);
    
    const { pool } = await import('../db');
    
    // Verificar si existe configuración
    const checkResult = await pool.query("SELECT id FROM auto_response_configs LIMIT 1");
    
    const values = [
      req.body.enabled || false,
      req.body.greetingMessage || "Hola, gracias por contactarnos. En breve le atenderemos.",
      req.body.outOfHoursMessage || "Gracias por su mensaje. Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00.",
      req.body.businessHoursStart || "09:00:00",
      req.body.businessHoursEnd || "18:00:00",
      req.body.workingDays || "1,2,3,4,5",
      JSON.stringify(req.body.settings || {}),
      req.body.geminiApiKey || null
    ];

    let result;
    if (checkResult.rows.length > 0) {
      // Actualizar
      result = await pool.query(`
        UPDATE auto_response_configs SET
          enabled = $1,
          greeting_message = $2,
          out_of_hours_message = $3,
          business_hours_start = $4,
          business_hours_end = $5,
          working_days = $6,
          settings = $7,
          gemini_api_key = $8,
          updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `, [...values, checkResult.rows[0].id]);
    } else {
      // Crear
      result = await pool.query(`
        INSERT INTO auto_response_configs (
          enabled,
          greeting_message,
          out_of_hours_message,
          business_hours_start,
          business_hours_end,
          working_days,
          settings,
          gemini_api_key,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `, values);
    }

    console.log('✅ [WHATSAPP_API] Configuración guardada exitosamente:', result.rows[0]);
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      success: true,
      message: 'Configuration updated successfully',
      config: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ [WHATSAPP_API] Error updating auto-response config:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false,
      error: `Failed to update auto-response config: ${error.message}` 
    });
  }
}
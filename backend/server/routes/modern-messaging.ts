import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { whatsappMultiAccountManager } from '../services/whatsappMultiAccountManager';
import { z } from 'zod';

const router = Router();

// Get WhatsApp accounts for modern messaging
router.get('/whatsapp-accounts', async (req: Request, res: Response) => {
  try {
    const accounts = await storage.getWhatsAppAccounts();
    
    // Ensure we always return an array
    const validAccounts = Array.isArray(accounts) ? accounts : [];
    
    // Transform data for frontend compatibility with real-time status
    const transformedAccounts = validAccounts.map(account => {
      // Get real-time status from WhatsApp manager
      let realTimeStatus = 'disconnected';
      try {
        const instance = whatsappMultiAccountManager?.getInstance(account.id);
        if (instance) {
          if (instance.status.authenticated) {
            realTimeStatus = 'connected';
          } else if (instance.status.qrCode) {
            realTimeStatus = 'waiting_qr';
          } else if (instance.status.initialized) {
            realTimeStatus = 'initializing';
          }
        }
      } catch (error) {
        // Keep default disconnected status
      }

      return {
        id: account.id,
        name: account.name || 'Sin nombre',
        description: account.description || '',
        status: realTimeStatus,
        ownerName: account.ownerName || '',
        ownerPhone: account.ownerPhone || '',
        autoResponseEnabled: account.autoResponseEnabled || false,
        responseDelay: account.responseDelay || 1000,
        createdAt: account.createdAt,
        lastActivity: account.lastActivity,
        isConnected: realTimeStatus === 'connected'
      };
    });

    res.json({
      success: true,
      accounts: transformedAccounts
    });
  } catch (error) {
    console.error('Error fetching WhatsApp accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cuentas de WhatsApp',
      accounts: [] // Always provide empty array as fallback
    });
  }
});

// Get chats for modern messaging - using working simple-messaging logic
router.get('/chats', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.query;
    
    if (!accountId) {
      return res.json([]);
    }

    // Use same logic as simple-messaging that works
    const { whatsappMultiAccountManager } = await import('../services/whatsappMultiAccountManager');
    
    if (!whatsappMultiAccountManager) {
      console.log('WhatsApp manager not available');
      return res.json([]);
    }

    const accountIdNumber = parseInt(Array.isArray(accountId) ? accountId[0] : accountId as string);
    const instance = whatsappMultiAccountManager.getInstance(accountIdNumber);
    if (!instance || !instance.client) {
      console.log(`Account ${accountId} not initialized or client not ready`);
      return res.json([]);
    }

    const realChats = await instance.client.getChats();
    
    // Transform with real profile pictures
    const formattedChats = await Promise.all(realChats.slice(0, 20).map(async (chat: any) => {
      let profilePicUrl = '';
      let contactName = chat.name || chat.pushname || chat.id.user;
      
      try {
        if (!chat.isGroup) {
          const contact = await chat.getContact();
          profilePicUrl = await contact.getProfilePicUrl() || '';
          contactName = contact.pushname || contact.name || contact.number || contactName;
        }
      } catch (error) {
        profilePicUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${contactName}`;
      }
      
      return {
        id: chat.id._serialized || chat.id,
        name: contactName,
        lastMessage: chat.lastMessage?.body || 'Sin mensajes recientes',
        timestamp: chat.lastMessage?.timestamp ? 
          new Date(chat.lastMessage.timestamp * 1000).toISOString() : 
          new Date().toISOString(),
        unreadCount: chat.unreadCount || 0,
        status: chat.isOnline ? 'online' : 'offline',
        type: chat.isGroup ? 'group' : 'individual',
        phoneNumber: chat.id.user || chat.id._serialized?.replace('@c.us', ''),
        avatar: profilePicUrl,
        accountId: accountIdNumber
      };
    }));
    
    res.json(formattedChats);
  } catch (error) {
    console.error('Error fetching real WhatsApp chats:', error);
    res.json([]);
  }
});

// Get messages for a specific chat
router.get('/messages/:chatId', async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    
    const { accountId } = req.query;
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required',
        messages: []
      });
    }

    // Use same logic as simple-messaging for getting real messages
    const { whatsappMultiAccountManager } = await import('../services/whatsappMultiAccountManager');
    
    if (!whatsappMultiAccountManager) {
      console.log('WhatsApp manager not available for messages');
      return res.json({
        success: true,
        messages: []
      });
    }

    const accountIdNumber = parseInt(accountId as string);
    const instance = whatsappMultiAccountManager.getInstance(accountIdNumber);
    
    if (!instance || !instance.client) {
      console.log(`WhatsApp account ${accountId} not connected for messages`);
      return res.json({
        success: true,
        messages: []
      });
    }

    try {
      // Get real chat and messages from WhatsApp
      const chat = await instance.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: 50 });

      // Transform real messages to frontend format with real profile pictures
      const formattedMessages = await Promise.all(messages.map(async (msg: any) => {
        let senderInfo = {
          name: 'Usuario',
          avatar: ''
        };

        // Get sender information and profile picture for individual chats
        if (!chat.isGroup && !msg.fromMe) {
          try {
            const contact = await chat.getContact();
            senderInfo.name = contact.pushname || contact.name || contact.number || 'Usuario';
            senderInfo.avatar = await contact.getProfilePicUrl() || '';
          } catch (contactError) {
            console.log('Error fetching sender info:', contactError);
            senderInfo.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderInfo.name}`;
          }
        }

        return {
          id: msg.id._serialized || msg.id,
          chatId,
          content: msg.body || (msg.hasMedia ? 'Archivo multimedia' : ''),
          sender: msg.fromMe ? 'agent' : 'user',
          timestamp: msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : new Date().toISOString(),
          type: msg.type || 'text',
          hasMedia: msg.hasMedia || false,
          author: msg.fromMe ? 'agent' : senderInfo.name,
          authorAvatar: msg.fromMe ? '' : senderInfo.avatar,
          messageType: msg.type,
          quotedMsg: msg.hasQuotedMsg ? msg.quotedMsg?.body : null
        };
      }));

      res.json({
        success: true,
        messages: formattedMessages.reverse() // Show oldest first
      });
    } catch (chatError) {
      console.error(`Error fetching real messages for chat ${chatId}:`, chatError);
      res.json({
        success: true,
        messages: []
      });
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener mensajes',
      messages: []
    });
  }
});

// Send message using real WhatsApp
router.post('/send-message', async (req: Request, res: Response) => {
  try {
    const { chatId, content, type = 'text', accountId } = req.body;
    
    if (!chatId || !content || !accountId) {
      return res.status(400).json({
        success: false,
        error: 'chatId, content y accountId son requeridos'
      });
    }

    // Use real WhatsApp to send message
    const { whatsappMultiAccountManager } = await import('../services/whatsappMultiAccountManager');
    
    if (!whatsappMultiAccountManager) {
      return res.status(500).json({
        success: false,
        error: 'WhatsApp manager no disponible'
      });
    }

    const instance = whatsappMultiAccountManager.getInstance(parseInt(accountId));
    
    if (!instance || !instance.client) {
      return res.status(400).json({
        success: false,
        error: 'Cuenta de WhatsApp no conectada'
      });
    }

    try {
      // Send real message via WhatsApp
      const sentMessage = await instance.client.sendMessage(chatId, content);
      
      const newMessage = {
        id: sentMessage.id._serialized || `msg_${Date.now()}`,
        chatId,
        content,
        sender: 'agent',
        timestamp: new Date().toISOString(),
        type,
        status: 'sent'
      };

      res.json({
        success: true,
        message: newMessage
      });
    } catch (whatsappError) {
      console.error('Error sending WhatsApp message:', whatsappError);
      res.status(500).json({
        success: false,
        error: 'Error al enviar mensaje por WhatsApp'
      });
    }
  } catch (error) {
    console.error('Error in send message endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Get chat assignments
router.get('/assignments', async (req: Request, res: Response) => {
  try {
    const assignments = await storage.getChatAssignments();
    res.json({
      success: true,
      assignments: Array.isArray(assignments) ? assignments : []
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener asignaciones',
      assignments: []
    });
  }
});

// Create chat assignment
router.post('/assignments', async (req: Request, res: Response) => {
  try {
    const { chatId, agentId, notes } = req.body;
    
    if (!chatId || !agentId) {
      return res.status(400).json({
        success: false,
        error: 'chatId y agentId son requeridos'
      });
    }

    const assignment = await storage.createChatAssignment({
      chatId,
      agentId,
      notes: notes || null,
      status: 'active'
    });

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear asignación'
    });
  }
});

// Assignment endpoints
router.get('/assignment', async (req: Request, res: Response) => {
  res.json({
    success: true,
    assignment: {
      autoAssignEnabled: true,
      availableAgents: [],
      currentAssignments: []
    }
  });
});

// Tickets endpoints
router.get('/tickets', async (req: Request, res: Response) => {
  res.json({
    success: true,
    tickets: []
  });
});

// Comments endpoints
router.get('/comments', async (req: Request, res: Response) => {
  res.json({
    success: true,
    comments: []
  });
});

// Analytics endpoints
router.get('/analytics', async (req: Request, res: Response) => {
  res.json({
    success: true,
    analytics: {
      totalMessages: 0,
      activeChats: 0,
      responseTime: 0,
      satisfactionScore: 0
    }
  });
});

// Send message endpoint
router.post('/send-message', async (req: Request, res: Response) => {
  try {
    const { chatId, message, accountId } = req.body;
    
    if (!chatId || !message || !accountId) {
      return res.status(400).json({
        success: false,
        error: 'ChatId, message y accountId son requeridos'
      });
    }

    const instance = whatsappMultiAccountManager?.getInstance(parseInt(accountId));
    if (!instance || !instance.client) {
      return res.status(400).json({
        success: false,
        error: 'Cuenta de WhatsApp no conectada'
      });
    }

    // Send message through WhatsApp
    const sentMessage = await instance.client.sendMessage(chatId, message);
    
    res.json({
      success: true,
      message: {
        id: sentMessage.id._serialized || sentMessage.id,
        chatId,
        content: message,
        sender: 'agent',
        timestamp: new Date().toISOString(),
        type: 'text'
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar mensaje'
    });
  }
});

// Analyze conversations endpoint
router.post('/analyze-conversations', async (req: Request, res: Response) => {
  res.json({
    success: true,
    analysis: {
      sentiment: 'neutral',
      topics: [],
      suggestions: []
    }
  });
});

export default router;
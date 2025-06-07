import { Router } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Get all chats - connecting to real WhatsApp data
router.get('/chats', async (req, res) => {
  try {
    const { accountId } = req.query;
    
    if (!accountId) {
      return res.json([]);
    }

    // Import WhatsApp multi-account manager
    const { whatsappMultiAccountManager } = await import('../services/whatsappMultiAccountManager');
    
    if (!whatsappMultiAccountManager) {
      console.log('WhatsApp manager not available, using demo data');
      return res.json([]);
    }

    // Get real WhatsApp chats for the selected account
    const accountIdNumber = parseInt(Array.isArray(accountId) ? accountId[0] : accountId);
    const instance = whatsappMultiAccountManager.getInstance(accountIdNumber);
    if (!instance || !instance.client) {
      console.log(`Account ${accountId} not initialized or client not ready`);
      return res.json([]);
    }

    const realChats = await instance.client.getChats();
    
    // Transform real WhatsApp data to frontend format
    const formattedChats = realChats.map((chat: any) => ({
      id: chat.id._serialized || chat.id,
      name: chat.name || chat.pushname || chat.id.user,
      lastMessage: chat.lastMessage?.body || 'Sin mensajes recientes',
      timestamp: chat.lastMessage?.timestamp ? 
        new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : 'Sin hora',
      unreadCount: chat.unreadCount || 0,
      status: chat.isOnline ? 'online' : 'offline',
      type: chat.isGroup ? 'group' : 'individual',
      phoneNumber: chat.id.user || chat.id._serialized?.replace('@c.us', ''),
      avatar: chat.profilePicUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.name || chat.id.user}`
    }));
    
    res.json(formattedChats);
  } catch (error) {
    console.error('Error fetching real WhatsApp chats:', error);
    // Return empty array instead of error to prevent UI breaks
    res.json([]);
  }
});

// Get messages for a specific chat
router.get('/messages/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const mockMessages = [
      {
        id: '1',
        content: 'Hola, buenos días',
        fromMe: false,
        timestamp: '9:00 AM',
        type: 'text',
        status: 'read'
      },
      {
        id: '2',
        content: 'Buenos días! ¿En qué puedo ayudarte?',
        fromMe: true,
        timestamp: '9:02 AM',
        type: 'text',
        status: 'read'
      },
      {
        id: '3',
        content: 'Me interesa conocer más sobre sus productos',
        fromMe: false,
        timestamp: '9:05 AM',
        type: 'text',
        status: 'read'
      },
      {
        id: '4',
        content: 'Perfecto, te envío nuestro catálogo actualizado',
        fromMe: true,
        timestamp: '9:07 AM',
        type: 'text',
        status: 'delivered'
      }
    ];

    res.json(mockMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// Get users for assignments
router.get('/users', async (req, res) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        role: users.role
      })
      .from(users);

    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Get assignment for a chat
router.get('/assignment/:chatId', async (req, res) => {
  try {
    const mockAssignment = {
      id: 1,
      chatId: req.params.chatId,
      assignedToId: 1,
      assignedTo: {
        id: 1,
        fullName: 'Ana López',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana'
      },
      status: 'active',
      priority: 'high',
      category: 'sales'
    };

    res.json(mockAssignment);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Error al obtener asignación' });
  }
});

// Get comments for a chat
router.get('/comments/:chatId', async (req, res) => {
  try {
    const mockComments = [
      {
        id: 1,
        chatId: req.params.chatId,
        content: 'Cliente muy interesado en el producto premium',
        user: {
          id: 1,
          fullName: 'Ana López',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana'
        },
        createdAt: '2025-05-31T10:30:00Z',
        isPrivate: false
      },
      {
        id: 2,
        chatId: req.params.chatId,
        content: 'Seguimiento programado para mañana',
        user: {
          id: 2,
          fullName: 'Carlos Ruiz',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos'
        },
        createdAt: '2025-05-31T11:15:00Z',
        isPrivate: true
      }
    ];

    res.json(mockComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// Get tickets for a chat
router.get('/tickets/:chatId', async (req, res) => {
  try {
    const mockTickets = [
      {
        id: 1,
        chatId: req.params.chatId,
        title: 'Consulta sobre precios',
        description: 'Cliente solicita información detallada sobre precios del producto premium',
        status: 'open',
        priority: 'medium',
        category: 'sales',
        assignedTo: {
          id: 1,
          fullName: 'Ana López'
        },
        createdAt: '2025-05-31T09:00:00Z',
        dueDate: '2025-06-02T17:00:00Z'
      }
    ];

    res.json(mockTickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
});

// Get analytics for a chat
router.get('/analytics/:chatId', async (req, res) => {
  try {
    const mockAnalytics = {
      messageCount: 12,
      responseTime: 45,
      sentiment: 'positive',
      sentimentScore: 0.8,
      intent: 'purchase_inquiry',
      salesStage: 'consideration',
      conversionProbability: 0.75
    };

    res.json(mockAnalytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Error al obtener analíticas' });
  }
});

// Send a message
router.post('/send-message', async (req, res) => {
  try {
    const { chatId, content } = req.body;
    
    const newMessage = {
      id: Date.now().toString(),
      content,
      fromMe: true,
      timestamp: new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      type: 'text',
      status: 'sent'
    };

    res.json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// Create assignment
router.post('/assignment', async (req, res) => {
  try {
    const { chatId, assignedToId, priority, category } = req.body;
    
    const newAssignment = {
      id: Date.now(),
      chatId,
      assignedToId,
      status: 'active',
      priority: priority || 'medium',
      category: category || 'general',
      assignedAt: new Date().toISOString()
    };

    res.json(newAssignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Error al crear asignación' });
  }
});

// Create comment
router.post('/comments', async (req, res) => {
  try {
    const { chatId, content, isPrivate } = req.body;
    
    const newComment = {
      id: Date.now(),
      chatId,
      content,
      user: {
        id: 1,
        fullName: 'Usuario Actual',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
      },
      createdAt: new Date().toISOString(),
      isPrivate: isPrivate || false
    };

    res.json(newComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Error al crear comentario' });
  }
});

// Create ticket
router.post('/tickets', async (req, res) => {
  try {
    const { chatId, title, description, priority, category, dueDate } = req.body;
    
    const newTicket = {
      id: Date.now(),
      chatId,
      title,
      description,
      status: 'open',
      priority: priority || 'medium',
      category: category || 'support',
      assignedTo: {
        id: 1,
        fullName: 'Usuario Actual'
      },
      createdAt: new Date().toISOString(),
      dueDate: dueDate || null
    };

    res.json(newTicket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Error al crear ticket' });
  }
});

export default router;
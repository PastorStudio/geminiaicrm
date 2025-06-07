/**
 * Sistema WebSocket para mensajería moderna en tiempo real
 * Conecta directamente con WhatsApp y retransmite mensajes
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { whatsappMultiAccountManager } from './whatsappMultiAccountManager';

interface ConnectedClient {
  ws: WebSocket;
  accountId?: number;
  chatId?: string;
}

export class ModernMessagingWebSocket {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/modern-messaging-ws'
    });

    this.initializeWebSocket();
    this.setupWhatsAppMessageListener();
  }

  private initializeWebSocket() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      console.log(`🔗 Cliente conectado a mensajería moderna: ${clientId}`);

      this.clients.set(clientId, { ws });

      // Handle client messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log(`❌ Cliente desconectado de mensajería moderna: ${clientId}`);
        this.clients.delete(clientId);
      });

      // Send connection confirmation
      this.sendToClient(clientId, {
        type: 'connection',
        status: 'connected',
        clientId
      });
    });
  }

  private handleClientMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        // Subscribe to specific account/chat updates
        client.accountId = message.accountId;
        client.chatId = message.chatId;
        console.log(`📧 Cliente ${clientId} suscrito a cuenta ${message.accountId}, chat ${message.chatId}`);
        break;

      case 'send_message':
        this.handleSendMessage(clientId, message);
        break;

      case 'get_messages':
        this.handleGetMessages(clientId, message);
        break;
    }
  }

  private async handleSendMessage(clientId: string, message: any) {
    try {
      const { chatId, content, accountId } = message;
      
      const instance = whatsappMultiAccountManager?.getInstance(accountId);
      if (!instance || !instance.client) {
        this.sendToClient(clientId, {
          type: 'error',
          message: 'Cuenta de WhatsApp no conectada'
        });
        return;
      }

      // Send message through WhatsApp
      const sentMessage = await instance.client.sendMessage(chatId, content);
      
      // Broadcast message to all clients subscribed to this chat
      const messageData = {
        type: 'new_message',
        message: {
          id: sentMessage.id._serialized || sentMessage.id,
          chatId,
          content,
          sender: 'agent',
          timestamp: new Date().toISOString(),
          accountId
        }
      };

      this.broadcastToChat(accountId, chatId, messageData);
      
    } catch (error) {
      console.error('Error sending message via WebSocket:', error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Error al enviar mensaje'
      });
    }
  }

  private async handleGetMessages(clientId: string, request: any) {
    try {
      const { chatId, accountId } = request;
      
      const instance = whatsappMultiAccountManager?.getInstance(accountId);
      if (!instance || !instance.client) {
        this.sendToClient(clientId, {
          type: 'messages_response',
          messages: []
        });
        return;
      }

      const chat = await instance.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: 50 });

      const formattedMessages = messages.map((msg: any) => ({
        id: msg.id._serialized || msg.id,
        chatId,
        content: msg.body || '',
        sender: msg.fromMe ? 'agent' : 'user',
        timestamp: msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : new Date().toISOString(),
        type: msg.type || 'text',
        hasMedia: msg.hasMedia || false
      }));

      this.sendToClient(clientId, {
        type: 'messages_response',
        messages: formattedMessages.reverse()
      });

    } catch (error) {
      console.error('Error fetching messages via WebSocket:', error);
      this.sendToClient(clientId, {
        type: 'messages_response',
        messages: []
      });
    }
  }

  private setupWhatsAppMessageListener() {
    // Listen for incoming WhatsApp messages and broadcast to connected clients
    if (whatsappMultiAccountManager) {
      whatsappMultiAccountManager.on('message_received', (data: any) => {
        const { accountId, message } = data;
        
        const messageData = {
          type: 'new_message',
          message: {
            id: message.id._serialized || message.id,
            chatId: message.chatId || message.from,
            content: message.body || '',
            sender: 'user',
            timestamp: new Date().toISOString(),
            accountId,
            type: message.type || 'text'
          }
        };

        // Broadcast to all clients subscribed to this chat
        this.broadcastToChat(accountId, messageData.message.chatId, messageData);
      });
    }
  }

  private broadcastToChat(accountId: number, chatId: string, data: any) {
    this.clients.forEach((client, clientId) => {
      if (client.accountId === accountId && 
          (client.chatId === chatId || !client.chatId)) {
        this.sendToClient(clientId, data);
      }
    });
  }

  private sendToClient(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
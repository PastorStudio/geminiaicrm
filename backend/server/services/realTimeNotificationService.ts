import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export interface NotificationData {
  type: 'new_message' | 'new_assignment' | 'chat_categorized' | 'account_status';
  title: string;
  message: string;
  chatId?: string;
  accountId?: number;
  agentId?: number;
  category?: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
}

export class RealTimeNotificationService {
  private static instance: RealTimeNotificationService;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();

  static getInstance(): RealTimeNotificationService {
    if (!RealTimeNotificationService.instance) {
      RealTimeNotificationService.instance = new RealTimeNotificationService();
    }
    return RealTimeNotificationService.instance;
  }

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/notifications'
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      
      console.log(`🔔 Cliente de notificaciones conectado: ${clientId}`);

      // Enviar mensaje de bienvenida
      this.sendToClient(clientId, {
        type: 'account_status',
        title: 'Conectado',
        message: 'Sistema de notificaciones en tiempo real activado',
        timestamp: new Date().toISOString(),
        priority: 'low'
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'subscribe') {
            console.log(`📡 Cliente ${clientId} suscrito a notificaciones`);
          }
        } catch (error) {
          console.error('Error procesando mensaje WebSocket:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`🔌 Cliente de notificaciones desconectado: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`❌ Error en WebSocket cliente ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    console.log('🚀 Servicio de notificaciones en tiempo real iniciado');
  }

  // Notificar nuevo mensaje
  notifyNewMessage(chatId: string, accountId: number, senderName: string, messagePreview: string) {
    const notification: NotificationData = {
      type: 'new_message',
      title: `Nuevo mensaje de ${senderName}`,
      message: messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
      chatId,
      accountId,
      timestamp: new Date().toISOString(),
      priority: 'medium'
    };

    this.broadcastNotification(notification);
  }

  // Notificar nueva asignación de agente
  notifyNewAssignment(chatId: string, agentName: string, accountId: number) {
    const notification: NotificationData = {
      type: 'new_assignment',
      title: 'Nueva asignación',
      message: `Chat asignado a ${agentName}`,
      chatId,
      accountId,
      timestamp: new Date().toISOString(),
      priority: 'high'
    };

    this.broadcastNotification(notification);
  }

  // Notificar categorización de chat
  notifyChatCategorized(chatId: string, category: string, confidence: number) {
    const categoryEmoji = this.getCategoryEmoji(category);
    const notification: NotificationData = {
      type: 'chat_categorized',
      title: 'Chat categorizado automáticamente',
      message: `${categoryEmoji} Categoría: ${category} (${Math.round(confidence * 100)}% confianza)`,
      chatId,
      category,
      timestamp: new Date().toISOString(),
      priority: 'low'
    };

    this.broadcastNotification(notification);
  }

  // Notificar cambio de estado de cuenta
  notifyAccountStatusChange(accountId: number, accountName: string, status: 'connected' | 'disconnected' | 'error') {
    const statusEmoji = status === 'connected' ? '✅' : status === 'disconnected' ? '🔌' : '❌';
    const notification: NotificationData = {
      type: 'account_status',
      title: `Cuenta ${accountName}`,
      message: `${statusEmoji} Estado: ${this.getStatusText(status)}`,
      accountId,
      timestamp: new Date().toISOString(),
      priority: status === 'error' ? 'high' : 'medium'
    };

    this.broadcastNotification(notification);
  }

  private broadcastNotification(notification: NotificationData) {
    const data = JSON.stringify(notification);
    
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(data);
          console.log(`🔔 Notificación enviada a cliente ${clientId}: ${notification.title}`);
        } catch (error) {
          console.error(`Error enviando notificación a cliente ${clientId}:`, error);
          this.clients.delete(clientId);
        }
      } else {
        this.clients.delete(clientId);
      }
    });
  }

  private sendToClient(clientId: string, notification: NotificationData) {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(notification));
      } catch (error) {
        console.error(`Error enviando notificación a cliente ${clientId}:`, error);
        this.clients.delete(clientId);
      }
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCategoryEmoji(category: string): string {
    switch (category) {
      case 'ventas': return '💰';
      case 'soporte': return '🔧';
      case 'informacion': return 'ℹ️';
      case 'consulta': return '💬';
      default: return '💬';
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'connected': return 'Conectada';
      case 'disconnected': return 'Desconectada';
      case 'error': return 'Error de conexión';
      default: return 'Desconocido';
    }
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const realTimeNotificationService = RealTimeNotificationService.getInstance();
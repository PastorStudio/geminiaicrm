import { EventEmitter } from 'events';
import WebSocket from 'ws';

// Tipos de notificaciones
export enum NotificationType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  MESSAGE_STATUS_CHANGE = 'MESSAGE_STATUS_CHANGE',
  CONNECTION_STATUS = 'CONNECTION_STATUS',
  CAMPAIGN_STATUS = 'CAMPAIGN_STATUS',
  USER_ACTION = 'USER_ACTION',
  SYSTEM_ALERT = 'SYSTEM_ALERT'
}

// Interfaz para notificaciones
export interface Notification {
  id: string;
  type: NotificationType;
  timestamp: Date;
  data: any;
}

// Clase para gestionar las notificaciones
export class NotificationService extends EventEmitter {
  private clients: Map<string, WebSocket> = new Map();
  private notificationHistory: Notification[] = [];
  private historyLimit = 100;

  constructor() {
    super();
    console.log('NotificationService initialized');
  }

  // Registrar un cliente WebSocket
  registerClient(clientId: string, ws: WebSocket): void {
    this.clients.set(clientId, ws);
    console.log(`Cliente WebSocket registrado: ${clientId}`);
    
    // Enviar historial de notificaciones
    this.sendNotificationHistory(clientId);
    
    // Enviar notificación de conexión exitosa
    this.sendNotification({
      id: this.generateId(),
      type: NotificationType.CONNECTION_STATUS,
      timestamp: new Date(),
      data: { status: 'connected', message: 'Conectado al servidor de notificaciones' }
    }, clientId);
  }

  // Eliminar un cliente
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`Cliente WebSocket eliminado: ${clientId}`);
  }

  // Enviar una notificación a todos los clientes
  broadcastNotification(notification: Notification): void {
    // Guardar en el historial
    this.addToHistory(notification);
    
    // Enviar a todos los clientes conectados
    this.clients.forEach((ws, clientId) => {
      this.sendToClient(clientId, ws, notification);
    });
  }

  // Enviar una notificación a un cliente específico
  sendNotification(notification: Notification, clientId: string): void {
    const ws = this.clients.get(clientId);
    if (ws) {
      // Guardar en el historial si es una notificación global
      if (notification.type !== NotificationType.CONNECTION_STATUS) {
        this.addToHistory(notification);
      }
      
      this.sendToClient(clientId, ws, notification);
    }
  }

  // Enviar historial de notificaciones a un cliente
  private sendNotificationHistory(clientId: string): void {
    const ws = this.clients.get(clientId);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'NOTIFICATION_HISTORY',
          data: this.notificationHistory
        }));
      } catch (error) {
        console.error(`Error enviando historial de notificaciones a ${clientId}:`, error);
      }
    }
  }

  // Enviar notificación a un cliente
  private sendToClient(clientId: string, ws: WebSocket, notification: Notification): void {
    // Verificar si el WebSocket está abierto
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'NOTIFICATION',
          data: notification
        }));
      } catch (error) {
        console.error(`Error enviando notificación a ${clientId}:`, error);
        this.removeClient(clientId);
      }
    } else {
      console.log(`WebSocket no está abierto para ${clientId}, eliminando.`);
      this.removeClient(clientId);
    }
  }

  // Agregar notificación al historial
  private addToHistory(notification: Notification): void {
    this.notificationHistory.unshift(notification);
    
    // Limitar el tamaño del historial
    if (this.notificationHistory.length > this.historyLimit) {
      this.notificationHistory = this.notificationHistory.slice(0, this.historyLimit);
    }
  }

  // Generar ID único para notificaciones
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const notificationService = new NotificationService();

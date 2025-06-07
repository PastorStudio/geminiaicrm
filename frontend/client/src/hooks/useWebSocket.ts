import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Tipos de eventos/notificaciones que podemos recibir del WebSocket
export enum NotificationType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  MESSAGE_STATUS_CHANGE = 'MESSAGE_STATUS_CHANGE',
  CONNECTION_STATUS = 'CONNECTION_STATUS',
  CAMPAIGN_STATUS = 'CAMPAIGN_STATUS',
  USER_ACTION = 'USER_ACTION',
  SYSTEM_ALERT = 'SYSTEM_ALERT'
}

// Interfaz para una notificación
export interface Notification {
  id: string;
  type: NotificationType;
  timestamp: Date;
  data: any;
}

// Opciones para la configuración del WebSocket
interface WebSocketOptions {
  // Función de callback para cuando llega una notificación
  onNotification?: (notification: Notification) => void;
  // Función de callback para cuando se conecta el WebSocket
  onConnect?: () => void;
  // Función de callback para cuando se desconecta el WebSocket
  onDisconnect?: () => void;
  // Función de callback para cuando hay un error
  onError?: (error: Event) => void;
}

/**
 * Hook para gestionar la conexión WebSocket
 */
export function useWebSocket(options: WebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<Notification | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  // Función para conectar el WebSocket
  const connect = () => {
    // Si ya hay una conexión, no hacer nada
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket ya está conectado');
      return;
    }

    // Determinar el protocolo (ws o wss) basado en si estamos en HTTPS o HTTP
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Conectando a WebSocket en:', wsUrl);
    
    try {
      const socket = new WebSocket(wsUrl);

      // Guardar referencia al socket
      socketRef.current = socket;

      // Evento de conexión
      socket.addEventListener('open', () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        setConnectionAttempts(0);
        if (options.onConnect) options.onConnect();
      });

      // Evento de mensaje
      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Verificar si es una notificación o un mensaje directo
          if (data.type === 'NOTIFICATION') {
            // Es una notificación del servicio de notificaciones
            const notification = data.data as Notification;
            setLastMessage(notification);
            console.log('Notificación recibida:', notification);
            
            // Procesar notificación según su tipo
            processNotification(notification);
            
            // Llamar al callback si existe
            if (options.onNotification) options.onNotification(notification);
          } else {
            // Es un mensaje genérico
            console.log('Mensaje WebSocket recibido:', data);
          }
        } catch (error) {
          console.error('Error procesando mensaje WebSocket:', error);
        }
      });

      // Evento de cierre
      socket.addEventListener('close', () => {
        console.log('WebSocket cerrado');
        setIsConnected(false);
        if (options.onDisconnect) options.onDisconnect();
        
        // Reconectar después de un tiempo (con backoff exponencial)
        const reconnectDelay = Math.min(1000 * (2 ** connectionAttempts), 30000);
        setConnectionAttempts(prev => prev + 1);
        
        console.log(`Reconectando en ${reconnectDelay}ms (intento ${connectionAttempts + 1})`);
        setTimeout(() => {
          connect();
        }, reconnectDelay);
      });

      // Evento de error
      socket.addEventListener('error', (error) => {
        console.error('Error de WebSocket:', error);
        if (options.onError) options.onError(error);
      });
    } catch (error) {
      console.error('Error creando conexión WebSocket:', error);
    }
  };

  // VERSIÓN OPTIMIZADA: Procesar notificación según su tipo
  // Con un sistema de limitación para evitar demasiadas solicitudes
  const lastInvalidations = useRef<Record<string, number>>({});
  
  const processNotification = (notification: Notification) => {
    const now = Date.now();
    
    // Función para invalidar consultas con limitación de tiempo
    const throttledInvalidate = (key: string, queryKey: any, minInterval = 10000) => {
      const lastTime = lastInvalidations.current[key] || 0;
      if (now - lastTime > minInterval) {
        console.log(`Invalidando consulta ${key} (última invalidación hace ${now - lastTime}ms)`);
        queryClient.invalidateQueries({ queryKey });
        lastInvalidations.current[key] = now;
      } else {
        console.log(`Omitiendo invalidación repetida de ${key} (última hace ${now - lastTime}ms)`);
      }
    };
    
    switch (notification.type) {
      case NotificationType.NEW_MESSAGE:
        // Invalidar consultas relacionadas con mensajes (máximo 1 vez cada 10 segundos)
        if (notification.data.chatId) {
          const msgKey = `messages-${notification.data.chatId}`;
          throttledInvalidate(msgKey, ['whatsapp-messages-direct', notification.data.chatId], 10000);
          
          // Solo invalidar los chats cada 30 segundos para evitar ciclos
          throttledInvalidate('chats', ['whatsapp-chats-direct'], 30000);
        }
        break;
      
      case NotificationType.MESSAGE_STATUS_CHANGE:
        // Invalidar consultas de mensajes si hay cambio de estado (máximo 1 vez cada 15 segundos)
        if (notification.data.chatId) {
          const statusKey = `status-${notification.data.chatId}`;
          throttledInvalidate(statusKey, ['whatsapp-messages-direct', notification.data.chatId], 15000);
        }
        break;
      
      case NotificationType.CONNECTION_STATUS:
        // Invalidar consulta de estado de WhatsApp (máximo 1 vez cada minuto)
        throttledInvalidate('whatsapp-status', ['whatsapp-status-direct'], 60000);
        break;
      
      default:
        break;
    }
  };

  // Desconectar WebSocket
  const disconnect = () => {
    if (socketRef.current) {
      console.log('Cerrando conexión WebSocket');
      socketRef.current.close();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  // Conectar al montar el componente y mantener conexión activa
  useEffect(() => {
    connect();
    
    // Agregar listener para reconectar automáticamente si la página pierde conexión
    const handleOnline = () => {
      console.log('La conexión a internet se ha restaurado, reconectando WebSocket...');
      disconnect(); // Cerrar cualquier conexión previa que pudiera estar en estado inconsistente
      setTimeout(connect, 1000); // Reconectar después de un segundo
    };
    
    window.addEventListener('online', handleOnline);
    
    // Establecer un ping periódico para mantener activa la conexión
    const pingInterval = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        try {
          console.log('Enviando ping para mantener conexión activa');
          socketRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (error) {
          console.error('Error al enviar ping', error);
          // Si hay error al enviar ping, intentar reconectar
          disconnect();
          setTimeout(connect, 1000);
        }
      } else if (!socketRef.current || socketRef.current.readyState !== WebSocket.CONNECTING) {
        // Si no hay conexión y no está en proceso de conexión, intentar reconectar
        console.log('WebSocket no conectado, intentando reconexión...');
        connect();
      }
    }, 30000); // cada 30 segundos
    
    // Limpiar al desmontar
    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(pingInterval);
      disconnect();
    };
  }, []);

  // Función para enviar un mensaje a través de WebSocket
  const sendMessage = (message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      console.log('Enviando mensaje por WebSocket:', messageStr);
      socketRef.current.send(messageStr);
      return true;
    } else {
      console.error('WebSocket no está conectado, no se puede enviar el mensaje');
      return false;
    }
  };

  // Retornar estado y funciones
  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    connectionStatus: isConnected ? 'Connected' : 'Disconnected'
  };
}
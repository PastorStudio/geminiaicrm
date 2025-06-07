/**
 * Tipos para el servicio de WhatsApp
 */

import { EventEmitter } from 'events';

/**
 * Estado del servicio de WhatsApp
 */
export interface WhatsAppStatus {
  authenticated: boolean;
  status: string;
  qrCode?: string | null;
  timestamp: string;
}

/**
 * Información de un chat de WhatsApp
 */
export interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp: string | null;
  lastMessage: {
    body: string;
    fromMe: boolean;
    timestamp: string | null;
  } | null;
}

/**
 * Información de un mensaje de WhatsApp
 */
export interface WhatsAppMessage {
  id: string;
  body: string;
  timestamp: string | null;
  fromMe: boolean;
  author: string;
  hasMedia: boolean;
  type: string;
}

/**
 * Interfaz del servicio de WhatsApp
 */
export interface IWhatsAppService extends EventEmitter {
  initialize(): Promise<void>;
  getStatus(): WhatsAppStatus;
  restart(): Promise<void>;
  logout(): Promise<void>;
  sendMessage(phoneNumber: string, message: string): Promise<any>;
  getContacts(): Promise<any[]>;
  getChats(): Promise<WhatsAppChat[]>;
  getMessages(chatId: string, limit?: number): Promise<WhatsAppMessage[]>;
  markChatAsRead(chatId: string): Promise<boolean>;
  getCustomTags(): Promise<any[]>;
  saveCustomTag(tag: any): Promise<any>;
}
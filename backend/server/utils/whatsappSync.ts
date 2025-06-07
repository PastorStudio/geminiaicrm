/**
 * Utilidad para sincronizar datos frescos de WhatsApp
 * Limpia el caché y obtiene datos actuales directamente de WhatsApp
 */

import { whatsappMultiAccountManager } from '../services/whatsappMultiAccountManager';

export class WhatsAppSyncManager {
  private static cacheMap = new Map<string, any>();
  
  /**
   * Limpia todo el caché de WhatsApp
   */
  static clearAllCache(): void {
    console.log('🧹 Limpiando todo el caché de WhatsApp...');
    this.cacheMap.clear();
    console.log('✅ Caché de WhatsApp limpiado completamente');
  }
  
  /**
   * Obtiene chats frescos directamente de WhatsApp (sin caché)
   */
  static async getFreshChats(accountId: number): Promise<any[]> {
    try {
      console.log(`🔄 Obteniendo chats FRESCOS para cuenta ${accountId}...`);
      
      // Limpiar caché específico de esta cuenta
      const cacheKey = `chats_${accountId}`;
      this.cacheMap.delete(cacheKey);
      
      // Obtener datos frescos directamente
      const freshChats = await whatsappMultiAccountManager.getChats(accountId);
      console.log(`✅ ${freshChats.length} chats FRESCOS obtenidos para cuenta ${accountId}`);
      
      return freshChats || [];
    } catch (error) {
      console.error(`❌ Error obteniendo chats frescos para cuenta ${accountId}:`, error);
      return [];
    }
  }
  
  /**
   * Obtiene mensajes frescos directamente de WhatsApp (sin caché)
   */
  static async getFreshMessages(accountId: number, chatId: string): Promise<any[]> {
    try {
      console.log(`🔄 Obteniendo mensajes FRESCOS para chat ${chatId}...`);
      
      // Limpiar caché específico de este chat
      const cacheKey = `messages_${accountId}_${chatId}`;
      this.cacheMap.delete(cacheKey);
      
      // Obtener datos frescos directamente
      const freshMessages = await whatsappMultiAccountManager.getMessages(accountId, chatId);
      console.log(`✅ ${freshMessages.length} mensajes FRESCOS obtenidos para chat ${chatId}`);
      
      return freshMessages || [];
    } catch (error) {
      console.error(`❌ Error obteniendo mensajes frescos para chat ${chatId}:`, error);
      return [];
    }
  }
  
  /**
   * Fuerza reconexión de una cuenta de WhatsApp
   */
  static async forceReconnect(accountId: number): Promise<boolean> {
    try {
      console.log(`🔄 Forzando reconexión de cuenta ${accountId}...`);
      
      // Limpiar todo el caché de esta cuenta
      this.clearAccountCache(accountId);
      
      // Reinicializar la conexión
      const success = await whatsappMultiAccountManager.initializeAccount(accountId);
      
      if (success) {
        console.log(`✅ Cuenta ${accountId} reconectada exitosamente`);
      } else {
        console.log(`❌ Falló la reconexión de cuenta ${accountId}`);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Error reconectando cuenta ${accountId}:`, error);
      return false;
    }
  }
  
  /**
   * Limpia el caché de una cuenta específica
   */
  static clearAccountCache(accountId: number): void {
    console.log(`🧹 Limpiando caché de cuenta ${accountId}...`);
    
    // Buscar y eliminar todas las entradas relacionadas con esta cuenta
    for (const [key] of this.cacheMap) {
      if (key.includes(`_${accountId}_`) || key.endsWith(`_${accountId}`)) {
        this.cacheMap.delete(key);
      }
    }
    
    console.log(`✅ Caché de cuenta ${accountId} limpiado`);
  }
  
  /**
   * Sincroniza todos los datos de WhatsApp
   */
  static async syncAllData(): Promise<void> {
    console.log('🔄 Iniciando sincronización completa de WhatsApp...');
    
    try {
      // Limpiar todo el caché
      this.clearAllCache();
      
      // Obtener todas las cuentas activas
      const accounts = await whatsappMultiAccountManager.getAccounts();
      console.log(`📱 Sincronizando ${accounts.length} cuentas de WhatsApp...`);
      
      for (const account of accounts) {
        await this.forceReconnect(account.id);
      }
      
      console.log('✅ Sincronización completa de WhatsApp finalizada');
    } catch (error) {
      console.error('❌ Error en sincronización completa:', error);
    }
  }
}
/**
 * Servicio para gestionar y almacenar claves API de forma segura
 * Proporciona funcionalidades para guardar, recuperar y validar claves API
 */

import * as fs from 'fs';
import * as path from 'path';

interface ApiKeys {
  gemini?: string;
  telegram?: string;
  tempKeys?: Record<string, { key: string, expiresAt: number }>;
}

class ApiKeyManager {
  private static instance: ApiKeyManager;
  private keys: ApiKeys;
  private keysFilePath: string;
  
  private constructor() {
    this.keys = {};
    // Ubicación del archivo de claves (nunca debe exponerse al cliente)
    this.keysFilePath = path.join(process.cwd(), '.api-keys.json');
    this.loadKeys();
  }
  
  /**
   * Devuelve la instancia única del gestor de claves
   */
  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }
  
  /**
   * Carga las claves API desde el archivo
   */
  private loadKeys(): void {
    try {
      if (fs.existsSync(this.keysFilePath)) {
        const keysData = fs.readFileSync(this.keysFilePath, 'utf8');
        this.keys = JSON.parse(keysData);
        console.log('Claves API cargadas correctamente');
      } else {
        console.log('No existe archivo de claves API, se creará uno nuevo');
        this.keys = { tempKeys: {} };
        this.saveKeys();
      }
    } catch (error) {
      console.error('Error al cargar claves API:', error);
      this.keys = { tempKeys: {} };
    }
  }
  
  /**
   * Guarda las claves API en el archivo
   */
  private saveKeys(): void {
    try {
      fs.writeFileSync(this.keysFilePath, JSON.stringify(this.keys, null, 2), 'utf8');
    } catch (error) {
      console.error('Error al guardar claves API:', error);
    }
  }
  
  /**
   * Obtiene la clave de Gemini
   */
  getGeminiKey(): string | undefined {
    // Primero intentamos obtener la clave del entorno
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey) {
      return envKey;
    }
    
    // Si no hay clave en el entorno, usamos la almacenada
    return this.keys.gemini;
  }
  
  /**
   * Establece la clave de Gemini
   */
  setGeminiKey(key: string): void {
    this.keys.gemini = key;
    this.saveKeys();
  }
  
  /**
   * Obtiene la clave de Telegram
   */
  getTelegramKey(): string | undefined {
    const envKey = process.env.TELEGRAM_API_KEY;
    if (envKey) {
      return envKey;
    }
    
    return this.keys.telegram;
  }
  
  /**
   * Establece la clave de Telegram
   */
  setTelegramKey(key: string): void {
    this.keys.telegram = key;
    this.saveKeys();
  }
  
  /**
   * Genera una clave temporal
   * @param service Nombre del servicio
   * @param expiresIn Tiempo de expiración en milisegundos
   */
  generateTempKey(service: string, expiresIn: number = 3600000): string {
    const key = `temp_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = Date.now() + expiresIn;
    
    if (!this.keys.tempKeys) {
      this.keys.tempKeys = {};
    }
    
    this.keys.tempKeys[service] = { key, expiresAt };
    this.saveKeys();
    
    return key;
  }
  
  /**
   * Verifica si una clave temporal es válida
   */
  verifyTempKey(service: string, key: string): boolean {
    if (!this.keys.tempKeys || !this.keys.tempKeys[service]) {
      return false;
    }
    
    const tempKey = this.keys.tempKeys[service];
    
    // Verificar si la clave coincide y no ha expirado
    if (tempKey.key === key && tempKey.expiresAt > Date.now()) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Elimina una clave temporal
   */
  removeTempKey(service: string): void {
    if (this.keys.tempKeys && this.keys.tempKeys[service]) {
      delete this.keys.tempKeys[service];
      this.saveKeys();
    }
  }
  
  /**
   * Limpia las claves temporales expiradas
   */
  cleanupTempKeys(): void {
    if (!this.keys.tempKeys) {
      return;
    }
    
    const now = Date.now();
    let modified = false;
    
    for (const service in this.keys.tempKeys) {
      if (this.keys.tempKeys[service].expiresAt < now) {
        delete this.keys.tempKeys[service];
        modified = true;
      }
    }
    
    if (modified) {
      this.saveKeys();
    }
  }

  /**
   * Verifica si hay una clave válida de Gemini configurada
   */
  hasValidGeminiKey(): boolean {
    return !!this.getGeminiKey();
  }

  /**
   * Verifica si se está usando una clave temporal de Gemini
   */
  isUsingTemporaryKey(): boolean {
    // Si hay una clave en el entorno, no es temporal
    if (process.env.GEMINI_API_KEY) {
      return false;
    }
    
    // Verificar si hay una clave temporal activa para Gemini
    if (this.keys.tempKeys && this.keys.tempKeys['gemini']) {
      const tempKey = this.keys.tempKeys['gemini'];
      return tempKey.expiresAt > Date.now();
    }
    
    return false;
  }

  /**
   * Actualiza la clave API de Gemini
   */
  updateGeminiKey(key: string): void {
    // Si la clave es válida, la guardamos
    if (key && key.trim().length > 0) {
      this.setGeminiKey(key.trim());
    }
  }
}

// Exportar la instancia única
export const apiKeyManager = ApiKeyManager.getInstance();
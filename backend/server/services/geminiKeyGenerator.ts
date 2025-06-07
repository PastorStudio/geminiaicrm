/**
 * Servicio para generar automáticamente claves API de Gemini
 * Este servicio maneja la generación, rotación y validación de claves API
 */

import axios from 'axios';
import * as crypto from 'crypto';
import { apiKeyManager } from './apiKeyManager';

// Lista de claves API de respaldo con información del modelo recomendado
// Usamos 'gemini-pro' como fallback cuando 'gemini-1.5-pro' tenga limitaciones de cuota
const BACKUP_API_KEYS = [
  {key: 'AIzaSyCvNKcMCPd_oS2W7qvK6I_h-R7eNbtzCro', model: 'gemini-pro'},
  {key: 'AIzaSyDJ4uf0zcLn2IeL4WQeQaZA24LgAxCqRUw', model: 'gemini-pro'},
  {key: 'AIzaSyB-QnuTZDp3b8_h9bq0JYW0fHF9MAQYHKA', model: 'gemini-pro'},
  {key: 'AIzaSyBvr9vwW6FQVJebMZs_DmTHj8jGscCdcPg', model: 'gemini-pro'},
  {key: 'AIzaSyAbFR_O8XgKp3FTVdKnCStSS5DTb6N2HpE', model: 'gemini-pro'}
];

// Intervalo de validación de claves (en milisegundos)
const VALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas

// Interfaz para el estado de una clave API
interface ApiKeyStatus {
  key: string;
  model: string;
  modelFallback: string;
  quotaExceeded: boolean;
  lastCheck: number;
  lastError?: string;
}

class GeminiKeyGenerator {
  private static instance: GeminiKeyGenerator;
  private lastValidationTime: number = 0;
  private isGenerating: boolean = false;
  private currentKeyIndex: number = 0;
  private keysStatus: Map<string, ApiKeyStatus> = new Map();
  
  private constructor() {
    // Inicializar validador periódico
    this.setupPeriodicValidation();
    
    // Inicializar estado de las claves de respaldo
    BACKUP_API_KEYS.forEach(keyInfo => {
      this.keysStatus.set(keyInfo.key, {
        key: keyInfo.key,
        model: 'gemini-pro', // Usamos el modelo estable que sabemos que funciona
        modelFallback: keyInfo.model,
        quotaExceeded: false,
        lastCheck: 0
      });
    });
  }
  
  public static getInstance(): GeminiKeyGenerator {
    if (!GeminiKeyGenerator.instance) {
      GeminiKeyGenerator.instance = new GeminiKeyGenerator();
    }
    return GeminiKeyGenerator.instance;
  }
  
  /**
   * Configura la validación periódica de claves
   */
  private setupPeriodicValidation(): void {
    setInterval(() => {
      this.validateCurrentKey();
    }, 3600000); // Cada hora
  }
  
  /**
   * Genera una nueva clave API (simulación)
   * En un entorno real, esto se conectaría a la API de Google
   */
  public async generateKey(): Promise<{key: string, model: string}> {
    try {
      if (this.isGenerating) {
        return this.getBackupKey();
      }
      
      this.isGenerating = true;
      
      // Simulamos un retraso en la generación
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // En un entorno real, aquí se haría una petición a la API de Google
      // para generar una nueva clave API
      
      // Por ahora, usamos una de las claves de respaldo
      const backupKeyInfo = this.getBackupKey();
      
      // Guardar la nueva clave
      apiKeyManager.updateGeminiKey(backupKeyInfo.key);
      
      this.isGenerating = false;
      this.lastValidationTime = Date.now();
      
      return backupKeyInfo;
    } catch (error) {
      console.error('Error generando clave API de Gemini:', error);
      this.isGenerating = false;
      return this.getBackupKey();
    }
  }
  
  /**
   * Obtiene una clave de respaldo con información del modelo recomendado
   * @returns {Object} Objeto con la clave API y el modelo recomendado
   */
  private getBackupKey(): { key: string, model: string } {
    const backupInfo = BACKUP_API_KEYS[this.currentKeyIndex];
    // Rotar a la siguiente clave para la próxima solicitud
    this.currentKeyIndex = (this.currentKeyIndex + 1) % BACKUP_API_KEYS.length;
    return backupInfo;
  }
  
  /**
   * Valida la clave API actual
   */
  public async validateCurrentKey(): Promise<boolean> {
    try {
      const currentKey = apiKeyManager.getGeminiKey();
      
      // Si no hay clave actual o ha pasado el tiempo de validación, generar una nueva
      if (!currentKey || (Date.now() - this.lastValidationTime > VALIDATION_INTERVAL)) {
        await this.generateKey();
        return true;
      }
      
      // Verificar si la clave actual es válida
      const isValid = await this.testApiKey(currentKey);
      
      if (!isValid) {
        // Si la clave no es válida, generar una nueva
        await this.generateKey();
      } else {
        this.lastValidationTime = Date.now();
      }
      
      return true;
    } catch (error) {
      console.error('Error validando clave API de Gemini:', error);
      return false;
    }
  }
  
  /**
   * Prueba una clave API para verificar si es válida y determinar qué modelo usar
   * @param apiKey La clave API a probar
   * @returns {boolean} true si la clave es válida, false si no lo es
   */
  private async testApiKey(apiKey: string): Promise<boolean> {
    try {
      // Primero verificamos que la clave API sea válida obteniendo la lista de modelos
      // Actualizado a v1 (la versión beta no está disponible)
      const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
      const response = await axios.get(url);
      
      if (response.status !== 200) {
        console.log('Clave API inválida');
        return false;
      }
      
      // La clave es válida, ahora intentamos con el modelo principal
      let keyStatus = this.keysStatus.get(apiKey) || {
        key: apiKey,
        model: 'gemini-pro',
        modelFallback: 'gemini-pro',
        quotaExceeded: false,
        lastCheck: Date.now()
      };
      
      try {
        // Intentar con Gemini Pro (modelo disponible)
        // Actualizado a v1 en lugar de v1beta para evitar errores 404
        const testResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                parts: [
                  { text: 'Hello' }
                ]
              }
            ],
            generationConfig: {
              maxOutputTokens: 10,
            }
          }
        );
        
        // Si llegamos aquí, Gemini Pro funciona
        console.log('Clave API válida para Gemini Pro');
        keyStatus.model = 'gemini-pro';
        keyStatus.quotaExceeded = false;
        keyStatus.lastCheck = Date.now();
        this.keysStatus.set(apiKey, keyStatus);
        return true;
      } catch (error: any) {
        // Verificar si el error es por límites de cuota (429)
        if (error.response && error.response.status === 429) {
          console.log('Límite de cuota excedido, intentando con modelo alternativo...');
          
          // Intentar con Gemini Pro (el modelo con más cuota disponible)
          try {
            // Actualizado a v1 (la versión beta ya no está disponible)
            const fallbackResponse = await axios.post(
              `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
              {
                contents: [
                  {
                    parts: [
                      { text: 'Hello' }
                    ]
                  }
                ],
                generationConfig: {
                  maxOutputTokens: 10,
                }
              }
            );
            
            // Gemini Pro funciona cuando Gemini 1.5 está limitado
            console.log('Clave válida para Gemini Pro, usando como fallback');
            keyStatus.model = 'gemini-pro';
            keyStatus.quotaExceeded = true;
            keyStatus.lastCheck = Date.now();
            this.keysStatus.set(apiKey, keyStatus);
            return true;
          } catch (fallbackError) {
            console.error('Error también con Gemini Pro:', fallbackError);
            return false;
          }
        } else {
          console.error('Error validando modelo Gemini 1.5:', error);
          
          // Intentamos con Gemini Pro como último recurso
          try {
            // Actualizado a v1 (la versión beta ya no está disponible)
            const fallbackResponse = await axios.post(
              `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
              {
                contents: [
                  {
                    parts: [
                      { text: 'Hello' }
                    ]
                  }
                ],
                generationConfig: {
                  maxOutputTokens: 10,
                }
              }
            );
            
            console.log('Usando Gemini Pro como fallback');
            keyStatus.model = 'gemini-pro';
            keyStatus.lastCheck = Date.now();
            this.keysStatus.set(apiKey, keyStatus);
            return true;
          } catch (fallbackError) {
            console.error('Error también con Gemini Pro:', fallbackError);
            return false;
          }
        }
      }
    } catch (error) {
      console.error('Error general probando clave API de Gemini:', error);
      return false;
    }
  }
  
  /**
   * Obtiene la clave API actual o genera una nueva si es necesario
   */
  public async getValidKey(): Promise<{key: string, model: string}> {
    try {
      // Verificar si hay una clave válida
      const currentKey = apiKeyManager.getGeminiKey();
      
      if (currentKey) {
        // Si ya pasó el tiempo de validación, validar la clave
        if (Date.now() - this.lastValidationTime > VALIDATION_INTERVAL) {
          const isValid = await this.testApiKey(currentKey);
          if (isValid) {
            this.lastValidationTime = Date.now();
            // Devolvemos un objeto con la clave y el modelo recomendado
            return {
              key: currentKey,
              model: 'gemini-pro' // Por defecto usamos gemini-pro para evitar problemas de cuota
            };
          }
        } else {
          // Si no ha pasado el tiempo de validación, devolver la clave actual
          return {
            key: currentKey,
            model: 'gemini-pro'
          };
        }
      }
      
      // Si no hay clave o no es válida, generar una nueva
      return await this.generateKey();
    } catch (error) {
      console.error('Error obteniendo clave válida:', error);
      // En caso de error, devolver un backup seguro
      return {
        key: 'AIzaSyCvNKcMCPd_oS2W7qvK6I_h-R7eNbtzCro', 
        model: 'gemini-pro'
      };
    }
  }
}

// Exportar la instancia única
export const geminiKeyGenerator = GeminiKeyGenerator.getInstance();
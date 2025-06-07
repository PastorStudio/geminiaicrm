/**
 * Utilidades para mejorar la generación y manejo de códigos QR en producción
 */
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';

export interface QRCodeData {
  text: string;
  dataUrl: string;
  generatedAt: number;
  isValid: boolean;
}

export class ProductionQRManager {
  private qrCache: Map<number, QRCodeData> = new Map();
  private readonly cacheMaxAge = 5 * 60 * 1000; // 5 minutos

  /**
   * Valida si un código QR es válido para WhatsApp
   */
  public isValidQRCode(qrText: string): boolean {
    if (!qrText || typeof qrText !== 'string') {
      return false;
    }
    
    // Los códigos QR de WhatsApp tienen un formato específico
    const isValidFormat = qrText.length > 20 && (
      qrText.startsWith('1@') || 
      qrText.startsWith('2@') ||
      qrText.includes('@')
    );
    
    return isValidFormat;
  }

  /**
   * Genera una imagen optimizada del código QR para producción
   */
  public async generateQRImage(qrText: string): Promise<string> {
    try {
      const qrDataUrl = await qrcode.toDataURL(qrText, {
        errorCorrectionLevel: 'H', // Máxima corrección de errores
        type: 'image/png',
        margin: 2,
        scale: 8, // Escala alta para mejor calidad
        width: 400, // Tamaño fijo para consistencia
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return qrDataUrl;
    } catch (error) {
      console.error('Error generando imagen QR:', error);
      throw new Error('No se pudo generar la imagen del código QR');
    }
  }

  /**
   * Almacena un código QR en cache con validación
   */
  public cacheQRCode(accountId: number, qrText: string, dataUrl?: string): boolean {
    try {
      if (!this.isValidQRCode(qrText)) {
        console.warn(`Código QR inválido para cuenta ${accountId}: ${qrText.substring(0, 50)}...`);
        return false;
      }

      const qrData: QRCodeData = {
        text: qrText,
        dataUrl: dataUrl || '',
        generatedAt: Date.now(),
        isValid: true
      };

      this.qrCache.set(accountId, qrData);
      console.log(`Código QR almacenado en cache para cuenta ${accountId}`);
      return true;
    } catch (error) {
      console.error(`Error almacenando QR en cache para cuenta ${accountId}:`, error);
      return false;
    }
  }

  /**
   * Obtiene un código QR desde el cache si es válido y no muy antiguo
   */
  public getCachedQR(accountId: number): QRCodeData | null {
    try {
      const cached = this.qrCache.get(accountId);
      if (!cached) {
        return null;
      }

      // Verificar si no es muy antiguo
      if (Date.now() - cached.generatedAt > this.cacheMaxAge) {
        this.qrCache.delete(accountId);
        console.log(`Cache QR expirado para cuenta ${accountId}, eliminando`);
        return null;
      }

      // Verificar si sigue siendo válido
      if (!this.isValidQRCode(cached.text)) {
        this.qrCache.delete(accountId);
        console.log(`Cache QR inválido para cuenta ${accountId}, eliminando`);
        return null;
      }

      return cached;
    } catch (error) {
      console.error(`Error obteniendo QR desde cache para cuenta ${accountId}:`, error);
      return null;
    }
  }

  /**
   * Guarda el código QR en archivo de manera segura
   */
  public saveQRToFile(qrText: string, filePath: string): boolean {
    try {
      // Verificar que el directorio existe
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Guardar con validación
      if (this.isValidQRCode(qrText)) {
        fs.writeFileSync(filePath, qrText, 'utf8');
        console.log(`Código QR guardado en: ${filePath}`);
        return true;
      } else {
        console.warn(`No se guardó código QR inválido en: ${filePath}`);
        return false;
      }
    } catch (error) {
      console.error(`Error guardando QR en archivo ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Lee un código QR desde archivo con validación
   */
  public readQRFromFile(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const qrText = fs.readFileSync(filePath, 'utf8').trim();
      
      if (this.isValidQRCode(qrText)) {
        return qrText;
      } else {
        console.warn(`Código QR inválido leído desde archivo: ${filePath}`);
        return null;
      }
    } catch (error) {
      console.error(`Error leyendo QR desde archivo ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Limpia códigos QR expirados del cache
   */
  public cleanExpiredCache(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [accountId, qrData] of this.qrCache) {
      if (now - qrData.generatedAt > this.cacheMaxAge) {
        this.qrCache.delete(accountId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Limpiados ${cleaned} códigos QR expirados del cache`);
    }
    
    return cleaned;
  }

  /**
   * Obtiene estadísticas del cache
   */
  public getCacheStats(): { total: number; expired: number; valid: number } {
    const now = Date.now();
    let expired = 0;
    let valid = 0;
    
    for (const qrData of this.qrCache.values()) {
      if (now - qrData.generatedAt > this.cacheMaxAge) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return {
      total: this.qrCache.size,
      expired,
      valid
    };
  }
}

// Instancia global para uso en el sistema
export const productionQRManager = new ProductionQRManager();

// Limpiar cache cada 10 minutos
setInterval(() => {
  productionQRManager.cleanExpiredCache();
}, 10 * 60 * 1000);
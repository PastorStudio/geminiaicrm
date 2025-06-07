/**
 * Generador optimizado de códigos QR para WhatsApp
 * Este módulo se especializa en generar códigos QR confiables para la conexión de WhatsApp
 * en entorno de producción.
 */

import * as fs from 'fs';
import * as path from 'path';
import { WhatsAppStatus } from './whatsappInterface';
import { storage } from '../storage';

/**
 * Clase para optimizar la generación y manejo de códigos QR para WhatsApp
 */
export class OptimizedQRGenerator {
  private qrBasePath: string;
  private backupQrPath: string;

  constructor() {
    // Configurar rutas base para almacenar códigos QR
    this.qrBasePath = path.join(process.cwd(), 'temp', 'whatsapp-accounts');
    this.backupQrPath = path.join(process.cwd(), 'temp', 'qr-backups');
    
    // Asegurar que los directorios existan
    this.ensureDirectories();
    
    console.log('OptimizedQRGenerator inicializado en modo producción');
  }

  /**
   * Asegura que los directorios necesarios para almacenar QR existan
   */
  private ensureDirectories(): void {
    try {
      // Crear directorios si no existen
      [this.qrBasePath, this.backupQrPath].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`Directorio creado: ${dir}`);
        }
      });
    } catch (error) {
      console.error('Error creando directorios para QR:', error);
    }
  }

  /**
   * Obtiene la ruta del archivo QR para una cuenta específica
   */
  public getQRPath(accountId: number): string {
    const accountDir = path.join(this.qrBasePath, `account_${accountId}`);
    
    // Asegurar que el directorio de la cuenta exista
    if (!fs.existsSync(accountDir)) {
      fs.mkdirSync(accountDir, { recursive: true });
    }
    
    return path.join(accountDir, 'qr.txt');
  }

  /**
   * Guarda un código QR para una cuenta específica
   */
  public saveQRCode(accountId: number, qrCode: string): boolean {
    try {
      const qrPath = this.getQRPath(accountId);
      
      // Guardar QR
      fs.writeFileSync(qrPath, qrCode, 'utf8');
      
      // Crear backup del QR para mayor seguridad
      const backupPath = path.join(this.backupQrPath, `qr_${accountId}_${Date.now()}.txt`);
      fs.writeFileSync(backupPath, qrCode, 'utf8');
      
      console.log(`Nuevo código QR guardado para cuenta ID ${accountId}`);
      
      // Actualizar el estado en la base de datos
      this.updateAccountStatus(accountId, {
        lastQrTimestamp: Date.now(),
        hasValidQr: true
      });
      
      return true;
    } catch (error) {
      console.error(`Error guardando QR para cuenta ID ${accountId}:`, error);
      return false;
    }
  }

  /**
   * Lee un código QR para una cuenta específica
   */
  public readQRCode(accountId: number): string | null {
    try {
      const qrPath = this.getQRPath(accountId);
      
      if (fs.existsSync(qrPath)) {
        const qrCode = fs.readFileSync(qrPath, 'utf8');
        
        // Verificar que el QR sea válido (formato esperado de WhatsApp)
        if (qrCode && qrCode.length > 20 && (qrCode.startsWith('1@') || qrCode.startsWith('2@'))) {
          console.log(`QR válido leído para cuenta ID ${accountId}`);
          return qrCode;
        } else {
          console.warn(`QR inválido encontrado para cuenta ID ${accountId}`);
          
          // Actualizar el estado en la base de datos
          this.updateAccountStatus(accountId, {
            hasValidQr: false,
            needsRegeneration: true
          });
          
          return null;
        }
      }
    } catch (error) {
      console.error(`Error leyendo QR para cuenta ID ${accountId}:`, error);
    }
    
    return null;
  }

  /**
   * Busca un QR válido, incluyendo en backups si es necesario
   */
  public findValidQR(accountId: number): string | null {
    // Primero verificar en la ubicación principal
    const primaryQR = this.readQRCode(accountId);
    if (primaryQR) return primaryQR;
    
    // Si no se encuentra, buscar en backups
    try {
      const backupDir = this.backupQrPath;
      if (fs.existsSync(backupDir)) {
        const files = fs.readdirSync(backupDir)
          .filter(file => file.startsWith(`qr_${accountId}_`))
          .sort((a, b) => {
            // Ordenar por timestamp (más reciente primero)
            const timestampA = parseInt(a.split('_')[2]) || 0;
            const timestampB = parseInt(b.split('_')[2]) || 0;
            return timestampB - timestampA;
          });
        
        // Intentar con los últimos 3 backups
        for (const file of files.slice(0, 3)) {
          try {
            const qrCode = fs.readFileSync(path.join(backupDir, file), 'utf8');
            if (qrCode && qrCode.length > 20 && (qrCode.startsWith('1@') || qrCode.startsWith('2@'))) {
              console.log(`QR válido encontrado en backup para cuenta ID ${accountId}`);
              
              // Restaurar este QR como principal
              this.saveQRCode(accountId, qrCode);
              
              return qrCode;
            }
          } catch (readErr) {
            continue; // Intentar con el siguiente backup
          }
        }
      }
    } catch (error) {
      console.error(`Error buscando QR en backups para cuenta ID ${accountId}:`, error);
    }
    
    return null;
  }

  /**
   * Genera un código QR temporal para mostrar en la interfaz
   */
  public generateTemporaryQR(accountId: number): string {
    const tempQR = `2@TEMP_WA_ACCOUNT_${accountId}_${Date.now()}`;
    this.saveQRCode(accountId, tempQR);
    console.log(`QR temporal generado para cuenta ID ${accountId}`);
    return tempQR;
  }

  /**
   * Actualiza el estado de la cuenta en la base de datos
   */
  private async updateAccountStatus(accountId: number, statusData: any): Promise<void> {
    try {
      const account = await storage.getWhatsappAccount(accountId);
      if (account) {
        // Actualizar sessionData con nuevos campos
        const sessionData = account.sessionData || {};
        const updatedSessionData = {
          ...sessionData,
          ...statusData,
          lastUpdated: new Date().toISOString()
        };
        
        await storage.updateWhatsappAccount(accountId, {
          sessionData: updatedSessionData
        });
      }
    } catch (error) {
      console.error(`Error actualizando estado de cuenta ${accountId}:`, error);
    }
  }
}

// Exportar una instancia única del generador optimizado
export const qrGenerator = new OptimizedQRGenerator();
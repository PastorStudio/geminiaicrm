import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

interface QRCodeData {
  text: string;
  dataUrl: string;
  generatedAt: number;
  expiresAt: number;
  accountId: number;
}

/**
 * Gestor mejorado de códigos QR con tiempos extendidos para producción
 */
export class ImprovedQRManager {
  private qrCache = new Map<number, QRCodeData>();
  private readonly QR_VALIDITY_TIME = 25 * 60 * 1000; // 25 minutos
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutos
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Genera un código QR con tiempo extendido para conexión
   */
  async generateQRCode(accountId: number, qrText: string): Promise<QRCodeData> {
    const now = Date.now();
    const expiresAt = now + this.QR_VALIDITY_TIME;

    try {
      // Generar código QR de alta calidad
      const dataUrl = await QRCode.toDataURL(qrText, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 512,
        scale: 8
      });

      const qrData: QRCodeData = {
        text: qrText,
        dataUrl,
        generatedAt: now,
        expiresAt,
        accountId
      };

      // Almacenar en cache
      this.qrCache.set(accountId, qrData);

      // Guardar como respaldo en archivo
      await this.saveQRToFile(accountId, qrData);

      console.log(`✓ Código QR generado para cuenta ${accountId} (válido por 25 minutos)`);
      return qrData;

    } catch (error) {
      console.error(`Error generando código QR para cuenta ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene un código QR válido, regenerándolo si es necesario
   */
  async getValidQRCode(accountId: number, qrText?: string): Promise<QRCodeData | null> {
    const cached = this.qrCache.get(accountId);
    const now = Date.now();

    // Verificar si el código en cache sigue válido
    if (cached && cached.expiresAt > now) {
      console.log(`✓ Usando código QR válido de cache para cuenta ${accountId}`);
      return cached;
    }

    // Intentar cargar desde archivo si no hay texto nuevo
    if (!qrText) {
      const fromFile = await this.loadQRFromFile(accountId);
      if (fromFile && fromFile.expiresAt > now) {
        this.qrCache.set(accountId, fromFile);
        console.log(`✓ Código QR cargado desde archivo para cuenta ${accountId}`);
        return fromFile;
      }
    }

    // Si tenemos texto nuevo, generar código QR
    if (qrText) {
      return await this.generateQRCode(accountId, qrText);
    }

    console.log(`⚠ No hay código QR válido para cuenta ${accountId}`);
    return null;
  }

  /**
   * Verifica si un código QR sigue siendo válido
   */
  isQRValid(accountId: number): boolean {
    const qrData = this.qrCache.get(accountId);
    if (!qrData) return false;
    
    return qrData.expiresAt > Date.now();
  }

  /**
   * Obtiene el tiempo restante de validez en minutos
   */
  getRemainingValidityMinutes(accountId: number): number {
    const qrData = this.qrCache.get(accountId);
    if (!qrData) return 0;
    
    const remaining = qrData.expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / (60 * 1000)));
  }

  /**
   * Guarda el código QR en archivo como respaldo
   */
  private async saveQRToFile(accountId: number, qrData: QRCodeData): Promise<void> {
    try {
      const baseDir = path.join(process.cwd(), 'temp', 'whatsapp-qr');
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      const filePath = path.join(baseDir, `qr_${accountId}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(qrData, null, 2));
    } catch (error) {
      console.warn(`Advertencia: No se pudo guardar QR en archivo para cuenta ${accountId}:`, error);
    }
  }

  /**
   * Carga el código QR desde archivo
   */
  private async loadQRFromFile(accountId: number): Promise<QRCodeData | null> {
    try {
      const filePath = path.join(process.cwd(), 'temp', 'whatsapp-qr', `qr_${accountId}.json`);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = await fs.promises.readFile(filePath, 'utf8');
      const qrData: QRCodeData = JSON.parse(data);
      
      // Verificar que no esté expirado
      if (qrData.expiresAt <= Date.now()) {
        fs.unlinkSync(filePath); // Eliminar archivo expirado
        return null;
      }

      return qrData;
    } catch (error) {
      console.warn(`Advertencia: Error cargando QR desde archivo para cuenta ${accountId}:`, error);
      return null;
    }
  }

  /**
   * Inicia el timer de limpieza automática
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredQRs();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Limpia códigos QR expirados
   */
  private cleanupExpiredQRs(): void {
    const now = Date.now();
    let cleaned = 0;

    Array.from(this.qrCache.entries()).forEach(([accountId, qrData]) => {
      if (qrData.expiresAt <= now) {
        this.qrCache.delete(accountId);
        cleaned++;

        // Eliminar archivo también
        try {
          const filePath = path.join(process.cwd(), 'temp', 'whatsapp-qr', `qr_${accountId}.json`);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          // Ignorar errores de eliminación de archivos
        }
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 Limpiados ${cleaned} códigos QR expirados`);
    }
  }

  /**
   * Elimina código QR específico
   */
  removeQR(accountId: number): void {
    this.qrCache.delete(accountId);
    
    try {
      const filePath = path.join(process.cwd(), 'temp', 'whatsapp-qr', `qr_${accountId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Ignorar errores
    }
  }

  /**
   * Destruye el gestor y limpia recursos
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.qrCache.clear();
  }
}

export const improvedQRManager = new ImprovedQRManager();
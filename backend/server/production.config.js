/**
 * Configuración para modo producción
 * Este archivo establece los parámetros necesarios para que la aplicación funcione
 * correctamente en un entorno de producción
 */

// Configurar entorno como producción
process.env.NODE_ENV = 'production';

// Configuraciones específicas para el modo producción
module.exports = {
  // Modo de la aplicación
  mode: 'production',
  
  // Opciones para la generación de códigos QR
  qrOptions: {
    // Tiempo máximo de espera para la generación de QR (ms)
    qrTimeout: 20000,
    
    // Intentos de generación de QR antes de fallar
    qrMaxRetries: 5,
    
    // Directorio para almacenar códigos QR
    qrStorageDir: './temp/whatsapp-accounts',
    
    // Directorio para backups
    qrBackupDir: './temp/qr-backups'
  },
  
  // Configuración de Puppeteer para WhatsApp Web
  browser: {
    // Usar Chromium instalado en el sistema
    useSystemChromium: true,
    
    // Argumentos para el navegador
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    
    // Tiempo máximo de espera para operaciones del navegador (ms)
    timeout: 30000
  },
  
  // Configuraciones de seguridad
  security: {
    // Habilitar CORS para dominios específicos
    allowedOrigins: ['*'],
    
    // Limitar intentos de autenticación
    maxAuthAttempts: 5,
    
    // Tiempo (en ms) para bloqueo tras intentos fallidos
    lockoutTime: 300000
  }
};
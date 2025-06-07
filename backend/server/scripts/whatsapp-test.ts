/**
 * Script para probar la generación de códigos QR reales de WhatsApp Web
 * Este script es independiente y puede ejecutarse con node
 */

import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import puppeteer from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';

// Directorio para almacenar sesiones de WhatsApp
const SESSION_DIR = path.join(process.cwd(), 'temp', 'whatsapp-sessions');
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

async function findChromiumPath() {
  // Rutas donde podría estar Chromium
  const possiblePaths = [
    '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    '/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];
  
  for (const path of possiblePaths) {
    try {
      if (fs.existsSync(path)) {
        console.log(`Encontrado Chromium en ${path}`);
        return path;
      }
    } catch {
      // Ignorar error y probar siguiente ruta
    }
  }
  
  // Si no se encuentra, mostrar mensaje de error
  console.error("No se encontró Chromium en el sistema");
  return null;
}

(async () => {
  try {
    console.log("Buscando ejecutable de Chromium...");
    const chromiumPath = await findChromiumPath();
    
    if (!chromiumPath) {
      console.error("No se pudo encontrar Chromium. Por favor instálalo para continuar.");
      process.exit(1);
    }
    
    // Probar si podemos inicializar Puppeteer
    try {
      console.log("Intentando inicializar Puppeteer con Chromium...");
      const browser = await puppeteer.launch({
        executablePath: chromiumPath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      
      console.log("Puppeteer inicializado correctamente");
      await browser.close();
    } catch (error) {
      console.error("Error al inicializar Puppeteer:", error);
      process.exit(1);
    }
    
    // Inicializar cliente de WhatsApp
    console.log("Inicializando cliente de WhatsApp Web...");
    const client = new Client({
      authStrategy: new LocalAuth({
        dataPath: SESSION_DIR
      }),
      puppeteer: {
        executablePath: chromiumPath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });
    
    // Eventos del cliente
    client.on('qr', (qr) => {
      console.log('CÓDIGO QR RECIBIDO - Escanéalo con tu teléfono');
      qrcode.generate(qr, { small: true });
      
      // También guardar el código QR en un archivo
      fs.writeFileSync(path.join(process.cwd(), 'temp', 'last-qr-code.txt'), qr);
      console.log('Código QR guardado en temp/last-qr-code.txt');
    });
    
    client.on('ready', () => {
      console.log('Cliente de WhatsApp Web listo');
    });
    
    client.on('authenticated', () => {
      console.log('Autenticación exitosa');
    });
    
    client.on('auth_failure', (error) => {
      console.error('Error de autenticación:', error);
    });
    
    // Inicializar cliente
    await client.initialize();
    
  } catch (error) {
    console.error('Error general:', error);
  }
})();
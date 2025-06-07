/**
 * Configuración avanzada para Puppeteer que funciona en entornos restrictivos como Replit
 * Versión ES Modules
 */
import puppeteerExtra from 'puppeteer-extra';
import { Browser } from 'puppeteer-core';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import util from 'util';

// Promisificar exec para usar async/await
const exec = util.promisify(execCallback);

// Importar Playwright solo si está disponible
let chromium: any;
// Usamos una función asíncrona autoinvocada para permitir top-level await
(async () => {
  try {
    const playwright = await import('playwright');
    chromium = playwright.chromium;
  } catch (error: any) {
    console.log("Playwright no está disponible:", error.message);
    chromium = null;
  }
})();

// Añadir plugins de Puppeteer
puppeteerExtra.use(StealthPlugin());

// Detectar el entorno de Replit
const IS_REPLIT = process.env.REPLIT_OWNER !== undefined;
if (IS_REPLIT) {
  console.log("Detectado entorno Replit, usando configuración especial...");
}

// Encontrar la ruta del ejecutable de Chromium
async function findChromiumPath() {
  try {
    // Verificar si chromium está instalado usando which
    const { stdout } = await exec('which chromium');
    const chromiumPath = stdout.toString().trim();
    if (chromiumPath && fs.existsSync(chromiumPath)) {
      console.log(`Chromium encontrado en: ${chromiumPath}`);
      return chromiumPath;
    }
  } catch (error) {
    console.log("No se encontró chromium usando 'which chromium'");
  }
  
  // Rutas comunes donde se puede encontrar chromium
  const possiblePaths = [
    '/nix/store/chromium/bin/chromium',
    '/nix/store/*/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
  ];
  
  for (const pattern of possiblePaths) {
    if (pattern.includes('*')) {
      try {
        // Si el patrón contiene un asterisco, buscar coincidencias
        const { stdout } = await exec(`ls ${pattern} 2>/dev/null || echo ""`);
        const paths = stdout.toString().trim().split('\n').filter(p => p);
        if (paths.length > 0) {
          console.log(`Chromium encontrado en: ${paths[0]}`);
          return paths[0];
        }
      } catch {
        // Ignorar errores con patrones glob
      }
    } else if (fs.existsSync(pattern)) {
      console.log(`Chromium encontrado en: ${pattern}`);
      return pattern;
    }
  }
  
  // Si no encontramos chromium, buscar chrome
  try {
    const { stdout } = await exec('which google-chrome');
    const chromePath = stdout.toString().trim();
    if (chromePath && fs.existsSync(chromePath)) {
      console.log(`Chrome encontrado en: ${chromePath}`);
      return chromePath;
    }
  } catch {
    console.log("No se encontró google-chrome usando 'which google-chrome'");
  }
  
  console.log("No se encontró ningún navegador compatible en el sistema.");
  return null;
}

// Instalar chromium si no está disponible
async function ensureChromium() {
  const chromiumPath = await findChromiumPath();
  if (chromiumPath) {
    return chromiumPath;
  }
  
  console.log("Intentando instalar chromium...");
  try {
    // En entornos basados en Debian/Ubuntu
    await exec('apt-get update && apt-get install -y chromium-browser');
    
    // Verificar si se instaló correctamente
    const { stdout } = await exec('which chromium-browser');
    const installedPath = stdout.toString().trim();
    if (installedPath && fs.existsSync(installedPath)) {
      console.log(`Chromium instalado en: ${installedPath}`);
      return installedPath;
    }
  } catch (error) {
    console.error("Error instalando chromium:", error);
  }
  
  console.log("No se pudo instalar chromium automáticamente.");
  return null;
}

// Crear un navegador utilizando Puppeteer
async function createPuppeteerBrowser() {
  console.log("Intentando crear navegador con Puppeteer...");
  
  const chromiumPath = await ensureChromium();
  const puppeteerOptions: any = {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
    ],
    headless: true
  };
  
  if (chromiumPath) {
    puppeteerOptions.executablePath = chromiumPath;
  }
  
  try {
    const browser = await puppeteerExtra.launch(puppeteerOptions);
    console.log("Navegador Puppeteer creado exitosamente");
    return browser;
  } catch (error) {
    console.error("Error creando navegador con Puppeteer:", error);
    return null;
  }
}

// Crear un navegador utilizando Playwright
async function createPlaywrightBrowser() {
  if (!chromium) {
    console.log("Playwright no está disponible para crear un navegador");
    return null;
  }
  
  console.log("Intentando crear navegador con Playwright...");
  
  try {
    const browser = await chromium.launch({
      executablePath: await findChromiumPath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      headless: true
    });
    
    console.log("Navegador Playwright creado exitosamente");
    
    // Convertir a interfaz compatible con Puppeteer
    const puppeteerBrowser = {
      pages: async () => {
        const pwPages = browser.contexts()[0].pages();
        return pwPages.map((pwPage: any) => ({
          goto: async (url: string) => pwPage.goto(url),
          evaluate: async (fn: Function) => pwPage.evaluate(fn as any),
          // Agregar más métodos según sea necesario
        }));
      },
      newPage: async () => {
        const pwPage = await browser.newPage();
        return {
          goto: async (url: string) => pwPage.goto(url),
          evaluate: async (fn: Function) => pwPage.evaluate(fn as any),
          // Agregar más métodos según sea necesario
        };
      },
      close: async () => browser.close(),
      // Agregar más métodos según sea necesario
    };
    
    return puppeteerBrowser as unknown as Browser;
  } catch (error) {
    console.error("Error creando navegador con Playwright:", error);
    return null;
  }
}

// Función principal para crear un navegador
export async function createBrowser(): Promise<any> {
  try {
    // Primero intentamos con Puppeteer
    const puppeteerBrowser = await createPuppeteerBrowser();
    if (puppeteerBrowser) {
      return puppeteerBrowser;
    }
    
    // Si Puppeteer falla, intentamos con Playwright
    const playwrightBrowser = await createPlaywrightBrowser();
    if (playwrightBrowser) {
      return playwrightBrowser;
    }
    
    // Si ambos fallan, lanzamos un error
    throw new Error("No se pudo crear un navegador con ningún método disponible.");
  } catch (error) {
    console.error("Error grave creando navegador:", error);
    throw error;
  }
}
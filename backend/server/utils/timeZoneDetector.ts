/**
 * Utilidad para detectar y manejar zonas horarias
 * Proporciona funcionalidades para detectar la zona horaria local y ajustar timestamps
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Directorio para almacenar configuración de zona horaria
const CONFIG_DIR = path.join(process.cwd(), 'temp');
const TIMEZONE_CONFIG_FILE = path.join(CONFIG_DIR, 'timezone_config.json');

// Interfaz para la configuración de zona horaria
interface TimeZoneConfig {
  timeZone: string;
  offset: number;
  daylightSaving: boolean;
  source: 'auto' | 'manual';
  detectedAt: string;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}

// Configuración predeterminada (UTC)
const DEFAULT_TIMEZONE_CONFIG: TimeZoneConfig = {
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  offset: new Date().getTimezoneOffset() * -1, // Convertir a minutos positivos
  daylightSaving: isDaylightSavingTime(),
  source: 'auto',
  detectedAt: new Date().toISOString()
};

/**
 * Detecta si el horario de verano está activo
 */
function isDaylightSavingTime(): boolean {
  const january = new Date(new Date().getFullYear(), 0, 1).getTimezoneOffset();
  const july = new Date(new Date().getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(january, july) !== new Date().getTimezoneOffset();
}

/**
 * Carga la configuración de zona horaria desde el archivo
 */
export async function getTimeZoneConfig(): Promise<TimeZoneConfig> {
  try {
    // Asegurarse de que el directorio de configuración existe
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    // Verificar si el archivo de configuración existe
    if (fs.existsSync(TIMEZONE_CONFIG_FILE)) {
      const configData = fs.readFileSync(TIMEZONE_CONFIG_FILE, 'utf8');
      const config = JSON.parse(configData) as TimeZoneConfig;
      
      // Validar que la configuración tiene los campos requeridos
      if (config.timeZone && typeof config.offset === 'number') {
        return config;
      }
    }
    
    // Si no existe o no es válido, detectar automáticamente
    const autoConfig = await detectTimeZone();
    saveTimeZoneConfig(autoConfig);
    return autoConfig;
  } catch (error) {
    console.error('Error cargando configuración de zona horaria:', error);
    // En caso de error, usar la configuración predeterminada
    return DEFAULT_TIMEZONE_CONFIG;
  }
}

/**
 * Guarda la configuración de zona horaria en el archivo
 */
function saveTimeZoneConfig(config: TimeZoneConfig): void {
  try {
    fs.writeFileSync(TIMEZONE_CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('Configuración de zona horaria guardada correctamente');
  } catch (error) {
    console.error('Error guardando configuración de zona horaria:', error);
  }
}

/**
 * Detecta la zona horaria usando geolocalización IP
 */
async function detectTimeZone(): Promise<TimeZoneConfig> {
  try {
    // Intentar obtener la zona horaria por geolocalización
    const geoResponse = await axios.get('http://ip-api.com/json/?fields=status,country,city,lat,lon,timezone,offset');
    
    if (geoResponse.data && geoResponse.data.status === 'success') {
      const data = geoResponse.data;
      
      return {
        timeZone: data.timezone || DEFAULT_TIMEZONE_CONFIG.timeZone,
        offset: data.offset ? data.offset / 60 : DEFAULT_TIMEZONE_CONFIG.offset, // Convertir segundos a minutos
        daylightSaving: isDaylightSavingTime(),
        source: 'auto',
        detectedAt: new Date().toISOString(),
        location: {
          country: data.country,
          city: data.city,
          latitude: data.lat,
          longitude: data.lon
        }
      };
    }
    
    throw new Error('No se pudo obtener información de geolocalización');
  } catch (error) {
    console.warn('Error detectando zona horaria por geolocalización:', error);
    
    // Usar detección del sistema local como respaldo
    return {
      ...DEFAULT_TIMEZONE_CONFIG,
      detectedAt: new Date().toISOString()
    };
  }
}

/**
 * Establece manualmente la zona horaria
 */
export async function setTimeZone(timeZone: string): Promise<TimeZoneConfig> {
  try {
    // Verificar que la zona horaria es válida intentando usarla
    new Date().toLocaleString('en-US', { timeZone });
    
    // Calcular offset para esta zona horaria
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone }));
    const offset = (tzDate.getTime() - utcDate.getTime()) / 60000; // Convertir a minutos
    
    const config: TimeZoneConfig = {
      timeZone,
      offset,
      daylightSaving: isDaylightSavingTime(),
      source: 'manual',
      detectedAt: new Date().toISOString()
    };
    
    saveTimeZoneConfig(config);
    return config;
  } catch (error) {
    console.error(`Error configurando zona horaria "${timeZone}":`, error);
    throw new Error(`Zona horaria "${timeZone}" no válida`);
  }
}

/**
 * Convierte un timestamp de WhatsApp (segundos desde epoch) a fecha local
 */
export function convertWhatsAppTimestamp(timestamp: number): Date {
  // WhatsApp usa segundos, JavaScript usa milisegundos
  return new Date(timestamp * 1000);
}

/**
 * Formatea una fecha según la zona horaria configurada
 */
export function formatDate(date: Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
  try {
    if (format === 'short') {
      return date.toLocaleTimeString();
    } else if (format === 'long') {
      return date.toLocaleString();
    } else {
      return date.toLocaleString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
      });
    }
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return date.toString();
  }
}

// Inicializar la configuración de zona horaria al cargar el módulo
getTimeZoneConfig().catch(err => {
  console.error('Error inicializando configuración de zona horaria:', err);
});
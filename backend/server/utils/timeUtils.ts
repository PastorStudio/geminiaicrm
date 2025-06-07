/**
 * Utilidades de tiempo para sincronizar todo el sistema con fecha real
 * Fecha real: Enero 28, 2025 - Zona horaria: Nueva York
 */

const REAL_DATE = new Date('2025-01-28T22:17:00.000-05:00'); // Nueva York tiempo
const SYSTEM_DATE_OFFSET = REAL_DATE.getTime() - Date.now();

/**
 * Obtiene la fecha real actual ajustada
 */
export function getRealNow(): Date {
  return new Date(Date.now() + SYSTEM_DATE_OFFSET);
}

/**
 * Obtiene el timestamp real actual
 */
export function getRealTimestamp(): number {
  return getRealNow().getTime();
}

/**
 * Convierte un timestamp del sistema a tiempo real
 */
export function convertToRealTime(systemTimestamp: number): Date {
  return new Date(systemTimestamp + SYSTEM_DATE_OFFSET);
}

/**
 * Formatea la fecha en zona horaria de Nueva York
 */
export function formatNYTime(date: Date = getRealNow()): string {
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Obtiene la fecha para insertar en base de datos
 */
export function getDBTimestamp(): Date {
  return getRealNow();
}

/**
 * Verifica si un timestamp está dentro del rango aceptable (último día)
 */
export function isRecentTimestamp(timestamp: number): boolean {
  const now = getRealTimestamp();
  const oneDayAgo = now - (24 * 60 * 60 * 1000); // 24 horas atrás
  return timestamp >= oneDayAgo && timestamp <= now;
}

/**
 * Override global para Date.now() en Node.js
 */
export function initializeTimeSync() {
  console.log('🕐 Inicializando sincronización de tiempo con Nueva York');
  console.log('📅 Fecha real configurada:', formatNYTime());
  
  // Override Date.now para todo el servidor
  const originalNow = Date.now;
  Date.now = function(): number {
    return originalNow() + SYSTEM_DATE_OFFSET;
  };
  
  // Override new Date() sin parámetros
  const originalDate = global.Date;
  global.Date = class extends originalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(originalDate.now() + SYSTEM_DATE_OFFSET);
      } else {
        super(...args);
      }
    }
    
    static now(): number {
      return originalDate.now() + SYSTEM_DATE_OFFSET;
    }
  } as any;
}

/**
 * Configuración para zona horaria
 */
export const NY_TIMEZONE = 'America/New_York';
export const REAL_DATE_STRING = '2025-01-28';

console.log('🌎 Módulo de tiempo cargado - Fecha real:', formatNYTime());
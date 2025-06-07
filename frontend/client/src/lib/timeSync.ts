/**
 * Sincronización de tiempo para el frontend
 * Configurado para usar fecha real: enero 28, 2025 con zona horaria Nueva York
 */

// Fecha real configurada: 27 de mayo 2025, 11:18 PM hora Nueva York
const REAL_DATE_OFFSET = new Date('2025-05-27T23:18:00.000-04:00').getTime() - Date.now();

// Override global de Date.now para el frontend
const originalNow = Date.now;
Date.now = function(): number {
  return originalNow() + REAL_DATE_OFFSET;
};

// Override constructor Date sin parámetros
const originalDate = globalThis.Date;
globalThis.Date = class extends originalDate {
  constructor(...args: any[]) {
    if (args.length === 0) {
      super(originalDate.now() + REAL_DATE_OFFSET);
    } else {
      super(...args);
    }
  }
  
  static now(): number {
    return originalDate.now() + REAL_DATE_OFFSET;
  }
} as any;

/**
 * Obtiene la fecha real actual sincronizada
 */
export function getRealNow(): Date {
  return new Date();
}

/**
 * Obtiene timestamp real actual
 */
export function getRealTimestamp(): number {
  return Date.now();
}

/**
 * Verifica si un timestamp está dentro del rango aceptable (últimas 24 horas)
 */
export function isRecentTimestamp(timestamp: number): boolean {
  const now = getRealTimestamp();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  return timestamp >= oneDayAgo && timestamp <= now;
}

/**
 * Formatea fecha en zona horaria Nueva York
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

console.log('🕐 FRONTEND SINCRONIZADO - NUEVA YORK:', formatNYTime());
console.log('📅 Fecha real configurada:', getRealNow().toISOString());
/**
 * Formatea una fecha en formato ISO a formato legible
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Devuelve una fecha hace X días desde hoy
 */
export function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Devuelve una fecha hace X meses desde hoy
 */
export function getMonthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

/**
 * Comprueba si una fecha está dentro de un rango especificado
 */
export function isDateInRange(date: Date | string, startDate: Date | string, endDate: Date | string): boolean {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return d >= start && d <= end;
}

/**
 * Calcula la diferencia en días entre dos fechas
 */
export function daysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Reset hours to compare only dates
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Convierte una fecha a formato ISO (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Obtiene el primer día del mes actual
 */
export function getFirstDayOfMonth(): Date {
  const date = new Date();
  date.setDate(1);
  return date;
}

/**
 * Obtiene el último día del mes actual
 */
export function getLastDayOfMonth(): Date {
  const date = new Date();
  // Ir al próximo mes, día 0 (que es el último día del mes actual)
  date.setMonth(date.getMonth() + 1, 0);
  return date;
}

/**
 * Agrupa una lista de elementos por año y mes
 */
export function groupByMonth<T>(items: T[], dateAccessor: (item: T) => Date | string): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  
  items.forEach(item => {
    const date = new Date(dateAccessor(item));
    const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    
    grouped[key].push(item);
  });
  
  return grouped;
}

/**
 * Obtiene el nombre del día de la semana 
 */
export function getDayName(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', { weekday: 'long' });
}

/**
 * Obtiene el nombre del mes
 */
export function getMonthName(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', { month: 'long' });
}
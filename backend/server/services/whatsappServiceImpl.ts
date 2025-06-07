/**
 * Implementación simplificada del servicio de WhatsApp
 * Este archivo reemplaza la implementación anterior que tenía errores
 */

import { EventEmitter } from 'events';
import simplifiedService from './simplified-whatsappService';

// Crear un objeto para exportar
const serviceInstance = simplifiedService;

// Mantener compatibilidad con las exportaciones esperadas por otros módulos
export default serviceInstance;
export const whatsappService = serviceInstance;
export const whatsappServiceImpl = serviceInstance;
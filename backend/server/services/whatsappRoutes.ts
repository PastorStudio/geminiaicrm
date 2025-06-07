/**
 * Rutas para el servicio de WhatsApp
 */

import type { Express } from "express";
import whatsappRoutes from "../routes/whatsappRoutes";

// Función para registrar todas las rutas de WhatsApp
export function registerWhatsAppRoutes(app: Express): void {
  // Registrar las rutas bajo el prefijo /api/whatsapp
  app.use('/api/whatsapp', whatsappRoutes);
  
  console.log('Rutas de WhatsApp registradas correctamente');
}
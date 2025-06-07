/**
 * Configuración de variables de entorno para el cliente
 */

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export const isGeminiConfigured = !!GEMINI_API_KEY;
/**
 * Sistema de cifrado y protección de datos sensibles
 * Protege información crítica del sistema WhatsApp CRM
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ✅ ALGORITMO DE CIFRADO SEGURO
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// ✅ GENERADOR DE CLAVES SEGURAS
export function generateSecureKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}

// ✅ HASHEADOR SEGURO PARA CONTRASEÑAS
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + useSalt).digest('hex');
  return { hash, salt: useSalt };
}

// ✅ CIFRADOR DE DATOS SENSIBLES
export function encryptSensitiveData(data: string, key: string): string {
  try {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combinar IV + Tag + Datos cifrados
    return iv.toString('hex') + tag.toString('hex') + encrypted;
    
  } catch (error) {
    console.error('❌ Error cifrando datos:', error);
    throw new Error('Error en cifrado de datos sensibles');
  }
}

// ✅ DESCIFRADOR DE DATOS SENSIBLES
export function decryptSensitiveData(encryptedData: string, key: string): string {
  try {
    const keyBuffer = Buffer.from(key, 'hex');
    
    // Extraer IV, tag y datos cifrados
    const iv = Buffer.from(encryptedData.substr(0, IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(encryptedData.substr(IV_LENGTH * 2, TAG_LENGTH * 2), 'hex');
    const encrypted = encryptedData.substr((IV_LENGTH + TAG_LENGTH) * 2);
    
    const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error) {
    console.error('❌ Error descifrando datos:', error);
    throw new Error('Error en descifrado de datos sensibles');
  }
}

// ✅ VALIDADOR DE INTEGRIDAD DE DATOS
export function validateDataIntegrity(data: string, expectedHash: string): boolean {
  const actualHash = createHash('sha256').update(data).digest('hex');
  return actualHash === expectedHash;
}

// ✅ GENERADOR DE TOKENS SEGUROS
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

// ✅ SANITIZADOR DE LOGS PARA PRODUCCIÓN
export function sanitizeLogData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sensitiveFields = [
    'password', 'token', 'apiKey', 'secret', 'key',
    'authorization', 'cookie', 'session', 'auth'
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// ✅ VALIDADOR DE FUERZA DE CONTRASEÑA
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  requirements: string[];
} {
  const requirements: string[] = [];
  let score = 0;
  
  if (password.length >= 8) {
    score += 20;
  } else {
    requirements.push('Mínimo 8 caracteres');
  }
  
  if (/[A-Z]/.test(password)) {
    score += 20;
  } else {
    requirements.push('Al menos una mayúscula');
  }
  
  if (/[a-z]/.test(password)) {
    score += 20;
  } else {
    requirements.push('Al menos una minúscula');
  }
  
  if (/[0-9]/.test(password)) {
    score += 20;
  } else {
    requirements.push('Al menos un número');
  }
  
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 20;
  } else {
    requirements.push('Al menos un carácter especial');
  }
  
  return {
    isValid: score >= 80,
    score,
    requirements
  };
}
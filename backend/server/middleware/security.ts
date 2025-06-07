/**
 * Middleware de seguridad para el sistema WhatsApp CRM
 * Implementa protecciones contra ataques comunes y vulnerabilidades
 */

import { Request, Response, NextFunction } from 'express';

// ✅ VALIDACIÓN Y SANITIZACIÓN DE ENTRADA
export function sanitizeInput(input: any): string {
  if (typeof input !== 'string') {
    return String(input || '').trim();
  }
  
  // Remover caracteres peligrosos
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Scripts
    .replace(/javascript:/gi, '') // JavaScript URLs
    .replace(/on\w+\s*=/gi, '') // Event handlers
    .replace(/eval\s*\(/gi, '') // Eval calls
    .replace(/document\./gi, '') // Document access
    .replace(/window\./gi, '') // Window access
    .trim();
}

// ✅ VALIDACIÓN DE PARÁMETROS CRÍTICOS
export function validateCriticalParams(requiredParams: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const missingParams: string[] = [];
      
      for (const param of requiredParams) {
        const value = req.body[param] || req.params[param] || req.query[param];
        
        if (!value || (typeof value === 'string' && value.trim().length === 0)) {
          missingParams.push(param);
        } else {
          // Sanitizar parámetro
          if (typeof value === 'string') {
            req.body[param] = sanitizeInput(value);
          }
        }
      }
      
      if (missingParams.length > 0) {
        return res.status(400).json({
          error: 'Parámetros requeridos faltantes',
          missingParams,
          code: 'MISSING_REQUIRED_PARAMS'
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Error en validación de parámetros',
        code: 'PARAM_VALIDATION_ERROR'
      });
    }
  };
}

// ✅ PROTECCIÓN CONTRA INJECTION ATTACKS
export function validateSqlInjection(req: Request, res: Response, next: NextFunction) {
  try {
    const dangerousPatterns = [
      /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)\b)/gi,
      /((\b(OR|AND)\b\s*\d+\s*=\s*\d+))/gi,
      /('|(\\)|;|--|\/\*|\*\/)/gi,
      /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT|ONLOAD|ONERROR|ONCLICK)\b)/gi
    ];
    
    const checkData = (obj: any, path = ''): boolean => {
      if (typeof obj === 'string') {
        return dangerousPatterns.some(pattern => pattern.test(obj));
      }
      
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          if (checkData(value, `${path}.${key}`)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    if (checkData(req.body) || checkData(req.query) || checkData(req.params)) {
      return res.status(400).json({
        error: 'Solicitud contiene contenido potencialmente peligroso',
        code: 'DANGEROUS_CONTENT_DETECTED'
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Error en validación de seguridad',
      code: 'SECURITY_VALIDATION_ERROR'
    });
  }
}

// ✅ HEADERS DE SEGURIDAD
export function setSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Habilitar XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Contenido de seguridad estricto
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;");
  
  // Prevenir información del servidor
  res.removeHeader('X-Powered-By');
  
  next();
}

// ✅ LOGGING SEGURO DE ERRORES
export function secureErrorLogger(error: Error, req: Request) {
  const safeError = {
    message: error.message,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 200), // Limitar longitud
    timestamp: new Date().toISOString()
  };
  
  // No loggear datos sensibles como passwords, tokens, etc.
  console.error('🚨 Error de seguridad:', JSON.stringify(safeError, null, 2));
}
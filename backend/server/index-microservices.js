/**
 * Script de inicio del sistema de integración WhatsApp con microservicios
 * 
 * Este archivo inicia la arquitectura de microservicios para el sistema de integración
 * de WhatsApp, incluyendo los siguientes componentes:
 * 
 * 1. Servidor de base de datos (PostgreSQL)
 * 2. Servidor de WhatsApp (WhatsApp Web API)
 * 3. Servidor de procesamiento de mensajes (Google Gemini AI)
 * 4. Servidor de API REST (cliente web)
 */

const path = require('path');
const { spawn } = require('child_process');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Crear directorios necesarios
const LOGS_DIR = path.join(__dirname, '..', 'microservices', 'logs');
const TEMP_DIR = path.join(__dirname, '..', 'microservices', 'temp');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Configuración de puertos
const PORTS = {
  DATABASE: process.env.DATABASE_SERVER_PORT || 5003,
  WHATSAPP: process.env.WHATSAPP_SERVER_PORT || 5001,
  PROCESSOR: process.env.MESSAGE_PROCESSOR_PORT || 5002,
  API: process.env.API_SERVER_PORT || 5000
};

// Configuración de servicios
const SERVICES = [
  {
    name: 'database',
    script: path.join(__dirname, '..', 'microservices', 'database-server', 'index.js'),
    port: PORTS.DATABASE,
    color: '\x1b[36m' // Cyan
  },
  {
    name: 'whatsapp',
    script: path.join(__dirname, '..', 'microservices', 'whatsapp-server', 'index.js'),
    port: PORTS.WHATSAPP,
    color: '\x1b[32m' // Verde
  },
  {
    name: 'processor',
    script: path.join(__dirname, '..', 'microservices', 'message-processor', 'index.js'),
    port: PORTS.PROCESSOR,
    color: '\x1b[35m' // Magenta
  },
  {
    name: 'api',
    script: path.join(__dirname, '..', 'microservices', 'api-server', 'index.js'),
    port: PORTS.API,
    color: '\x1b[33m' // Amarillo
  }
];

// Mapa de procesos activos
const processes = new Map();

// Función para iniciar un servicio
function startService(service) {
  console.log(`${service.color}[${service.name.toUpperCase()}] Iniciando servicio en puerto ${service.port}...\x1b[0m`);
  
  // Crear archivos de log
  const logFile = fs.createWriteStream(path.join(LOGS_DIR, `${service.name}.log`), { flags: 'a' });
  const errorLogFile = fs.createWriteStream(path.join(LOGS_DIR, `${service.name}-error.log`), { flags: 'a' });
  
  // Configurar variables de entorno específicas del servicio
  const env = {
    ...process.env,
    PORT: service.port,
    DATABASE_SERVER_URL: `http://localhost:${PORTS.DATABASE}`,
    WHATSAPP_SERVER_URL: `http://localhost:${PORTS.WHATSAPP}`,
    PROCESSOR_SERVER_URL: `http://localhost:${PORTS.PROCESSOR}`,
    API_SERVER_URL: `http://localhost:${PORTS.API}`,
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  // Iniciar el proceso
  const proc = spawn('node', [service.script], { env });
  processes.set(service.name, proc);
  
  // Manejar salidas
  proc.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`${service.color}[${service.name.toUpperCase()}] ${output.trim()}\x1b[0m`);
    logFile.write(`${new Date().toISOString()} - ${output}`);
  });
  
  proc.stderr.on('data', (data) => {
    const output = data.toString();
    console.error(`${service.color}[${service.name.toUpperCase()}] ERROR: ${output.trim()}\x1b[0m`);
    errorLogFile.write(`${new Date().toISOString()} - ${output}`);
  });
  
  // Manejar cierre del proceso
  proc.on('close', (code) => {
    console.log(`${service.color}[${service.name.toUpperCase()}] Proceso terminado con código ${code}\x1b[0m`);
    processes.delete(service.name);
    
    // Si el código es inesperado, reiniciar
    if (code !== 0 && !proc.terminated) {
      console.log(`${service.color}[${service.name.toUpperCase()}] Reiniciando servicio...\x1b[0m`);
      setTimeout(() => startService(service), 5000);
    }
  });
  
  // Esperar un poco para iniciar el siguiente servicio
  return new Promise(resolve => {
    setTimeout(() => {
      console.log(`${service.color}[${service.name.toUpperCase()}] Servicio iniciado (PID: ${proc.pid})\x1b[0m`);
      resolve(proc);
    }, 3000);
  });
}

// Función para detener un servicio
function stopService(serviceName) {
  const proc = processes.get(serviceName);
  if (!proc) {
    console.log(`[${serviceName.toUpperCase()}] Servicio no está en ejecución`);
    return;
  }
  
  console.log(`[${serviceName.toUpperCase()}] Deteniendo servicio (PID: ${proc.pid})...`);
  
  // Marcar que estamos terminando intencionalmente
  proc.terminated = true;
  
  // Enviar señal de terminación
  proc.kill('SIGTERM');
}

// Función para detener todos los servicios
function stopAllServices() {
  console.log('\nDeteniendo todos los servicios...');
  
  // Detener en orden inverso
  for (const service of [...SERVICES].reverse()) {
    stopService(service.name);
  }
}

// Ruta proxy para redirigir al servidor API
app.use('/api', (req, res) => {
  const url = `http://localhost:${PORTS.API}${req.url}`;
  res.redirect(url);
});

// Ruta principal
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Sistema de Integración WhatsApp</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          h1 { color: #075e54; } /* Color de WhatsApp */
          .container { max-width: 800px; margin: 0 auto; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
          .card h2 { margin-top: 0; color: #128c7e; }
          .status { display: inline-block; padding: 5px 10px; border-radius: 4px; font-size: 14px; }
          .status.ok { background-color: #25d366; color: white; }
          .status.error { background-color: #ff5252; color: white; }
          .status.warning { background-color: #ffbc00; color: white; }
          .links { margin-top: 20px; }
          .link-button { display: inline-block; background-color: #128c7e; color: white; padding: 8px 15px; 
                        text-decoration: none; border-radius: 4px; margin-right: 10px; margin-bottom: 10px; }
          .link-button:hover { background-color: #075e54; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Sistema de Integración WhatsApp</h1>
          <p>El sistema está en ejecución. Utilice la API para interactuar con el mismo.</p>
          
          <div class="card">
            <h2>Microservicios</h2>
            <p>Componentes del sistema:</p>
            <ul>
              <li>API Server: <span class="status ok">Activo</span> (Puerto ${PORTS.API})</li>
              <li>WhatsApp Server: <span class="status ok">Activo</span> (Puerto ${PORTS.WHATSAPP})</li>
              <li>Message Processor: <span class="status ok">Activo</span> (Puerto ${PORTS.PROCESSOR})</li>
              <li>Database Server: <span class="status ok">Activo</span> (Puerto ${PORTS.DATABASE})</li>
            </ul>
          </div>
          
          <div class="links">
            <a href="/api/docs" class="link-button">Documentación API</a>
            <a href="/api/whatsapp/qr" class="link-button">Conectar WhatsApp</a>
            <a href="/api/system/status" class="link-button">Estado del Sistema</a>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Iniciar microservicios
async function startMicroservices() {
  console.log('=== INICIANDO MICROSERVICIOS ===');
  
  // Iniciar los servicios en orden
  for (const service of SERVICES) {
    try {
      await startService(service);
    } catch (error) {
      console.error(`Error al iniciar servicio ${service.name}:`, error);
    }
  }
  
  console.log('\n✅ Todos los servicios iniciados correctamente');
  console.log('\nURLs de servicio:');
  console.log(`🗄️  Base de datos: http://localhost:${PORTS.DATABASE}`);
  console.log(`📱 WhatsApp: http://localhost:${PORTS.WHATSAPP}`);
  console.log(`🧠 Procesador: http://localhost:${PORTS.PROCESSOR}`);
  console.log(`🌐 API: http://localhost:${PORTS.API}`);
  console.log(`📊 Panel principal: http://localhost:${PORT}`);
}

// Iniciar el servidor web principal y los microservicios
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor principal iniciado en http://0.0.0.0:${PORT}`);
  startMicroservices();
});

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\nSeñal de interrupción recibida');
  stopAllServices();
  
  server.close(() => {
    console.log('Servidor principal detenido');
    setTimeout(() => process.exit(0), 3000);
  });
});

process.on('SIGTERM', () => {
  console.log('\nSeñal de terminación recibida');
  stopAllServices();
  
  server.close(() => {
    console.log('Servidor principal detenido');
    setTimeout(() => process.exit(0), 3000);
  });
});
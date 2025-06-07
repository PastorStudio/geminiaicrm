# CRM WhatsApp AI System

## Sistema Autónomo de CRM con Integración WhatsApp e Inteligencia Artificial

Un sistema completo de CRM que integra WhatsApp Business con inteligencia artificial para automatizar completamente las comunicaciones empresariales.

### Características Principales

- **Operación 24/7 Completamente Autónoma**: Funciona independientemente sin necesidad de intervención manual
- **Integración WhatsApp Business**: Conecta múltiples cuentas de WhatsApp
- **IA Conversacional Avanzada**: Respuestas automáticas inteligentes usando agentes externos
- **Sistema de Tickets**: Conversión automática de chats a leads y tickets
- **Análisis de Conversaciones**: Extracción automática de intenciones del cliente
- **Sincronización de Calendario**: Integración con calendario local del sistema
- **Dashboard Completo**: Interfaz web para monitoreo y gestión
- **Transcripción de Notas de Voz**: Conversión automática de audio a texto
- **Sistema de Agentes Externos**: Integración con múltiples proveedores de IA

### Arquitectura del Sistema

```
├── backend/           # Servidor Node.js con TypeScript
│   ├── server/        # Lógica principal del servidor
│   ├── services/      # Servicios autónomos (WhatsApp, IA, etc.)
│   └── shared/        # Esquemas y tipos compartidos
└── frontend/          # Cliente React con TypeScript
    ├── src/           # Código fuente de la aplicación
    └── components/    # Componentes reutilizables
```

### Tecnologías Utilizadas

**Backend:**
- Node.js + TypeScript
- Express.js
- PostgreSQL + Drizzle ORM
- WhatsApp Web API
- WebSocket para tiempo real
- Integración con OpenAI y Google Gemini

**Frontend:**
- React + TypeScript
- Vite
- TanStack Query
- Tailwind CSS + shadcn/ui
- WebSocket cliente

### Instalación y Configuración

#### Prerrequisitos
- Node.js 18+
- PostgreSQL
- Cuentas de API para servicios de IA (OpenAI, Google Gemini)

#### Backend

```bash
cd backend
npm install
```

Configurar variables de entorno:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/crm_whatsapp
OPENAI_API_KEY=tu_clave_openai
GOOGLE_GEMINI_API_KEY=tu_clave_gemini
```

Inicializar base de datos:
```bash
npm run db:push
npm run db:seed
```

Iniciar servidor:
```bash
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Funcionalidades Principales

#### 1. Gestión de Cuentas WhatsApp
- Conexión múltiple de cuentas WhatsApp Business
- Generación automática de códigos QR
- Monitoreo de estado de conexión en tiempo real
- Sistema de keep-alive para mantener conexiones activas

#### 2. Sistema de IA Conversacional
- Respuestas automáticas inteligentes
- Configuración de agentes externos personalizados
- Análisis de intención del cliente
- Soporte multiidioma

#### 3. CRM Integrado
- Conversión automática de chats a leads
- Sistema de tickets con categorización automática
- Seguimiento de conversaciones
- Análisis de sentimientos

#### 4. Dashboard y Monitoreo
- Métricas en tiempo real
- Historial de conversaciones
- Gestión de agentes y configuraciones
- Reportes de actividad

### Deployment

El sistema está preparado para deployment en producción con:
- Configuración de PM2 para procesos
- Variables de entorno de producción
- Base de datos PostgreSQL
- Archivos estáticos optimizados

### Soporte y Mantenimiento

Este sistema está diseñado para operar de forma completamente autónoma con mínima intervención manual. Incluye:
- Monitoreo automático de servicios
- Reconexión automática de WhatsApp
- Sistema de logs completo
- Heartbeat para verificación de estado

### Estado del Proyecto

✅ **Sistema Completamente Funcional**
- Operación autónoma 24/7
- Integración WhatsApp estable
- IA conversacional activa
- Dashboard operativo
- Base de datos configurada

### Licencia

Propiedad privada - Todos los derechos reservados
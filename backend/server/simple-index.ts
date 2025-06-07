import express from "express";
import cors from "cors";
import { viteServer } from "./vite";
import { registerDirectAPIRoutes } from "./services/directApiServer";
import { storage } from "./storage";
import whatsappAccountsRouter from "./routes/whatsappAccounts";

console.log('🚀 Iniciando CRM WhatsApp...');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware básico
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas básicas
app.use('/api/whatsapp-accounts', whatsappAccountsRouter);

// Registrar rutas de API directa
registerDirectAPIRoutes(app);

// Inicializar datos
storage.initializeData().catch(console.error);

// Integrar con Vite
viteServer(app);

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor iniciado en puerto ${PORT}`);
  console.log(`🌐 Interfaz disponible en: http://localhost:${PORT}`);
});

// Manejo de errores
server.on('error', (error: any) => {
  console.error('❌ Error del servidor:', error);
});

export { app };
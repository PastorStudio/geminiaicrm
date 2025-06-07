/**
 * Rutas dedicadas para la integración de WhatsApp que generan un código QR real
 */
const { whatsappRealService } = require('./whatsappRealService');

function registerWhatsAppRoutes(app) {
  // Status endpoint
  app.get("/api/integrations/whatsapp/status", async (req, res) => {
    try {
      // Inicializar si no está inicializado
      if (!whatsappRealService.getStatus().initialized) {
        await whatsappRealService.initialize().catch(err => {
          console.error("Error inicializando servicio real de WhatsApp:", err);
        });
      }
      const status = whatsappRealService.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error obteniendo estado de WhatsApp:", error);
      res.status(500).json({ 
        message: "Error obteniendo estado de WhatsApp", 
        error: error instanceof Error ? error.message : "Error desconocido" 
      });
    }
  });

  // QR Code endpoint
  app.get("/api/integrations/whatsapp/qrcode", async (req, res) => {
    try {
      // Inicializar si no está inicializado
      if (!whatsappRealService.getStatus().initialized) {
        await whatsappRealService.initialize().catch(err => {
          console.error("Error inicializando servicio real de WhatsApp:", err);
        });
      }
      
      const status = whatsappRealService.getStatus();
      
      if (status.qrCode) {
        res.json({ data: status.qrCode });
      } else {
        res.status(204).json({ message: "No hay código QR disponible" });
      }
    } catch (error) {
      console.error("Error obteniendo código QR de WhatsApp:", error);
      res.status(500).json({ 
        message: "Error obteniendo código QR de WhatsApp", 
        error: error instanceof Error ? error.message : "Error desconocido" 
      });
    }
  });

  // Restart endpoint - genera un nuevo código QR
  app.post("/api/integrations/whatsapp/restart", async (req, res) => {
    try {
      console.log("Reiniciando servicio de WhatsApp (modo real)...");
      const result = await whatsappRealService.restart();
      res.json({ success: true });
    } catch (error) {
      console.error("Error reiniciando servicio de WhatsApp:", error);
      res.status(500).json({ 
        message: "Error reiniciando servicio de WhatsApp", 
        error: error instanceof Error ? error.message : "Error desconocido" 
      });
    }
  });

  // Logout endpoint
  app.post("/api/integrations/whatsapp/logout", async (req, res) => {
    try {
      console.log("Cerrando sesión de WhatsApp...");
      const result = await whatsappRealService.logout();
      res.json(result);
    } catch (error) {
      console.error("Error cerrando sesión de WhatsApp:", error);
      res.status(500).json({ 
        message: "Error cerrando sesión de WhatsApp", 
        error: error instanceof Error ? error.message : "Error desconocido" 
      });
    }
  });

  // Send message endpoint
  app.post("/api/integrations/whatsapp/send", async (req, res) => {
    try {
      const { to, message, leadId } = req.body;
      
      if (!to || !message) {
        return res.status(400).json({ message: "Se requiere número de teléfono y mensaje" });
      }
      
      console.log(`Enviando mensaje a ${to}: ${message} (leadId: ${leadId || 'N/A'})`);
      const result = await whatsappRealService.sendMessage(
        to, 
        message, 
        leadId ? parseInt(leadId) : undefined
      );
      
      res.json({
        success: true,
        message: "Mensaje enviado correctamente",
        result
      });
    } catch (error) {
      console.error("Error enviando mensaje de WhatsApp:", error);
      res.status(500).json({ 
        message: "Error enviando mensaje de WhatsApp", 
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  });
}

module.exports = { registerWhatsAppRoutes };
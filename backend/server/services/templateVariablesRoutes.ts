import { Express, Request, Response } from "express";
import { templateVariablesHelper } from "./templateVariablesHelper";
import { excelImportService } from "./excelImportService";

export function registerTemplateVariablesRoutes(app: Express) {
  // Obtener variables disponibles para un archivo importado
  app.get("/api/excel/imports/:id/variables", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          error: "Se requiere id de importación" 
        });
      }
      
      // Verificar que la importación existe
      const importResult = excelImportService.getImportResult(id);
      if (!importResult) {
        return res.status(404).json({ error: "Importación no encontrada" });
      }
      
      // Obtener las variables disponibles
      const variables = await templateVariablesHelper.getImportVariables(id);
      
      res.json({
        success: true,
        variables
      });
    } catch (error) {
      console.error("Error al obtener variables disponibles:", error);
      res.status(500).json({ error: "Error al obtener variables disponibles" });
    }
  });

  // Obtener variables requeridas por una plantilla
  app.get("/api/message-templates/:id/variables", async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ 
          error: "Se requiere un ID de plantilla válido" 
        });
      }
      
      // Obtener las variables requeridas
      const variables = await templateVariablesHelper.getTemplateRequiredVariables(templateId);
      
      res.json({
        success: true,
        variables
      });
    } catch (error) {
      console.error("Error al obtener variables de plantilla:", error);
      res.status(500).json({ error: "Error al obtener variables de plantilla" });
    }
  });

  // Sugerir mapeo de variables entre plantilla y archivo importado
  app.get("/api/templates/:templateId/imports/:importId/mapping", async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const { importId } = req.params;
      
      if (isNaN(templateId) || !importId) {
        return res.status(400).json({ 
          error: "Se requieren IDs válidos de plantilla e importación" 
        });
      }
      
      // Verificar que la importación existe
      const importResult = excelImportService.getImportResult(importId);
      if (!importResult) {
        return res.status(404).json({ error: "Importación no encontrada" });
      }
      
      // Sugerir mapeo automático
      const mapping = await templateVariablesHelper.suggestVariableMapping(templateId, importId);
      
      res.json({
        success: true,
        mapping
      });
    } catch (error) {
      console.error("Error al sugerir mapeo de variables:", error);
      res.status(500).json({ error: "Error al sugerir mapeo de variables" });
    }
  });
}
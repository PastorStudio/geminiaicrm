import { excelImportService } from './excelImportService';
import { messageTemplateService } from './messageTemplateService';

/**
 * Servicio auxiliar para manejar variables en plantillas
 */
export class TemplateVariablesHelper {
  
  /**
   * Obtiene todas las variables disponibles para un archivo importado
   * @param importId ID de la importación
   * @returns Array de nombres de variables disponibles
   */
  async getImportVariables(importId: string): Promise<string[]> {
    return excelImportService.getAvailableVariables(importId);
  }
  
  /**
   * Obtiene las variables requeridas por una plantilla
   * @param templateId ID de la plantilla
   * @returns Array de nombres de variables requeridas
   */
  async getTemplateRequiredVariables(templateId: number): Promise<string[]> {
    const template = await messageTemplateService.getTemplateById(templateId);
    if (!template) return [];
    
    // Buscar todas las coincidencias de {{variable}} en el contenido
    const regex = /{{([^{}]+)}}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(template.content)) !== null) {
      // Extraer el nombre de la variable sin las llaves
      const varName = match[1].trim();
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    }
    
    return variables;
  }
  
  /**
   * Sugiere un mapeo automático entre variables de la plantilla y columnas del Excel
   * @param templateId ID de la plantilla
   * @param importId ID de la importación
   * @returns Mapeo sugerido de variables a columnas
   */
  async suggestVariableMapping(templateId: number, importId: string): Promise<Record<string, string>> {
    const templateVariables = await this.getTemplateRequiredVariables(templateId);
    const importVariables = await this.getImportVariables(importId);
    
    const mapping: Record<string, string> = {};
    
    // Para cada variable de la plantilla, buscar una coincidencia en las columnas del Excel
    for (const templateVar of templateVariables) {
      // Buscar coincidencia exacta primero
      if (importVariables.includes(templateVar)) {
        mapping[templateVar] = templateVar;
        continue;
      }
      
      // Buscar coincidencia ignorando mayúsculas/minúsculas
      const lowerTemplateVar = templateVar.toLowerCase();
      const match = importVariables.find(iv => iv.toLowerCase() === lowerTemplateVar);
      if (match) {
        mapping[templateVar] = match;
        continue;
      }
      
      // Buscar coincidencia parcial
      const partialMatch = importVariables.find(iv => 
        iv.toLowerCase().includes(lowerTemplateVar) || 
        lowerTemplateVar.includes(iv.toLowerCase())
      );
      if (partialMatch) {
        mapping[templateVar] = partialMatch;
      }
    }
    
    return mapping;
  }
}

export const templateVariablesHelper = new TemplateVariablesHelper();
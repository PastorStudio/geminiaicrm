import { db } from "../db";
import { messageTemplates, type InsertMessageTemplate, type MessageTemplate } from "@shared/schema";
import { eq } from "drizzle-orm";

// Servicio para gestionar las plantillas de mensajes
export class MessageTemplateService {
  // Obtener todas las plantillas
  async getAllTemplates(): Promise<MessageTemplate[]> {
    try {
      const dbTemplates = await db.select().from(messageTemplates).orderBy(messageTemplates.name);
      
      // Si no hay plantillas en la base de datos, devolvemos plantillas predefinidas
      if (dbTemplates.length === 0) {
        // Plantillas predefinidas para recuperación de equipos
        return [
          {
            id: 1,
            name: "Recuperación de equipos - Formal",
            description: "Mensaje formal para recuperación de equipos de clientes",
            content: "Buenos días, {{nombre}}!\n\nEspero que se encuentre muy bien.\n\nMi nombre es {{usuario}}, representante de {{empresa}}, empresa especializada en la recuperación de equipos a nivel nacional, contratista oficial de {{compañia}}.\n\nSe nos ha asignado la orden de retiro correspondiente a su suscripción {{suscripcion}}, registrada en {{ubicacion}}.\n\n¿Podría por favor confirmarnos la dirección exacta o compartir su ubicación por GPS para coordinar el retiro de los equipos? Así evitamos que se generen cargos adicionales por no devolución.\n\nAgradezco mucho su apoyo.\nSaludos cordiales.",
            category: "recuperacion",
            tags: ["formal", "recuperación", "equipos"],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: null,
            isActive: true,
            variables: null
          },
          {
            id: 2,
            name: "Recuperación de equipos - Cordial",
            description: "Mensaje cordial para recuperación de equipos de clientes",
            content: "Estimado {{nombre}}!, muy buenos días.\n\nLe saluda cordialmente el {{usuario}}, representante de {{empresa}}, empresa encargada de la gestión de recuperación de equipos a nivel nacional para {{compañia}}.\n\nNos ha llegado la orden de retiro correspondiente a la suscripción {{suscripcion}}, ubicada en {{ubicacion}}.\n\n¿Podría colaborarnos con la dirección o, de ser posible, la ubicación en tiempo real vía GPS para enviar a uno de nuestros agentes y proceder con el retiro?\n\nSu apoyo evitará cargos innecesarios en su cuenta.\nGracias por su atención.\nSaludos cordiales.",
            category: "recuperacion",
            tags: ["cordial", "recuperación", "equipos"],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: null,
            isActive: true,
            variables: null
          },
          {
            id: 3,
            name: "Recuperación de equipos - Amigable",
            description: "Mensaje amigable para recuperación de equipos de clientes",
            content: "Muy buenos días, {{nombre}}!\n\nEspero que todo marche bien.\n\nMi nombre es {{usuario}} y me comunico en nombre de {{empresa}}, empresa contratista responsable de la recuperación de equipos para {{compañia}}, en todo el país.\n\nNos ha sido asignada la orden de retiro de los equipos relacionados con su suscripción {{suscripcion}}, localizada en {{ubicacion}}.\n\n¿Podría indicarnos la dirección exacta o compartir su ubicación por GPS para que un agente pueda acercarse a realizar la gestión?\n\nEstamos para asistirle y evitar que se generen cargos adicionales.\nGracias por su colaboración.",
            category: "recuperacion",
            tags: ["amigable", "recuperación", "equipos"],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: null,
            isActive: true,
            variables: null
          },
          {
            id: 4,
            name: "Recuperación de equipos - Conciso",
            description: "Mensaje conciso para recuperación de equipos de clientes",
            content: "Saludos cordiales, {{nombre}}!\n\nLe escribe el {{usuario}} representante de la empresa {{empresa}}, responsable del proceso de recuperación de equipos contratada por {{compañia}}.\n\nNos fue asignada la orden de retiro correspondiente a su suscripción {{suscripcion}}, ubicada en {{ubicacion}}.\n\nLe agradeceríamos nos pudiera proporcionar la dirección o compartir su GPS para enviar a nuestro agente a realizar el retiro correspondiente.\n\nCon su apoyo evitamos que se generen más cargos en su cuenta.\nQuedamos atentos. Saludos.",
            category: "recuperacion",
            tags: ["conciso", "recuperación", "equipos"],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: null,
            isActive: true,
            variables: null
          },
          {
            id: 5,
            name: "Recuperación de equipos - Casual",
            description: "Mensaje casual para recuperación de equipos de clientes",
            content: "Buenos días {{nombre}}! excelente día para ti, espero que se encuentre bien.\n\nMi nombre es {{usuario}}, soy Representante de la empresa {{empresa}}, empresa encargada de recuperación de los equipos a nivel nacional contratista de la empresa {{compañia}}, nos llegó la orden de retiro de los equipos de su suscripción {{suscripcion}}, que se encuentra ubicado en {{ubicacion}}.\n\nUsted cree que nos pueda brindar o ayudar con la dirección y nos regala su GPS, para poder enviar un Agente de recuperación para pasar a retirar los equipos que están por entrega, y así evitar que genere más costos en su suscripción.\n\nGracias saludos.",
            category: "recuperacion",
            tags: ["casual", "recuperación", "equipos"],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: null,
            isActive: true,
            variables: null
          }
        ];
      }
      
      return dbTemplates;
    } catch (error) {
      console.error("Error al obtener plantillas:", error);
      return [];
    }
  }

  // Obtener plantillas por categoría
  async getTemplatesByCategory(category: string): Promise<MessageTemplate[]> {
    return db.select().from(messageTemplates)
      .where(eq(messageTemplates.category, category))
      .orderBy(messageTemplates.name);
  }

  // Obtener una plantilla por ID
  async getTemplateById(id: number): Promise<MessageTemplate | undefined> {
    const result = await db.select().from(messageTemplates)
      .where(eq(messageTemplates.id, id));
    return result[0];
  }

  // Crear una nueva plantilla
  async createTemplate(data: InsertMessageTemplate): Promise<MessageTemplate> {
    const result = await db.insert(messageTemplates)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return result[0];
  }

  // Actualizar una plantilla existente
  async updateTemplate(id: number, data: Partial<InsertMessageTemplate>): Promise<MessageTemplate | undefined> {
    const template = await this.getTemplateById(id);
    if (!template) return undefined;

    const result = await db.update(messageTemplates)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(messageTemplates.id, id))
      .returning();
    return result[0];
  }

  // Eliminar una plantilla
  async deleteTemplate(id: number): Promise<boolean> {
    const result = await db.delete(messageTemplates)
      .where(eq(messageTemplates.id, id))
      .returning();
    return result.length > 0;
  }

  // Buscar plantillas por texto
  async searchTemplates(searchText: string): Promise<MessageTemplate[]> {
    const lowerSearchText = searchText.toLowerCase();
    const allTemplates = await this.getAllTemplates();
    
    return allTemplates.filter(template => 
      template.name.toLowerCase().includes(lowerSearchText) ||
      (template.description && template.description.toLowerCase().includes(lowerSearchText)) ||
      template.content.toLowerCase().includes(lowerSearchText) ||
      (template.category && template.category.toLowerCase().includes(lowerSearchText))
    );
  }

  // Analizar variables en una plantilla
  async analyzeTemplateVariables(templateId: number): Promise<string[]> {
    const template = await this.getTemplateById(templateId);
    if (!template) return [];

    // Extraer todas las variables en formato {{variable}}
    const variableRegex = /{{([^}]+)}}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(template.content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  // Aplicar valores a las variables de una plantilla
  applyVariablesToTemplate(templateContent: string, variables: Record<string, string>): string {
    let result = templateContent;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }
}

export const messageTemplateService = new MessageTemplateService();

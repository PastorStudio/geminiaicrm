import { db } from "../db";
import { chatAssignments, users, chatCategories, whatsappAccounts } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Servicio para gestionar las asignaciones de chats a agentes
 */
class ChatAssignmentService {
  /**
   * Busca una asignación existente para un chat y cuenta específicos
   */
  async findAssignment(chatId: string, accountId: number) {
    try {
      const [assignment] = await db
        .select()
        .from(chatAssignments)
        .where(
          and(
            eq(chatAssignments.chatId, chatId),
            eq(chatAssignments.accountId, accountId)
          )
        );
      
      return assignment || null;
    } catch (error: any) {
      console.error("Error al buscar asignación:", error);
      throw new Error("Error al buscar asignación de chat");
    }
  }
  
  /**
   * Busca una asignación por ID
   */
  async findAssignmentById(id: number) {
    try {
      const [assignment] = await db
        .select()
        .from(chatAssignments)
        .where(eq(chatAssignments.id, id));
      
      return assignment || null;
    } catch (error: any) {
      console.error("Error al buscar asignación por ID:", error);
      throw new Error("Error al buscar asignación de chat");
    }
  }

  /**
   * Crea una nueva asignación de chat
   */
  async createAssignment(data: {
    chatId: string;
    accountId: number;
    assignedToId: number;
    assignedById: number;
    category?: string;
    notes?: string;
  }) {
    try {
      // Verificar si el agente existe
      const [agent] = await db
        .select()
        .from(users)
        .where(eq(users.id, data.assignedToId));
      
      if (!agent) {
        throw new Error("El agente seleccionado no existe");
      }
      
      // Verificar si la cuenta existe
      const [account] = await db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.id, data.accountId));
      
      if (!account) {
        throw new Error("La cuenta de WhatsApp no existe");
      }

      // Crear la asignación
      const [newAssignment] = await db
        .insert(chatAssignments)
        .values({
          chatId: data.chatId,
          accountId: data.accountId,
          assignedToId: data.assignedToId,
          assignedById: data.assignedById,
          category: data.category,
          notes: data.notes,
          status: "active",
          assignedAt: new Date(),
          lastActivityAt: new Date()
        })
        .returning();
      
      return newAssignment;
    } catch (error) {
      console.error("Error al crear asignación:", error);
      throw new Error(error.message || "Error al crear asignación de chat");
    }
  }

  /**
   * Actualiza una asignación existente
   */
  async updateAssignment(id: number, data: {
    assignedToId?: number;
    category?: string;
    notes?: string;
    status?: string;
  }) {
    try {
      // Verificar si la asignación existe
      const [existingAssignment] = await db
        .select()
        .from(chatAssignments)
        .where(eq(chatAssignments.id, id));
      
      if (!existingAssignment) {
        throw new Error("La asignación no existe");
      }
      
      // Si se está cambiando el agente, verificar que existe
      if (data.assignedToId) {
        const [agent] = await db
          .select()
          .from(users)
          .where(eq(users.id, data.assignedToId));
        
        if (!agent) {
          throw new Error("El agente seleccionado no existe");
        }
      }

      // Actualizar la asignación
      const [updatedAssignment] = await db
        .update(chatAssignments)
        .set({
          ...data,
          lastActivityAt: new Date()
        })
        .where(eq(chatAssignments.id, id))
        .returning();
      
      return updatedAssignment;
    } catch (error) {
      console.error("Error al actualizar asignación:", error);
      throw new Error(error.message || "Error al actualizar asignación de chat");
    }
  }

  /**
   * Obtiene todas las asignaciones de chat
   */
  async getAllAssignments(filters?: {
    accountId?: number;
    assignedToId?: number;
    status?: string;
  }) {
    try {
      let query = db
        .select({
          assignment: chatAssignments,
          agent: {
            id: users.id,
            username: users.username,
            fullName: users.fullName,
            avatar: users.avatar
          }
        })
        .from(chatAssignments)
        .leftJoin(users, eq(chatAssignments.assignedToId, users.id));
      
      // Aplicar filtros si se proporcionan
      if (filters) {
        if (filters.accountId) {
          query = query.where(eq(chatAssignments.accountId, filters.accountId));
        }
        
        if (filters.assignedToId) {
          query = query.where(eq(chatAssignments.assignedToId, filters.assignedToId));
        }
        
        if (filters.status) {
          query = query.where(eq(chatAssignments.status, filters.status));
        }
      }
      
      const results = await query;
      
      return results.map(({ assignment, agent }) => ({
        ...assignment,
        agent
      }));
    } catch (error) {
      console.error("Error al obtener asignaciones:", error);
      throw new Error("Error al obtener asignaciones de chat");
    }
  }

  /**
   * Obtiene todas las categorías de chat
   */
  async getAllCategories() {
    try {
      const categories = await db
        .select()
        .from(chatCategories);
      
      return categories;
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      throw new Error("Error al obtener categorías de chat");
    }
  }

  /**
   * Crea una nueva categoría de chat
   */
  async createCategory(data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    createdBy: number;
  }) {
    try {
      // Verificar si ya existe una categoría con el mismo nombre
      const [existingCategory] = await db
        .select()
        .from(chatCategories)
        .where(eq(chatCategories.name, data.name));
      
      if (existingCategory) {
        throw new Error("Ya existe una categoría con ese nombre");
      }
      
      // Crear la categoría
      const [newCategory] = await db
        .insert(chatCategories)
        .values({
          name: data.name,
          description: data.description,
          color: data.color || "#3b82f6",
          icon: data.icon,
          createdBy: data.createdBy,
          createdAt: new Date()
        })
        .returning();
      
      return newCategory;
    } catch (error) {
      console.error("Error al crear categoría:", error);
      throw new Error(error.message || "Error al crear categoría de chat");
    }
  }
}

export const chatAssignmentService = new ChatAssignmentService();
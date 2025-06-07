import { Request, Response } from "express";
import { db } from "../db";
import { leads } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";

// Schema for updating lead status
const updateLeadStatusSchema = z.object({
  status: z.enum(["new", "assigned", "contacted", "negotiation", "completed", "not-interested"])
});

// Schema for creating/updating leads (matching actual database structure)
const leadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(["new", "assigned", "contacted", "negotiation", "completed", "not-interested"]).default("new"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  company: z.string().optional(),
  budget: z.number().optional(),
  notes: z.string().optional(),
  assigneeId: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Get all leads with contact information
 */
export async function getLeads(req: Request, res: Response) {
  try {
    const leadsData = await db
      .select({
        id: leads.id,
        title: leads.name,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        status: leads.status,
        priority: leads.priority,
        source: leads.source,
        assignedTo: leads.assigneeId,
        notes: leads.notes,
        tags: leads.tags,
        createdAt: leads.createdAt,
        company: leads.company,
        budget: leads.budget,
        // Default values for Kanban compatibility
        stage: sql`'lead'`.as('stage'),
        value: sql`COALESCE(${leads.budget}::text, '0')`.as('value'),
        currency: sql`'USD'`.as('currency'),
        probability: sql`50`.as('probability'),
        updatedAt: leads.createdAt,
      })
      .from(leads)
      .orderBy(desc(leads.createdAt));

    res.json(leadsData);
  } catch (error) {
    console.error("Error getting leads:", error);
    res.status(500).json({ error: "Error al obtener leads" });
  }
}

/**
 * Create a new lead
 */
export async function createLead(req: Request, res: Response) {
  try {
    const validatedData = leadSchema.parse(req.body);
    
    const [newLead] = await db
      .insert(leads)
      .values(validatedData)
      .returning();

    res.status(201).json(newLead);
  } catch (error) {
    console.error("Error creating lead:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Datos inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Error al crear lead" });
  }
}

/**
 * Update lead status (for drag-and-drop)
 */
export async function updateLeadStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const leadId = parseInt(id);
    
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "ID de lead inválido" });
    }

    const validatedData = updateLeadStatusSchema.parse(req.body);
    
    const [updatedLead] = await db
      .update(leads)
      .set({ 
        status: validatedData.status
      })
      .where(eq(leads.id, leadId))
      .returning();

    if (!updatedLead) {
      return res.status(404).json({ error: "Lead no encontrado" });
    }

    res.json(updatedLead);
  } catch (error) {
    console.error("Error updating lead status:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Datos inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Error al actualizar estado del lead" });
  }
}

/**
 * Update a lead
 */
export async function updateLead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const leadId = parseInt(id);
    
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "ID de lead inválido" });
    }

    const validatedData = leadSchema.partial().parse(req.body);
    
    const [updatedLead] = await db
      .update(leads)
      .set(validatedData)
      .where(eq(leads.id, leadId))
      .returning();

    if (!updatedLead) {
      return res.status(404).json({ error: "Lead no encontrado" });
    }

    res.json(updatedLead);
  } catch (error) {
    console.error("Error updating lead:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Datos inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Error al actualizar lead" });
  }
}

/**
 * Delete a lead
 */
export async function deleteLead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const leadId = parseInt(id);
    
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "ID de lead inválido" });
    }

    const [deletedLead] = await db
      .delete(leads)
      .where(eq(leads.id, leadId))
      .returning();

    if (!deletedLead) {
      return res.status(404).json({ error: "Lead no encontrado" });
    }

    res.json({ message: "Lead eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ error: "Error al eliminar lead" });
  }
}

/**
 * Get lead statistics for dashboard
 */
export async function getLeadStats(req: Request, res: Response) {
  try {
    const stats = await db
      .select({
        status: leads.status,
        count: sql<number>`count(*)::int`,
        totalValue: sql<number>`sum(cast(${leads.value} as decimal))::decimal`
      })
      .from(leads)
      .groupBy(leads.status);

    res.json(stats);
  } catch (error) {
    console.error("Error getting lead stats:", error);
    res.status(500).json({ error: "Error al obtener estadísticas de leads" });
  }
}
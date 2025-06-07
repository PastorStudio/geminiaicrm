import { Request, Response } from "express";
import { pool } from "../db";

/**
 * API directa para leads que funciona con consultas SQL puras
 * Evita problemas de esquemas de Drizzle
 */

export async function getLeadsDirectAPI(req: Request, res: Response) {
  try {
    console.log("📋 Iniciando consulta de leads...");
    
    const result = await pool.query('SELECT * FROM leads ORDER BY "createdAt" DESC');
    console.log(`📋 Leads encontrados: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      console.log("📋 Primer lead:", result.rows[0]);
    }

    // Transformar datos para compatibilidad con el frontend
    const leadsData = result.rows.map((row: any) => ({
      id: row.id,
      title: row.name,
      name: row.name,
      email: row.email,
      phone: row.phone,
      source: row.source,
      status: row.status,
      assignedTo: row.assigneeId,
      company: row.company,
      budget: row.budget || 0,
      notes: row.notes,
      priority: row.priority,
      tags: row.tags,
      createdAt: row.createdAt,
      stage: 'lead',
      value: row.budget ? row.budget.toString() : '0',
      currency: 'USD',
      probability: 50,
      updatedAt: row.createdAt
    }));

    console.log("✅ Retornando datos al frontend");
    res.json(leadsData);
  } catch (error) {
    console.error("❌ Error específico:", error.message);
    console.error("❌ Stack completo:", error.stack);
    res.status(500).json({ error: "Error al obtener leads", details: error.message });
  }
}

export async function getLeadStatsDirectAPI(req: Request, res: Response) {
  try {
    console.log("📊 Consultando estadísticas de leads...");
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
        COUNT(CASE WHEN status = 'negotiation' THEN 1 END) as negotiation,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'not-interested' THEN 1 END) as not_interested,
        COALESCE(AVG(budget), 0) as avg_value,
        COALESCE(SUM(budget), 0) as total_value
      FROM leads
    `);

    const stats = result.rows[0];
    
    const statsData = {
      total: parseInt(stats.total),
      new: parseInt(stats.new_leads),
      assigned: parseInt(stats.assigned),
      contacted: parseInt(stats.contacted),
      negotiation: parseInt(stats.negotiation),
      completed: parseInt(stats.completed),
      notInterested: parseInt(stats.not_interested),
      averageValue: parseFloat(stats.avg_value),
      totalValue: parseFloat(stats.total_value)
    };

    console.log("📊 Estadísticas calculadas:", statsData);
    res.json(statsData);
  } catch (error) {
    console.error("❌ Error en estadísticas de leads:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
}

export async function updateLeadStatusDirectAPI(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Actualizando lead ${id} a status: ${status}`);
    
    const result = await pool.query(`
      UPDATE leads 
      SET status = $1
      WHERE id = $2
      RETURNING *
    `, [status, parseInt(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lead no encontrado" });
    }

    console.log(`✅ Lead ${id} actualizado correctamente`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error actualizando lead:", error);
    res.status(500).json({ error: "Error al actualizar lead" });
  }
}

export async function deleteLeadDirectAPI(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Eliminando lead ${id}`);
    
    const result = await pool.query(`
      DELETE FROM leads 
      WHERE id = $1
      RETURNING id
    `, [parseInt(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lead no encontrado" });
    }

    console.log(`✅ Lead ${id} eliminado correctamente`);
    res.json({ success: true, id: parseInt(id) });
  } catch (error) {
    console.error("❌ Error eliminando lead:", error);
    res.status(500).json({ error: "Error al eliminar lead" });
  }
}
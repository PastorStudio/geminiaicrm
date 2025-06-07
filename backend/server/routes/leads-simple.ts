import { Request, Response } from "express";

/**
 * API simple para leads que evita problemas de importación
 */

export async function getLeadsSimpleAPI(req: Request, res: Response) {
  try {
    console.log("📋 [SIMPLE API] Iniciando consulta de leads...");
    
    // Crear conexión directa sin importaciones problemáticas
    const { Pool } = require('@neondatabase/serverless');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    console.log("✅ [SIMPLE API] Conexión creada");
    
    const result = await pool.query('SELECT * FROM leads ORDER BY "createdAt" DESC');
    console.log(`📋 [SIMPLE API] Leads encontrados: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      console.log("📋 [SIMPLE API] Primer lead:", JSON.stringify(result.rows[0], null, 2));
    }

    // Transformar datos para el frontend
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

    console.log("✅ [SIMPLE API] Retornando", leadsData.length, "leads al frontend");
    
    // Cerrar conexión
    await pool.end();
    
    res.json(leadsData);
  } catch (error) {
    console.error("❌ [SIMPLE API] Error:", error.message);
    console.error("❌ [SIMPLE API] Stack:", error.stack);
    res.status(500).json({ 
      error: "Error al obtener leads", 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

export async function getLeadStatsSimpleAPI(req: Request, res: Response) {
  try {
    console.log("📊 [SIMPLE API] Consultando estadísticas...");
    
    const { Pool } = require('@neondatabase/serverless');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Contar por status
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM leads 
      GROUP BY status
    `);
    
    // Total de leads
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM leads');
    
    const stats = {
      total: parseInt(totalResult.rows[0].total),
      byStatus: statusResult.rows.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      timestamp: new Date().toISOString()
    };
    
    console.log("📊 [SIMPLE API] Stats:", JSON.stringify(stats, null, 2));
    
    await pool.end();
    res.json(stats);
  } catch (error) {
    console.error("❌ [SIMPLE API] Error en stats:", error.message);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
}
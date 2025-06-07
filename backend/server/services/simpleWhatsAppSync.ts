/**
 * Simplified WhatsApp Data Synchronization
 * Works with existing database schema to automatically update leads when WhatsApp accounts connect
 */
import { pool } from '../db';

export class SimpleWhatsAppSync {
  
  static async syncChatsToDatabase(chats: any[], accountInfo = { id: 1, name: 'WhatsApp' }) {
    console.log(`🔄 Sincronizando ${chats.length} chats de WhatsApp a la base de datos...`);
    
    let leadsCreated = 0;
    let leadsUpdated = 0;

    for (const chat of chats) {
      try {
        // Extract contact information from chat
        const contactName = chat.name || 'WhatsApp Contact';
        const phoneNumber = this.extractPhone(chat.id);
        
        if (!phoneNumber) continue;

        // Check if lead exists
        const existingLead = await pool.query(
          'SELECT id FROM leads WHERE phone = $1',
          [phoneNumber]
        );

        if (existingLead.rows.length === 0) {
          // Create new lead with proper schema
          await pool.query(`
            INSERT INTO leads (name, phone, source, status, "createdAt")
            VALUES ($1, $2, $3, $4, NOW())
          `, [contactName, phoneNumber, 'whatsapp', 'nuevo']);
          
          leadsCreated++;
          console.log(`✅ Nuevo lead: ${contactName} (${phoneNumber})`);
        } else {
          // Update existing lead
          await pool.query(`
            UPDATE leads 
            SET name = COALESCE(NULLIF($1, ''), name), 
                source = 'whatsapp'
            WHERE phone = $2
          `, [contactName, phoneNumber]);
          
          leadsUpdated++;
        }

      } catch (error) {
        console.log(`⚠️ Error procesando chat: ${error.message}`);
      }
    }

    console.log(`✅ Sincronización completada: ${leadsCreated} leads creados, ${leadsUpdated} actualizados`);
    
    // Update dashboard with real numbers
    await this.refreshDashboardStats();
    
    return { leadsCreated, leadsUpdated };
  }

  private static extractPhone(chatId: string | any): string | null {
    if (!chatId) return null;
    
    // Handle different chat ID formats
    const idString = typeof chatId === 'string' ? chatId : chatId.toString();
    
    // Extract phone from WhatsApp chat ID (format: phone@c.us)
    const match = idString.match(/(\d+)@/);
    return match ? match[1] : null;
  }

  private static async refreshDashboardStats() {
    try {
      // Get real counts for dashboard
      const leadsResult = await pool.query('SELECT COUNT(*) as count FROM leads');
      const totalLeads = parseInt(leadsResult.rows[0].count) || 0;
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const monthlyResult = await pool.query(
        'SELECT COUNT(*) as count FROM leads WHERE "createdAt" >= $1',
        [thisMonth]
      );
      const newLeadsThisMonth = parseInt(monthlyResult.rows[0].count) || 0;
      
      console.log(`📊 Dashboard actualizado: ${totalLeads} leads totales, ${newLeadsThisMonth} este mes`);
      
    } catch (error) {
      console.log(`⚠️ Error actualizando dashboard: ${error.message}`);
    }
  }
}
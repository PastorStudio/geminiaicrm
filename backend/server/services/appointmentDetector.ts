/**
 * Servicio para la detección y creación automática de citas a partir de conversaciones
 * Este servicio analiza conversaciones de WhatsApp para detectar y programar citas automáticamente
 */

import { pool } from '../db';

/**
 * Crea una nueva cita en el calendario basada en la información detectada
 * en la conversación de WhatsApp
 */
export async function createAppointmentFromConversation(clientInfo: any, leadId: number): Promise<void> {
  try {
    console.log('Creando cita a partir de conversación...', clientInfo.appointment);
    
    // Si no tenemos información de cita o está marcada como no detectada, no hacemos nada
    if (!clientInfo.appointment || clientInfo.appointment.detected !== true) {
      console.log('No se detectó ninguna cita en la conversación');
      return;
    }
    
    // Si no tenemos fecha o descripción, no podemos crear la cita
    if (!clientInfo.appointment.date || !clientInfo.appointment.description) {
      console.log('Información insuficiente para crear cita. Se requiere fecha y descripción.');
      return;
    }
    
    // Verificar si ya existe una cita con la misma fecha y lead
    const { rows: existingActivities } = await pool.query(
      `SELECT id FROM activities 
       WHERE "leadId" = $1 
       AND DATE(scheduled) = DATE($2)
       LIMIT 1`,
      [leadId, clientInfo.appointment.date]
    );
    
    if (existingActivities.length > 0) {
      console.log(`Ya existe una cita para este lead (ID: ${leadId}) en la fecha ${clientInfo.appointment.date}`);
      return;
    }
    
    // Construir fecha y hora completa
    let scheduledDateTime = new Date(clientInfo.appointment.date);
    if (clientInfo.appointment.time) {
      const [hours, minutes] = clientInfo.appointment.time.split(':').map(Number);
      scheduledDateTime.setHours(hours, minutes);
    } else {
      // Si no hay hora específica, usar 9:00 AM por defecto
      scheduledDateTime.setHours(9, 0);
    }
    
    // Determinar el tipo de actividad (por defecto 'meeting')
    const activityType = clientInfo.appointment.type || 'meeting';
    
    // Construir título apropiado
    let title = '';
    if (activityType === 'meeting') {
      title = `Reunión con ${clientInfo.clientName || 'Cliente'}`;
    } else if (activityType === 'call') {
      title = `Llamada con ${clientInfo.clientName || 'Cliente'}`;
    } else {
      title = `Seguimiento con ${clientInfo.clientName || 'Cliente'}`;
    }
    
    // Crear la actividad en la base de datos con los campos correctos según el esquema
    const insertQuery = {
      text: `
        INSERT INTO activities (
          "leadId",
          type,
          scheduled,
          notes,
          completed,
          "createdAt"
        )
        VALUES ($1, $2, $3, $4, false, NOW())
        RETURNING id
      `,
      values: [
        leadId,
        activityType,
        scheduledDateTime.toISOString(),
        `${title}: ${clientInfo.appointment.description}. Interés del cliente: ${clientInfo.interestLevel || 'No determinado'}`
      ]
    };
    
    const result = await pool.query(insertQuery);
    console.log(`Nueva cita creada con ID: ${result.rows[0].id} para el lead ID: ${leadId}`);
    
    // Crear mensaje de sistema para registro
    const messageInsertQuery = {
      text: `
        INSERT INTO messages (
          "leadId",
          content,
          direction,
          channel,
          read,
          "sentAt"
        )
        VALUES ($1, $2, 'system', 'calendar', true, NOW())
      `,
      values: [
        leadId,
        `✅ Se ha programado automáticamente una cita para el ${scheduledDateTime.toLocaleDateString()} a las ${scheduledDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}: ${clientInfo.appointment.description}`
      ]
    };
    
    await pool.query(messageInsertQuery);
    console.log('Mensaje de sistema sobre la cita registrado correctamente');
    
  } catch (error) {
    console.error('Error creando cita a partir de conversación:', error);
  }
}
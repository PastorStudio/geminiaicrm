/**
 * Script para probar la funcionalidad de creación de citas
 * Este módulo expone una función que puede ser llamada directamente por otras partes del código
 */

import { pool } from '../db';
import { createAppointmentFromConversation } from './appointmentDetector';

/**
 * Crea una cita de prueba para un lead específico
 * Esto es útil para verificar que el sistema de citas funciona correctamente
 */
export async function createTestAppointment(leadId: number): Promise<boolean> {
  try {
    console.log(`⏱️ Ejecutando prueba de creación de cita para lead ID: ${leadId}`);
    
    // Verificar si el lead existe
    const checkQuery = {
      text: 'SELECT name FROM leads WHERE id = $1',
      values: [leadId]
    };
    
    const checkResult = await pool.query(checkQuery);
    if (checkResult.rows.length === 0) {
      console.error(`⚠️ No existe un lead con ID: ${leadId}`);
      return false;
    }
    
    const leadName = checkResult.rows[0].name;
    console.log(`✓ Lead encontrado: ${leadName}`);
    
    // Crear un objeto clientInfo con toda la información necesaria
    const clientInfo = {
      clientName: leadName,
      phoneNumber: "1234567890", // Teléfono de prueba
      interestLevel: "alto",
      interestPercentage: 85,
      appointment: {
        detected: true,
        description: `Reunión para discutir implementación del CRM con ${leadName}`,
        date: new Date().toISOString().split('T')[0], // Hoy
        time: "15:00",
        type: "meeting",
        location: "Oficina central"
      }
    };
    
    // Mostrar los datos que se usarán para crear la cita
    console.log('📅 Datos de la cita de prueba:', JSON.stringify(clientInfo.appointment, null, 2));
    
    // Intentar crear la cita
    await createAppointmentFromConversation(clientInfo, leadId);
    
    console.log(`✅ Cita creada correctamente para ${leadName} (ID: ${leadId})`);
    return true;
  } catch (error) {
    console.error('❌ Error al crear cita de prueba:', error);
    return false;
  }
}
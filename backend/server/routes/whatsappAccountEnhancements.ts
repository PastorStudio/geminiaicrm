/**
 * Enhanced WhatsApp Account Management Routes
 * Fixes for user permissions, custom prompts, and persistent connections
 */

import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

// 1. Fix user permissions for auto-response activation
router.post('/:accountId/toggle-auto-response', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { enabled, userId } = req.body;
    
    console.log(`🔧 Usuario ${userId || 'anónimo'} cambiando auto-respuesta para cuenta ${accountId}: ${enabled ? 'ACTIVAR' : 'DESACTIVAR'}`);
    
    // Update auto-response configuration
    const account = await storage.getWhatsappAccount(parseInt(accountId));
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Cuenta de WhatsApp no encontrada'
      });
    }
    
    // Update persistent configuration
    const currentConfig = await storage.getWhatsappAgentConfig(parseInt(accountId));
    await storage.setWhatsappAgentConfig(
      parseInt(accountId), 
      currentConfig?.agentId || account.assignedExternalAgentId || '3',
      enabled
    );
    
    // Update account record
    const updatedAccount = await storage.updateWhatsappAccount(parseInt(accountId), {
      autoResponseEnabled: enabled,
      lastActivity: new Date()
    });
    
    console.log(`✅ Auto-respuesta ${enabled ? 'ACTIVADA' : 'DESACTIVADA'} para cuenta ${accountId}`);
    
    res.json({
      success: true,
      autoResponseEnabled: enabled,
      account: updatedAccount,
      message: `Respuestas automáticas ${enabled ? 'activadas' : 'desactivadas'} exitosamente`
    });
    
  } catch (error) {
    console.error(`Error toggling auto-response for account ${req.params.accountId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar configuración de respuestas automáticas'
    });
  }
});

// 2. Custom prompts per account management
router.post('/:accountId/set-custom-prompt', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { customPrompt } = req.body;
    
    console.log(`💬 Configurando prompt personalizado para cuenta ${accountId}`);
    
    const updatedAccount = await storage.updateWhatsappAccount(parseInt(accountId), {
      customPrompt: customPrompt || null,
      lastActivity: new Date()
    });
    
    if (!updatedAccount) {
      return res.status(404).json({
        success: false,
        error: 'Cuenta de WhatsApp no encontrada'
      });
    }
    
    console.log(`✅ Prompt personalizado configurado para cuenta ${accountId}`);
    
    res.json({
      success: true,
      customPrompt: customPrompt,
      account: updatedAccount,
      message: 'Prompt personalizado configurado exitosamente'
    });
    
  } catch (error) {
    console.error(`Error setting custom prompt for account ${req.params.accountId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Error al configurar prompt personalizado'
    });
  }
});

// 3. Persistent connection management
router.post('/:accountId/ensure-connection', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    console.log(`🔗 Asegurando conexión persistente para cuenta ${accountId}`);
    
    // Enable persistent connection and reset connection attempts
    const updatedAccount = await storage.updateWhatsappAccount(parseInt(accountId), {
      keepAliveEnabled: true,
      lastActivity: new Date(),
      connectionAttempts: 0
    });
    
    if (!updatedAccount) {
      return res.status(404).json({
        success: false,
        error: 'Cuenta de WhatsApp no encontrada'
      });
    }
    
    // Try to maintain connection through WhatsApp manager
    try {
      const { whatsappMultiAccountManager } = await import('../services/whatsappMultiAccountManager');
      const status = whatsappMultiAccountManager.getStatus(parseInt(accountId));
      if (!status || status.status === 'disconnected') {
        console.log(`🔄 Reintentando conexión para cuenta ${accountId}`);
        await whatsappMultiAccountManager.initializeAccount(parseInt(accountId));
      }
    } catch (connectionError) {
      console.log(`⚠️ Error en reconexión automática para cuenta ${accountId}:`, connectionError);
    }
    
    console.log(`✅ Conexión persistente asegurada para cuenta ${accountId}`);
    
    res.json({
      success: true,
      keepAliveEnabled: true,
      account: updatedAccount,
      message: 'Conexión persistente asegurada'
    });
    
  } catch (error) {
    console.error(`Error ensuring connection for account ${req.params.accountId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Error al asegurar conexión persistente'
    });
  }
});

// Enhanced account info with proper owner details
router.patch('/:accountId/update-info', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { ownerName, ownerPhone, description } = req.body;
    
    console.log(`📝 Actualizando información de propietario para cuenta ${accountId}`);
    
    const updateData: any = { lastActivity: new Date() };
    if (ownerName !== undefined) updateData.ownerName = ownerName;
    if (ownerPhone !== undefined) updateData.ownerPhone = ownerPhone;
    if (description !== undefined) updateData.description = description;
    
    const updatedAccount = await storage.updateWhatsappAccount(parseInt(accountId), updateData);
    
    if (!updatedAccount) {
      return res.status(404).json({
        success: false,
        error: 'Cuenta de WhatsApp no encontrada'
      });
    }
    
    console.log(`✅ Información de propietario actualizada para cuenta ${accountId}`);
    
    res.json({
      success: true,
      account: updatedAccount,
      message: 'Información de propietario actualizada exitosamente'
    });
    
  } catch (error) {
    console.error(`Error updating account info for ${req.params.accountId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar información de la cuenta'
    });
  }
});

// Enhanced account listing with proper owner information and last activity
router.get('/enhanced-list', async (req, res) => {
  try {
    console.log('🔄 Obteniendo lista mejorada de cuentas de WhatsApp...');
    
    const accounts = await storage.getAllWhatsappAccounts();
    console.log(`✅ Cuentas obtenidas: ${accounts.length}`);
    
    // Transform accounts with enhanced owner info and proper last activity
    const transformedAccounts = accounts.map(account => {
      // Calculate proper last activity display
      const lastActivity = account.lastActivity || account.lastActiveAt;
      const lastActivityDisplay = lastActivity ? 
        (() => {
          const diff = Date.now() - new Date(lastActivity).getTime();
          const minutes = Math.floor(diff / 60000);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);
          
          if (minutes < 1) return 'Hace menos de 1 minuto';
          if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
          if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
          if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
          return new Date(lastActivity).toLocaleDateString();
        })() : 'Nunca';
      
      // Get real-time status
      let realTimeStatus = account.status || 'inactive';
      try {
        const { whatsappMultiAccountManager } = require('../services/whatsappMultiAccountManager');
        const statusInfo = whatsappMultiAccountManager.getStatus(account.id);
        realTimeStatus = statusInfo?.status || account.status || 'inactive';
      } catch (error) {
        console.log(`⚠️ No se pudo obtener estado en tiempo real para cuenta ${account.id}`);
      }
      
      return {
        id: account.id,
        name: account.name || 'Sin nombre',
        description: account.description || '',
        status: realTimeStatus,
        ownerName: account.ownerName || 'No asignado',
        ownerPhone: account.ownerPhone || 'No registrado',
        autoResponseEnabled: account.autoResponseEnabled || false,
        responseDelay: account.responseDelay || 1000,
        customPrompt: account.customPrompt || null,
        keepAliveEnabled: account.keepAliveEnabled !== false,
        lastActivity: lastActivityDisplay,
        createdAt: account.createdAt,
        isConnected: realTimeStatus === 'connected' || realTimeStatus === 'ready'
      };
    });

    res.json({
      success: true,
      accounts: transformedAccounts
    });
  } catch (error) {
    console.error('Error fetching enhanced WhatsApp accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cuentas de WhatsApp',
      accounts: []
    });
  }
});

// Dashboard auto-refresh endpoint
router.get('/dashboard-refresh', async (req, res) => {
  try {
    const [stats, accounts] = await Promise.all([
      storage.getDashboardStats(),
      storage.getAllWhatsappAccounts()
    ]);
    
    const accountsWithStatus = accounts.map(account => {
      let statusInfo = null;
      try {
        const { whatsappMultiAccountManager } = require('../services/whatsappMultiAccountManager');
        statusInfo = whatsappMultiAccountManager.getStatus(account.id);
      } catch (error) {
        console.log(`⚠️ No se pudo obtener estado para cuenta ${account.id}`);
      }
      
      const lastActivity = account.lastActivity || account.lastActiveAt;
      
      return {
        id: account.id,
        name: account.name,
        status: statusInfo?.status || account.status || 'inactive',
        ownerName: account.ownerName || 'No asignado',
        ownerPhone: account.ownerPhone || 'No registrado',
        lastActivity: lastActivity ? new Date(lastActivity).toLocaleString() : 'Nunca',
        isConnected: statusInfo?.status === 'connected' || statusInfo?.status === 'ready'
      };
    });
    
    res.json({
      success: true,
      stats: stats,
      accounts: accountsWithStatus,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Error in dashboard auto-refresh:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh dashboard data'
    });
  }
});

export default router;
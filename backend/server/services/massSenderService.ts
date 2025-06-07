import { whatsappService } from './whatsappServiceImpl';
import { messageTemplateService } from './messageTemplateService';
import { excelImportService, type ContactData, type TemplateContactBatch } from './excelImportService';
import { db } from '../db';
import { marketingCampaigns, type MarketingCampaign } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { EventEmitter } from 'events';

// Interfaz para configuración de envío masivo
export interface SendingConfig {
  minIntervalMs: number;      // Intervalo mínimo entre mensajes (ms)
  maxIntervalMs: number;      // Intervalo máximo entre mensajes (ms)
  batchSize: number;          // Tamaño del lote de mensajes
  pauseBetweenBatchesMs: number; // Pausa entre lotes (ms)
  respectBusinessHours: boolean; // Respetar horario comercial
  businessHoursStart: number; // Hora de inicio del horario comercial (0-23)
  businessHoursEnd: number;   // Hora de fin del horario comercial (0-23)
  simulateTyping: boolean;    // Simular escritura
  typingDurationMs: number;   // Duración de la simulación de escritura (ms)
}

// Interfaz para estadísticas de campaña
export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  responses: number;
  failed: number;
}

// Interfaz para receptores de mensajes
export interface MessageRecipient {
  id: string;
  phoneNumber: string;
  name?: string;
  company?: string;
  variables?: Record<string, string>;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  responseReceived?: boolean;
}

// Estado de la campaña
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';

// Clase para servicio de envío masivo
export class MassSenderService extends EventEmitter {
  private runningCampaigns: Map<number, NodeJS.Timeout> = new Map();
  private campaignRecipients: Map<number, MessageRecipient[]> = new Map();
  private isProcessingQueue: boolean = false;
  private processingQueueTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
    this.startQueueProcessing();
  }

  // Obtener todas las campañas
  async getCampaigns(): Promise<MarketingCampaign[]> {
    return db.select().from(marketingCampaigns).orderBy(marketingCampaigns.createdAt);
  }

  // Obtener una campaña por ID
  async getCampaignById(id: number): Promise<MarketingCampaign | undefined> {
    const result = await db.select().from(marketingCampaigns)
      .where(eq(marketingCampaigns.id, id));
    return result[0];
  }

  // Crear una nueva campaña
  async createCampaign(campaignData: {
    name: string;
    description?: string;
    templateId?: number;
    status?: CampaignStatus;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    sendingConfig?: SendingConfig;
    createdBy?: number;
  }): Promise<MarketingCampaign> {
    // Valores por defecto para sendingConfig
    const defaultSendingConfig: SendingConfig = {
      minIntervalMs: 5000,
      maxIntervalMs: 15000,
      batchSize: 10,
      pauseBetweenBatchesMs: 60000,
      respectBusinessHours: true,
      businessHoursStart: 9,
      businessHoursEnd: 18,
      simulateTyping: true,
      typingDurationMs: 3000
    };

    const sendingConfig = campaignData.sendingConfig || defaultSendingConfig;

    // Crear la campaña en la base de datos
    const [campaign] = await db.insert(marketingCampaigns)
      .values({
        name: campaignData.name,
        description: campaignData.description || null,
        templateId: campaignData.templateId || null,
        status: campaignData.status || 'draft',
        scheduledStart: campaignData.scheduledStart || null,
        scheduledEnd: campaignData.scheduledEnd || null,
        sendingConfig: sendingConfig,
        recipientList: {},
        importedContacts: {},
        stats: {
          total: 0,
          sent: 0,
          delivered: 0,
          read: 0,
          responses: 0,
          failed: 0
        },
        createdBy: campaignData.createdBy || null
      })
      .returning();

    return campaign;
  }

  // Actualizar una campaña existente
  async updateCampaign(id: number, campaignData: Partial<{
    name: string;
    description: string;
    templateId: number;
    status: CampaignStatus;
    scheduledStart: Date;
    scheduledEnd: Date;
    sendingConfig: SendingConfig;
  }>): Promise<MarketingCampaign | undefined> {
    const campaign = await this.getCampaignById(id);
    if (!campaign) return undefined;

    const [updatedCampaign] = await db.update(marketingCampaigns)
      .set({
        ...campaignData,
        updatedAt: new Date()
      })
      .where(eq(marketingCampaigns.id, id))
      .returning();

    return updatedCampaign;
  }

  // Importar contactos desde un resultado de importación de Excel
  async importContactsFromExcel(
    campaignId: number,
    importId: string
  ): Promise<boolean> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) return false;

    const importResult = excelImportService.getImportResult(importId);
    if (!importResult) return false;

    // Convertir los contactos importados
    const recipients: MessageRecipient[] = importResult.contacts.map(contact => ({
      id: contact.id,
      phoneNumber: contact.phoneNumber,
      name: contact.name,
      company: contact.company,
      variables: this.createVariableMap(contact),
      status: 'pending'
    }));

    // Actualizar la campaña con los contactos importados
    await db.update(marketingCampaigns)
      .set({
        importedContacts: importResult.contacts,
        recipientList: recipients,
        stats: {
          ...campaign.stats as CampaignStats,
          total: recipients.length
        },
        updatedAt: new Date()
      })
      .where(eq(marketingCampaigns.id, campaignId));

    // Guardar los destinatarios en memoria
    this.campaignRecipients.set(campaignId, recipients);

    return true;
  }
  
  // Importar contactos y aplicar una plantilla usando un mapeo de variables
  async importContactsWithTemplate(
    campaignId: number,
    batch: TemplateContactBatch
  ): Promise<boolean> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) return false;
    
    // Verificar si la plantilla existe
    const template = await messageTemplateService.getTemplateById(batch.templateId);
    if (!template) return false;
    
    // Actualizar la campaña con el ID de la plantilla
    await this.updateCampaign(campaignId, { templateId: batch.templateId });
    
    // Preparar los destinatarios con sus variables
    const recipients: MessageRecipient[] = [];
    
    for (let i = 0; i < batch.contactIds.length; i++) {
      const contactId = batch.contactIds[i];
      const variables = batch.variables[i] || {};
      
      // Aquí asumimos que tenemos contactos con estos IDs en algún lugar
      // Por ahora vamos a crear objetos simples
      recipients.push({
        id: contactId,
        phoneNumber: variables.phoneNumber as string, // Asumimos que hay un número de teléfono en las variables
        name: variables.nombre as string,
        company: variables.empresa as string,
        variables,
        status: 'pending'
      });
    }
    
    // Actualizar la campaña con los contactos importados
    await db.update(marketingCampaigns)
      .set({
        recipientList: recipients,
        stats: {
          ...campaign.stats as CampaignStats,
          total: recipients.length
        },
        updatedAt: new Date()
      })
      .where(eq(marketingCampaigns.id, campaignId));
    
    // Guardar los destinatarios en memoria
    this.campaignRecipients.set(campaignId, recipients);
    
    return true;
  }

  // Crear mapa de variables para un contacto
  private createVariableMap(contact: ContactData): Record<string, string> {
    const variables: Record<string, string> = {};
    
    // Agregar campos básicos
    if (contact.name) variables['nombre'] = contact.name;
    if (contact.company) variables['empresa'] = contact.company;
    if (contact.email) variables['email'] = contact.email;
    
    // Agregar todos los demás campos personalizados
    Object.entries(contact).forEach(([key, value]) => {
      if (
        key !== 'id' && 
        key !== 'phoneNumber' && 
        key !== 'name' && 
        key !== 'company' && 
        key !== 'email' && 
        key !== 'tags'
      ) {
        variables[key] = String(value);
      }
    });
    
    return variables;
  }

  // Iniciar una campaña
  async startCampaign(id: number): Promise<boolean> {
    const campaign = await this.getCampaignById(id);
    if (!campaign) return false;

    // Verificar si ya hay una campaña en ejecución
    if (this.runningCampaigns.has(id)) {
      return false;
    }

    // Verificar si WhatsApp está conectado
    const whatsappStatus = whatsappService.getStatus();
    if (!whatsappStatus.authenticated) {
      return false;
    }

    // Cargar los destinatarios si no están en memoria
    if (!this.campaignRecipients.has(id)) {
      const recipientList = campaign.recipientList as MessageRecipient[];
      if (!recipientList || !Array.isArray(recipientList) || recipientList.length === 0) {
        return false;
      }
      this.campaignRecipients.set(id, recipientList);
    }

    // Actualizar el estado de la campaña a 'running'
    await this.updateCampaign(id, { status: 'running' });

    // Comenzar procesamiento de cola automáticamente
    this.startQueueProcessing();

    return true;
  }

  // Pausar una campaña
  async pauseCampaign(id: number): Promise<boolean> {
    const campaign = await this.getCampaignById(id);
    if (!campaign) return false;

    // Actualizar el estado de la campaña a 'paused'
    await this.updateCampaign(id, { status: 'paused' });

    return true;
  }

  // Reanudar una campaña
  async resumeCampaign(id: number): Promise<boolean> {
    const campaign = await this.getCampaignById(id);
    if (!campaign || campaign.status !== 'paused') return false;

    // Actualizar el estado de la campaña a 'running'
    await this.updateCampaign(id, { status: 'running' });

    return true;
  }

  // Iniciar procesamiento de cola
  private startQueueProcessing(): void {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    this.processQueue();
  }

  // Detener procesamiento de cola
  private stopQueueProcessing(): void {
    this.isProcessingQueue = false;
    
    if (this.processingQueueTimeout) {
      clearTimeout(this.processingQueueTimeout);
      this.processingQueueTimeout = null;
    }
  }

  // Procesar cola de mensajes
  private async processQueue(): Promise<void> {
    if (!this.isProcessingQueue) return;

    try {
      // Obtener todas las campañas activas
      const campaigns = await this.getCampaigns();
      const runningCampaigns = campaigns.filter(c => c.status === 'running');

      // Procesar cada campaña activa
      for (const campaign of runningCampaigns) {
        await this.processCampaignBatch(campaign);
      }
    } catch (error) {
      console.error('Error procesando cola de mensajes:', error);
    }

    // Programar el próximo procesamiento
    this.processingQueueTimeout = setTimeout(() => this.processQueue(), 10000);
  }

  // Procesar un lote de mensajes para una campaña
  private async processCampaignBatch(campaign: MarketingCampaign): Promise<void> {
    // Verificar si se puede enviar según horario comercial
    if (!this.canSendNow(campaign)) {
      return;
    }

    // Obtener la configuración de envío
    const sendingConfig = campaign.sendingConfig as SendingConfig;
    if (!sendingConfig) return;

    // Obtener la plantilla
    let templateContent = '';
    if (campaign.templateId) {
      const template = await messageTemplateService.getTemplateById(campaign.templateId);
      if (template) {
        templateContent = template.content;
      }
    }

    if (!templateContent) return;

    // Obtener los destinatarios pendientes
    const recipients = this.campaignRecipients.get(campaign.id) || [];
    const pendingRecipients = recipients.filter(r => r.status === 'pending');

    // Seleccionar un lote para enviar
    const batchSize = Math.min(sendingConfig.batchSize, pendingRecipients.length);
    const batch = pendingRecipients.slice(0, batchSize);

    // Enviar mensajes al lote
    for (const recipient of batch) {
      try {
        // Personalizar el mensaje para este destinatario
        const personalizedMessage = messageTemplateService.applyVariablesToTemplate(
          templateContent,
          recipient.variables || {}
        );

        // Simular escritura si está configurado
        if (sendingConfig.simulateTyping) {
          // Esta función aún no está implementada en el servicio de WhatsApp
          // await whatsappService.simulateTyping(recipient.phoneNumber, sendingConfig.typingDurationMs);
        }

        // Enviar el mensaje
        const result = await whatsappService.sendMessage(recipient.phoneNumber, personalizedMessage);
        
        // Actualizar estado del destinatario
        recipient.status = 'sent';
        recipient.sentAt = new Date();

        // Actualizar estadísticas de la campaña
        const stats = campaign.stats as CampaignStats;
        stats.sent++;

        // Guardar actualizaciones en la base de datos
        await db.update(marketingCampaigns)
          .set({ 
            stats,
            recipientList: this.campaignRecipients.get(campaign.id) || []
          })
          .where(eq(marketingCampaigns.id, campaign.id));

        // Esperar un intervalo aleatorio antes del próximo envío
        const interval = this.getRandomInterval(
          sendingConfig.minIntervalMs,
          sendingConfig.maxIntervalMs
        );
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        // Marcar como fallido
        recipient.status = 'failed';
        
        // Actualizar estadísticas
        const stats = campaign.stats as CampaignStats;
        stats.failed++;
        
        console.error(`Error enviando mensaje a ${recipient.phoneNumber}:`, error);
      }
    }

    // Verificar si se han completado todos los envíos
    const allDone = recipients.every(r => r.status !== 'pending');
    if (allDone) {
      // Marcar la campaña como completada
      await this.updateCampaign(campaign.id, { status: 'completed' });
    }
  }

  // Verificar si se puede enviar ahora según configuración de horario
  private canSendNow(campaign: MarketingCampaign): boolean {
    const sendingConfig = campaign.sendingConfig as SendingConfig;
    if (!sendingConfig) return false;

    // Si no hay que respetar horario comercial, siempre se puede enviar
    if (!sendingConfig.respectBusinessHours) {
      return true;
    }

    // Verificar hora actual
    const now = new Date();
    const hour = now.getHours();
    
    return hour >= sendingConfig.businessHoursStart && 
           hour < sendingConfig.businessHoursEnd;
  }

  // Obtener un intervalo aleatorio entre min y max
  private getRandomInterval(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  // Verificar que un mensaje ha sido entregado correctamente
  async verifyMessageSent(campaignId: number, contactId: string, messageId?: string): Promise<boolean> {
    // Obtener la campaña
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) return false;
    
    // Obtener lista de destinatarios
    const recipientList = (campaign.recipientList || []) as MessageRecipient[];
    
    // Buscar el contacto específico
    const contactIndex = recipientList.findIndex(contact => contact.id === contactId);
    if (contactIndex === -1) return false;
    
    // Actualizar el estado del contacto a verificado
    recipientList[contactIndex].status = 'delivered';
    recipientList[contactIndex].deliveredAt = new Date();
    
    // Actualizar las estadísticas
    const stats = campaign.stats as CampaignStats;
    stats.delivered = (stats.delivered || 0) + 1;
    
    // Guardar los cambios en la base de datos
    await db.update(marketingCampaigns)
      .set({
        recipientList,
        stats,
        updatedAt: new Date()
      })
      .where(eq(marketingCampaigns.id, campaignId));
    
    // Actualizar la lista en memoria
    this.campaignRecipients.set(campaignId, recipientList);
    
    return true;
  }
}

export const massSenderService = new MassSenderService();

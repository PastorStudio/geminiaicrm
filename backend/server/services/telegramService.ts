import { Telegraf, Context } from 'telegraf';
import TelegramBot from 'node-telegram-bot-api';
import { EventEmitter } from 'events';
import QRCode from 'qrcode';
import { Lead, Message as CRMMessage } from '@shared/schema';
import { storage } from '../storage';
import * as crypto from 'crypto';

interface TelegramAuthCode {
    code: string;
    expiresAt: Date;
    base64Image?: string;
}

/**
 * Servicio para manejar la integración con Telegram
 * Permite la autenticación mediante código QR y el envío/recepción de mensajes
 */
export class TelegramService extends EventEmitter {
    private bot: Telegraf | null = null;
    private isReady: boolean = false;
    private authCode: TelegramAuthCode | null = null;
    private connectedChats: Map<number, { userId: number, username?: string }> = new Map();
    private pendingMessages: Array<{
        chatId: number | string;
        message: string;
        leadId?: number;
    }> = [];

    constructor() {
        super();
        this.initialize();
    }

    /**
     * Inicializa el bot de Telegram
     */
    private initialize() {
        try {
            // Intentamos usar un token de entorno si está disponible
            const token = process.env.TELEGRAM_BOT_TOKEN;
            
            if (!token) {
                console.log('No se ha configurado un token de Telegram. Generando código de autenticación para configuración manual.');
                this.generateAuthCode();
                return;
            }
            
            console.log('Inicializando Telegram...');
            
            // Crear instancia del bot
            this.bot = new Telegraf(token);
            
            // Configurar manejadores de eventos
            this.setupEventHandlers();
            
            // Lanzar el bot
            this.bot.launch()
                .then(() => {
                    console.log('Bot de Telegram iniciado correctamente');
                    this.isReady = true;
                    this.emit('ready');
                    
                    // Enviar mensajes pendientes
                    this.sendPendingMessages();
                })
                .catch(error => {
                    console.error('Error al iniciar bot de Telegram:', error);
                    this.emit('error', error);
                });
                
            // Manejo de cierre adecuado
            process.once('SIGINT', () => this.bot?.stop('SIGINT'));
            process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
            
        } catch (error) {
            console.error('Error al inicializar Telegram:', error);
            this.emit('error', error);
        }
    }

    /**
     * Configura los manejadores de eventos del bot
     */
    private setupEventHandlers() {
        if (!this.bot) return;
        
        // Comando de inicio
        this.bot.start((ctx) => {
            if (!ctx.chat || !ctx.from) return;
            
            const chatId = ctx.chat.id;
            // Obtenemos el username desde from en lugar de chat, ya que solo PrivateChat y SupergroupChat tienen username
            const username = ctx.from?.username;
            
            // Registramos el chat
            this.connectedChats.set(chatId, { 
                userId: ctx.from.id,
                username
            });
            
            ctx.reply(`¡Bienvenido al bot de GeminiCRM! Tu chat ID es: ${chatId}`);
            
            // Emitir evento de conexión
            this.emit('chat_connected', { chatId, username });
            
            console.log(`Nuevo chat conectado: ${chatId} (${username || 'sin username'})`);
        });
        
        // Comando de ayuda
        this.bot.help((ctx) => {
            ctx.reply(`
Comandos disponibles:
/start - Iniciar el bot y registrar tu chat
/help - Mostrar este mensaje de ayuda
/status - Ver el estado de la conexión

Simplemente envía mensajes y se procesarán automáticamente.
Para vincular este chat a un lead específico, un administrador debe configurarlo.
            `);
        });
        
        // Comando de estado
        this.bot.command('status', (ctx) => {
            const chatId = ctx.chat.id;
            const isRegistered = this.connectedChats.has(chatId);
            
            ctx.reply(`
Estado de la conexión:
- Chat ID: ${chatId}
- Registrado: ${isRegistered ? 'Sí' : 'No'}
- Bot activo: ${this.isReady ? 'Sí' : 'No'}
- Mensajes pendientes: ${this.pendingMessages.length}
            `);
        });
        
        // Manejador de mensajes
        this.bot.on('message', async (ctx) => {
            // Solo procesar mensajes de texto
            if (ctx.message && 'text' in ctx.message) {
                const chatId = ctx.chat.id;
                const messageText = ctx.message.text;
                
                console.log(`Mensaje recibido de Telegram (${chatId}): ${messageText}`);
                
                // Si el mensaje comienza con /, es un comando y ya lo manejamos antes
                if (!messageText.startsWith('/')) {
                    // Procesar el mensaje entrante
                    await this.processIncomingMessage(ctx);
                    
                    // Emitir evento de mensaje
                    this.emit('message', { 
                        chatId, 
                        text: messageText, 
                        from: ctx.from 
                    });
                }
            }
        });
    }

    /**
     * Genera un código de autenticación para la configuración manual del bot
     */
    public generateAuthCode() {
        // Generar un código único
        const code = crypto.randomBytes(4).toString('hex');
        
        // Establecer tiempo de expiración (24 horas)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        this.authCode = {
            code,
            expiresAt
        };
        
        // Generar imagen QR para el código
        QRCode.toDataURL(`geminicrm://telegram/auth/${code}`, (err: any, url: string) => {
            if (err) {
                console.error('Error al generar QR para código de autenticación:', err);
                return;
            }
            
            if (this.authCode) {
                this.authCode.base64Image = url;
                
                // Emitir evento de código generado
                this.emit('auth_code', this.authCode);
                
                console.log('Código de autenticación generado:', code);
                console.log('Para configurar el bot manualmente, sigue los pasos en el panel de administración.');
            }
        });
    }

    /**
     * Procesa un mensaje entrante de Telegram y lo guarda en el CRM
     */
    private async processIncomingMessage(ctx: Context) {
        try {
            if (!ctx.message || !('text' in ctx.message) || !ctx.chat || !ctx.from) return;
            
            const chatId = ctx.chat.id;
            const messageText = ctx.message.text;
            
            // Buscar si existe un lead vinculado a este chatId
            const leads = await storage.getAllLeads();
            let lead = leads.find(lead => lead.telegramChatId === chatId.toString());
            
            // Si no existe un lead, creamos uno nuevo
            if (!lead) {
                const name = ctx.from.first_name + 
                    (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
                
                lead = await storage.createLead({
                    fullName: name,
                    email: ctx.from.username ? 
                        `${ctx.from.username}@telegram.placeholder` : 
                        `${chatId}@telegram.placeholder`,
                    phone: null,
                    source: 'telegram',
                    status: 'new',
                    assignedTo: 1, // ID del usuario por defecto
                    notes: 'Lead generado automáticamente desde Telegram',
                    telegramChatId: chatId.toString()
                });
            }
            
            // Guardar el mensaje en el CRM
            await storage.createMessage({
                leadId: lead.id,
                userId: null, // Mensaje recibido del cliente, no de un usuario del CRM
                direction: 'incoming',
                channel: 'telegram',
                content: messageText,
                read: false
            });
            
        } catch (error) {
            console.error('Error al procesar mensaje de Telegram:', error);
        }
    }

    /**
     * Envía los mensajes que quedaron pendientes
     */
    private async sendPendingMessages() {
        if (this.isReady && this.bot) {
            while (this.pendingMessages.length > 0) {
                const msg = this.pendingMessages.shift();
                if (msg) {
                    await this.sendDirectMessage(msg.chatId, msg.message, msg.leadId);
                }
            }
        }
    }

    /**
     * Envía un mensaje a un chat de Telegram
     */
    public async sendMessage(chatId: number | string, message: string, leadId?: number) {
        if (this.isReady && this.bot) {
            return this.sendDirectMessage(chatId, message, leadId);
        } else {
            // Si el bot no está listo, guardar el mensaje para enviarlo después
            this.pendingMessages.push({
                chatId,
                message,
                leadId
            });
            
            return {
                success: false,
                pending: true,
                message: 'Mensaje en cola. El bot de Telegram no está listo.'
            };
        }
    }

    /**
     * Envía un mensaje directamente a través del bot de Telegram
     */
    private async sendDirectMessage(chatId: number | string, message: string, leadId?: number) {
        try {
            if (!this.bot) {
                throw new Error('Bot de Telegram no inicializado');
            }
            
            // Convertir chatId a número si es string
            const numericChatId = typeof chatId === 'string' ? parseInt(chatId, 10) : chatId;
            
            // Enviar el mensaje
            const response = await this.bot.telegram.sendMessage(numericChatId, message);
            
            // Guardamos el mensaje en el CRM si se proporcionó un leadId
            if (leadId) {
                await storage.createMessage({
                    leadId,
                    userId: 1, // Usuario del sistema o bot
                    direction: 'outgoing',
                    channel: 'telegram',
                    content: message,
                    read: true
                });
            }
            
            return {
                success: true,
                messageId: response.message_id,
                timestamp: new Date()
            };
            
        } catch (error: any) {
            console.error('Error al enviar mensaje de Telegram:', error);
            return {
                success: false,
                error: error.message || 'Error desconocido'
            };
        }
    }

    /**
     * Obtiene el estado actual del bot
     */
    public getStatus() {
        return {
            initialized: !!this.bot,
            ready: this.isReady,
            connectedChats: Array.from(this.connectedChats.keys()),
            pendingMessages: this.pendingMessages.length,
            authCode: this.authCode ? {
                code: this.authCode.code,
                expiresAt: this.authCode.expiresAt,
                hasQR: !!this.authCode.base64Image
            } : null
        };
    }

    /**
     * Obtiene el código QR de autenticación actual
     */
    public getAuthCode() {
        return this.authCode;
    }

    /**
     * Configura manualmente el token del bot de Telegram
     */
    public async setToken(token: string) {
        try {
            // Detener el bot actual si existe
            if (this.bot) {
                await this.bot.stop();
            }
            
            // Guardar el token (en un entorno de producción esto debería ir a una base de datos segura)
            process.env.TELEGRAM_BOT_TOKEN = token;
            
            // Reiniciar el bot
            this.bot = null;
            this.isReady = false;
            this.initialize();
            
            return { success: true };
        } catch (error: any) {
            console.error('Error al configurar token de Telegram:', error);
            return { 
                success: false,
                error: error.message || 'Error desconocido'
            };
        }
    }

    /**
     * Reinicia la conexión del bot de Telegram
     */
    public async restart() {
        if (this.bot) {
            await this.bot.stop();
        }
        this.bot = null;
        this.isReady = false;
        this.initialize();
        return { success: true };
    }

    /**
     * Elimina un chat del registro
     */
    public removeChat(chatId: number) {
        const removed = this.connectedChats.delete(chatId);
        return { success: removed };
    }

    /**
     * Genera un código de autenticación de demostración
     * Este método NO debe usarse en producción
     */
    public generateDemoAuthCode() {
        const code = 'demo123';
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        QRCode.toDataURL(`geminicrm://telegram/auth/${code}`, (err: any, url: string) => {
            if (!err && url) {
                this.authCode = {
                    code,
                    expiresAt,
                    base64Image: url
                };
                this.emit('auth_code', this.authCode);
            }
        });
        
        return {
            code,
            expiresAt
        };
    }
}

// Exportar como singleton
export const telegramService = new TelegramService();
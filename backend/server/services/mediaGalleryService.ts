/**
 * Servicio para gestionar la galería de archivos multimedia
 * Permite almacenar, categorizar y reutilizar archivos subidos al sistema
 */

import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { mediaGallery } from '@shared/schema';
import { eq, desc, asc, and, like, or, inArray, sql } from 'drizzle-orm';

// Ruta para almacenar archivos multimedia
const MEDIA_DIR = path.join(process.cwd(), 'temp', 'media');

// Asegurarse de que el directorio existe
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// Interfaz de un elemento de la galería
export interface MediaItem {
  id: number;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  path: string;
  type: string;
  tags?: string[];
  title?: string;
  description?: string;
  uploadedBy?: number;
  uploadedAt: Date;
  lastUsedAt?: Date;
  useCount: number;
  url?: string; // URL para acceso público (no se almacena en BD)
}

// Opciones para filtros de búsqueda
export interface MediaSearchOptions {
  type?: string | string[];
  tags?: string | string[];
  search?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

class MediaGalleryService {
  /**
   * Guarda un archivo en la galería
   */
  async saveMedia(file: Express.Multer.File, options: {
    type: string;
    title?: string;
    description?: string;
    tags?: string[];
    uploadedBy?: number;
  }): Promise<MediaItem> {
    try {
      // Generar un nombre único para el archivo
      const fileExt = path.extname(file.originalname);
      const fileId = nanoid();
      const filename = `${Date.now()}_${fileId}${fileExt}`;
      const filePath = path.join(MEDIA_DIR, filename);
      
      // Asegurarse de que el directorio existe
      if (!fs.existsSync(MEDIA_DIR)) {
        fs.mkdirSync(MEDIA_DIR, { recursive: true });
      }
      
      // Guardar el archivo en el sistema de archivos
      await fs.promises.writeFile(filePath, file.buffer);
      
      // Usamos el método insert de Drizzle ORM correctamente 
      const result = await db.insert(mediaGallery).values({
        filename: filename,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
        type: options.type,
        tags: options.tags || [],
        title: options.title || null,
        description: options.description || null,
        uploadedBy: options.uploadedBy || null,
        useCount: 0,
        uploadedAt: new Date()
      }).returning();
      
      // Para mayor seguridad, usamos el operador || para proporcionar un valor por defecto
      const mediaItem = (result && result[0]) || null;
      
      if (!mediaItem) {
        throw new Error('No se pudo obtener el resultado de la inserción');
      }
      
      return this.formatMediaItem(mediaItem);
    } catch (error) {
      console.error('Error en saveMedia:', error);
      throw new Error('Error al guardar archivo en la galería');
    }
  }
  
  /**
   * Obtiene un archivo por su ID
   */
  async getMediaById(id: number): Promise<MediaItem | null> {
    try {
      const result = await db.select().from(mediaGallery).where(eq(mediaGallery.id, id)).limit(1);
      
      if (!result.length) {
        return null;
      }
      
      return this.formatMediaItem(result[0]);
    } catch (error) {
      console.error('Error en getMediaById:', error);
      return null;
    }
  }
  
  /**
   * Busca archivos según criterios
   */
  async searchMedia(options: MediaSearchOptions = {}): Promise<{ items: MediaItem[], total: number }> {
    // Parámetros por defecto
    const {
      type,
      tags,
      search,
      orderBy = 'uploadedAt',
      order = 'desc',
      page = 1,
      limit = 20
    } = options;
    
    try {
      // Construir consulta base
      const baseQuery = db.select().from(mediaGallery);
      
      // Crear condiciones de filtrado
      const conditions = [];
      
      // Filtrar por tipo
      if (type) {
        if (Array.isArray(type)) {
          conditions.push(inArray(mediaGallery.type, type));
        } else {
          conditions.push(eq(mediaGallery.type, type));
        }
      }
      
      // Filtrar por tags
      if (tags) {
        if (Array.isArray(tags) && tags.length > 0) {
          // Usamos SQL raw para la intersección de arrays
          conditions.push(sql`${mediaGallery.tags} && ${tags}`);
        } else if (typeof tags === 'string') {
          // Búsqueda de un solo tag
          conditions.push(sql`${tags} = ANY(${mediaGallery.tags})`);
        }
      }
      
      // Búsqueda por texto
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
          or(
            sql`${mediaGallery.title} LIKE ${searchPattern}`,
            sql`${mediaGallery.description} LIKE ${searchPattern}`,
            sql`${mediaGallery.originalFilename} LIKE ${searchPattern}`
          )
        );
      }
      
      // Aplicar condiciones si existen
      let finalQuery = baseQuery;
      if (conditions.length > 0) {
        finalQuery = baseQuery.where(and(...conditions));
      } else {
        finalQuery = baseQuery.where(sql`1=1`); // Condición siempre verdadera para mantener consistencia de tipos
      }
      
      // Consulta para contar resultados (usar una nueva consulta para evitar problemas de tipado)
      const countResult = await db.select({ 
        count: sql<number>`count(*)` 
      }).from(mediaGallery)
        .where(conditions.length > 0 ? and(...conditions) : sql`1=1`);
      
      const total = Number(countResult[0]?.count || 0);
      
      // Crear una consulta paginada
      let paginatedQuery = finalQuery;
      
      // Ordenar resultados
      if (orderBy === 'uploadedAt') {
        paginatedQuery = paginatedQuery.orderBy(order === 'desc' ? desc(mediaGallery.uploadedAt) : asc(mediaGallery.uploadedAt));
      } else if (orderBy === 'useCount') {
        paginatedQuery = paginatedQuery.orderBy(order === 'desc' ? desc(mediaGallery.useCount) : asc(mediaGallery.useCount));
      } else if (orderBy === 'lastUsedAt') {
        paginatedQuery = paginatedQuery.orderBy(order === 'desc' ? desc(mediaGallery.lastUsedAt) : asc(mediaGallery.lastUsedAt));
      }
      
      // Paginación
      const offset = (page - 1) * limit;
      paginatedQuery = paginatedQuery.limit(limit).offset(offset);
      
      // Ejecutar consulta principal
      const result = await paginatedQuery;
      
      // Formatear resultados
      return {
        items: result.map(item => this.formatMediaItem(item)),
        total
      };
    } catch (error) {
      console.error('Error en searchMedia:', error);
      return { items: [], total: 0 };
    }
  }
  
  /**
   * Actualiza los metadatos de un archivo
   */
  async updateMedia(id: number, data: {
    title?: string;
    description?: string;
    tags?: string[];
  }): Promise<MediaItem | null> {
    try {
      // Crear objeto de actualización con solo los campos proporcionados
      const updateData: any = {};
      
      if (data.title !== undefined) {
        updateData.title = data.title;
      }
      
      if (data.description !== undefined) {
        updateData.description = data.description;
      }
      
      if (data.tags !== undefined && Array.isArray(data.tags)) {
        updateData.tags = data.tags;
      }
      
      if (Object.keys(updateData).length === 0) {
        // No hay nada que actualizar
        return await this.getMediaById(id);
      }
      
      // Ejecutar la actualización usando Drizzle ORM
      const result = await db.update(mediaGallery)
        .set(updateData)
        .where(eq(mediaGallery.id, id))
        .returning();
      
      if (!result.length) {
        return null;
      }
      
      // Retornar el elemento actualizado
      return this.formatMediaItem(result[0]);
    } catch (error) {
      console.error('Error en updateMedia:', error);
      return null;
    }
  }
  
  /**
   * Elimina un archivo de la galería
   */
  async deleteMedia(id: number): Promise<boolean> {
    try {
      // Primero, obtener el archivo para saber qué eliminar físicamente
      const mediaItems = await db.select().from(mediaGallery).where(eq(mediaGallery.id, id)).limit(1);
      
      if (!mediaItems.length) {
        return false;
      }
      
      const mediaItem = mediaItems[0];
      
      // Eliminar el archivo físico
      try {
        if (typeof mediaItem.path === 'string') {
          await fs.promises.unlink(mediaItem.path);
        }
      } catch (error) {
        console.error('Error al eliminar archivo físico:', error);
      }
      
      // Eliminar de la base de datos usando Drizzle ORM
      await db.delete(mediaGallery).where(eq(mediaGallery.id, id));
      
      return true;
    } catch (error) {
      console.error('Error en deleteMedia:', error);
      return false;
    }
  }
  
  /**
   * Registra el uso de un archivo para estadísticas
   */
  async trackMediaUsage(id: number): Promise<void> {
    try {
      // Obtener el archivo actual para incrementar el contador
      const items = await db.select().from(mediaGallery).where(eq(mediaGallery.id, id)).limit(1);
      
      if (items.length === 0) {
        console.warn(`No se encontró archivo con ID ${id} para actualizar estadísticas`);
        return;
      }
      
      const currentItem = items[0];
      const newCount = (currentItem.useCount || 0) + 1;
      
      // Usar Drizzle ORM para la actualización
      await db.update(mediaGallery)
        .set({
          useCount: newCount,
          lastUsedAt: new Date()
        })
        .where(eq(mediaGallery.id, id));
        
      console.log(`Estadísticas actualizadas para archivo ID ${id}: ${newCount} usos`);
    } catch (error) {
      console.error('Error en trackMediaUsage:', error);
    }
  }
  
  /**
   * Formatea un elemento de la galería
   */
  private formatMediaItem(item: any): MediaItem {
    // Crear URL para acceso público
    const baseUrl = '/api/media';
    const url = `${baseUrl}/${item.id}/${encodeURIComponent(item.originalFilename)}`;
    
    return {
      ...item,
      url
    };
  }
}

export const mediaGalleryService = new MediaGalleryService();
/**
 * Rutas para la galería de medios
 */

import { Request, Response, Router } from 'express';
import multer from 'multer';
import { mediaGalleryService } from './mediaGalleryService';

// Configuración de multer para subida de archivos
const upload = multer({ storage: multer.memoryStorage() });

// Crear router para la galería de medios
export const mediaGalleryRouter = Router();

// Obtener archivos de la galería (con filtros y paginación)
mediaGalleryRouter.get('/list', async (req: Request, res: Response) => {
  try {
    const { type, tags, search, orderBy, order, page, limit } = req.query;
    
    const options: any = {};
    if (type) options.type = type;
    if (tags) options.tags = typeof tags === 'string' ? [tags] : tags;
    if (search) options.search = search;
    if (orderBy) options.orderBy = orderBy;
    if (order) options.order = order;
    if (page) options.page = parseInt(page as string);
    if (limit) options.limit = parseInt(limit as string);
    
    const result = await mediaGalleryService.searchMedia(options);
    res.status(200).json({
      success: true,
      items: result.items,
      total: result.total
    });
  } catch (error) {
    console.error('Error buscando medios:', error);
    res.status(500).json({ error: 'Error al buscar archivos multimedia' });
  }
});

// Obtener un archivo específico de la galería
mediaGalleryRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const media = await mediaGalleryService.getMediaById(id);
    
    if (!media) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    res.status(200).json(media);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({ error: errorMessage });
  }
});

// Subir un nuevo archivo a la galería
mediaGalleryRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
    }
    
    const options = {
      type: req.body.type || 'unknown',
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      uploadedBy: req.body.uploadedBy ? parseInt(req.body.uploadedBy) : undefined
    };
    
    const mediaItem = await mediaGalleryService.saveMedia(req.file, options);
    res.status(201).json(mediaItem);
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ error: 'Error al subir archivo multimedia' });
  }
});

// Actualizar metadatos de un archivo
mediaGalleryRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, tags } = req.body;
    
    const updated = await mediaGalleryService.updateMedia(id, {
      title,
      description,
      tags
    });
    
    if (!updated) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    res.status(200).json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el archivo';
    res.status(500).json({ error: errorMessage });
  }
});

// Eliminar un archivo de la galería
mediaGalleryRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await mediaGalleryService.deleteMedia(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error al eliminar el archivo';
    res.status(500).json({ error: errorMessage });
  }
});

// Registrar uso de un archivo (para estadísticas)
mediaGalleryRouter.post('/:id/track-usage', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await mediaGalleryService.trackMediaUsage(id);
    res.status(200).json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error al registrar uso del archivo';
    res.status(500).json({ error: errorMessage });
  }
});

// Router para servir archivos multimedia
export const mediaServeRouter = Router();

// Servir los archivos de la galería
mediaServeRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const media = await mediaGalleryService.getMediaById(id);
    
    if (!media) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    // Verificar que el camino del archivo sea válido
    if (!media.path || typeof media.path !== 'string') {
      return res.status(500).json({ error: 'Error en la ruta del archivo' });
    }
    
    // Registrar el uso del archivo
    await mediaGalleryService.trackMediaUsage(id);
    
    // Enviar el archivo como respuesta
    res.sendFile(media.path);
  } catch (error) {
    console.error('Error sirviendo archivo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({ error: 'Error al servir el archivo multimedia: ' + errorMessage });
  }
});
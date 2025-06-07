import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, Image, FileText, FileAudio, FileVideo, File, X, Download, Link, Copy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// Tipo para los archivos de la galería
interface MediaItem {
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
  uploadedAt: string;
  lastUsedAt?: string;
  useCount: number;
  url: string;
}

export default function MediaGalleryList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const { toast } = useToast();

  // Consulta para obtener la lista de archivos
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/media-gallery/list', selectedType, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const url = `/api/media-gallery/list?${params.toString()}`;
      const response = await apiRequest<{ success: boolean, items: MediaItem[], total: number }>(url);
      return response;
    }
  });

  // Obtener el icono para un tipo de archivo
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-8 w-8 text-blue-500" />;
      case 'document':
        return <FileText className="h-8 w-8 text-orange-500" />;
      case 'audio':
        return <FileAudio className="h-8 w-8 text-purple-500" />;
      case 'video':
        return <FileVideo className="h-8 w-8 text-red-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  // Función para abrir el modal con vista previa
  const openPreview = (media: MediaItem) => {
    setSelectedMedia(media);
    setPreviewOpen(true);
  };
  
  // Formatear tamaño del archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };
  
  // Renderizar contenido de la vista previa según el tipo de archivo
  const renderPreviewContent = () => {
    if (!selectedMedia) return null;
    
    switch (selectedMedia.type) {
      case 'image':
        return (
          <div className="flex justify-center">
            <img 
              src={selectedMedia.url} 
              alt={selectedMedia.title || selectedMedia.originalFilename}
              className="max-w-full max-h-[70vh] object-contain rounded-md"
            />
          </div>
        );
      case 'video':
        return (
          <div className="flex justify-center">
            <video 
              src={selectedMedia.url} 
              controls 
              className="max-w-full max-h-[70vh] rounded-md"
            >
              Tu navegador no soporta la reproducción de video.
            </video>
          </div>
        );
      case 'audio':
        return (
          <div className="flex justify-center p-6 bg-gray-50 rounded-md">
            <audio 
              src={selectedMedia.url} 
              controls
              className="w-full"
            >
              Tu navegador no soporta la reproducción de audio.
            </audio>
          </div>
        );
      case 'document':
        // Para documentos, intentamos usar un iframe para mostrar el documento
        return (
          <div className="w-full h-[70vh] rounded-md overflow-hidden border border-gray-200">
            <iframe 
              src={selectedMedia.url} 
              className="w-full h-full"
              title={selectedMedia.title || selectedMedia.originalFilename}
            />
          </div>
        );
      default:
        return (
          <div className="p-8 text-center bg-gray-50 rounded-md">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-gray-700">
              Vista previa no disponible para este tipo de archivo.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Descarga el archivo para visualizarlo.
            </p>
          </div>
        );
    }
  };

  return (
    <>
      <Helmet>
        <title>Lista de Galería de Medios - CRM</title>
        <meta name="description" content="Lista detallada de archivos multimedia en el CRM" />
      </Helmet>

      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Galería de Medios - Lista</h1>
          <Button 
            className="flex items-center gap-2"
            onClick={() => window.location.href = '/media-gallery'}
          >
            <Image className="h-4 w-4" />
            Volver a la Galería
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Archivos</CardTitle>
            <CardDescription>
              Explora todos los archivos disponibles en la galería
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetch()}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </Button>
                
                <Select 
                  value={selectedType} 
                  onValueChange={(value) => setSelectedType(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo de archivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="image">Imágenes</SelectItem>
                    <SelectItem value="document">Documentos</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="other">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar archivos..."
                  className="pl-8 w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <span className="ml-2">Cargando archivos...</span>
              </div>
            ) : isError ? (
              <div className="text-center text-red-500 py-8">
                <p>Error al cargar la galería. Intenta nuevamente.</p>
                <Button onClick={() => refetch()} variant="outline" className="mt-2">
                  Reintentar
                </Button>
              </div>
            ) : !data || data.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mx-auto h-12 w-12 text-muted-foreground mb-2">
                  <Image className="h-full w-full" />
                </div>
                <p className="mt-2">No hay archivos en la galería.</p>
                <Button 
                  onClick={() => window.location.href = '/media-gallery'} 
                  variant="outline" 
                  className="mt-2"
                >
                  Ir a Subir Archivo
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Archivo</th>
                      <th className="text-left py-3 px-4">Tipo</th>
                      <th className="text-left py-3 px-4">Tamaño</th>
                      <th className="text-left py-3 px-4">Fecha de subida</th>
                      <th className="text-left py-3 px-4">Etiquetas</th>
                      <th className="text-left py-3 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="mr-3">
                              {getFileIcon(item.type)}
                            </div>
                            <div>
                              <div className="font-medium">{item.title || item.originalFilename}</div>
                              <div className="text-sm text-gray-500">{item.originalFilename}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 capitalize">{item.type}</td>
                        <td className="py-3 px-4">{formatFileSize(item.size)}</td>
                        <td className="py-3 px-4">{new Date(item.uploadedAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {item.tags && item.tags.length > 0 ? (
                              item.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">Sin etiquetas</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openPreview(item)}
                            >
                              Ver
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              asChild
                            >
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
                                Descargar
                              </a>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal para vista previa */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">
                {selectedMedia?.title || selectedMedia?.originalFilename || 'Vista Previa'}
              </DialogTitle>
              <DialogClose className="h-6 w-6 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </DialogClose>
            </div>
            {selectedMedia && (
              <DialogDescription>
                {selectedMedia.type === 'image' && 'Imagen'}
                {selectedMedia.type === 'video' && 'Video'}
                {selectedMedia.type === 'audio' && 'Archivo de audio'}
                {selectedMedia.type === 'document' && 'Documento'}
                {!['image', 'video', 'audio', 'document'].includes(selectedMedia.type) && 'Archivo'} 
                • {formatFileSize(selectedMedia.size)} • {new Date(selectedMedia.uploadedAt).toLocaleDateString()}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="mt-4">
            {renderPreviewContent()}
          </div>
          
          {selectedMedia && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                {selectedMedia.description && (
                  <p className="mb-2">{selectedMedia.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  MIME: {selectedMedia.mimeType} • Usado {selectedMedia.useCount} veces
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  asChild
                >
                  <a 
                    href={selectedMedia.url} 
                    download={selectedMedia.originalFilename}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Descargar
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedMedia.url);
                    toast({
                      title: "URL copiada",
                      description: "La URL del archivo ha sido copiada al portapapeles",
                      variant: "success"
                    });
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar URL
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
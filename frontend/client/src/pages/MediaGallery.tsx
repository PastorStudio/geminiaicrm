import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Search, RefreshCw, Image, FileText, FileAudio, FileVideo, File, X, Download, Copy } from 'lucide-react';
import { MediaGallery, MediaItem } from '@/components/ui/MediaGallery';
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

export default function MediaGalleryPage() {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeView, setActiveView] = useState<"gallery" | "list">("gallery");
  const { toast } = useToast();

  // Manejador para cuando se selecciona un archivo
  const handleMediaSelect = (media: MediaItem) => {
    setSelectedMedia(media);
  };

  // Consulta para obtener la lista de archivos en vista de tabla
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
    },
    enabled: activeView === "list"
  });

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
        <title>Galería de Medios - CRM</title>
        <meta name="description" content="Gestión de archivos multimedia para el CRM" />
      </Helmet>

      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Galería de Medios</h1>
          <div className="flex space-x-2">
            <Button 
              className="flex items-center gap-2" 
              onClick={() => document.getElementById('upload-media-button')?.click()}
            >
              <UploadCloud className="h-4 w-4" />
              Subir Archivo
            </Button>
          </div>
        </div>

        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "gallery" | "list")} className="w-full">
          <TabsList className="w-full flex justify-start mb-6">
            <TabsTrigger value="gallery" className="flex-1 max-w-[200px]">Vista de Galería</TabsTrigger>
            <TabsTrigger value="list" className="flex-1 max-w-[200px]">Vista de Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Gestión de Archivos</CardTitle>
                    <CardDescription>
                      Administra todos los archivos multimedia del sistema desde un solo lugar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MediaGallery 
                      onSelect={handleMediaSelect}
                      selectedMediaId={selectedMedia?.id}
                      showButton={true}
                    />
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Información</CardTitle>
                    <CardDescription>
                      Detalles sobre la galería y la media seleccionada
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="preview">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="preview">Vista Previa</TabsTrigger>
                        <TabsTrigger value="info">Información</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="preview" className="space-y-4 pt-4">
                        {selectedMedia ? (
                          <div className="flex flex-col items-center">
                            {selectedMedia.type === 'image' ? (
                              <div className="border rounded-md overflow-hidden mb-4 w-full">
                                <img
                                  src={selectedMedia.url}
                                  alt={selectedMedia.title || selectedMedia.originalFilename}
                                  className="w-full object-contain max-h-[300px]"
                                />
                              </div>
                            ) : (
                              <div className="border rounded-md p-6 text-center mb-4 w-full bg-gray-50">
                                <div className="text-4xl mb-2">
                                  {selectedMedia.type === 'document' ? '📄' : 
                                   selectedMedia.type === 'audio' ? '🔊' : 
                                   selectedMedia.type === 'video' ? '🎬' : '📁'}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {selectedMedia.originalFilename}
                                </p>
                              </div>
                            )}
                            
                            <div className="w-full">
                              <h3 className="font-medium">{selectedMedia.title || selectedMedia.originalFilename}</h3>
                              {selectedMedia.description && (
                                <p className="text-sm text-gray-600 mt-1">{selectedMedia.description}</p>
                              )}
                              
                              <a 
                                href={selectedMedia.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
                              >
                                Abrir archivo
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <p className="text-5xl mb-3">🖼️</p>
                            <p>Selecciona un archivo para ver su vista previa</p>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="info" className="space-y-4 pt-4">
                        {selectedMedia ? (
                          <div className="space-y-3">
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Nombre Original</h3>
                              <p>{selectedMedia.originalFilename}</p>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Tipo</h3>
                              <p className="capitalize">{selectedMedia.type}</p>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Tamaño</h3>
                              <p>{formatFileSize(selectedMedia.size)}</p>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">MIME Type</h3>
                              <p>{selectedMedia.mimeType}</p>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Fecha de Subida</h3>
                              <p>{new Date(selectedMedia.uploadedAt).toLocaleString()}</p>
                            </div>
                            
                            {selectedMedia.lastUsedAt && (
                              <div>
                                <h3 className="text-sm font-medium text-gray-500">Último Uso</h3>
                                <p>{new Date(selectedMedia.lastUsedAt).toLocaleString()}</p>
                              </div>
                            )}
                            
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Usos</h3>
                              <p>{selectedMedia.useCount}</p>
                            </div>
                            
                            {selectedMedia.tags && selectedMedia.tags.length > 0 && (
                              <div>
                                <h3 className="text-sm font-medium text-gray-500">Etiquetas</h3>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {selectedMedia.tags.map((tag, i) => (
                                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <p className="text-5xl mb-3">📋</p>
                            <p>Selecciona un archivo para ver su información</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Guía de Uso</CardTitle>
                    <CardDescription>
                      Cómo usar la galería de medios
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium">Subir archivos</h3>
                      <p className="text-sm text-gray-600">
                        Utiliza el botón "Subir Archivo" para agregar nuevos elementos a la galería.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium">Categorización</h3>
                      <p className="text-sm text-gray-600">
                        Asigna etiquetas a tus archivos para organizarlos mejor y facilitar su búsqueda.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium">Integración con el CRM</h3>
                      <p className="text-sm text-gray-600">
                        Los archivos de la galería pueden ser utilizados en mensajes, notas, y perfiles de clientes.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="w-full">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Archivos</CardTitle>
                <CardDescription>
                  Visualiza todos tus archivos en un formato de lista detallada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {/* Filtros y buscador */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Buscar archivos..."
                        className="pl-10 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    
                    <div className="w-full sm:w-[200px]">
                      <Select
                        value={selectedType}
                        onValueChange={setSelectedType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo de archivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los tipos</SelectItem>
                          <SelectItem value="image">Imágenes</SelectItem>
                          <SelectItem value="document">Documentos</SelectItem>
                          <SelectItem value="audio">Audio</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => refetch()}
                      title="Actualizar lista"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Tabla de archivos */}
                  {isLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Cargando archivos...</p>
                    </div>
                  ) : isError ? (
                    <div className="text-center py-8">
                      <p className="text-red-500">Error al cargar los archivos. Intenta de nuevo.</p>
                    </div>
                  ) : data?.items?.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No se encontraron archivos que coincidan con los criterios.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Archivo</th>
                            <th className="text-left p-2 hidden md:table-cell">Tipo</th>
                            <th className="text-left p-2 hidden md:table-cell">Tamaño</th>
                            <th className="text-left p-2 hidden lg:table-cell">Fecha</th>
                            <th className="text-right p-2">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data?.items?.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">
                                <div className="flex items-center gap-3">
                                  {getFileIcon(item.type)}
                                  <div className="flex flex-col">
                                    <span className="font-medium truncate max-w-[200px]" title={item.title || item.originalFilename}>
                                      {item.title || item.originalFilename}
                                    </span>
                                    <span className="text-xs text-gray-500 truncate max-w-[200px]">
                                      {item.originalFilename}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-2 hidden md:table-cell">
                                <Badge variant="outline" className="capitalize">
                                  {item.type}
                                </Badge>
                              </td>
                              <td className="p-2 hidden md:table-cell">
                                {formatFileSize(item.size)}
                              </td>
                              <td className="p-2 hidden lg:table-cell">
                                <span title={new Date(item.uploadedAt).toLocaleString()}>
                                  {new Date(item.uploadedAt).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="p-2 text-right">
                                <div className="flex justify-end gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => openPreview(item)}
                                  >
                                    Ver
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Modal de vista previa */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl w-full">
            {selectedMedia && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedMedia.title || selectedMedia.originalFilename}</DialogTitle>
                  <DialogDescription>
                    {selectedMedia.description || `Archivo ${selectedMedia.type}`}
                    {selectedMedia.tags && selectedMedia.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedMedia.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="my-4">
                  {renderPreviewContent()}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <p>Tamaño: {formatFileSize(selectedMedia.size)}</p>
                    <p>Subido el: {new Date(selectedMedia.uploadedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedMedia.url;
                        link.download = selectedMedia.originalFilename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Descargar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedMedia.url);
                        toast({
                          title: "URL copiada",
                          description: "La URL del archivo ha sido copiada al portapapeles"
                        });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar URL
                    </Button>
                  </div>
                </div>
                
                <DialogClose />
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
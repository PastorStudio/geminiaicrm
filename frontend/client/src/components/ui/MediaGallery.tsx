import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, X, Search, CheckCircle, RefreshCw, Image, FileText, FileAudio, FileVideo, File } from 'lucide-react';

// Tipo para los archivos de la galería
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
  uploadedAt: string;
  lastUsedAt?: string;
  useCount: number;
  url: string;
}

// Props para el componente
interface MediaGalleryProps {
  onSelect?: (media: MediaItem) => void;
  selectedMediaId?: number;
  filter?: {
    type?: string | string[];
    tags?: string[];
    search?: string;
  };
  allowMultiple?: boolean;
  buttonText?: string;
  showButton?: boolean;
}

export const MediaGallery = ({
  onSelect,
  selectedMediaId,
  filter = {} as MediaGalleryProps['filter'],
  allowMultiple = false,
  buttonText = "Seleccionar de la galería",
  showButton = true
}: MediaGalleryProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("gallery");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    title: "",
    description: "",
    tags: "",
    type: "image"
  });

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
      
      // Añadir filtros adicionales si existen
      if (filter && filter.type) {
        if (Array.isArray(filter.type)) {
          filter.type.forEach(type => params.append('type', type));
        } else {
          params.append('type', filter.type);
        }
      }
      
      if (filter && filter.tags && filter.tags.length > 0) {
        filter.tags.forEach(tag => params.append('tags', tag));
      }
      
      if (filter && filter.search) {
        params.append('search', filter.search);
      }
      
      const url = `/api/media-gallery/list?${params.toString()}`;
      const response = await apiRequest<{ success: boolean, items: MediaItem[], total: number }>(url);
      return response;
    }
  });

  // Mutación para subir un archivo
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest<MediaItem>('/api/media-gallery/upload', {
        method: 'POST',
        body: formData,
        headers: {
          // No establecer Content-Type, es automático con FormData
        }
      });
      return response;
    },
    onSuccess: () => {
      // Limpiar el formulario
      setUploadFile(null);
      setUploadMetadata({
        title: "",
        description: "",
        tags: "",
        type: "image"
      });
      
      // Actualizar la galería
      queryClient.invalidateQueries({ queryKey: ['/api/media-gallery/list'] });
      
      // Mostrar notificación
      toast({
        title: "Archivo subido",
        description: "El archivo se ha cargado exitosamente a la galería.",
      });
      
      // Cambiar a la pestaña de galería
      setActiveTab("gallery");
    },
    onError: (error) => {
      toast({
        title: "Error al subir",
        description: "No se pudo subir el archivo. " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Mutación para eliminar un archivo
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest<{ success: boolean }>(`/api/media-gallery/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      // Actualizar la galería
      queryClient.invalidateQueries({ queryKey: ['/api/media-gallery'] });
      
      // Mostrar notificación
      toast({
        title: "Archivo eliminado",
        description: "El archivo se ha eliminado de la galería.",
      });
      
      // Quitar selección
      setSelectedMedia(null);
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el archivo. " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Manejar la selección de un archivo
  const handleSelect = (media: MediaItem) => {
    setSelectedMedia(media);
    
    if (onSelect) {
      onSelect(media);
    }
    
    if (!allowMultiple) {
      setIsOpen(false);
    }
  };

  // Manejar la subida de archivos
  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadFile) {
      toast({
        title: "No hay archivo",
        description: "Por favor selecciona un archivo para subir.",
        variant: "destructive"
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('type', uploadMetadata.type);
    
    if (uploadMetadata.title) {
      formData.append('title', uploadMetadata.title);
    }
    
    if (uploadMetadata.description) {
      formData.append('description', uploadMetadata.description);
    }
    
    if (uploadMetadata.tags) {
      const tags = uploadMetadata.tags.split(',').map(tag => tag.trim());
      formData.append('tags', JSON.stringify(tags));
    }
    
    uploadMutation.mutate(formData);
  };

  // Confirmar eliminación
  const confirmDelete = (media: MediaItem) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el archivo "${media.title || media.originalFilename}"?`)) {
      deleteMutation.mutate(media.id);
    }
  };

  // Obtener icono según el tipo de archivo
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-8 w-8 text-blue-500" />;
      case 'document':
        return <FileText className="h-8 w-8 text-green-500" />;
      case 'audio':
        return <FileAudio className="h-8 w-8 text-purple-500" />;
      case 'video':
        return <FileVideo className="h-8 w-8 text-red-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  // Formatear tamaño del archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Formatear fecha
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {showButton && (
        <Button
          id="upload-media-button"
          onClick={() => setIsOpen(true)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Image className="h-4 w-4" />
          {buttonText}
        </Button>
      )}
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Galería de Medios</DialogTitle>
            <DialogDescription>
              Gestiona y selecciona archivos multimedia para tu aplicación.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gallery">Galería</TabsTrigger>
              <TabsTrigger value="upload">Subir Archivo</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gallery" className="space-y-4">
              <div className="flex justify-between items-center">
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
                  
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="p-2 border rounded-md text-sm"
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="image">Imágenes</option>
                    <option value="document">Documentos</option>
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                    <option value="other">Otros</option>
                  </select>
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
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Cargando archivos...</span>
                </div>
              ) : isError ? (
                <div className="text-center text-red-500 py-8">
                  <p>Error al cargar la galería. Intenta nuevamente.</p>
                  <Button onClick={() => refetch()} variant="outline" className="mt-2">
                    Reintentar
                  </Button>
                </div>
              ) : (data?.items && data.items.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2">No hay archivos en la galería.</p>
                  <Button 
                    onClick={() => setActiveTab("upload")} 
                    variant="outline" 
                    className="mt-2"
                  >
                    Subir Archivo
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data?.items.map((media) => (
                    <Card 
                      key={media.id} 
                      className={
                        selectedMediaId === media.id || (selectedMedia && selectedMedia.id === media.id)
                          ? "border-primary border-2"
                          : ""
                      }
                    >
                      <CardContent className="p-3">
                        <div className="relative aspect-square mb-2 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                          {media.type === 'image' ? (
                            <img
                              src={media.url}
                              alt={media.title || media.originalFilename}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="text-center">
                              {getFileIcon(media.type)}
                              <p className="text-xs mt-1 text-muted-foreground">
                                {media.originalFilename.split('.').pop()?.toUpperCase()}
                              </p>
                            </div>
                          )}
                          
                          {(selectedMediaId === media.id || (selectedMedia && selectedMedia.id === media.id)) && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="h-6 w-6 text-primary bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                        
                        <h3 className="font-medium text-sm truncate">
                          {media.title || media.originalFilename}
                        </h3>
                        
                        <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                          <span>{formatFileSize(media.size)}</span>
                          <span>{new Date(media.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        
                        {media.tags && media.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {media.tags.slice(0, 2).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {media.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{media.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                      
                      <CardFooter className="flex justify-between p-3 pt-0">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => handleSelect(media)}
                        >
                          Seleccionar
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => confirmDelete(media)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="upload">
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Archivo:</Label>
                  <div
                    className={`border-2 border-dashed rounded-md p-6 text-center ${
                      uploadFile ? "border-green-500 bg-green-50" : "border-muted-foreground"
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        setUploadFile(e.dataTransfer.files[0]);
                      }
                    }}
                  >
                    {uploadFile ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                        <p className="text-sm font-medium">{uploadFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatFileSize(uploadFile.size)}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setUploadFile(null)}
                          className="mt-2"
                        >
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm">
                          Arrastra y suelta o haz clic para seleccionar
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Archivos de hasta 10MB
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      id="file"
                      className={uploadFile ? "hidden" : "absolute inset-0 w-full h-full opacity-0 cursor-pointer"}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setUploadFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo:</Label>
                    <select
                      id="type"
                      className="w-full p-2 border rounded-md"
                      value={uploadMetadata.type}
                      onChange={(e) => 
                        setUploadMetadata({
                          ...uploadMetadata,
                          type: e.target.value
                        })
                      }
                    >
                      <option value="image">Imagen</option>
                      <option value="document">Documento</option>
                      <option value="audio">Audio</option>
                      <option value="video">Video</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Título:</Label>
                    <Input
                      id="title"
                      placeholder="Título del archivo"
                      value={uploadMetadata.title}
                      onChange={(e) => 
                        setUploadMetadata({
                          ...uploadMetadata,
                          title: e.target.value
                        })
                      }
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción:</Label>
                  <Textarea
                    id="description"
                    placeholder="Descripción del archivo"
                    rows={3}
                    value={uploadMetadata.description}
                    onChange={(e) => 
                      setUploadMetadata({
                        ...uploadMetadata,
                        description: e.target.value
                      })
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Etiquetas (separadas por coma):</Label>
                  <Input
                    id="tags"
                    placeholder="etiqueta1, etiqueta2, ..."
                    value={uploadMetadata.tags}
                    onChange={(e) => 
                      setUploadMetadata({
                        ...uploadMetadata,
                        tags: e.target.value
                      })
                    }
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("gallery")}
                  >
                    Cancelar
                  </Button>
                  
                  <Button 
                    type="submit"
                    disabled={!uploadFile || uploadMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" />
                        Subir Archivo
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
          
          {selectedMedia && (
            <>
              <Separator />
              <div className="pt-2">
                <h3 className="font-semibold">Archivo seleccionado:</h3>
                <div className="flex items-center mt-2">
                  {selectedMedia.type === 'image' ? (
                    <img
                      src={selectedMedia.url}
                      alt={selectedMedia.title || selectedMedia.originalFilename}
                      className="w-12 h-12 object-cover rounded-md mr-3"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center mr-3">
                      {getFileIcon(selectedMedia.type)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{selectedMedia.title || selectedMedia.originalFilename}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedMedia.size)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setIsOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
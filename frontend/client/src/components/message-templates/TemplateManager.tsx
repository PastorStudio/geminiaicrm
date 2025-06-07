import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Plus, MessageSquare, Tag, Eye } from "lucide-react";
import { TemplatePreview } from "./TemplatePreview";

interface Template {
  id: number;
  name: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function TemplateManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  const [newTemplate, setNewTemplate] = useState<{
    name: string;
    content: string;
    category: string;
    tags: string[];
  }>({
    name: "",
    content: "",
    category: "general",
    tags: []
  });

  // Variables para el formulario de edición
  const [editTemplate, setEditTemplate] = useState<{
    id: number;
    name: string;
    content: string;
    category: string;
    tags: string[];
  }>({
    id: 0,
    name: "",
    content: "",
    category: "",
    tags: []
  });

  // Para la entrada de tags
  const [tagInput, setTagInput] = useState("");

  // Obtener las plantillas desde el servidor
  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["/api/message-templates"],
  });

  // Mutación para añadir una nueva plantilla
  const addTemplateMutation = useMutation({
    mutationFn: async (templateData: Omit<Template, "id" | "createdAt" | "updatedAt">) => {
      // Asegurar que los tags estén correctamente formateados como array
      const formattedTemplate = {
        ...templateData,
        tags: Array.isArray(templateData.tags) ? templateData.tags : []
      };
      
      console.log("Enviando plantilla (formateada):", formattedTemplate);
      const result = await apiRequest("/api/message-templates", {
        method: "POST",
        body: formattedTemplate
      });
      console.log("Respuesta del servidor:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Plantilla creada exitosamente:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({
        title: "Plantilla creada",
        description: "La plantilla ha sido creada exitosamente.",
      });
      resetNewTemplate();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la plantilla. Intente nuevamente.",
        variant: "destructive",
      });
      console.error("Error creating template:", error);
    }
  });

  // Mutación para editar una plantilla
  const editTemplateMutation = useMutation({
    mutationFn: async (templateData: Partial<Template> & { id: number }) => {
      // Asegurar que los tags estén correctamente formateados como array
      const formattedTemplate = {
        ...templateData,
        tags: Array.isArray(templateData.tags) ? templateData.tags : []
      };
      
      console.log("Actualizando plantilla (formateada):", formattedTemplate);
      
      // Usar el endpoint correcto con JSON bien formateado
      const result = await apiRequest(`/api/message-templates/${formattedTemplate.id}`, {
        method: "PATCH",
        body: formattedTemplate
      });
      
      console.log("Respuesta de actualización:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Plantilla actualizada exitosamente:", data);
      // Invalidar la consulta para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({
        title: "Plantilla actualizada",
        description: "La plantilla ha sido actualizada exitosamente.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la plantilla. Intente nuevamente.",
        variant: "destructive",
      });
      console.error("Error updating template:", error);
    }
  });

  // Mutación para eliminar una plantilla
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/message-templates/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({
        title: "Plantilla eliminada",
        description: "La plantilla ha sido eliminada exitosamente.",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la plantilla. Intente nuevamente.",
        variant: "destructive",
      });
      console.error("Error deleting template:", error);
    }
  });

  // Resetear el formulario de nueva plantilla
  const resetNewTemplate = () => {
    setNewTemplate({
      name: "",
      content: "",
      category: "general",
      tags: []
    });
    setTagInput("");
  };

  // Preparar la edición de una plantilla
  const prepareEditTemplate = (template: Template) => {
    // Asegurar que los tags sean siempre un array válido
    const tags = Array.isArray(template.tags) ? template.tags : [];
    console.log(`Preparando plantilla para edición:`, template.id, template.name, `tags:`, tags);
    
    setEditTemplate({
      id: template.id,
      name: template.name,
      content: template.content,
      category: template.category || "general",
      tags: tags
    });
    setIsEditDialogOpen(true);
  };

  // Preparar la eliminación de una plantilla
  const prepareDeleteTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  // Mostrar vista previa de una plantilla
  const showTemplatePreview = (template: Template) => {
    setSelectedTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  // Añadir un tag al template
  const addTag = (isEdit = false) => {
    if (!tagInput.trim()) return;
    
    if (isEdit) {
      setEditTemplate({
        ...editTemplate,
        tags: [...editTemplate.tags, tagInput.trim()]
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        tags: [...newTemplate.tags, tagInput.trim()]
      });
    }
    
    setTagInput("");
  };

  // Eliminar un tag
  const removeTag = (index: number, isEdit = false) => {
    if (isEdit) {
      // Crear una copia segura del array de tags
      const currentTags = Array.isArray(editTemplate.tags) ? [...editTemplate.tags] : [];
      currentTags.splice(index, 1);
      setEditTemplate({
        ...editTemplate,
        tags: currentTags
      });
    } else {
      // Crear una copia segura del array de tags
      const currentTags = Array.isArray(newTemplate.tags) ? [...newTemplate.tags] : [];
      currentTags.splice(index, 1);
      setNewTemplate({
        ...newTemplate,
        tags: currentTags
      });
    }
  };

  // Formatear la fecha
  const formatDate = (dateString: string) => {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Plantillas de Mensajes</h2>
          <p className="text-muted-foreground">
            Administra tus plantillas predefinidas para el envío de mensajes
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1">
              <Plus className="h-4 w-4" />
              Crear Plantilla
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Nueva Plantilla</DialogTitle>
              <DialogDescription>
                Crea una plantilla para reutilizarla en tus mensajes. Usa {`{{variable}}`} para valores dinámicos.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Nombre de la plantilla
                </label>
                <Input
                  id="name"
                  placeholder="Ej: Saludo inicial"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium">
                  Categoría
                </label>
                <Select 
                  value={newTemplate.category} 
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="bienvenida">Bienvenida</SelectItem>
                    <SelectItem value="seguimiento">Seguimiento</SelectItem>
                    <SelectItem value="promocion">Promoción</SelectItem>
                    <SelectItem value="recordatorio">Recordatorio</SelectItem>
                    <SelectItem value="agradecimiento">Agradecimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="tags" className="text-sm font-medium">
                  Etiquetas
                </label>
                <div className="flex space-x-2">
                  <Input
                    id="tags"
                    placeholder="Añadir etiqueta"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={() => addTag()} size="sm">
                    Añadir
                  </Button>
                </div>
                {newTemplate.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {newTemplate.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          onClick={() => removeTag(index)}
                          className="rounded-full h-4 w-4 inline-flex items-center justify-center text-xs bg-muted-foreground/30 hover:bg-muted-foreground/50"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="content" className="text-sm font-medium">
                  Contenido del mensaje
                </label>
                <Textarea
                  id="content"
                  placeholder="Ej: Hola {nombre}, gracias por contactarnos..."
                  className="h-32"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Usa {`{{nombre}}`}, {`{{empresa}}`}, etc. para personalizar el mensaje.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => addTemplateMutation.mutate(newTemplate)}
                disabled={!newTemplate.name || !newTemplate.content || addTemplateMutation.isPending}
              >
                {addTemplateMutation.isPending ? "Guardando..." : "Guardar Plantilla"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plantillas disponibles</CardTitle>
          <CardDescription>
            Lista de plantillas disponibles para el envío de mensajes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <Table>
              <TableCaption>Lista de plantillas disponibles.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Etiquetas</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates && templates.length > 0 ? (
                  templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.tags && template.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {(!template.tags || template.tags.length === 0) && (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.createdAt ? formatDate(template.createdAt) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showTemplatePreview(template)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => prepareEditTemplate(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => prepareDeleteTemplate(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      <div className="flex flex-col items-center justify-center">
                        <MessageSquare className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-lg font-medium">No hay plantillas disponibles</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Crea tu primera plantilla para comenzar
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para editar una plantilla */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Plantilla</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la plantilla. Usa {`{{variable}}`} para valores dinámicos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium">
                Nombre de la plantilla
              </label>
              <Input
                id="edit-name"
                placeholder="Ej: Saludo inicial"
                value={editTemplate.name}
                onChange={(e) => setEditTemplate({ ...editTemplate, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-category" className="text-sm font-medium">
                Categoría
              </label>
              <Select 
                value={editTemplate.category} 
                onValueChange={(value) => setEditTemplate({ ...editTemplate, category: value })}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="bienvenida">Bienvenida</SelectItem>
                  <SelectItem value="seguimiento">Seguimiento</SelectItem>
                  <SelectItem value="promocion">Promoción</SelectItem>
                  <SelectItem value="recordatorio">Recordatorio</SelectItem>
                  <SelectItem value="agradecimiento">Agradecimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-tags" className="text-sm font-medium">
                Etiquetas
              </label>
              <div className="flex space-x-2">
                <Input
                  id="edit-tags"
                  placeholder="Añadir etiqueta"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(true);
                    }
                  }}
                />
                <Button type="button" onClick={() => addTag(true)} size="sm">
                  Añadir
                </Button>
              </div>
              {editTemplate.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {editTemplate.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(index, true)}
                        className="rounded-full h-4 w-4 inline-flex items-center justify-center text-xs bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-content" className="text-sm font-medium">
                Contenido del mensaje
              </label>
              <Textarea
                id="edit-content"
                placeholder="Ej: Hola {nombre}, gracias por contactarnos..."
                className="h-32"
                value={editTemplate.content}
                onChange={(e) => setEditTemplate({ ...editTemplate, content: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Usa {`{{nombre}}`}, {`{{empresa}}`}, etc. para personalizar el mensaje.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => editTemplateMutation.mutate(editTemplate)}
              disabled={!editTemplate.name || !editTemplate.content || editTemplateMutation.isPending}
            >
              {editTemplateMutation.isPending ? "Guardando..." : "Actualizar Plantilla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para eliminar una plantilla */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta plantilla? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedTemplate && (
              <div className="border rounded-md p-3 bg-muted/50">
                <p className="font-medium">{selectedTemplate.name}</p>
                <p className="text-sm text-muted-foreground truncate mt-1">
                  {selectedTemplate.content}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedTemplate && deleteTemplateMutation.mutate(selectedTemplate.id)}
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? "Eliminando..." : "Eliminar Plantilla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para previsualizar una plantilla */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Vista previa de plantilla</DialogTitle>
            <DialogDescription>
              Así es como se verá tu plantilla al enviarla.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedTemplate && (
              <TemplatePreview 
                template={selectedTemplate} 
                contactData={{
                  nombre: "Juan Pérez",
                  empresa: "Empresa Ejemplo S.A.",
                  servicio: "Consultoría Digital",
                  fecha: "15 de mayo de 2025",
                  monto: "$1,500.00"
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPreviewDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TemplateManager;
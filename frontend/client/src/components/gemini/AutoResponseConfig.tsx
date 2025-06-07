import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit } from "lucide-react";

interface Template {
  id: string;
  name: string;
  pattern?: string;
  template: string;
  autoDetect: boolean;
}

interface AutoResponseConfigProps {
  initialConfig: {
    enabled: boolean;
    delaySeconds: number;
    templates: Template[];
    useProfessionLevel: boolean;
    defaultTemplate: string;
    enabledForGroups: boolean;
    enabledForBroadcast: boolean;
    excludedContacts: string[];
  };
  onSave: (config: any) => void;
}

export default function AutoResponseConfig({ initialConfig, onSave }: AutoResponseConfigProps) {
  const [config, setConfig] = useState(initialConfig);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  
  const handleToggleEnabled = (enabled: boolean) => {
    setConfig({ ...config, enabled });
  };
  
  const handleDelayChange = (value: string) => {
    const delay = parseInt(value);
    if (!isNaN(delay) && delay >= 0) {
      setConfig({ ...config, delaySeconds: delay });
    }
  };
  
  const handleToggleProfessionLevel = (useProfessionLevel: boolean) => {
    setConfig({ ...config, useProfessionLevel });
  };
  
  const handleToggleGroups = (enabledForGroups: boolean) => {
    setConfig({ ...config, enabledForGroups });
  };
  
  const handleToggleBroadcast = (enabledForBroadcast: boolean) => {
    setConfig({ ...config, enabledForBroadcast });
  };
  
  const handleSaveTemplate = (template: Template) => {
    const updatedTemplates = [...config.templates];
    const index = updatedTemplates.findIndex(t => t.id === template.id);
    
    if (index >= 0) {
      updatedTemplates[index] = template;
    } else {
      template.id = `template-${Date.now()}`;
      updatedTemplates.push(template);
    }
    
    setConfig({
      ...config,
      templates: updatedTemplates,
      defaultTemplate: config.templates.length === 0 ? template.id : config.defaultTemplate
    });
    
    setEditingTemplate(null);
    setIsAddingTemplate(false);
  };
  
  const handleDeleteTemplate = (id: string) => {
    const updatedTemplates = config.templates.filter(t => t.id !== id);
    let defaultTemplate = config.defaultTemplate;
    
    if (defaultTemplate === id && updatedTemplates.length > 0) {
      defaultTemplate = updatedTemplates[0].id;
    } else if (updatedTemplates.length === 0) {
      defaultTemplate = "";
    }
    
    setConfig({
      ...config,
      templates: updatedTemplates,
      defaultTemplate
    });
  };
  
  const handleSetDefault = (id: string) => {
    setConfig({
      ...config,
      defaultTemplate: id
    });
  };
  
  const handleSaveConfig = () => {
    onSave(config);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">Respuestas Automáticas</h3>
            <div className={`w-3 h-3 rounded-full ${config.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          </div>
          <p className="text-sm text-muted-foreground">
            Configura respuestas automáticas para mensajes entrantes de WhatsApp
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={config.enabled}
            onCheckedChange={handleToggleEnabled}
            id="auto-response-enabled"
          />
          <Label htmlFor="auto-response-enabled">
            {config.enabled ? "Habilitado" : "Deshabilitado"}
          </Label>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuración General</CardTitle>
            <CardDescription>
              Opciones generales para las respuestas automáticas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delay-seconds">Tiempo de espera (segundos)</Label>
              <Input
                id="delay-seconds"
                type="number"
                min="0"
                value={config.delaySeconds}
                onChange={(e) => handleDelayChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Tiempo a esperar antes de enviar una respuesta automática
              </p>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                checked={config.useProfessionLevel}
                onCheckedChange={handleToggleProfessionLevel}
                id="profession-level"
              />
              <Label htmlFor="profession-level">
                Usar nivel de profesionalidad actual
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enabledForGroups}
                onCheckedChange={handleToggleGroups}
                id="enabled-groups"
              />
              <Label htmlFor="enabled-groups">
                Habilitar para grupos
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enabledForBroadcast}
                onCheckedChange={handleToggleBroadcast}
                id="enabled-broadcast"
              />
              <Label htmlFor="enabled-broadcast">
                Habilitar para mensajes de difusión
              </Label>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Plantillas de Respuesta</CardTitle>
              <CardDescription>
                Configura diferentes respuestas según el contexto
              </CardDescription>
            </div>
            <Dialog open={isAddingTemplate} onOpenChange={setIsAddingTemplate}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8">
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir
                </Button>
              </DialogTrigger>
              <DialogContent>
                <TemplateForm
                  template={{
                    id: "",
                    name: "",
                    template: "",
                    autoDetect: true
                  }}
                  onSave={handleSaveTemplate}
                  onCancel={() => setIsAddingTemplate(false)}
                />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {config.templates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Predeterminada</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <div className="flex h-full items-center">
                            <input 
                              type="radio" 
                              checked={config.defaultTemplate === template.id}
                              onChange={() => handleSetDefault(template.id)}
                              className="h-4 w-4 rounded-full border-gray-300 text-primary"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setEditingTemplate(template)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <TemplateForm
                                  template={editingTemplate || template}
                                  onSave={handleSaveTemplate}
                                  onCancel={() => setEditingTemplate(null)}
                                />
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No hay plantillas configuradas
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={handleSaveConfig}>
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}

interface TemplateFormProps {
  template: Template;
  onSave: (template: Template) => void;
  onCancel: () => void;
}

function TemplateForm({ template, onSave, onCancel }: TemplateFormProps) {
  const [name, setName] = useState(template.name);
  const [pattern, setPattern] = useState(template.pattern || "");
  const [templateText, setTemplateText] = useState(template.template);
  const [autoDetect, setAutoDetect] = useState(template.autoDetect);
  
  const handleSave = () => {
    onSave({
      ...template,
      name,
      pattern: pattern.trim() ? pattern : undefined,
      template: templateText,
      autoDetect
    });
  };
  
  return (
    <>
      <DialogHeader>
        <DialogTitle>{template.id ? "Editar Plantilla" : "Nueva Plantilla"}</DialogTitle>
        <DialogDescription>
          Configura una plantilla de respuesta automática
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="template-name">Nombre</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Respuesta estándar"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pattern">Patrón de coincidencia (opcional)</Label>
          <Input
            id="pattern"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="urgente|ayuda|problema"
          />
          <p className="text-xs text-muted-foreground">
            Patrón de expresión regular para activar esta plantilla (separados por |)
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="template-text">Texto de la respuesta</Label>
          <Textarea
            id="template-text"
            value={templateText}
            onChange={(e) => setTemplateText(e.target.value)}
            placeholder="Gracias por tu mensaje. En breve nos pondremos en contacto contigo."
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            Puedes usar {"{{"+"nombre"+"}}"}  para incluir el nombre del contacto
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={autoDetect}
            onCheckedChange={setAutoDetect}
            id="auto-detect"
          />
          <Label htmlFor="auto-detect">
            Detección automática mediante IA
          </Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={!name || !templateText}>
          Guardar
        </Button>
      </DialogFooter>
    </>
  );
}

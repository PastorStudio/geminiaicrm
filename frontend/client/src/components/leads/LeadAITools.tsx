import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  TagIcon, 
  ListTodo, 
  Sparkles, 
  BrainCircuit, 
  Lightbulb, 
  ArrowRight, 
  PieChart, 
  BarChart,
  RotateCw
} from 'lucide-react';

interface LeadAIToolsProps {
  leadId: number;
  onTagsGenerated?: (tags: any[]) => void;
  onTasksGenerated?: (tasks: any[]) => void;
}

type Tag = {
  name: string;
  probability: number;
  category: string;
};

type Task = {
  id: number;
  title: string;
  description: string;
  type: string;
  priority: string;
  dueDate: string;
};

export function LeadAITools({ leadId, onTagsGenerated, onTasksGenerated }: LeadAIToolsProps) {
  const [activeTab, setActiveTab] = useState('tags');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Consultar las etiquetas actuales
  const { 
    data: tagsData, 
    isLoading: isLoadingTags 
  } = useQuery({ 
    queryKey: ['/api/leads/tags', leadId],
    queryFn: async () => {
      const lead = await apiRequest<any>({ url: `/api/leads/${leadId}` });
      return lead.tags ? JSON.parse(lead.tags) : [];
    },
    enabled: !!leadId,
  });

  // Generar etiquetas con probabilidades
  const generateTagsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<any>({
        url: '/api/gemini/generate-tags',
        method: 'POST',
        data: { leadId }
      });
    },
    onSuccess: (data) => {
      if (data.success && data.tags) {
        toast({
          title: "Etiquetas generadas",
          description: `Se generaron ${data.tags.length} etiquetas con probabilidades`,
        });
        
        if (onTagsGenerated) {
          onTagsGenerated(data.tags);
        }
        
        // Invalidar la consulta para obtener las etiquetas actualizadas
        queryClient.invalidateQueries({ queryKey: ['/api/leads/tags', leadId] });
        queryClient.invalidateQueries({ queryKey: ['/api/leads', leadId] });
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudieron generar etiquetas",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error("Error al generar etiquetas:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al generar las etiquetas",
        variant: "destructive"
      });
    }
  });

  // Gestión automática completa del lead
  const autoManageMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<any>({
        url: '/api/auto/manage-lead',
        method: 'POST',
        data: { leadId }
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Gestión automática completada",
          description: "Se completó la gestión automática del lead",
        });
        
        // Invalidar varias consultas para actualizar los datos
        queryClient.invalidateQueries({ queryKey: ['/api/leads', leadId] });
        queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
        
        if (data.automaticTasks && onTasksGenerated) {
          onTasksGenerated(data.automaticTasks);
        }
        
        if (data.tagsWithProbability && onTagsGenerated) {
          onTagsGenerated(data.tagsWithProbability.tags);
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudo completar la gestión automática",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error("Error en gestión automática:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error durante la gestión automática",
        variant: "destructive"
      });
    }
  });

  // Generar tareas automáticas
  const generateTasksMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<any>({
        url: '/api/auto/generate-tasks',
        method: 'POST',
        data: { leadId }
      });
    },
    onSuccess: (data) => {
      if (data.success && data.tasks) {
        toast({
          title: "Tareas generadas",
          description: `Se generaron ${data.tasks.length} tareas para este lead`,
        });
        
        if (onTasksGenerated) {
          onTasksGenerated(data.tasks);
        }
        
        // Invalidar la consulta para obtener las actividades actualizadas
        queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudieron generar tareas",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error("Error al generar tareas:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al generar las tareas",
        variant: "destructive"
      });
    }
  });

  // Renderizar etiquetas con probabilidades
  const renderTags = (tags: Tag[]) => {
    // Agrupar por categoría
    const categorizedTags: Record<string, Tag[]> = {};
    
    tags.forEach(tag => {
      if (!categorizedTags[tag.category]) {
        categorizedTags[tag.category] = [];
      }
      categorizedTags[tag.category].push(tag);
    });
    
    return (
      <div className="space-y-4">
        {Object.entries(categorizedTags).map(([category, categoryTags]) => (
          <div key={category} className="space-y-2">
            <h4 className="text-sm font-semibold capitalize">{category}</h4>
            <div className="flex flex-wrap gap-2">
              {categoryTags.map((tag, idx) => (
                <Badge 
                  key={idx} 
                  variant={getBadgeVariant(tag.probability)}
                  className="flex items-center gap-1"
                >
                  <span>{tag.name}</span>
                  <span className="inline-flex items-center justify-center rounded-full bg-white bg-opacity-20 px-1.5 py-0.5 text-xs font-medium">
                    {tag.probability}%
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Determinar el variant del badge según la probabilidad
  const getBadgeVariant = (probability: number): "default" | "secondary" | "destructive" | "outline" => {
    if (probability >= 80) return "default";
    if (probability >= 60) return "secondary";
    if (probability >= 40) return "outline";
    return "destructive";
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-teal-500" />
          <span>Herramientas de IA</span>
        </CardTitle>
        <CardDescription>
          Automatiza la gestión de leads con inteligencia artificial
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-2">
            <TabsTrigger value="tags" className="flex items-center gap-1">
              <TagIcon className="h-4 w-4" />
              <span>Etiquetas</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-1">
              <ListTodo className="h-4 w-4" />
              <span>Tareas</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tags" className="space-y-4">
            {isLoadingTags ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : tagsData && tagsData.length > 0 ? (
              renderTags(tagsData)
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TagIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No hay etiquetas generadas para este lead</p>
                <p className="text-sm text-gray-400 mt-1">
                  Haz clic en "Generar etiquetas" para crear etiquetas con probabilidades
                </p>
              </div>
            )}
            
            <div className="flex justify-center">
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => generateTagsMutation.mutate()}
                disabled={generateTagsMutation.isPending}
              >
                {generateTagsMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Generando etiquetas...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generar etiquetas con IA
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="tasks" className="space-y-4">
            <div className="grid gap-4">
              <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 bg-blue-100 p-2 rounded-full">
                    <Lightbulb className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-900">Tareas inteligentes</h3>
                    <p className="text-sm text-blue-700">
                      Genera tareas personalizadas basadas en el perfil del lead y el historial de interacciones.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50 p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 bg-purple-100 p-2 rounded-full">
                    <BarChart className="h-4 w-4 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="font-medium text-purple-900">Gestión automática</h3>
                    <p className="text-sm text-purple-700">
                      Analiza, prioriza y sugiere acciones completas para avanzar en el embudo de ventas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2 mt-4">
              <Button 
                variant="outline"
                onClick={() => generateTasksMutation.mutate()}
                disabled={generateTasksMutation.isPending}
                className="w-full"
              >
                {generateTasksMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Generando tareas...
                  </>
                ) : (
                  <>
                    <ListTodo className="h-4 w-4 mr-2" />
                    Generar tareas inteligentes
                  </>
                )}
              </Button>
              
              <Button 
                onClick={() => autoManageMutation.mutate()}
                disabled={autoManageMutation.isPending}
                className="w-full"
              >
                {autoManageMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gestión completa automática
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between text-xs text-muted-foreground bg-gradient-to-r from-slate-50 to-gray-50 pt-2">
        <span className="italic">Potenciado por Google Gemini AI</span>
        <Button variant="ghost" size="sm" className="h-6" asChild>
          <a href="#" className="flex items-center text-xs">
            Ver detalles <ArrowRight className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
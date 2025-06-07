import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Settings, Bot, MessageSquare } from "lucide-react";

// AI Integration settings schema
const aiIntegrationSchema = z.object({
  selectedProvider: z.enum(["gemini", "openai", "qwen3"]).default("gemini"),
  geminiApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  qwenApiKey: z.string().optional(),
  customPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  enableAIResponses: z.boolean().default(true),
});

// AI Prompt schema
const aiPromptSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  content: z.string().min(10, "El contenido debe tener al menos 10 caracteres"),
  provider: z.enum(["openai", "gemini", "qwen3"]).default("openai"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(100).max(4000).default(1000),
  model: z.string().default("gpt-4o"),
  isActive: z.boolean().default(true),
});

type AiPrompt = {
  id: number;
  name: string;
  description?: string;
  content: string;
  provider: string;
  temperature: number;
  maxTokens: number;
  model: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type AiIntegrationValues = z.infer<typeof aiIntegrationSchema>;
type AiPromptValues = z.infer<typeof aiPromptSchema>;

export default function AISettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AiPrompt | null>(null);
  const [promptToDelete, setPromptToDelete] = useState<AiPrompt | null>(null);
  
  // Cargar configuraciones desde la base de datos
  const { data: aiSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/ai-settings'],
    queryFn: async () => {
      const response = await fetch('/api/ai-settings');
      if (!response.ok) {
        throw new Error('Error al cargar configuraciones');
      }
      return response.json();
    }
  });

  // Cargar prompts de AI
  const { data: aiPrompts = [], isLoading: isLoadingPrompts } = useQuery({
    queryKey: ['/api/ai-prompts'],
    queryFn: async () => {
      const response = await fetch('/api/ai-prompts');
      if (!response.ok) {
        throw new Error('Error al cargar prompts');
      }
      return response.json();
    }
  });

  // Cargar cuentas de WhatsApp con estado real de conexión
  const { data: whatsappAccountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/whatsapp-status-check'],
    queryFn: async () => {
      const response = await fetch('/api/whatsapp-status-check');
      if (!response.ok) {
        throw new Error('Error al cargar cuentas de WhatsApp');
      }
      return response.json();
    },
    refetchInterval: 10000 // Actualizar cada 10 segundos para mostrar estado en tiempo real
  });

  const whatsappAccounts = whatsappAccountsData?.accounts || [];

  // AI Prompt form setup
  const promptForm = useForm<AiPromptValues>({
    resolver: zodResolver(aiPromptSchema),
    defaultValues: {
      name: "",
      description: "",
      content: "",
      provider: "openai",
      temperature: 0.7,
      maxTokens: 1000,
      model: "gpt-4o",
      isActive: true,
    },
  });
  
  // AI Integration form setup
  const aiForm = useForm<AiIntegrationValues>({
    resolver: zodResolver(aiIntegrationSchema),
    defaultValues: {
      selectedProvider: "gemini",
      geminiApiKey: "",
      openaiApiKey: "",
      qwenApiKey: "",
      customPrompt: "Eres un asistente virtual útil y amigable. Responde de manera profesional y concisa.",
      temperature: 0.7,
      enableAIResponses: true,
    },
  });

  // Actualizar formulario cuando se cargan las configuraciones
  useEffect(() => {
    if (aiSettings) {
      const hasExistingConfig = aiSettings.selectedProvider || aiSettings.geminiApiKey || aiSettings.openaiApiKey || aiSettings.qwenApiKey;
      
      aiForm.reset({
        selectedProvider: aiSettings.selectedProvider || "gemini",
        geminiApiKey: aiSettings.geminiApiKey || "",
        openaiApiKey: aiSettings.openaiApiKey || "",
        qwenApiKey: aiSettings.qwenApiKey || "",
        customPrompt: aiSettings.customPrompt || "Eres un asistente virtual útil y amigable. Responde de manera profesional y concisa.",
        temperature: aiSettings.temperature || 0.7,
        enableAIResponses: aiSettings.enableAIResponses || false,
      });

      // Mostrar mensaje de bienvenida solo si hay configuraciones existentes
      if (hasExistingConfig) {
        toast({
          title: "📋 Configuraciones cargadas",
          description: `Proveedor actual: ${(aiSettings.selectedProvider || "gemini").toUpperCase()}`,
          duration: 2000,
        });
      }
    }
  }, [aiSettings, aiForm, toast]);

  // Mutación para guardar configuraciones
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: AiIntegrationValues) => {
      console.log('🔥 Enviando datos al servidor:', data);
      
      try {
        const response = await fetch('/api/ai-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        console.log('📡 Respuesta del servidor - Status:', response.status);
        console.log('📡 Respuesta del servidor - Headers:', response.headers.get('content-type'));
        
        // Obtener el texto crudo primero
        const responseText = await response.text();
        console.log('📡 Respuesta del servidor - Texto crudo:', responseText);
        
        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status} - ${responseText}`);
        }
        
        // Intentar parsear como JSON
        let jsonData;
        try {
          jsonData = JSON.parse(responseText);
          console.log('✅ JSON parseado exitosamente:', jsonData);
        } catch (parseError) {
          console.error('❌ Error parseando JSON:', parseError);
          throw new Error(`Respuesta no es JSON válido: ${responseText.substring(0, 100)}...`);
        }
        
        return jsonData;
      } catch (fetchError) {
        console.error('❌ Error en fetch:', fetchError);
        throw fetchError;
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-settings'] });
      
      // Mostrar mensaje específico según si se creó o actualizó
      const isNewConfiguration = response.message?.includes('creadas');
      
      toast({
        title: isNewConfiguration ? "🎉 Configuración creada" : "✅ Configuración actualizada",
        description: response.message || "Las configuraciones de AI han sido guardadas exitosamente.",
        duration: 4000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Error al guardar",
        description: error.message || "No se pudo guardar la configuración. Inténtalo de nuevo.",
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  // AI Integration form submission handler
  const onAiIntegrationSubmit = (values: AiIntegrationValues) => {
    saveSettingsMutation.mutate(values);
  };

  // AI Prompt mutations
  const createPromptMutation = useMutation({
    mutationFn: async (data: AiPromptValues) => {
      const response = await fetch('/api/ai-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Error al crear prompt');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-prompts'] });
      setIsPromptDialogOpen(false);
      setEditingPrompt(null);
      promptForm.reset();
      toast({
        title: "Prompt creado",
        description: "El prompt AI ha sido creado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updatePromptMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AiPromptValues> }) => {
      const response = await fetch(`/api/ai-prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Error al actualizar prompt');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-prompts'] });
      setIsPromptDialogOpen(false);
      setEditingPrompt(null);
      promptForm.reset();
      toast({
        title: "Prompt actualizado",
        description: "El prompt AI ha sido actualizado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deletePromptMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/ai-prompts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error al eliminar prompt');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-prompts'] });
      setPromptToDelete(null);
      toast({
        title: "Prompt eliminado",
        description: "El prompt AI ha sido eliminado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const assignPromptMutation = useMutation({
    mutationFn: async ({ accountId, promptId }: { accountId: number; promptId: number }) => {
      const response = await fetch(`/api/whatsapp-accounts/${accountId}/assign-prompt/${promptId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Error al asignar prompt');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp-accounts'] });
      toast({
        title: "Prompt asignado",
        description: "El prompt ha sido asignado a la cuenta de WhatsApp exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Form handlers
  const handleCreatePrompt = () => {
    setEditingPrompt(null);
    promptForm.reset();
    setIsPromptDialogOpen(true);
  };

  const handleEditPrompt = (prompt: AiPrompt) => {
    setEditingPrompt(prompt);
    promptForm.reset({
      name: prompt.name,
      description: prompt.description || "",
      content: prompt.content,
      provider: prompt.provider as "openai" | "gemini" | "qwen3",
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      model: prompt.model,
      isActive: prompt.isActive,
    });
    setIsPromptDialogOpen(true);
  };

  const handleDeletePrompt = (prompt: AiPrompt) => {
    setPromptToDelete(prompt);
  };

  const onPromptSubmit = (values: AiPromptValues) => {
    if (editingPrompt) {
      updatePromptMutation.mutate({ id: editingPrompt.id, data: values });
    } else {
      createPromptMutation.mutate(values);
    }
  };

  const handleAssignPrompt = (accountId: number, promptId: number) => {
    assignPromptMutation.mutate({ accountId, promptId });
  };

  return (
    <>
      <Helmet>
        <title>AI Integration Settings | GeminiCRM</title>
        <meta name="description" content="Configure AI providers for intelligent WhatsApp responses" />
      </Helmet>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">AI Integration</h1>
        <p className="text-sm text-gray-500">
          Configure your AI provider and settings for intelligent WhatsApp responses
        </p>
      </div>

      <div className="space-y-6">
        {/* AI Prompt Management Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Prompt Management
                </CardTitle>
                <CardDescription>
                  Create and manage custom AI prompts for different WhatsApp accounts
                </CardDescription>
              </div>
              <Button onClick={handleCreatePrompt} className="gap-2">
                <Plus className="h-4 w-4" />
                New Prompt
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPrompts ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading prompts...</p>
              </div>
            ) : aiPrompts.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No AI prompts created yet</p>
                <Button onClick={handleCreatePrompt} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Prompt
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiPrompts.map((prompt) => {
                      const assignedAccount = whatsappAccounts.find(
                        account => account.assignedPromptId === prompt.id
                      );
                      
                      return (
                        <TableRow key={prompt.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{prompt.name}</p>
                              {prompt.description && (
                                <p className="text-sm text-gray-500">{prompt.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {prompt.provider.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {prompt.model}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant={prompt.isActive ? "default" : "secondary"}>
                              {prompt.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {assignedAccount ? (
                              <Badge variant="outline">
                                {assignedAccount.name}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPrompt(prompt)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePrompt(prompt)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* WhatsApp Account Assignment Section */}
                {whatsappAccounts.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-4">Quick Assignment</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {whatsappAccounts.map((account) => (
                        <div key={account.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{account.name}</h5>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={account.realStatus === 'connected' ? "default" : "outline"} 
                                className={`text-xs ${
                                  account.realStatus === 'connected' 
                                    ? 'bg-green-100 text-green-800 border-green-300' 
                                    : 'bg-gray-100 text-gray-800 border-gray-300'
                                }`}
                              >
                                {account.realStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 mb-3">
                            Currently assigned: {
                              aiPrompts.find(p => p.id === account.assignedPromptId)?.name || 
                              "No prompt assigned"
                            }
                          </div>
                          <Select
                            value={account.assignedPromptId?.toString() || ""}
                            onValueChange={(value) => {
                              if (value) {
                                handleAssignPrompt(account.id, parseInt(value));
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Assign a prompt" />
                            </SelectTrigger>
                            <SelectContent>
                              {aiPrompts.filter(p => p.isActive).map((prompt) => (
                                <SelectItem key={prompt.id} value={prompt.id.toString()}>
                                  {prompt.name} ({prompt.provider})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Integration Settings */}
        <Card>
        <CardHeader>
          <CardTitle>AI Integration</CardTitle>
          <CardDescription>
            Configure your AI provider and settings for intelligent WhatsApp responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...aiForm}>
            <form onSubmit={aiForm.handleSubmit(onAiIntegrationSubmit)} className="space-y-6">
              <div className="space-y-6">
                {/* AI Provider Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">AI Provider Selection</h3>
                  <FormField
                    control={aiForm.control}
                    name="selectedProvider"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Choose your AI provider</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select AI provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gemini">🤖 Google Gemini AI</SelectItem>
                              <SelectItem value="openai">🧠 OpenAI GPT</SelectItem>
                              <SelectItem value="qwen3">🚀 Qwen3 AI</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Select the AI provider for generating intelligent WhatsApp responses
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* API Keys Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">API Keys</h3>
                  
                  {/* Gemini API Key */}
                  <FormField
                    control={aiForm.control}
                    name="geminiApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gemini API Key</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your Gemini API key"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Get your API key from{" "}
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Google AI Studio
                          </a>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* OpenAI API Key */}
                  <FormField
                    control={aiForm.control}
                    name="openaiApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OpenAI API Key</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your OpenAI API key"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Get your API key from{" "}
                          <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            OpenAI Platform
                          </a>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Qwen3 API Key */}
                  <FormField
                    control={aiForm.control}
                    name="qwenApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qwen3 API Key (DashScope)</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your DashScope API key"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Get your API key from{" "}
                          <a
                            href="https://dashscope.aliyun.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Alibaba Cloud DashScope
                          </a>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* AI Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">AI Configuration</h3>
                  
                  <FormField
                    control={aiForm.control}
                    name="enableAIResponses"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable AI Responses</FormLabel>
                          <FormDescription>
                            Turn on AI-powered automatic responses for WhatsApp messages
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={aiForm.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Response Creativity (Temperature: {field.value})</FormLabel>
                        <FormControl>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </FormControl>
                        <FormDescription>
                          Lower values (0.1-0.3) for focused responses, higher values (0.7-1.0) for creative responses
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={aiForm.control}
                    name="customPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom System Prompt</FormLabel>
                        <FormControl>
                          <textarea
                            placeholder="Enter custom instructions for the AI (optional)"
                            className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Customize how the AI responds to your customers. Leave empty for default behavior.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <CardFooter className="px-0">
                <Button 
                  type="submit" 
                  disabled={saveSettingsMutation.isPending || isLoadingSettings}
                >
                  {saveSettingsMutation.isPending ? "Guardando..." : "Guardar Configuraciones de AI"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* WhatsApp Accounts and Prompt Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            WhatsApp Accounts & Prompt Assignment
          </CardTitle>
          <CardDescription>
            Assign AI prompts to specific WhatsApp accounts and monitor connection status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAccounts ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {whatsappAccounts.map((account) => (
                <div key={account.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        account.realStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <h4 className="font-medium">{account.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Status: {account.realStatus === 'connected' ? 'Connected' : 'Disconnected'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={account.assignedPromptId?.toString() || ""}
                        onValueChange={(value) => handleAssignPrompt(account.id, parseInt(value))}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select AI Prompt" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Prompt Assigned</SelectItem>
                          {aiPrompts.map((prompt) => (
                            <SelectItem key={prompt.id} value={prompt.id.toString()}>
                              {prompt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {account.assignedPromptId && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <strong>Assigned Prompt:</strong> {
                        aiPrompts.find(p => p.id === account.assignedPromptId)?.name || 'Unknown'
                      }
                    </div>
                  )}
                </div>
              ))}
              
              {whatsappAccounts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No WhatsApp accounts found. Create a WhatsApp account first.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* AI Prompt Dialog */}
      <Dialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? "Edit AI Prompt" : "Create New AI Prompt"}
            </DialogTitle>
            <DialogDescription>
              {editingPrompt 
                ? "Update the AI prompt configuration" 
                : "Create a new AI prompt for WhatsApp responses"
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...promptForm}>
            <form onSubmit={promptForm.handleSubmit(onPromptSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={promptForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prompt Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer Service Assistant" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={promptForm.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Provider</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="gemini">Gemini</SelectItem>
                          <SelectItem value="qwen3">Qwen3</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={promptForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of this prompt's purpose" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={promptForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="You are a helpful customer service assistant. Respond professionally and concisely to customer inquiries..."
                        className="min-h-32"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={promptForm.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="gpt-4o" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={promptForm.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          min="0" 
                          max="2" 
                          placeholder="0.7"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={promptForm.control}
                  name="maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Tokens</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="4000" 
                          placeholder="1000"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1000)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={promptForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox 
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Active (prompt can be assigned to accounts)
                    </FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPromptDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPromptMutation.isPending || updatePromptMutation.isPending}
                >
                  {createPromptMutation.isPending || updatePromptMutation.isPending 
                    ? "Saving..." 
                    : editingPrompt ? "Update Prompt" : "Create Prompt"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!promptToDelete} onOpenChange={(open) => !open && setPromptToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{promptToDelete?.name}"? This action cannot be undone.
              Any WhatsApp accounts using this prompt will lose their AI configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => promptToDelete && deletePromptMutation.mutate(promptToDelete.id)}
              disabled={deletePromptMutation.isPending}
            >
              {deletePromptMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
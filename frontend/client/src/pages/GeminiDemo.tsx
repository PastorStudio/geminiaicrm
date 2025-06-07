import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ProfessionLevelSelector, 
  MessageAnalyzer, 
  ChatCategorizer, 
  ActionSuggestion,
  AutoResponseConfig
} from '@/components/gemini';

export default function GeminiDemo() {
  const [tab, setTab] = useState("analyzer");
  const [apiStatus, setApiStatus] = useState<"loading" | "ready" | "error">("loading");
  const [messageInput, setMessageInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messageResponse, setMessageResponse] = useState<any>(null);
  const [chatResponse, setChatResponse] = useState<any>(null);
  const [professionLevel, setProfessionLevel] = useState("professional");

  // Verificar el estado de la API de Gemini
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch("/api/gemini/status");
        const data = await response.json();
        setApiStatus(data.available ? "ready" : "error");
      } catch (error) {
        setApiStatus("error");
      }
    };

    checkApiStatus();
  }, []);

  // Mutaciones para las diferentes funciones de Gemini
  const analyzeMessageMutation = useMutation({
    mutationFn: (message: string) => 
      apiRequest("/api/gemini/extract-info", "POST", { text: message }),
    onSuccess: (data) => {
      setMessageResponse(data);
      toast({
        title: "Análisis completado",
        description: "El mensaje ha sido analizado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Hubo un error al analizar el mensaje",
        variant: "destructive",
      });
    }
  });

  const categorizeChatMutation = useMutation({
    mutationFn: (chat: string) => 
      apiRequest("/api/gemini/chat", "POST", { text: chat }),
    onSuccess: (data) => {
      setChatResponse(data);
      toast({
        title: "Categorización completada",
        description: "El chat ha sido categorizado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Hubo un error al categorizar el chat",
        variant: "destructive",
      });
    }
  });

  // Consulta para obtener la configuración de auto-respuesta
  const { data: autoResponseConfig } = useQuery({
    queryKey: ['/api/auto-response/config'],
    retry: false,
    enabled: tab === "auto-response"
  });

  // Función para actualizar el nivel de profesionalidad
  const handleProfessionLevelChange = async (level: string) => {
    try {
      setProfessionLevel(level);
      await apiRequest("/api/gemini/update-settings", "POST", { professionLevel: level });
      toast({
        title: "Nivel de profesionalidad actualizado",
        description: `El nivel de profesionalidad se ha establecido a "${level}"`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al actualizar el nivel de profesionalidad",
        variant: "destructive",
      });
    }
  };

  // Analizar un mensaje
  const handleAnalyzeMessage = () => {
    if (!messageInput.trim()) {
      toast({
        title: "Mensaje vacío",
        description: "Por favor, introduce un mensaje para analizar",
        variant: "destructive",
      });
      return;
    }

    analyzeMessageMutation.mutate(messageInput);
  };

  // Categorizar un chat
  const handleCategorizeChat = () => {
    if (!chatInput.trim()) {
      toast({
        title: "Chat vacío",
        description: "Por favor, introduce un chat para categorizar",
        variant: "destructive",
      });
      return;
    }

    categorizeChatMutation.mutate(chatInput);
  };

  // Actualizar la configuración de auto-respuesta
  const handleUpdateAutoResponseConfig = async (newConfig: any) => {
    try {
      await apiRequest("/api/auto-response/config", "POST", newConfig);
      queryClient.invalidateQueries({ queryKey: ['/api/auto-response/config'] });
      toast({
        title: "Configuración actualizada",
        description: "La configuración de auto-respuesta se ha actualizado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al actualizar la configuración",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demostración Gemini AI</h1>
          <p className="text-muted-foreground mt-1">
            Explora las capacidades de análisis e integración de Google Gemini AI en el CRM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            apiStatus === "ready" ? "bg-green-500" : 
            apiStatus === "error" ? "bg-red-500" : "bg-yellow-500"
          }`}></div>
          <span className="text-sm">
            {apiStatus === "ready" ? "API Conectada" : 
             apiStatus === "error" ? "API No Disponible" : "Conectando..."}
          </span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="analyzer">Analizador de Mensajes</TabsTrigger>
          <TabsTrigger value="categorizer">Categorizador</TabsTrigger>
          <TabsTrigger value="suggestions">Sugerencias</TabsTrigger>
          <TabsTrigger value="auto-response">Auto-Respuestas</TabsTrigger>
        </TabsList>

        {/* Analizador de Mensajes */}
        <TabsContent value="analyzer">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Mensajes</CardTitle>
                <CardDescription>
                  Analiza mensajes para extraer información relevante como intención, sentimiento y entidades.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="message-input">Mensaje para analizar</Label>
                    <Textarea
                      id="message-input"
                      placeholder="Ingresa un mensaje para analizar..."
                      className="min-h-32"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <Button 
                      onClick={handleAnalyzeMessage}
                      disabled={analyzeMessageMutation.isPending || apiStatus !== "ready"}
                      className="w-full"
                    >
                      {analyzeMessageMutation.isPending ? "Analizando..." : "Analizar Mensaje"}
                    </Button>
                  </div>
                  <div>
                    <ProfessionLevelSelector 
                      value={professionLevel}
                      onChange={handleProfessionLevelChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resultados del Análisis</CardTitle>
                <CardDescription>
                  Información extraída del mensaje analizado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyzeMessageMutation.isPending ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : messageResponse ? (
                  <MessageAnalyzer results={messageResponse} />
                ) : (
                  <div className="text-center text-muted-foreground h-64 flex items-center justify-center">
                    <p>Ingresa un mensaje y haz clic en "Analizar Mensaje" para ver los resultados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categorizador */}
        <TabsContent value="categorizer">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Categorización de Chats</CardTitle>
                <CardDescription>
                  Identifica la categoría de una conversación con probabilidades de pertenencia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="chat-input">Conversación para categorizar</Label>
                    <Textarea
                      id="chat-input"
                      placeholder="Ingresa un fragmento de conversación..."
                      className="min-h-32"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <Button 
                      onClick={handleCategorizeChat}
                      disabled={categorizeChatMutation.isPending || apiStatus !== "ready"}
                      className="w-full"
                    >
                      {categorizeChatMutation.isPending ? "Categorizando..." : "Categorizar Chat"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categorías Detectadas</CardTitle>
                <CardDescription>
                  Categorías identificadas con sus probabilidades
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categorizeChatMutation.isPending ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : chatResponse ? (
                  <ChatCategorizer results={chatResponse} />
                ) : (
                  <div className="text-center text-muted-foreground h-64 flex items-center justify-center">
                    <p>Ingresa una conversación y haz clic en "Categorizar Chat" para ver los resultados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sugerencias */}
        <TabsContent value="suggestions">
          <Card>
            <CardHeader>
              <CardTitle>Sugerencias de Acción</CardTitle>
              <CardDescription>
                Recibe recomendaciones inteligentes basadas en el contexto de la conversación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="context-input">Contexto de la conversación</Label>
                  <Textarea
                    id="context-input"
                    placeholder="Describe la situación o pega fragmentos de la conversación..."
                    className="min-h-32"
                  />
                  <Button className="mt-4 w-full">Generar Sugerencias</Button>
                </div>
                <div>
                  <ActionSuggestion 
                    suggestions={[
                      { 
                        title: "Agendar una demostración", 
                        description: "El cliente ha mostrado interés en ver cómo funciona el producto",
                        priority: "high" 
                      },
                      { 
                        title: "Enviar documentación técnica", 
                        description: "Han preguntado sobre especificaciones técnicas",
                        priority: "medium" 
                      },
                      { 
                        title: "Consultar con el equipo de ventas", 
                        description: "Requieren un presupuesto personalizado", 
                        priority: "low" 
                      }
                    ]} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto-Respuestas */}
        <TabsContent value="auto-response">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Auto-Respuestas</CardTitle>
              <CardDescription>
                Configura respuestas automáticas inteligentes para WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              {autoResponseConfig ? (
                <AutoResponseConfig 
                  initialConfig={autoResponseConfig} 
                  onSave={handleUpdateAutoResponseConfig}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

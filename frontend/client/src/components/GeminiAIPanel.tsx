import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Zap, Target, TrendingUp, FileText, Activity, Ticket, KanbanSquare, Loader2, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeadAnalysis {
  priority: 'high' | 'medium' | 'low';
  score: number;
  category: string;
  nextAction: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  conversionProbability: number;
  reasoning: string;
  suggestedFollowUp: string;
  timeline: string;
}

export function GeminiAIPanel() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<LeadAnalysis | null>(null);
  const [organizeResult, setOrganizeResult] = useState<any>(null);
  const [smartReport, setSmartReport] = useState<string | null>(null);
  const [ticketsResult, setTicketsResult] = useState<any>(null);
  const [kanbanResult, setKanbanResult] = useState<any>(null);
  const [automationResult, setAutomationResult] = useState<any>(null);
  const [chatConversionResult, setChatConversionResult] = useState<any>(null);
  const [systemResetResult, setSystemResetResult] = useState<any>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [currentTask, setCurrentTask] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const { toast } = useToast();

  // Timer para tiempo restante
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsQuotaExceeded(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleQuotaError = () => {
    setIsQuotaExceeded(true);
    setTimeRemaining(60); // 1 minuto de espera
    toast({
      title: "⏳ Cuota de Gemini AI excedida",
      description: "Esperando 1 minuto antes del próximo intento...",
      variant: "destructive",
    });
  };

  const analyzeFirstLead = async () => {
    if (isQuotaExceeded) return;
    
    setIsProcessing(true);
    setCurrentTask("Analizando lead con Gemini AI...");
    setProgress(20);
    
    try {
      const response = await fetch('/api/ai/analyze-lead/1');
      setProgress(60);
      const data = await response.json();
      setProgress(80);
      
      if (response.status === 429) {
        handleQuotaError();
        return;
      }
      
      if (data.success) {
        setAnalysis(data.analysis);
        setProgress(100);
        toast({
          title: "✅ Análisis completado",
          description: `Lead analizado con score ${data.analysis.score}/100`,
        });
      } else {
        throw new Error(data.error || 'Error en análisis');
      }
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        handleQuotaError();
      } else {
        toast({
          title: "❌ Error",
          description: "Error al analizar lead con Gemini AI",
          variant: "destructive",
        });
      }
    }
    setIsProcessing(false);
    setProgress(0);
    setCurrentTask("");
  };

  const organizeAllLeads = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/organize-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      if (data.success) {
        setOrganizeResult(data);
        toast({
          title: "🤖 Organización exitosa",
          description: `${data.organized} leads organizados con IA`,
        });
      } else {
        throw new Error(data.error || 'Error en organización');
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al organizar leads automáticamente",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  const generateSmartReport = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/smart-report');
      const data = await response.json();
      
      if (data.success) {
        setSmartReport(data.report);
        toast({
          title: "📊 Reporte generado",
          description: `Analizados ${data.leadsAnalyzed} leads`,
        });
      } else {
        throw new Error(data.error || 'Error en reporte');
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al generar reporte inteligente",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  const manageTickets = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/manage-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      if (data.success) {
        setTicketsResult(data);
        toast({
          title: "🎫 Tickets gestionados",
          description: `${data.processed} mensajes procesados, ${data.created} tickets creados`,
        });
      } else {
        throw new Error(data.error || 'Error en gestión de tickets');
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al gestionar tickets automáticamente",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  const organizeKanban = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/kanban-organize');
      const data = await response.json();
      
      if (data.success) {
        setKanbanResult(data);
        toast({
          title: "📋 Kanban organizado",
          description: `${data.organized} tarjetas organizadas en tablero`,
        });
      } else {
        throw new Error(data.error || 'Error en organización Kanban');
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al organizar tablero Kanban",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  const runFullAutomation = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/full-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      if (data.success) {
        setAutomationResult(data);
        toast({
          title: "🚀 Automatización completa",
          description: "Sistema automatizado exitosamente",
        });
      } else {
        throw new Error(data.error || 'Error en automatización completa');
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error en automatización completa del sistema",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  const convertChatsToLeads = async () => {
    if (isQuotaExceeded) return;
    
    setIsProcessing(true);
    setCurrentTask("Convirtiendo chats de WhatsApp en leads...");
    setProgress(10);
    
    try {
      // Convertir chats de ambas cuentas
      const accounts = [1, 2];
      let totalResults = {
        processed: 0,
        created: 0,
        updated: 0,
        analyzed: 0
      };
      
      for (let i = 0; i < accounts.length; i++) {
        const accountId = accounts[i];
        setCurrentTask(`Procesando cuenta WhatsApp ${accountId}...`);
        setProgress(20 + (i * 30));
        
        const response = await fetch(`/api/whatsapp/${accountId}/convert-chats-to-leads`, {
          method: 'POST',
        });
        
        const data = await response.json();
        
        if (data.success) {
          totalResults.processed += data.data.processed;
          totalResults.created += data.data.created;
          totalResults.updated += data.data.updated;
          totalResults.analyzed += data.data.analyzed;
        }
      }
      
      setProgress(90);
      setCurrentTask("Finalizando conversión...");
      
      setChatConversionResult(totalResults);
      setProgress(100);
      
      toast({
        title: "✅ Conversión completada",
        description: `${totalResults.created} nuevos leads creados, ${totalResults.updated} actualizados, ${totalResults.analyzed} analizados con IA`,
      });
      
    } catch (error: any) {
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        handleQuotaError();
      } else {
        toast({
          title: "❌ Error",
          description: "Error convirtiendo chats a leads",
          variant: "destructive",
        });
      }
    }
    setIsProcessing(false);
  };

  const resetSystemData = async () => {
    if (isQuotaExceeded) return;
    
    setIsProcessing(true);
    setCurrentTask("Eliminando todos los datos del sistema...");
    setProgress(10);
    
    try {
      const response = await fetch('/api/system/reset-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminPassword })
      });
      
      setProgress(50);
      const data = await response.json();
      setProgress(80);
      
      if (data.success) {
        setSystemResetResult(data.data);
        setProgress(100);
        setShowResetDialog(false);
        setAdminPassword("");
        
        toast({
          title: "✅ Sistema resetado completamente",
          description: `${data.data.deletedLeads} leads, ${data.data.deletedTickets} tickets, ${data.data.deletedActivities} actividades eliminados`,
        });
      } else {
        throw new Error(data.error || 'Error en el reseteo del sistema');
      }
      
    } catch (error: any) {
      toast({
        title: "❌ Error en reseteo",
        description: error.message || "Error al resetear el sistema",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  const handleResetClick = () => {
    setShowResetDialog(true);
    setAdminPassword("");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'neutral': return 'bg-blue-100 text-blue-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Panel de Gemini AI
          </CardTitle>
          <CardDescription>
            Organización inteligente de leads, tickets y pipeline de ventas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de progreso y estado */}
          {(isProcessing || isQuotaExceeded) && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isQuotaExceeded ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-700">
                        Cuota de Gemini AI excedida
                      </span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">
                        {currentTask || "Procesando..."}
                      </span>
                    </>
                  )}
                </div>
                {timeRemaining > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Próximo intento en: {formatTime(timeRemaining)}</span>
                  </div>
                )}
              </div>
              
              {isProcessing && !isQuotaExceeded && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <div className="text-xs text-gray-500 text-center">
                    {progress}% completado
                  </div>
                </div>
              )}
              
              {isQuotaExceeded && (
                <div className="space-y-2">
                  <Progress value={Math.max(0, 100 - (timeRemaining / 60 * 100))} className="h-2 bg-orange-100" />
                  <div className="text-xs text-orange-600 text-center">
                    Esperando para restablecer cuota de API...
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={convertChatsToLeads}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Activity className="h-4 w-4" />
              {isProcessing ? "Convirtiendo..." : "🚀 Chats → Leads con IA"}
            </Button>

            <Button
              onClick={analyzeFirstLead}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              {isProcessing ? "Analizando..." : "Analizar Lead #1"}
            </Button>
            
            <Button
              onClick={organizeAllLeads}
              disabled={isProcessing}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {isProcessing ? "Organizando..." : "Organizar Leads"}
            </Button>
            
            <Button
              onClick={manageTickets}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Ticket className="h-4 w-4" />
              {isProcessing ? "Procesando..." : "Gestionar Tickets"}
            </Button>
            
            <Button
              onClick={organizeKanban}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <KanbanSquare className="h-4 w-4" />
              {isProcessing ? "Organizando..." : "Organizar Kanban"}
            </Button>
            
            <Button
              onClick={generateSmartReport}
              disabled={isProcessing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {isProcessing ? "Generando..." : "Reporte Inteligente"}
            </Button>
            
            <Button
              onClick={runFullAutomation}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold col-span-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ejecutando Automatización...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  🚀 AUTOMATIZACIÓN COMPLETA DEL SISTEMA
                </>
              )}
            </Button>

            <Button
              onClick={handleResetClick}
              disabled={isProcessing}
              variant="destructive"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold col-span-full"
            >
              <Trash2 className="h-4 w-4" />
              {isProcessing ? "Eliminando..." : "🗑️ RESET TOTAL DEL SISTEMA"}
            </Button>
          </div>

          {/* Dialog de confirmación para reset del sistema */}
          <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  Reset Total del Sistema
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Esta acción eliminará TODOS los datos del sistema de forma permanente:
                  <br />• Todos los leads y contactos
                  <br />• Todos los tickets y actividades
                  <br />• Todos los mensajes y conversaciones
                  <br />• Todos los reportes y análisis
                  <br /><br />
                  <span className="font-semibold text-red-600">⚠️ Esta acción NO se puede deshacer</span>
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="admin-password" className="text-right font-semibold">
                    Clave Admin:
                  </Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Ingresa la clave de administrador"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowResetDialog(false);
                    setAdminPassword("");
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={resetSystemData}
                  disabled={!adminPassword || isProcessing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Confirmar Reset
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {analysis && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Análisis del Lead</span>
                  <Badge className={getPriorityColor(analysis.priority)}>
                    {analysis.priority.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{analysis.score}/100</div>
                    <div className="text-sm text-gray-600">Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{analysis.conversionProbability}%</div>
                    <div className="text-sm text-gray-600">Conversión</div>
                  </div>
                  <div className="text-center">
                    <Badge className={getSentimentColor(analysis.sentiment)}>
                      {analysis.sentiment}
                    </Badge>
                    <div className="text-sm text-gray-600 mt-1">Sentimiento</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">{analysis.category}</div>
                    <div className="text-sm text-gray-600">Categoría</div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Siguiente Acción:</h4>
                    <p className="text-sm">{analysis.nextAction}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Seguimiento Sugerido:</h4>
                    <p className="text-sm">{analysis.suggestedFollowUp}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Timeline:</h4>
                    <p className="text-sm">{analysis.timeline}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Razonamiento de IA:</h4>
                    <p className="text-sm text-gray-600">{analysis.reasoning}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {organizeResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Resultado de Organización
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-green-600">{organizeResult.organized}</span>
                    <span className="text-sm text-gray-600">leads organizados exitosamente</span>
                  </div>
                  
                  {organizeResult.insights && organizeResult.insights.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Insights generados:</h4>
                      <ul className="space-y-1">
                        {organizeResult.insights.slice(0, 3).map((insight: string, index: number) => (
                          <li key={index} className="text-sm text-gray-600">• {insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {chatConversionResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Conversión de Chats de WhatsApp
                </CardTitle>
                <CardDescription>
                  Resultados de la conversión automática de chats en leads analizados con IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{chatConversionResult.processed}</div>
                    <div className="text-sm text-blue-700">Chats Procesados</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{chatConversionResult.created}</div>
                    <div className="text-sm text-green-700">Leads Creados</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{chatConversionResult.updated}</div>
                    <div className="text-sm text-yellow-700">Leads Actualizados</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{chatConversionResult.analyzed}</div>
                    <div className="text-sm text-purple-700">Analizados con IA</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="text-sm text-green-800 font-medium">
                    ✅ Sistema completamente actualizado con conversaciones reales de WhatsApp
                  </div>
                  <div className="text-xs text-green-700 mt-1">
                    Cada chat ha sido convertido en un lead con análisis de sentimiento, probabilidad de conversión y próximas acciones sugeridas
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {systemResetResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  Reset Total del Sistema Completado
                </CardTitle>
                <CardDescription>
                  Todos los datos del sistema han sido eliminados exitosamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{systemResetResult.deletedLeads}</div>
                    <div className="text-sm text-red-700">Leads Eliminados</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{systemResetResult.deletedTickets}</div>
                    <div className="text-sm text-orange-700">Tickets Eliminados</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{systemResetResult.deletedActivities}</div>
                    <div className="text-sm text-yellow-700">Actividades Eliminadas</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{systemResetResult.deletedMessages}</div>
                    <div className="text-sm text-gray-700">Mensajes Eliminados</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
                  <div className="text-sm text-red-800 font-medium">
                    ✅ Sistema completamente limpio y listo para nuevos datos
                  </div>
                  <div className="text-xs text-red-700 mt-1">
                    Todos los datos anteriores han sido eliminados de forma permanente. El sistema está listo para comenzar con datos frescos.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {smartReport && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Reporte Inteligente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm">{smartReport}</pre>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
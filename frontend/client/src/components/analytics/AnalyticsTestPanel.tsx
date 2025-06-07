import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { Loader2, CheckCircle, TagIcon, TrendingUp, Users, Brain } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TagResult {
  tag: string;
  confidence: number;
}

interface TestResult {
  success: boolean;
  message?: string;
  tags?: TagResult[];
  prediction?: any;
  segmentation?: any;
  text?: string;
  metric?: string;
  timeframe?: string;
}

const AnalyticsTestPanel = () => {
  const [testTab, setTestTab] = useState<string>("tags");
  const [inputText, setInputText] = useState<string>("");
  const [metric, setMetric] = useState<string>("leads");
  const [result, setResult] = useState<TestResult | null>(null);
  const { toast } = useToast();

  // Mutación para test de tags
  const tagsMutation = useMutation({
    mutationFn: async (text: string) => {
      try {
        return await fetch("/api/analytics/demo/generate-tags", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text })
        }).then(res => {
          if (!res.ok) throw new Error(`Error: ${res.status}`);
          return res.json();
        });
      } catch (error) {
        console.error("Error generando tags:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      console.error("Error en mutación de tags:", error);
      toast({
        title: "Error al generar tags",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}`
      });
    }
  });

  // Mutación para test de predicción
  const predictionMutation = useMutation({
    mutationFn: async (metricName: string) => {
      try {
        return await fetch(`/api/analytics/demo/predict?metric=${metricName}`).then(res => {
          if (!res.ok) throw new Error(`Error: ${res.status}`);
          return res.json();
        });
      } catch (error) {
        console.error("Error en predicción:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      toast({
        title: "Error en predicción",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}`
      });
    }
  });

  // Mutación para test de segmentación
  const segmentationMutation = useMutation({
    mutationFn: async () => {
      try {
        return await fetch("/api/analytics/demo/segment").then(res => {
          if (!res.ok) throw new Error(`Error: ${res.status}`);
          return res.json();
        });
      } catch (error) {
        console.error("Error en segmentación:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      toast({
        title: "Error en segmentación",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}`
      });
    }
  });

  // Verificación del estado del servicio Gemini
  const geminiStatusMutation = useMutation({
    mutationFn: async () => {
      try {
        return await fetch("/api/analytics/status").then(res => {
          if (!res.ok) throw new Error(`Error: ${res.status}`);
          return res.json();
        });
      } catch (error) {
        console.error("Error verificando estado:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (!data.success || !data.status?.available) {
        setResult({
          success: false,
          message: data.status?.message || "Servicio de Gemini no disponible"
        });
      } else {
        setResult({
          success: true,
          message: "Servicio de Gemini disponible y funcionando correctamente"
        });
      }
    },
    onError: (error) => {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}`
      });
    }
  });

  const handleGenerateTags = () => {
    if (!inputText.trim()) {
      setResult({
        success: false,
        message: "Por favor, ingresa un texto para analizar"
      });
      return;
    }
    
    tagsMutation.mutate(inputText);
  };

  const handlePredictMetric = () => {
    predictionMutation.mutate(metric);
  };

  const handleSegmentCustomers = () => {
    segmentationMutation.mutate();
  };

  const handleCheckGemini = () => {
    geminiStatusMutation.mutate();
  };

  const isPending = 
    tagsMutation.isPending || 
    predictionMutation.isPending || 
    segmentationMutation.isPending || 
    geminiStatusMutation.isPending;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          Prueba de Analytics con IA
        </CardTitle>
        <CardDescription>
          Prueba las capacidades de análisis avanzado con ML para tu CRM
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tags" value={testTab} onValueChange={setTestTab}>
          <TabsList className="mb-4 w-full grid grid-cols-4">
            <TabsTrigger value="tags" className="flex items-center gap-1">
              <TagIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Generación de Tags</span>
              <span className="inline sm:hidden">Tags</span>
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Predicciones</span>
              <span className="inline sm:hidden">Predecir</span>
            </TabsTrigger>
            <TabsTrigger value="segmentation" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Segmentación</span>
              <span className="inline sm:hidden">Segmentos</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Estado del Servicio</span>
              <span className="inline sm:hidden">Estado</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tags" className="space-y-4">
            <div>
              <Label htmlFor="tagInput">Texto para analizar</Label>
              <Textarea
                id="tagInput"
                placeholder="Ingresa el texto que quieres analizar para generar tags inteligentes..."
                className="h-32 mt-2"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleGenerateTags} 
              disabled={isPending || !inputText.trim()}
              className="w-full sm:w-auto"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generar Tags
            </Button>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            <div>
              <Label htmlFor="metricSelect">Métrica a predecir</Label>
              <Select 
                value={metric} 
                onValueChange={setMetric}
              >
                <SelectTrigger id="metricSelect" className="mt-2">
                  <SelectValue placeholder="Selecciona una métrica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="conversions">Conversiones</SelectItem>
                  <SelectItem value="sales">Ventas</SelectItem>
                  <SelectItem value="messages">Mensajes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handlePredictMetric} 
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Predecir Métrica
            </Button>
          </TabsContent>

          <TabsContent value="segmentation" className="space-y-4">
            <p className="text-sm text-gray-500">
              Este test segmentará tus leads actuales en grupos basados en características y comportamientos similares
              usando análisis avanzado.
            </p>
            <Button 
              onClick={handleSegmentCustomers} 
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Segmentar Clientes
            </Button>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <p className="text-sm text-gray-500">
              Verifica el estado del servicio de análisis avanzado con Gemini API.
            </p>
            <Button 
              onClick={handleCheckGemini} 
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar Estado
            </Button>
          </TabsContent>
        </Tabs>

        {result && (
          <>
            <Separator className="my-4" />
            
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Resultado:</h3>
              
              {!result.success ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              ) : testTab === "tags" && result.tags ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Tags generados para: "{result.text}"</p>
                  <div className="flex flex-wrap gap-2">
                    {result.tags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="outline"
                        className="bg-purple-50 border-purple-200 text-purple-800 flex items-center"
                      >
                        <span className="mr-1">{tag.tag}</span>
                        <span className="text-xs bg-purple-200 text-purple-800 px-1 py-0.5 rounded-sm">{tag.confidence}%</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : testTab === "predictions" && result.prediction ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Predicción para {result.metric} en periodo {result.timeframe}</p>
                  
                  <Card className="bg-gray-50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Valor Predicho</p>
                          <p className="text-2xl font-bold text-blue-600">{result.prediction.value}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Probabilidad</p>
                          <p className="text-2xl font-bold text-green-600">{result.prediction.probability}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Confianza</p>
                          <p className="text-lg font-semibold">{result.prediction.confidence}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tendencia</p>
                          <p className="text-lg font-semibold flex items-center">
                            {result.prediction.trend === 'increasing' && <TrendingUp className="text-green-500 mr-1 h-4 w-4" />}
                            {result.prediction.trend === 'decreasing' && <TrendingUp className="text-red-500 mr-1 h-4 w-4 transform rotate-180" />}
                            {result.prediction.trend}
                          </p>
                        </div>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Factores principales</p>
                        <ul className="text-sm list-disc pl-5 space-y-1">
                          {result.prediction.factors.map((factor: string, i: number) => (
                            <li key={i}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : testTab === "segmentation" && result.segmentation ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Segmentación de clientes completada</p>
                  
                  {result.segmentation.segments && result.segmentation.segments.length > 0 ? (
                    <div className="space-y-4">
                      {result.segmentation.segments.map((segment: any, i: number) => (
                        <Card key={i} className="bg-gray-50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center justify-between">
                              {segment.name}
                              <Badge className="ml-2">{segment.percentageOfTotal}%</Badge>
                            </CardTitle>
                            <CardDescription>{segment.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-gray-500 mb-1">Características principales</p>
                            <ul className="text-sm list-disc pl-5 space-y-1">
                              {segment.characteristics.map((characteristic: string, j: number) => (
                                <li key={j}>{characteristic}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p>No se encontraron segmentos</p>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertTitle>Éxito</AlertTitle>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="text-xs text-gray-500 flex justify-between pt-0">
        <p>Impulsado por Google Gemini Pro</p>
        <p>Los resultados pueden variar con diferentes datos</p>
      </CardFooter>
    </Card>
  );
};

export default AnalyticsTestPanel;
import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SuperSimpleToggle from "@/components/messaging/SuperSimpleToggle";

// Configuration schema simplificado
const autoResponseConfigSchema = z.object({
  enabled: z.boolean().default(false),
  delaySeconds: z.number().min(1).max(60).default(3),
  greetingMessage: z.string().default("Hola, gracias por contactarnos. En breve le atenderemos."),
  outOfHoursMessage: z.string().default("Gracias por su mensaje. Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00."),
  businessHoursStart: z.string().default("09:00:00"),
  businessHoursEnd: z.string().default("18:00:00"),
  workingDays: z.string().default("1,2,3,4,5"),
  aiProvider: z.string().default("gemini"),
  customPrompts: z.object({
    enabled: z.boolean().default(false),
    system: z.string().default(""),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(50).max(2000).default(500)
  }).default({
    enabled: false,
    system: "",
    temperature: 0.7,
    maxTokens: 500
  })
});

type AutoResponseConfig = z.infer<typeof autoResponseConfigSchema>;

export default function AutoResponseSettingsFixed() {
  const { toast } = useToast();
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  // Referencias para el autoguardado
  const hasLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Form setup
  const form = useForm<AutoResponseConfig>({
    resolver: zodResolver(autoResponseConfigSchema),
    defaultValues: {
      enabled: false,
      delaySeconds: 3,
      greetingMessage: "Hola, gracias por contactarnos. En breve le atenderemos.",
      outOfHoursMessage: "Gracias por su mensaje. Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00.",
      businessHoursStart: "09:00:00",
      businessHoursEnd: "18:00:00",
      workingDays: "1,2,3,4,5",
      aiProvider: "gemini",
      customPrompts: {
        enabled: false,
        system: "",
        temperature: 0.7,
        maxTokens: 500
      }
    },
  });

  // Cargar configuración existente
  const { data: config, isLoading } = useQuery({
    queryKey: ["/api/auto-response/config"],
    queryFn: async () => {
      console.log("⚙️ Obteniendo configuración de respuestas automáticas");
      const response = await fetch("/api/auto-response/config");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
  });

  // Mutación para guardar configuración
  const { mutate: updateConfig } = useMutation({
    mutationFn: async (values: AutoResponseConfig) => {
      const response = await fetch("/api/auto-response/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-response/config"] });
      toast({
        title: "✅ Configuración guardada",
        description: "Los cambios se han guardado correctamente",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Error al guardar",
        description: `No se pudo guardar la configuración: ${error.message}`,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  // Auto-save mutation
  const { mutate: autoSaveConfig } = useMutation({
    mutationFn: async (values: AutoResponseConfig) => {
      setIsAutoSaving(true);
      const response = await fetch("/api/auto-response/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsAutoSaving(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auto-response/config"] });
    },
    onError: (error) => {
      setIsAutoSaving(false);
      console.error("Error en autoguardado:", error);
    },
  });

  // Función de autoguardado con debounce
  const scheduleAutoSave = (values: AutoResponseConfig) => {
    if (!hasLoadedRef.current) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      console.log('💾 Autoguardado activado');
      autoSaveConfig(values);
    }, 1500);
  };

  // Form submission handler
  const onSubmit = (values: AutoResponseConfig) => {
    console.log("Enviando configuración:", values);
    updateConfig(values);
  };

  // Cargar datos en el formulario cuando se obtengan
  useEffect(() => {
    if (config && !hasLoadedRef.current) {
      console.log("✅ Configuración encontrada:", config);
      const configWithDefaults = {
        enabled: config.enabled || false,
        delaySeconds: config.delaySeconds || 3,
        greetingMessage: config.greetingMessage || "Hola, gracias por contactarnos. En breve le atenderemos.",
        outOfHoursMessage: config.outOfHoursMessage || "Gracias por su mensaje. Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00.",
        businessHoursStart: config.businessHoursStart || "09:00:00",
        businessHoursEnd: config.businessHoursEnd || "18:00:00",
        workingDays: config.workingDays || "1,2,3,4,5",
        aiProvider: config.aiProvider || "gemini",
        customPrompts: {
          enabled: config.customPrompts?.enabled || false,
          system: config.customPrompts?.system || "",
          temperature: config.customPrompts?.temperature || 0.7,
          maxTokens: config.customPrompts?.maxTokens || 500
        }
      };
      
      form.reset(configWithDefaults);
      hasLoadedRef.current = true;
    }
  }, [config, form]);

  // Watch para autoguardado
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (hasLoadedRef.current) {
        scheduleAutoSave(values as AutoResponseConfig);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Configuración de Respuestas Automáticas - GeminiCRM</title>
        <meta name="description" content="Configura respuestas automáticas inteligentes para WhatsApp con IA" />
      </Helmet>

      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            Configuración de Respuestas Automáticas
          </CardTitle>
          <CardDescription>
            Configura respuestas automáticas inteligentes para mejorar la atención al cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Switch principal */}
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Activar respuestas automáticas</FormLabel>
                      <FormDescription>
                        Habilita las respuestas automáticas para todos los mensajes entrantes
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

              {/* Configuraciones básicas */}
              {form.watch("enabled") && (
                <>
                  <FormField
                    control={form.control}
                    name="delaySeconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retraso en respuesta (segundos)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Slider
                              min={1}
                              max={60}
                              step={1}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                              className="w-full"
                            />
                            <div className="text-center text-sm text-gray-500">
                              {field.value} segundo{field.value !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Tiempo de espera antes de enviar la respuesta automática
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="greetingMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensaje de saludo</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Hola, gracias por contactarnos..."
                            className="min-h-20"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Mensaje que se envía como respuesta automática durante horario laboral
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="outOfHoursMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensaje fuera de horario</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Gracias por su mensaje. Nuestro horario..."
                            className="min-h-20"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Mensaje que se envía fuera del horario laboral
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="businessHoursStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de inicio</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="businessHoursEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de fin</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              <div className="space-y-6">
                <Separator />
                
                {/* Nuevo componente de activación directa */}
                <SuperSimpleToggle />
                
                <div className="flex justify-center">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {isAutoSaving ? (
                        <>
                          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-blue-700 font-medium">Guardando automáticamente...</span>
                        </>
                      ) : (
                        <>
                          <div className="h-4 w-4 bg-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                          <span className="text-green-700 font-medium">✅ Autoguardado activo</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Los cambios se guardan automáticamente
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    💾 Guardar configuración
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  BrainCircuit, 
  Target, 
  BarChart, 
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  Zap,
  Users,
  ThumbsUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Metric {
  name: string;
  value: number; // de 0 a 100
  description: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'sky';
}

interface LeadAIMetricsProps {
  leadId: number;
  metrics?: Metric[];
  loading?: boolean;
  className?: string;
  compact?: boolean;
}

export function LeadAIMetrics({
  leadId,
  metrics: propMetrics,
  loading = false,
  className,
  compact = false
}: LeadAIMetricsProps) {
  // Si se proporcionan métricas, usarlas; de lo contrario, usar métricas de ejemplo
  const metrics = propMetrics || [
    {
      name: 'Puntuación general',
      value: 78,
      description: 'Evaluación global del lead basada en múltiples factores',
      icon: <BrainCircuit size={16} />,
      color: 'green'
    },
    {
      name: 'Probabilidad de conversión',
      value: 65,
      description: 'Probabilidad estimada de que este lead se convierta en cliente',
      icon: <Target size={16} />,
      color: 'blue'
    },
    {
      name: 'Confianza para siguiente etapa',
      value: 82,
      description: 'Nivel de confianza para avanzar al siguiente paso del embudo',
      icon: <TrendingUp size={16} />,
      color: 'purple'
    },
    {
      name: 'Porcentaje de coincidencia',
      value: 73,
      description: 'Cuánto coincide este lead con tu cliente ideal',
      icon: <PieChart size={16} />,
      color: 'sky'
    },
    {
      name: 'Prioridad de seguimiento',
      value: 88,
      description: 'Qué tan importante es dar seguimiento a este lead pronto',
      icon: <Clock size={16} />,
      color: 'amber'
    },
    {
      name: 'Valor potencial',
      value: 62,
      description: 'Estimación del valor potencial del cliente',
      icon: <DollarSign size={16} />,
      color: 'green'
    },
    {
      name: 'Urgencia de compra',
      value: 45,
      description: 'Qué tan urgente es la necesidad del lead',
      icon: <Zap size={16} />,
      color: 'red'
    },
    {
      name: 'Influencia en decisiones',
      value: 79,
      description: 'Nivel de influencia del contacto en la decisión de compra',
      icon: <Users size={16} />,
      color: 'blue'
    },
    {
      name: 'Satisfacción con interacción',
      value: 91,
      description: 'Nivel de satisfacción detectado en interacciones previas',
      icon: <ThumbsUp size={16} />,
      color: 'green'
    }
  ];
  
  // Función para obtener colores según el valor
  const getColorClasses = (value: number, type: 'bg' | 'text' | 'border', color?: string) => {
    if (color === 'green') {
      return type === 'bg' ? 'bg-green-500' : type === 'text' ? 'text-green-500' : 'border-green-500';
    }
    if (color === 'blue') {
      return type === 'bg' ? 'bg-blue-500' : type === 'text' ? 'text-blue-500' : 'border-blue-500';
    }
    if (color === 'purple') {
      return type === 'bg' ? 'bg-purple-500' : type === 'text' ? 'text-purple-500' : 'border-purple-500';
    }
    if (color === 'amber') {
      return type === 'bg' ? 'bg-amber-500' : type === 'text' ? 'text-amber-500' : 'border-amber-500';
    }
    if (color === 'red') {
      return type === 'bg' ? 'bg-red-500' : type === 'text' ? 'text-red-500' : 'border-red-500';
    }
    if (color === 'sky') {
      return type === 'bg' ? 'bg-sky-500' : type === 'text' ? 'text-sky-500' : 'border-sky-500';
    }
    
    // Color por defecto según el valor
    if (value >= 80) return type === 'bg' ? 'bg-green-500' : type === 'text' ? 'text-green-500' : 'border-green-500';
    if (value >= 60) return type === 'bg' ? 'bg-blue-500' : type === 'text' ? 'text-blue-500' : 'border-blue-500';
    if (value >= 40) return type === 'bg' ? 'bg-amber-500' : type === 'text' ? 'text-amber-500' : 'border-amber-500';
    return type === 'bg' ? 'bg-red-500' : type === 'text' ? 'text-red-500' : 'border-red-500';
  };

  // Obtener categorías para las pestañas
  const mainMetrics = metrics.slice(0, 4); // Las 4 métricas principales
  const additionalMetrics = metrics.slice(4); // Métricas adicionales
  
  // Renderizar una métrica individual
  const renderMetric = (metric: Metric, index: number) => (
    <div key={index} className="mb-4 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("rounded-full p-1", `bg-${metric.color}-100`, `text-${metric.color}-500`)}>
            {metric.icon}
          </span>
          <h4 className="text-sm font-medium">{metric.name}</h4>
        </div>
        <span className={cn("text-sm font-bold", getColorClasses(metric.value, 'text', metric.color))}>
          {metric.value}%
        </span>
      </div>
      
      <div className="space-y-1.5">
        <Progress 
          value={metric.value} 
          className="h-2 bg-gray-100"
          indicatorClassName={getColorClasses(metric.value, 'bg', metric.color)}
        />
        <p className="text-xs text-gray-500">{metric.description}</p>
      </div>
    </div>
  );

  if (compact) {
    return (
      <Card className={cn("border shadow-sm", className)}>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 size={16} className="text-primary-500" />
            Métricas IA
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-3">
          <div className="space-y-3">
            {mainMetrics.map((metric, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-xs", getColorClasses(metric.value, 'text', metric.color))}>
                    {metric.icon}
                  </span>
                  <span className="text-xs truncate max-w-[150px]">{metric.name}</span>
                </div>
                <div className="flex items-center">
                  <Progress 
                    value={metric.value} 
                    className="h-1.5 w-16 mr-1.5 bg-gray-100"
                    indicatorClassName={getColorClasses(metric.value, 'bg', metric.color)}
                  />
                  <span className={cn("text-xs font-medium", getColorClasses(metric.value, 'text', metric.color))}>
                    {metric.value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BrainCircuit className="text-primary-500 h-5 w-5" />
          Análisis de IA
        </CardTitle>
        <CardDescription>
          Métricas e indicadores generados con inteligencia artificial
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="principales" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="principales" className="text-sm">
              Métricas principales
            </TabsTrigger>
            <TabsTrigger value="adicionales" className="text-sm">
              Métricas adicionales
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="principales" className="mt-0">
            <div className="space-y-0">
              {mainMetrics.map((metric, index) => renderMetric(metric, index))}
            </div>
          </TabsContent>
          
          <TabsContent value="adicionales" className="mt-0">
            <div className="space-y-0">
              {additionalMetrics.map((metric, index) => renderMetric(metric, index))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
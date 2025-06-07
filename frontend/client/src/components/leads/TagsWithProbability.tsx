import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tag, PieChart, BarChart3, TrendingUp, Tags, BadgeCheck, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagWithProbability {
  tag: string;
  probability: number;
  category: string;
}

interface TagsWithProbabilityProps {
  tags: TagWithProbability[];
  compact?: boolean;
  showCharts?: boolean;
  className?: string;
  title?: string;
  showCategory?: boolean;
}

export function TagsWithProbability({
  tags,
  compact = false,
  showCharts = true,
  className,
  title = 'Etiquetas con probabilidad',
  showCategory = true
}: TagsWithProbabilityProps) {
  // Si no hay etiquetas, mostrar mensaje
  if (!tags || tags.length === 0) {
    return (
      <Card className={cn("border shadow-sm", className)}>
        <CardHeader className={compact ? "pb-2 pt-4 px-4" : ""}>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Tags size={16} className="text-primary-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? "px-4 py-3" : ""}>
          <div className="text-sm text-gray-500 italic">
            No hay etiquetas disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ordenar etiquetas por probabilidad (de mayor a menor)
  const sortedTags = [...tags].sort((a, b) => b.probability - a.probability);
  
  // Agrupar etiquetas por categoría si es necesario
  const tagsByCategory: Record<string, TagWithProbability[]> = {};
  
  if (showCategory) {
    sortedTags.forEach(tag => {
      if (!tagsByCategory[tag.category]) {
        tagsByCategory[tag.category] = [];
      }
      tagsByCategory[tag.category].push(tag);
    });
  }
  
  // Obtener color según la probabilidad
  const getColorForProbability = (probability: number): string => {
    if (probability >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (probability >= 60) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (probability >= 40) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (probability >= 20) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };
  
  // Obtener icono según la categoría
  const getIconForCategory = (category: string) => {
    switch (category.toLowerCase()) {
      case 'etapa':
        return <TrendingUp size={14} />;
      case 'interés':
        return <CircleDot size={14} />;
      case 'conversión':
        return <BarChart3 size={14} />;
      default:
        return <Tag size={14} />;
    }
  };
  
  // Obtener título para la categoría
  const getCategoryTitle = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'etapa':
        return 'Etapa del ciclo de venta';
      case 'interés':
        return 'Intereses detectados';
      case 'conversión':
        return 'Probabilidad de conversión';
      default:
        return 'Características generales';
    }
  };

  // Renderizar las etiquetas agrupadas por categoría
  const renderTagsByCategory = () => {
    return Object.entries(tagsByCategory).map(([category, categoryTags]) => (
      <div key={category} className="mb-4 last:mb-0">
        <div className="flex items-center gap-1.5 mb-2">
          {getIconForCategory(category)}
          <h4 className="text-sm font-medium">{getCategoryTitle(category)}</h4>
        </div>
        
        <div className="space-y-2">
          {categoryTags.map((tag, index) => renderTagWithProbability(tag, index))}
        </div>
      </div>
    ));
  };

  // Renderizar una etiqueta individual con su barra de probabilidad
  const renderTagWithProbability = (tag: TagWithProbability, index: number) => {
    return (
      <div key={index} className="flex flex-col">
        <div className="flex justify-between items-center mb-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-xs cursor-help", 
                    getColorForProbability(tag.probability)
                  )}
                >
                  {tag.tag}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Confianza: {tag.probability}%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <span className="text-xs font-medium">
            {tag.probability}%
          </span>
        </div>
        
        <Progress 
          value={tag.probability} 
          className={cn(
            "h-1.5", 
            tag.probability >= 80 ? "bg-green-100" : 
            tag.probability >= 60 ? "bg-emerald-100" : 
            tag.probability >= 40 ? "bg-blue-100" : 
            tag.probability >= 20 ? "bg-amber-100" : "bg-red-100"
          )}
          indicatorClassName={
            tag.probability >= 80 ? "bg-green-500" : 
            tag.probability >= 60 ? "bg-emerald-500" : 
            tag.probability >= 40 ? "bg-blue-500" : 
            tag.probability >= 20 ? "bg-amber-500" : "bg-red-500"
          }
        />
      </div>
    );
  };

  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardHeader className={compact ? "pb-2 pt-4 px-4" : ""}>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Tags size={16} className="text-primary-500" />
          {title}
        </CardTitle>
        {!compact && (
          <CardDescription>
            Etiquetas generadas automáticamente usando IA con porcentajes de probabilidad
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className={compact ? "px-4 py-3" : ""}>
        {showCategory ? (
          renderTagsByCategory()
        ) : (
          <div className="space-y-2">
            {sortedTags.map((tag, index) => renderTagWithProbability(tag, index))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
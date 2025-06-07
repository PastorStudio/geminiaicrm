import React from 'react';
import { useToast } from '@/hooks/use-toast';

// Declarar el tipo de notifyModelChange para TypeScript
declare global {
  interface Window {
    notifyModelChange?: (oldModel: string, newModel: string) => void;
  }
}

/**
 * Componente que implementa la notificación de cambio de modelo
 */
export const ModelNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();

  React.useEffect(() => {
    // Implementar la función global para notificar cambios de modelo
    window.notifyModelChange = (oldModel, newModel) => {
      // Determinar si estamos degradando o mejorando
      const isDowngrade = oldModel.includes('1.5') && !newModel.includes('1.5');
      
      toast({
        title: isDowngrade 
          ? "Degradación automática de modelo" 
          : "Cambio automático de modelo",
        description: isDowngrade 
          ? `Debido a límites de cuota, el sistema ha cambiado de ${oldModel} a ${newModel}. Las respuestas podrían ser diferentes.` 
          : `El sistema ha cambiado automáticamente de ${oldModel} a ${newModel}.`,
        duration: 5000,
      });
    };

    // Limpiar el efecto
    return () => {
      window.notifyModelChange = undefined;
    };
  }, [toast]);

  return <>{children}</>;
};

/**
 * Hook para mostrar una notificación sobre el modelo actual de Gemini
 */
export function useModelNotification() {
  const { toast } = useToast();

  const showCurrentModel = (modelName: string) => {
    const isAdvanced = modelName.includes('1.5');
    
    toast({
      title: `Usando ${modelName}`,
      description: isAdvanced 
        ? "Estás utilizando la versión más avanzada de Gemini." 
        : "Estás utilizando la versión estándar de Gemini.",
      duration: 3000,
    });
  };

  return { showCurrentModel };
}
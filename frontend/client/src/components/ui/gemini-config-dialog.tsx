import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { chatContext, type ChatConfig } from '@/lib/chatContext';

interface GeminiConfigDialogProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GeminiConfigDialog({ chatId, isOpen, onClose }: GeminiConfigDialogProps) {
  const [config, setConfig] = useState<ChatConfig>({
    customPrompt: '',
    systemRole: 'asistente',
    temperature: 0.7,
    modelName: 'gemini-1.5-pro'
  });

  // Cargar la configuración actual cuando se abre el diálogo
  useEffect(() => {
    if (isOpen && chatId) {
      const currentConfig = chatContext.getConversation(chatId).config;
      setConfig(currentConfig);
    }
  }, [isOpen, chatId]);

  // Manejar cambios en el formulario
  const handleChange = (field: keyof ChatConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Guardar la configuración
  const handleSave = () => {
    if (chatId) {
      chatContext.updateConfig(chatId, config);
      onClose();
    }
  };

  // Restaurar configuración predeterminada
  const handleReset = () => {
    setConfig({
      customPrompt: '',
      systemRole: 'asistente',
      temperature: 0.7,
      modelName: 'gemini-1.5-pro'
    });
  };

  // Borrar historial de conversación
  const handleClearHistory = () => {
    if (chatId && confirm('¿Estás seguro de que deseas borrar todo el historial de esta conversación?')) {
      chatContext.clearHistory(chatId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Configuración de Gemini AI</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="model" className="text-right">
              Modelo
            </Label>
            <Select
              value={config.modelName}
              onValueChange={(value) => handleChange('modelName', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecciona un modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="temperature" className="text-right">
              Temperatura
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-sm">{config.temperature}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="prompt" className="text-right pt-2">
              Prompt personalizado
            </Label>
            <Textarea
              id="prompt"
              value={config.customPrompt || ''}
              onChange={(e) => handleChange('customPrompt', e.target.value)}
              placeholder="Eres un asistente de atención al cliente profesional y útil..."
              className="col-span-3 h-32"
            />
          </div>

          <div className="col-span-4 mt-4">
            <details className="text-sm text-gray-500">
              <summary className="cursor-pointer font-medium">Ejemplos de prompts</summary>
              <div className="mt-2 space-y-2 p-2 bg-gray-50 rounded-md">
                <div>
                  <h4 className="font-medium">Atención al cliente:</h4>
                  <p className="text-xs">Eres un asistente de atención al cliente profesional. Tu trabajo es responder a las consultas de manera concisa, empatizar con el cliente, ofrecer soluciones eficaces, y seguir las políticas de la empresa.</p>
                </div>
                <div>
                  <h4 className="font-medium">Ventas:</h4>
                  <p className="text-xs">Eres un vendedor experto. Tu objetivo es entender las necesidades del cliente, destacar las características y beneficios de nuestros productos, manejar objeciones y cerrar ventas de manera efectiva.</p>
                </div>
                <div>
                  <h4 className="font-medium">Soporte técnico:</h4>
                  <p className="text-xs">Eres un especialista de soporte técnico. Tu función es diagnosticar problemas técnicos, proporcionar soluciones paso a paso, y explicar conceptos técnicos de manera sencilla para el usuario.</p>
                </div>
              </div>
            </details>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div>
            <Button 
              variant="outline" 
              onClick={handleClearHistory}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              Borrar historial
            </Button>
            <Button variant="outline" onClick={handleReset} className="ml-2">
              Restaurar predeterminados
            </Button>
          </div>
          <div>
            <Button variant="outline" onClick={onClose} className="mr-2">
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
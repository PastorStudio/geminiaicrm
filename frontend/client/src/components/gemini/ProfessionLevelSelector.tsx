import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ProfessionLevelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ProfessionLevelSelector({ value, onChange }: ProfessionLevelSelectorProps) {
  const handleChange = (newValue: string) => {
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="profession-level" className="font-medium">
          Nivel de Profesionalidad
        </Label>
      </div>
      <RadioGroup 
        value={value} 
        onValueChange={handleChange}
        className="flex flex-col space-y-1"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="casual" id="casual" />
          <Label htmlFor="casual" className="font-normal">Casual</Label>
          <span className="text-xs text-muted-foreground ml-auto">Amigable, informal</span>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="professional" id="professional" />
          <Label htmlFor="professional" className="font-normal">Profesional</Label>
          <span className="text-xs text-muted-foreground ml-auto">Formal, respetuoso</span>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="technical" id="technical" />
          <Label htmlFor="technical" className="font-normal">Técnico</Label>
          <span className="text-xs text-muted-foreground ml-auto">Preciso, detallado</span>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="executive" id="executive" />
          <Label htmlFor="executive" className="font-normal">Ejecutivo</Label>
          <span className="text-xs text-muted-foreground ml-auto">Conciso, decisivo</span>
        </div>
      </RadioGroup>
    </div>
  );
}

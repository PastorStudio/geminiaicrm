import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle } from "lucide-react";
import { Link } from "wouter";

interface Template {
  id: number;
  name: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface TemplateSelectorProps {
  value?: number;
  onChange?: (template: Template | null) => void;
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    value ? value.toString() : ""
  );

  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["/api/message-templates"],
  });

  useEffect(() => {
    if (value) {
      setSelectedTemplateId(value.toString());
    }
  }, [value]);

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    
    if (!templates) return;
    
    const selectedTemplate = templates.find(
      (template) => template.id.toString() === id
    );
    
    if (onChange) {
      onChange(selectedTemplate || null);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium leading-none">
          Plantilla de mensaje
        </label>
        <Link href="/message-templates">
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <PlusCircle className="h-4 w-4" />
            <span className="text-xs">Gestionar</span>
          </Button>
        </Link>
      </div>
      
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <Select
          value={selectedTemplateId}
          onValueChange={handleTemplateChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar una plantilla" />
          </SelectTrigger>
          <SelectContent>
            {templates && templates.length > 0 ? (
              templates.map((template) => (
                <SelectItem
                  key={template.id}
                  value={template.id.toString()}
                >
                  {template.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="empty" disabled>
                No hay plantillas disponibles
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export default TemplateSelector;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

interface Template {
  id: number;
  name: string;
  content: string;
  category?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface TemplatePreviewProps {
  template: Template | null;
  contactData?: Record<string, any>;
}

export function TemplatePreview({ template, contactData }: TemplatePreviewProps) {
  if (!template) {
    return (
      <Card className="w-full mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Vista previa
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-400 italic">
          Selecciona una plantilla para ver la vista previa
        </CardContent>
      </Card>
    );
  }

  // Función para reemplazar variables en la plantilla
  const parseTemplate = (content: string, data?: Record<string, any>) => {
    if (!data) return content;

    return content.replace(/{{([^{}]+)}}/g, (match, key) => {
      const trimmedKey = key.trim();
      return data[trimmedKey] || match;
    });
  };

  const parsedContent = parseTemplate(template.content, contactData);

  return (
    <Card className="w-full mt-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {template.name}
          </CardTitle>
          {template.category && (
            <Badge variant="outline" className="text-xs">
              {template.category}
            </Badge>
          )}
        </div>
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {template.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="bg-primary-50 p-4 rounded-md whitespace-pre-wrap">
          {parsedContent}
        </div>
      </CardContent>
    </Card>
  );
}

export default TemplatePreview;
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChatCategorizerProps {
  results: {
    categories: {
      category: string;
      probability: number;
    }[];
  };
}

// Colores personalizados para diferentes categorías
const categoryColors: Record<string, string> = {
  "ventas": "bg-blue-600",
  "soporte": "bg-green-600",
  "consulta": "bg-yellow-600",
  "queja": "bg-red-600",
  "información": "bg-purple-600",
  "seguimiento": "bg-indigo-600",
  "cancelación": "bg-orange-600",
  "default": "bg-gray-600"
};

export default function ChatCategorizer({ results }: ChatCategorizerProps) {
  const { categories = [] } = results || {};

  // Ordenar las categorías por probabilidad de mayor a menor
  const sortedCategories = [...categories].sort((a, b) => b.probability - a.probability);

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-0">
        <div className="space-y-4">
          {sortedCategories.length > 0 ? (
            sortedCategories.map((category, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{category.category}</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(category.probability * 100)}%
                  </span>
                </div>
                <Progress 
                  value={category.probability * 100} 
                  className={`h-2 ${categoryColors[category.category.toLowerCase()] || categoryColors.default}`}
                />
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground p-4">
              No se detectaron categorías
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

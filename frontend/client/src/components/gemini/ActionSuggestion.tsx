import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionSuggestionProps {
  suggestions: {
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
  }[];
}

export default function ActionSuggestion({ suggestions }: ActionSuggestionProps) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "medium":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "low":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-amber-500";
      case "low":
        return "border-l-green-500";
      default:
        return "border-l-gray-300";
    }
  };

  return (
    <div className="space-y-4">
      {suggestions.length > 0 ? (
        suggestions.map((suggestion, index) => (
          <Card 
            key={index} 
            className={`p-4 border-l-4 ${getPriorityClass(suggestion.priority)} shadow-sm`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {getPriorityIcon(suggestion.priority)}
                <div>
                  <h4 className="font-medium text-sm">{suggestion.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {suggestion.description}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))
      ) : (
        <div className="text-center text-muted-foreground p-4">
          No hay sugerencias disponibles
        </div>
      )}
    </div>
  );
}

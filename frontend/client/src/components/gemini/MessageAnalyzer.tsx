import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface MessageAnalyzerProps {
  results: {
    intent?: string;
    sentiment?: {
      score: number;
      label: string;
    };
    urgency?: {
      score: number;
      label: string;
    };
    entities?: {
      name: string;
      type: string;
      relevance?: number;
    }[];
    topics?: {
      topic: string;
      confidence: number;
    }[];
  };
}

const sentimentColors = {
  positive: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200",
  neutral: "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200",
  negative: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200"
};

const urgencyColors = {
  high: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200",
  low: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200"
};

const entityColors: Record<string, string> = {
  person: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200",
  organization: "bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200",
  location: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200",
  date: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200",
  product: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-200",
  quantity: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200",
  default: "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200"
};

export default function MessageAnalyzer({ results }: MessageAnalyzerProps) {
  const {
    intent,
    sentiment = { score: 0, label: "neutral" },
    urgency = { score: 0, label: "low" },
    entities = [],
    topics = []
  } = results || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Intención</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <p className="font-medium">{intent || "No detectada"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Sentimiento</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex items-center justify-between mb-1">
              <Badge variant="outline" className={sentimentColors[sentiment.label as keyof typeof sentimentColors] || sentimentColors.neutral}>
                {sentiment.label.charAt(0).toUpperCase() + sentiment.label.slice(1)}
              </Badge>
              <span className="text-xs font-medium">{Math.round(sentiment.score * 100)}%</span>
            </div>
            <Progress value={sentiment.score * 100} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Urgencia</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className={urgencyColors[urgency.label as keyof typeof urgencyColors] || urgencyColors.low}>
              {urgency.label.charAt(0).toUpperCase() + urgency.label.slice(1)}
            </Badge>
            <span className="text-xs font-medium">{Math.round(urgency.score * 100)}%</span>
          </div>
          <Progress value={urgency.score * 100} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Entidades</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-2">
            {entities.length > 0 ? entities.map((entity, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className={entityColors[entity.type.toLowerCase()] || entityColors.default}
              >
                {entity.name}
                {entity.type && <span className="ml-1 opacity-70">({entity.type})</span>}
              </Badge>
            )) : 
            <p className="text-muted-foreground">No se detectaron entidades</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Temas</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="space-y-3">
            {topics.length > 0 ? topics.map((topic, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <p className="text-sm font-medium">{topic.topic}</p>
                  <span className="text-xs font-medium">{Math.round(topic.confidence * 100)}%</span>
                </div>
                <Progress value={topic.confidence * 100} className="h-2" />
              </div>
            )) : 
            <p className="text-muted-foreground">No se detectaron temas</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

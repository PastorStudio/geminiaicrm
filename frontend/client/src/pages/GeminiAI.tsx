import { GeminiAIPanel } from "@/components/GeminiAIPanel";

export default function GeminiAI() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gemini AI</h1>
        <p className="text-muted-foreground">
          Organización inteligente de leads, clasificación de tickets y optimización del pipeline de ventas
        </p>
      </div>
      <GeminiAIPanel />
    </div>
  );
}
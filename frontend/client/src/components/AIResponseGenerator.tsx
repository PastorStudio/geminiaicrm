import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AIResponseGeneratorProps {
  chatId: string;
  messages: any[];
  onResponseGenerated: (response: string) => void;
}

export function AIResponseGenerator({ chatId, messages, onResponseGenerated }: AIResponseGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateAIResponse = async () => {
    setIsGenerating(true);
    
    try {
      // Get the last user message
      const lastUserMessage = messages.filter(msg => !msg.fromMe).pop();
      if (!lastUserMessage) {
        toast({
          title: "No user message found",
          description: "Cannot generate response without a user message",
          variant: "destructive"
        });
        return;
      }

      // Format conversation history
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.fromMe ? 'assistant' : 'user',
        content: msg.body || msg.text || '',
        timestamp: new Date(msg.timestamp * 1000)
      }));

      // Get AI configuration
      const configResponse = await apiRequest("GET", "/api/settings/ai-config");
      const config = await configResponse.json();

      // Generate response
      const response = await apiRequest("POST", "/api/ai/generate-response", {
        chatId,
        provider: config.config?.aiProvider || 'gemini',
        userMessage: lastUserMessage.body || lastUserMessage.text,
        conversationHistory
      });

      const result = await response.json();

      if (result.success) {
        onResponseGenerated(result.response);
        toast({
          title: "Response generated",
          description: `AI response generated using ${result.provider}`
        });
      } else {
        throw new Error(result.error || 'Failed to generate response');
      }

    } catch (error) {
      console.error('Error generating AI response:', error);
      toast({
        title: "Error generating response",
        description: error instanceof Error ? error.message : "Failed to generate AI response",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generateAIResponse}
      disabled={isGenerating}
      variant="outline"
      size="sm"
      className="border-green-600 text-green-600 hover:bg-green-50"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Bot className="h-4 w-4 mr-2" />
      )}
      Generate AI Response
    </Button>
  );
}
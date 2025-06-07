import { useState, useRef, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGemini } from "@/hooks/useGemini";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiAssistantProps {
  open: boolean;
  onClose: () => void;
}

export default function AiAssistant({ open, onClose }: AiAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: "Hello! I'm your Gemini AI assistant. I can help you with lead management, customer insights, creating personalized messages, scheduling, and more. What would you like to do today?" 
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const { sendChatMessage, isLoading } = useGemini();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    // Add user message
    const userMessage: Message = {
      role: "user",
      content: inputValue,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    
    try {
      // Send to Gemini API
      const response = await sendChatMessage(inputValue, messages);
      
      // Add assistant response
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: response.content,
      }]);
    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      
      // Add error message
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
      }]);
    }
  };

  // Handle pressing Enter in the input field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Quick prompt buttons
  const quickPrompts = [
    "Analyze leads",
    "Draft email",
    "Schedule meeting",
    "Generate report"
  ];

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="material-icons text-secondary-600 mr-2">smart_toy</span>
            Gemini AI Assistant
          </DialogTitle>
          <DialogDescription>
            How can I help you today?
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow border border-gray-300 rounded-lg p-4 h-[360px]">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === "user" ? "justify-end" : ""}`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary-100 flex items-center justify-center mr-3">
                    <span className="material-icons text-secondary-600 text-sm">smart_toy</span>
                  </div>
                )}
                
                <div 
                  className={`py-2 px-4 rounded-lg max-w-xs ${
                    message.role === "user" 
                      ? "bg-primary-100 mr-3" 
                      : "bg-gray-100"
                  }`}
                >
                  <p className="text-sm text-gray-800 whitespace-pre-line">{message.content}</p>
                </div>
                
                {message.role === "user" && (
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="material-icons text-gray-600 text-sm">person</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="mt-4">
          <div className="flex rounded-md shadow-sm">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 rounded-r-none"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="rounded-l-none bg-primary-600 hover:bg-primary-700"
            >
              {isLoading ? (
                <span className="material-icons animate-spin">refresh</span>
              ) : (
                <span className="material-icons text-white text-sm">send</span>
              )}
            </Button>
          </div>
        </div>
        
        <div className="mt-2">
          <div className="flex flex-wrap -mx-2">
            {quickPrompts.map((prompt) => (
              <div key={prompt} className="px-2 py-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInputValue(prompt);
                  }}
                  disabled={isLoading}
                >
                  {prompt}
                </Button>
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// src/components/analytics/AnalyticsChat.tsx
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, User, Sparkles, ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "What are the most popular laundry services?",
  "Which branch is handling the most orders?",
  "What's the distribution of order statuses?",
  "Which extra services are most popular?",
  "What trends can you identify from recent orders?",
  "Should we promote premium packages more?",
];

const AnalyticsChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Hello! I'm your Laundry Analytics Assistant. Ask me anything about your recent orders, popular services, revenue trends, or operational insights. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ✅ PDF Download Function
  const downloadPDF = (assistantMessage: Message) => {
    const doc = new jsPDF();

    const messageIndex = messages.findIndex(m => m.id === assistantMessage.id);
    const userMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;

    doc.setFontSize(18);
    doc.text("Laundry Room Inc", 14, 20);

    doc.setFontSize(14);
    doc.text("Analytics Report", 14, 30);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);

    doc.line(14, 42, 196, 42);

    doc.setFontSize(12);
    doc.text("User Question:", 14, 55);

    doc.setFontSize(11);
    const questionText = doc.splitTextToSize(userMessage?.content || "N/A", 180);
    doc.text(questionText, 14, 63);

    let currentY = 63 + questionText.length * 6 + 10;

    doc.setFontSize(12);
    doc.text("AI Insights:", 14, currentY);

    doc.setFontSize(11);
    const responseText = doc.splitTextToSize(assistantMessage.content, 180);
    doc.text(responseText, 14, currentY + 8);

    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Powered by Laundry Room AI", 14, 285);

    doc.save(`Laundry-Analytics-${Date.now()}.pdf`);
  };

  const handleSendMessage = async (question?: string) => {
    const messageText = question || input.trim();
    if (!messageText || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL;

      const response = await fetch(`${apiBaseUrl}/analytics-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: messageText }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from analytics agent");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "I couldn't generate a response.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Analytics query error:", error);
      toast.error("Failed to get response.");

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Analytics Assistant
          </h1>
          <p className="text-muted-foreground">
            AI-powered insights from your laundry business data
          </p>
        </div>
      </div>

      {/* Chat Container */}
      <Card className="bg-card border rounded-xl overflow-hidden shadow-lg">
        <div className="h-[calc(100vh-280px)] flex flex-col">
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>

                    <div
                      className={`text-xs mt-2 flex items-center justify-between ${
                        message.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span>
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {/* ✅ Show download ONLY for real assistant answers */}
                      {message.role === "assistant" &&
                        message.id !== "welcome" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => downloadPDF(message)}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                        )}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-5 h-5 text-secondary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Analyzing your data...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggested Questions */}
          {messages.length === 1 && !loading && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Suggested Questions
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestedQuestion(question)}
                    className="justify-start text-left h-auto py-2 px-3 hover:bg-primary/5"
                  >
                    <span className="text-xs line-clamp-2">{question}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t bg-background p-4">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your orders, services, revenue, trends..."
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                size="icon"
                className="bg-gradient-to-r from-primary to-accent"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </p>
              <Badge variant="secondary" className="text-xs">
                <Bot className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsChat;

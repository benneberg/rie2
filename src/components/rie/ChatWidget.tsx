import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, X, Minimize2, Loader2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { chatService } from '@/lib/chat';
import { Message } from '../../../worker/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);
  const loadHistory = async () => {
    const response = await chatService.getMessages();
    if (response.success && response.data) {
      setMessages(response.data.messages || []);
    }
  };
  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    let fullText = '';
    const response = await chatService.sendMessage(userMsg.content, undefined, (chunk) => {
      fullText += chunk;
    });
    if (response.success) {
      await loadHistory();
    }
    setIsTyping(false);
  };
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-[380px] sm:w-[420px]"
          >
            <Card className="shadow-brutal-dark border-primary/20 glass overflow-hidden flex flex-col h-[600px]">
              <CardHeader className="p-4 bg-primary text-primary-foreground flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-black/10">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-xs font-display font-black uppercase tracking-widest">ArchLens_AI</CardTitle>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest opacity-80">Sync_Active</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-black/10" onClick={() => setIsOpen(false)}>
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col">
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                    {messages.map((msg) => (
                      <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                          msg.role === 'user' ? "bg-primary border-primary/20" : "bg-black/40 border-white/10"
                        )}>
                          {msg.role === 'user' ? <User className="w-4 h-4 text-primary-foreground" /> : <Bot className="w-4 h-4 text-primary" />}
                        </div>
                        <div className={cn(
                          "max-w-[85%] p-4 rounded-xl text-xs font-mono tracking-tight leading-relaxed border shadow-sm",
                          msg.role === 'user' 
                            ? "bg-primary text-primary-foreground border-primary/20" 
                            : "bg-white/5 border-white/5 text-foreground/90"
                        )}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-3">
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                          <span className="text-[10px] font-mono uppercase tracking-widest opacity-60">Mapping_Repo...</span>
                        </div>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="p-4 border-t border-white/5 bg-black/20">
                <form className="flex w-full items-center gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="QUERY REPOSITORY ARCHITECTURE..."
                    className="flex-1 bg-black/40 border-white/10 font-mono text-[10px] tracking-widest focus-visible:ring-primary/50"
                    disabled={isTyping}
                  />
                  <Button size="icon" type="submit" disabled={!input.trim() || isTyping} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      <Button
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-full h-14 w-14 shadow-brutal-amber transition-all duration-300 hover:scale-110 active:translate-x-1 active:translate-y-1 active:shadow-none",
          isOpen ? "bg-red-500 hover:bg-red-600 rotate-90" : "bg-primary"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>
    </div>
  );
}
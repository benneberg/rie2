import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JSZip from 'jszip';
import { FileText, Download, Sparkles, Loader2, ChevronLeft, Save, CheckCircle2, Terminal as TerminalIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { chatService } from '@/lib/chat';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
export function DocumentationStudio() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [activeDoc, setActiveDoc] = useState<string>('README.md');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success'}[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    fetchDocs();
  }, [sessionId, navigate]);
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);
  const addLog = (msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
    setLogs(prev => [...prev, { msg, type }]);
  };
  const fetchDocs = async () => {
    try {
      const response = await chatService.getMessages();
      if (response.success && response.data?.metadata?.documentation) {
        setDocs(response.data.metadata.documentation);
      }
    } catch (err) {
      toast.error('Failed to load documentation');
    } finally {
      setIsLoading(false);
    }
  };
  const generateDoc = async (docType: string) => {
    setIsGenerating(true);
    setShowTerminal(true);
    addLog(`rie: initializing synthesis for ${docType}...`, 'info');
    addLog(`rie: loading context from session ${sessionId?.slice(0, 8)}`, 'info');
    const toastId = toast.loading(`Synthesizing ${docType}...`);
    try {
      addLog(`rie: running documentation-plugin-v1...`, 'info');
      const response = await fetch(`/api/chat/${sessionId}/generate-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: docType })
      });
      const result = await response.json();
      if (result.success) {
        setDocs(prev => ({ ...prev, [docType]: result.content }));
        setActiveDoc(docType);
        addLog(`rie: artifact ${docType} successfully generated.`, 'success');
        toast.success(`${docType} generated!`, { id: toastId });
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      addLog(`rie: FATAL ERROR: ${(err as Error).message}`, 'warn');
      toast.error('Synthesis failed: ' + (err as Error).message, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };
  const handleExportZip = async () => {
    if (Object.keys(docs).length === 0) return;
    setIsExporting(true);
    addLog(`rie: bundling artifacts into ZIP archive...`, 'info');
    const zip = new JSZip();
    const folder = zip.folder("archlens-docs");
    Object.entries(docs).forEach(([filename, content]) => {
      folder?.file(filename, content);
    });
    try {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `archlens-docs.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      addLog(`rie: bundle export completed.`, 'success');
      toast.success('Bundle exported!');
    } catch (err) {
      addLog(`rie: export failed.`, 'warn');
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[600px] col-span-1" />
          <Skeleton className="h-[600px] col-span-2" />
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12 space-y-8 flex flex-col min-h-screen">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard?session=${sessionId}`)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Doc Studio</h1>
              <p className="text-muted-foreground">Architectural Documentation Synthesis</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowTerminal(!showTerminal)}>
              <TerminalIcon className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={handleExportZip} disabled={isExporting || Object.keys(docs).length === 0}>
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export ZIP
            </Button>
            <Button variant="default" className="bg-primary shadow-soft">
              <Save className="w-4 h-4 mr-2" /> Save to Cloud
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1">
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card/40 backdrop-blur-md border-border">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Artifacts</h3>
                <div className="space-y-2">
                  {['README.md', 'ARCHITECTURE.md', 'SECURITY.md', 'CONTRIBUTING.md'].map(doc => (
                    <button
                      key={doc}
                      onClick={() => setActiveDoc(doc)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all ${
                        activeDoc === doc
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-secondary/40 hover:bg-secondary/70 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium">{doc}</span>
                      </div>
                      {docs[doc] ? (
                        <CheckCircle2 className={`w-3.5 h-3.5 ${activeDoc === doc ? 'text-primary-foreground' : 'text-emerald-500'}`} />
                      ) : (
                        <Sparkles
                          className={`w-3.5 h-3.5 opacity-50 cursor-pointer hover:opacity-100 transition-opacity ${isGenerating ? 'animate-pulse' : ''}`}
                          onClick={(e) => { e.stopPropagation(); generateDoc(doc); }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-3 flex flex-col gap-4">
            <Card className="flex-1 min-h-[500px] flex flex-col bg-card/40 backdrop-blur-md border-border overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                   <div className="flex gap-1.5 mr-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                     <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                     <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                   </div>
                   <span className="font-mono text-xs font-semibold text-muted-foreground">{activeDoc}</span>
                </div>
              </div>
              <ScrollArea className="flex-1 p-8">
                {docs[activeDoc] ? (
                  <article className="prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{docs[activeDoc]}</ReactMarkdown>
                  </article>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-6">
                    <div className="p-8 rounded-full bg-primary/5 border border-primary/10 shadow-glow">
                      <Sparkles className="w-12 h-12 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tight">Ready for AI Synthesis</h3>
                      <p className="text-muted-foreground max-w-xs mx-auto text-sm">
                        Initialize technical drafting for {activeDoc}.
                      </p>
                    </div>
                    <Button onClick={() => generateDoc(activeDoc)} disabled={isGenerating}>
                      Initialize {activeDoc} Draft
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </Card>
            <AnimatePresence>
              {showTerminal && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 200, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-zinc-950 rounded-xl border border-white/10 overflow-hidden flex flex-col shadow-2xl"
                >
                  <div className="bg-zinc-900 px-4 py-2 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-zinc-500 tracking-widest uppercase">
                      <TerminalIcon className="w-3 h-3" /> RIE-CORE CLI v4.0.1
                    </div>
                    <Button variant="ghost" size="icon" className="h-4 w-4 text-zinc-500" onClick={() => setShowTerminal(false)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div ref={terminalRef} className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    {logs.map((log, i) => (
                      <div key={i} className={log.type === 'success' ? 'text-emerald-400' : log.type === 'warn' ? 'text-amber-400' : 'text-zinc-400'}>
                        <span className="opacity-30 mr-2">$</span>
                        {log.msg}
                      </div>
                    ))}
                    {isGenerating && (
                      <div className="text-indigo-400 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        rie: synthesizing...
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
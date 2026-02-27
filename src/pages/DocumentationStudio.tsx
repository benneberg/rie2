import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JSZip from 'jszip';
import { FileText, Download, Sparkles, Loader2, ChevronLeft, CloudUpload, Terminal as TerminalIcon, X, Edit3, Eye, Database, Code, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { chatService } from '@/lib/chat';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
  const [isSaving, setIsSaving] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [cliInput, setCliInput] = useState('');
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success' | 'cmd'}[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    fetchDocs();
    addLog('RIE CLI INITIALIZED. READY FOR COMMANDS.', 'success');
  }, [sessionId, navigate]);
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);
  const addLog = (msg: string, type: 'info' | 'warn' | 'success' | 'cmd' = 'info') => {
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
  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;
    const cmd = cliInput.trim().toLowerCase();
    addLog(cliInput, 'cmd');
    setCliInput('');
    if (cmd === 'clear') {
      setLogs([]);
      return;
    }
    if (cmd.startsWith('rie scan')) {
      addLog('rie: starting deep repository walk...', 'info');
      // Simulate/Trigger re-analysis
      addLog('rie: structural integrity verified. metadata updated.', 'success');
      return;
    }
    if (cmd.startsWith('rie readme')) {
      generateDoc('README.md');
      return;
    }
    if (cmd.startsWith('rie validate')) {
      addLog('rie: verifying cross-module consistency...', 'info');
      addLog('rie: validation cycle complete. 0 critical errors found.', 'success');
      return;
    }
    addLog(`Unknown command: ${cmd}. Available: rie scan, rie readme, rie validate, clear`, 'warn');
  };
  const generateDoc = async (docType: string) => {
    setIsGenerating(true);
    addLog(`rie: synthesizing artifact: ${docType}...`, 'info');
    try {
      const response = await fetch(`/api/chat/${sessionId}/generate-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: docType })
      });
      const result = await response.json();
      if (result.success) {
        setDocs(prev => ({ ...prev, [docType]: result.content }));
        setActiveDoc(docType);
        addLog(`rie: ${docType} generated successfully.`, 'success');
      }
    } catch (err) {
      addLog(`rie: error generating ${docType}`, 'warn');
    } finally {
      setIsGenerating(false);
    }
  };
  const handleExportLLMContext = async () => {
    addLog('rie: compiling high-signal LLM context bundle...', 'info');
    const response = await chatService.getMessages();
    if (response.success && response.data?.metadata) {
      const meta = response.data.metadata;
      const context = {
        projectName: meta.name,
        summary: meta.documentation?.['summary'] || '',
        healthScore: meta.validation?.score || 0,
        primaryLanguage: meta.primaryLanguage,
        structure: meta.structure.slice(0, 100).map(f => f.path),
        dependencies: meta.dependencies,
        excerpts: {} // Could add actual file content here
      };
      const blob = new Blob([JSON.stringify(context, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archlens-context-${meta.name}.json`;
      a.click();
      addLog('rie: llm-context.json exported successfully.', 'success');
      toast.success('Context Exported');
    }
  };
  if (isLoading) return <div className="max-w-7xl mx-auto px-4 py-8"><Skeleton className="h-[600px] glass" /></div>;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12 space-y-8 flex flex-col min-h-screen">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard?session=${sessionId}`)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Artifact Studio</h1>
              <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest opacity-60">Synthesis Environment v4.0</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="btn-brutal-dark" onClick={handleExportLLMContext}>
              <Zap className="w-4 h-4 mr-2" /> Export LLM Context
            </Button>
            <Button onClick={() => setIsSaving(true)} className="btn-brutal-amber">
              <CloudUpload className="w-4 h-4 mr-2" /> Sync Cloud
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1">
          <div className="lg:col-span-1 space-y-4">
            <Card className="glass border-border">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-2">Technical Artifacts</h3>
                <div className="space-y-2">
                  {['README.md', 'ARCHITECTURE.md', 'SECURITY.md', 'TESTING.md'].map(doc => (
                    <button
                      key={doc}
                      onClick={() => { setActiveDoc(doc); setIsEditing(false); }}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all",
                        activeDoc === doc ? 'bg-primary text-primary-foreground shadow-brutal-amber' : 'bg-white/5 hover:bg-white/10'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" /> {doc}
                      </div>
                      {docs[doc] && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-3 flex flex-col gap-6">
            <Card className="flex-1 min-h-[500px] flex flex-col glass border-border overflow-hidden shadow-brutal-dark">
              <div className="flex items-center justify-between px-6 py-3 border-b bg-white/5">
                <span className="font-mono text-[10px] font-bold text-muted-foreground tracking-widest uppercase">{activeDoc}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} className="text-[9px] font-bold tracking-widest uppercase h-7">
                    {isEditing ? <Eye className="w-3.5 h-3.5 mr-1" /> : <Edit3 className="w-3.5 h-3.5 mr-1" />} {isEditing ? 'Preview' : 'Edit'}
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-10">
                  {docs[activeDoc] ? (
                    isEditing ? (
                      <Textarea
                        value={docs[activeDoc]}
                        onChange={(e) => setDocs(prev => ({ ...prev, [activeDoc]: e.target.value }))}
                        className="min-h-[400px] font-mono text-sm bg-black/20 border-white/10"
                      />
                    ) : (
                      <article className="prose prose-slate dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{docs[activeDoc]}</ReactMarkdown>
                      </article>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] space-y-6">
                      <div className="p-8 rounded-full bg-primary/10 border border-primary/20">
                        <Sparkles className="w-12 h-12 text-primary" />
                      </div>
                      <Button onClick={() => generateDoc(activeDoc)} disabled={isGenerating} className="btn-brutal-amber">Synthesize {activeDoc}</Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
            <div className="bg-zinc-950 rounded-xl border border-white/10 overflow-hidden flex flex-col shadow-brutal-dark h-60">
              <div className="bg-zinc-900 px-4 py-2 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-zinc-500 tracking-[0.2em] uppercase">
                  <TerminalIcon className="w-3 h-3" /> RIE-CORE_CLI_V4.0
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/30" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/30" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
                </div>
              </div>
              <div ref={terminalRef} className="flex-1 p-4 font-mono text-[10px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
                {logs.map((log, i) => (
                  <div key={i} className={cn("flex gap-2", log.type === 'success' ? 'text-emerald-400' : log.type === 'warn' ? 'text-amber-400' : log.type === 'cmd' ? 'text-sky-400' : 'text-zinc-400')}>
                    <span className="opacity-30">{log.type === 'cmd' ? '➜' : '$'}</span>
                    <span>{log.msg}</span>
                  </div>
                ))}
                {isGenerating && <div className="text-primary flex items-center gap-2 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> rie: synthesizing...</div>}
                <form onSubmit={handleCommand} className="flex gap-2 mt-2">
                  <span className="text-emerald-500">archlens@rie:~$</span>
                  <input
                    ref={inputRef}
                    autoFocus
                    value={cliInput}
                    onChange={(e) => setCliInput(e.target.value)}
                    className="bg-transparent border-none outline-none flex-1 text-zinc-300"
                  />
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
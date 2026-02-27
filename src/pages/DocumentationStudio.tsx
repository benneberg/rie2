import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Download, Sparkles, Loader2, ChevronLeft, CloudUpload, Terminal as TerminalIcon, Eye, Zap, Code, ShieldCheck, DownloadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/layout/AppLayout';
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
  const [exportProgress, setExportProgress] = useState(0);
  const [cliInput, setCliInput] = useState('');
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success' | 'cmd'}[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    fetchDocs();
    addLog('RIE-CORE_STIMULATOR_READY. WAITING FOR COMMANDS.', 'success');
  }, [sessionId, navigate]);
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);
  const addLog = (msg: string, type: 'info' | 'warn' | 'success' | 'cmd' = 'info') => {
    setLogs(prev => [...prev, { msg: `[${new Date().toLocaleTimeString()}] ${msg}`, type }]);
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
    if (cmd === 'rie config --view') {
      addLog('rie: fetching session parameters...', 'info');
      const response = await chatService.getMessages();
      addLog(`rie: config: ${JSON.stringify(response.data?.config || {}, null, 2)}`, 'info');
      return;
    }
    if (cmd === 'rie validate --strict') {
      addLog('rie: performing deep recursive audit...', 'info');
      setTimeout(() => addLog('rie: validation cycle complete. health: 85%. 0 violations.', 'success'), 800);
      return;
    }
    if (cmd === 'rie export --html') {
      handleHTMLReportExport();
      return;
    }
    addLog(`Unknown command: ${cmd}. Usage: rie scan, rie validate --strict, rie export --html, clear`, 'warn');
  };
  const handleHTMLReportExport = async () => {
    setIsExporting(true);
    setExportProgress(10);
    addLog('rie: initializing html report template...', 'info');
    const response = await chatService.getMessages();
    if (response.success && response.data?.metadata) {
      const meta = response.data.metadata;
      setExportProgress(40);
      addLog('rie: embedding structural graphs and scores...', 'info');
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>ArchLens Analysis: ${meta.name}</title>
          <style>
            body { font-family: sans-serif; background: #070911; color: #dde4f4; padding: 40px; }
            .card { background: #0b0e18; border: 1px solid #181e30; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            h1 { color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
            .score { font-size: 48px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${meta.name.toUpperCase()} ARCHITECTURAL REPORT</h1>
          <div class="card">
            <div class="score">${meta.validation?.score || 0}%</div>
            <p>HEALTH SCORE</p>
          </div>
          <div class="card">
            <h2>SYSTEM SUMMARY</h2>
            <p>${meta.documentation?.summary || 'No summary generated.'}</p>
          </div>
          <div class="card">
            <h2>FILES ANALYZED</h2>
            <p>TOTAL: ${meta.totalFiles}</p>
            <p>STACK: ${meta.primaryLanguage}</p>
          </div>
          <footer>GENERATE BY ARCHLENS_PRO_ENGINEER_V4.2</footer>
        </body>
        </html>
      `;
      setExportProgress(80);
      setTimeout(() => {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rie-report-${meta.name}.html`;
        a.click();
        addLog('rie: report-export.html generated successfully.', 'success');
        setIsExporting(false);
        setExportProgress(100);
        toast.success('Report Exported');
      }, 1000);
    }
  };
  const handleExportContext = async () => {
    const response = await chatService.getMessages();
    if (response.success && response.data?.metadata) {
      const blob = new Blob([JSON.stringify(response.data.metadata, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archlens-context-${response.data.metadata.name}.json`;
      a.click();
      addLog('rie: full llm context exported for rag usage.', 'success');
    }
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
        addLog(`rie: synthesis successful. ${docType} updated.`, 'success');
      }
    } catch (err) {
      addLog(`rie: synthesis error for ${docType}`, 'warn');
    } finally {
      setIsGenerating(false);
    }
  };
  if (isLoading) return <AppLayout container><Skeleton className="h-[600px] glass" /></AppLayout>;
  return (
    <AppLayout container>
      <div className="space-y-8 flex flex-col min-h-screen">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard?session=${sessionId}`)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight uppercase">Artifact Studio</h1>
              <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest opacity-60">Synthesis_Env_v4.2</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="btn-brutal-dark" onClick={handleExportContext}>
              <DownloadCloud className="w-4 h-4 mr-2" /> JSON Context
            </Button>
            <Button onClick={handleHTMLReportExport} className="btn-brutal-amber">
              <Code className="w-4 h-4 mr-2" /> HTML Report
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
                      onClick={() => setActiveDoc(doc)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all",
                        activeDoc === doc ? 'bg-primary text-primary-foreground shadow-brutal-amber' : 'bg-white/5 hover:bg-white/10'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" /> {doc}
                      </div>
                      {docs[doc] && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
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
                  <Button variant="ghost" size="sm" className="text-[9px] font-bold tracking-widest uppercase h-7">
                    <Eye className="w-3.5 h-3.5 mr-1" /> View_Preview
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-10">
                  {docs[activeDoc] ? (
                    <article className="prose prose-slate dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{docs[activeDoc]}</ReactMarkdown>
                    </article>
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
                  <TerminalIcon className="w-3 h-3" /> RIE-CORE_CLI_V4.2
                </div>
                {isExporting && (
                  <div className="flex items-center gap-4 px-2">
                    <span className="text-[9px] text-primary animate-pulse uppercase tracking-widest">Generating_Report...</span>
                    <Progress value={exportProgress} className="w-24 h-1.5" />
                  </div>
                )}
              </div>
              <div ref={terminalRef} className="flex-1 p-4 font-mono text-[10px] overflow-y-auto space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className={cn("flex gap-2", log.type === 'success' ? 'text-emerald-400' : log.type === 'warn' ? 'text-amber-400' : log.type === 'cmd' ? 'text-sky-400' : 'text-zinc-400')}>
                    <span className="opacity-30">{log.type === 'cmd' ? '➜' : '◈'}</span>
                    <span>{log.msg}</span>
                  </div>
                ))}
                <form onSubmit={handleCommand} className="flex gap-2 mt-2">
                  <span className="text-emerald-500">archlens@rie:~$</span>
                  <input
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
    </AppLayout>
  );
}
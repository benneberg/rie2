import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JSZip from 'jszip';
import {
  ChevronLeft, Eye, Zap,
  DownloadCloud, Sparkles, CheckCircle2,
  Circle, Save, Package, Terminal as TerminalIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppLayout } from '@/components/layout/AppLayout';
import { chatService } from '@/lib/chat';
import { toast } from 'sonner';
import { generateV2Spec } from '@/lib/specs-generator';
import { cn } from '@/lib/utils';
export function DocumentationStudio() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [activeDoc, setActiveDoc] = useState<string>('README.md');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cliInput, setCliInput] = useState('');
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success' | 'cmd' | 'error'}[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    fetchDocs();
    addLog('RIE-CORE_STIMULATOR_v2.0 READY. WAITING FOR COMMANDS.', 'success');
  }, [sessionId, navigate]);
  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [logs]);
  const addLog = (msg: string, type: 'info' | 'warn' | 'success' | 'cmd' | 'error' = 'info') => {
    setLogs(prev => [...prev, { msg: `[${new Date().toLocaleTimeString()}] ${msg}`, type }]);
  };
  const fetchDocs = async () => {
    try {
      const response = await chatService.getMessages();
      if (response.success && response.data?.metadata) {
        setDocs(response.data.metadata.documentation || {});
        setMetadata(response.data.metadata);
      }
    } catch (err) {
      toast.error('Failed to load documentation');
    } finally {
      setIsLoading(false);
    }
  };
  const handleDownloadBundle = async () => {
    if (Object.keys(docs).length === 0) {
      toast.error('No documentation artifacts found.');
      return;
    }
    const zip = new JSZip();
    Object.entries(docs).forEach(([name, content]) => {
      zip.file(name, content);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archlens-artifacts-${metadata?.name || 'repo'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('ARTIFACT_BUNDLE_DOWNLOADED');
  };
  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;
    const cmd = cliInput.trim();
    addLog(cmd, 'cmd');
    setCliInput('');
    if (cmd.startsWith('rie compare')) {
      const targetId = cmd.split(' ')[2];
      if (!targetId) { addLog('rie: usage - rie compare <session_id>', 'warn'); return; }
      addLog(`rie: fetching target metadata [${targetId}]...`, 'info');
      try {
        const res = await fetch(`/api/sessions/${targetId}/metadata`);
        const targetData = await res.json();
        if (targetData.success && targetData.metadata) {
          addLog(`rie: delta score: ${metadata.validation.score - targetData.metadata.validation.score}%`, 'info');
        } else throw new Error();
      } catch { addLog('rie: session not found.', 'error'); }
      return;
    }
    if (cmd === 'rie export --spec') {
      addLog('rie: generating v2.0 spec...', 'info');
      if (metadata) { generateV2Spec(metadata); addLog('rie: spec generated.', 'success'); }
      return;
    }
    if (cmd === 'rie export --all') {
      addLog('rie: bundling all artifacts...', 'info');
      await handleDownloadBundle();
      addLog('rie: bundle download initiated.', 'success');
      return;
    }
    if (cmd === 'clear') { setLogs([]); return; }
    addLog(`Unknown command. Usage: rie export --spec, rie export --all, clear`, 'warn');
  };
  const getSynthesisInventory = () => {
    const content = docs[activeDoc] || '';
    const sections = [
      { name: 'Philosophy', regex: /(#|##) (Philosophy|Mission|Purpose)/i },
      { name: 'Roadmap', regex: /(#|##) (Roadmap|Future|TODO)/i },
      { name: 'Architecture', regex: /(#|##) (Architecture|Structure)/i },
      { name: 'Security', regex: /(#|##) (Security|Policy)/i },
    ];
    return sections.map(s => ({ ...s, populated: s.regex.test(content) }));
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
              <h1 className="text-3xl font-bold tracking-tight uppercase">v2.0 Studio</h1>
              <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest opacity-60">Artifact_Synthesis_Module</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadBundle} className="btn-brutal-dark gap-2">
              <Package className="w-4 h-4" /> Download Bundle
            </Button>
            <Button onClick={async () => {
              const res = await chatService.saveDocumentation(docs);
              if (res.success) toast.success('STATE_COMMITTED');
            }} className="btn-brutal-amber h-11">
              <Save className="w-4 h-4 mr-2" /> Commit State
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
          <div className="lg:col-span-3 space-y-4">
            <Card className="glass border-border p-4 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-2">Synthesis Health</h3>
              <div className="space-y-3">
                {getSynthesisInventory().map(section => (
                  <div key={section.name} className="flex items-center justify-between text-[10px] font-mono uppercase tracking-tighter">
                    <span className={cn(section.populated ? "text-foreground" : "text-white/20")}>{section.name}</span>
                    {section.populated ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-white/5" />}
                  </div>
                ))}
              </div>
            </Card>
            <Card className="glass border-border p-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-2 mb-4">Integrity_Index</h3>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-stats">{metadata?.validation?.categories.grounding || 0}%</span>
                <span className="text-[9px] font-bold uppercase text-primary/60">Truth_Conf</span>
              </div>
            </Card>
          </div>
          <div className="lg:col-span-9 flex flex-col gap-6">
            <Card className="flex-1 min-h-[600px] flex flex-col glass border-border overflow-hidden">
               <div className="flex items-center justify-between px-6 py-3 border-b bg-white/5">
                <span className="font-mono text-[10px] font-bold text-muted-foreground tracking-widest uppercase">{activeDoc}</span>
                <div className="flex gap-2">
                  {['README.md', 'ARCHITECTURE.md', 'SECURITY.md'].map(d => (
                    <Button key={d} variant="ghost" size="sm" className={cn("h-6 text-[8px] font-bold uppercase px-2", activeDoc === d && "bg-primary/20 text-primary")} onClick={() => setActiveDoc(d)}>
                      {d.split('.')[0]}
                    </Button>
                  ))}
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className={cn("p-10 transition-opacity", isGenerating && "opacity-50")}>
                  {docs[activeDoc] ? (
                    <article className="prose prose-slate dark:prose-invert max-w-none prose-pre:bg-black/40">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{docs[activeDoc]}</ReactMarkdown>
                    </article>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[400px] space-y-6">
                      <Sparkles className="w-12 h-12 text-primary animate-pulse" />
                      <Button onClick={async () => {
                        setIsGenerating(true);
                        const res = await fetch(`/api/chat/${sessionId}/generate-docs`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: activeDoc })
                        });
                        const result = await res.json();
                        if (result.success) {
                          setDocs(prev => ({ ...prev, [activeDoc]: result.content }));
                          addLog(`rie: ${activeDoc} synthesized.`, 'success');
                        }
                        setIsGenerating(false);
                      }} disabled={isGenerating} className="btn-brutal-amber h-12 px-10">Synthesize {activeDoc}</Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
            <div className="bg-zinc-950 rounded-xl border border-white/10 h-60 overflow-hidden flex flex-col shadow-inner">
              <div ref={terminalRef} className="flex-1 p-4 font-mono text-[10px] overflow-y-auto space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className={cn("flex gap-2", log.type === 'success' ? 'text-emerald-400' : log.type === 'warn' ? 'text-amber-400' : log.type === 'error' ? 'text-red-400' : log.type === 'cmd' ? 'text-sky-400' : 'text-zinc-400')}>
                    <span className="opacity-30">{log.type === 'cmd' ? '➜' : '��'}</span>
                    <span>{log.msg}</span>
                  </div>
                ))}
                <form onSubmit={handleCommand} className="flex gap-2 mt-2">
                  <span className="text-emerald-500">archlens@studio:~$</span>
                  <input autoFocus value={cliInput} onChange={(e) => setCliInput(e.target.value)} className="bg-transparent border-none outline-none flex-1 text-zinc-300 font-mono text-[10px] uppercase" />
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
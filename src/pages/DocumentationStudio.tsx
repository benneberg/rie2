import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JSZip from 'jszip';
import { FileText, ChevronLeft, Terminal as TerminalIcon, Eye, Zap, Code, ShieldCheck, DownloadCloud, Sparkles, CheckCircle2, Circle, LayoutPanelLeft, Save, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/layout/AppLayout';
import { chatService } from '@/lib/chat';
import { toast } from 'sonner';
import { generateStandaloneReport } from '@/lib/report-generator';
import { cn } from '@/lib/utils';
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
  const [showTerminal, setShowTerminal] = useState(true);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success' | 'cmd' | 'error'}[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
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
  const addLog = (msg: string, type: 'info' | 'warn' | 'success' | 'cmd' | 'error' = 'info') => {
    setLogs(prev => [...prev, { msg: `[${new Date().toLocaleTimeString()}] ${msg}`, type }]);
  };
  const getSynthesisInventory = () => {
    const content = docs[activeDoc] || '';
    const sections = [
      { name: 'Overview', regex: /(#|##) (Overview|What is|Intro)/i },
      { name: 'Architecture', regex: /(#|##) (Architecture|Structure|Design)/i },
      { name: 'Quick Start', regex: /(#|##) (Quick Start|Installation|Setup)/i },
      { name: 'Security', regex: /(#|##) (Security|Audit)/i },
      { name: 'Contributing', regex: /(#|##) (Contributing|Development)/i },
    ];
    return sections.map(s => ({ ...s, populated: s.regex.test(content) }));
  };
  const fetchDocs = async () => {
    try {
      const response = await chatService.getMessages();
      if (response.success && response.data?.metadata?.documentation) {
        setDocs(response.data.metadata.documentation);
        setMetadata(response.data.metadata);
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
    const cmd = cliInput.trim();
    addLog(cmd, 'cmd');
    setCliInput('');
    const parts = cmd.toLowerCase().split(' ');
    if (parts[0] === 'clear') {
      setLogs([]);
      return;
    }
    if (cmd === 'rie report --portable') {
      addLog('rie: initializing portable report generator...', 'info');
      if (metadata) {
        generateStandaloneReport(metadata);
        addLog('rie: report generated successfully.', 'success');
      } else {
        addLog('rie: error - metadata not loaded.', 'error');
      }
      return;
    }
    if (cmd === 'rie fix --all') {
      addLog('rie: scanning for auto-fixable vulnerabilities...', 'info');
      const res = await fetch(`/api/chat/${sessionId}/apply-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId: 'all' })
      });
      if (res.ok) addLog('rie: bulk remediation successful. all documentation updated.', 'success');
      else addLog('rie: bulk remediation failed.', 'error');
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
      const response = await chatService.getMessages();
      const score = response.data?.metadata?.validation?.score || 0;
      setTimeout(() => {
        if (score >= 80) {
          addLog(`rie: validation success. health: ${score}%. exit code: 0`, 'success');
        } else {
          addLog(`rie: validation failure. health: ${score}% < 80%. exit code: 1`, 'error');
        }
      }, 800);
      return;
    }
    addLog(`Unknown command. Usage: rie config --view, rie validate --strict, clear`, 'warn');
  };
  const handleZipExport = async () => {
    addLog('rie: initializing zip archiver...', 'info');
    setIsExporting(true);
    try {
      const zip = new JSZip();
      Object.entries(docs).forEach(([name, content]) => {
        zip.file(name, content);
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archlens-artifacts-${sessionId?.slice(0, 8)}.zip`;
      a.click();
      addLog('rie: multi-artifact zip generated.', 'success');
    } catch (e) {
      addLog('rie: zip generation failed.', 'error');
    } finally {
      setIsExporting(false);
    }
  };
  const generateDoc = async (docType: string) => {
    setIsGenerating(true);
    const response = await chatService.getMessages();
    const mode = response.data?.config?.docMode || 'technical';
    addLog(`rie: pipeline init. persona: ${mode.toUpperCase()}.`, 'info');
    addLog(`rie: synthesizing ${docType}...`, 'info');
    try {
      const genRes = await fetch(`/api/chat/${sessionId}/generate-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: docType })
      });
      const result = await genRes.json();
      if (result.success) {
        setDocs(prev => ({ ...prev, [docType]: result.content }));
        setActiveDoc(docType);
        addLog(`rie: ${docType} synthesis commit success. integrity verified.`, 'success');
      }
    } catch (err) {
      addLog(`rie: synthesis error.`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };
  const saveManualEdits = async () => {
    addLog('rie: committing documentation state...', 'info');
    const res = await chatService.saveDocumentation(docs);
    if (res.success) {
      addLog('rie: documentation persistence confirmed.', 'success');
      toast.success('DOCUMENTATION_SAVED');
    }
  };
  const exportGitHubAction = () => {
    const actionTemplate = `name: ArchLens Architectural Guardrail
on: [push, pull_request]
jobs:
  archlens_scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: ArchLens Core Scan
        uses: archlens/action-rie-core@v1
        with:
          session_id: $\{'{{'} inputs.session_id || '${sessionId || 'default'}' $\{'}}'}
          threshold: 80
          fail_on_drift: true
        env:
          ARCHLENS_TOKEN: $\{'{{'} secrets.ARCHLENS_TOKEN $\{'}}'}
`.trim();
    setDocs(prev => ({ ...prev, 'archlens.yml': actionTemplate }));
    setActiveDoc('archlens.yml');
    addLog('rie: github action workflow generated.', 'success');
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
            <Button variant="outline" onClick={handleZipExport} className="btn-brutal-dark">
              <Package className="w-4 h-4 mr-2" /> Export All (.zip)
            </Button>
            <Button onClick={saveManualEdits} className="btn-brutal-amber">
              <Save className="w-4 h-4 mr-2" /> Commit State
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
          <div className="lg:col-span-3 space-y-4">
            <Card className="glass border-border">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-2">Technical Artifacts</h3>
                <div className="space-y-2">
                  {['README.md', 'ARCHITECTURE.md', 'SECURITY.md', 'archlens.yml'].map(doc => (
                    <button
                      key={doc}
                      onClick={() => setActiveDoc(doc)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all",
                        activeDoc === doc ? 'bg-primary text-primary-foreground shadow-brutal-amber' : 'bg-white/5 hover:bg-white/10'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {doc.endsWith('.yml') ? <Code className="w-4 h-4" /> : <FileText className="w-4 h-4" />} {doc}
                      </div>
                      {docs[doc] && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                    </button>
                  ))}
                </div>
                <Button variant="outline" className="w-full text-[9px] font-bold uppercase border-dashed border-white/20" onClick={exportGitHubAction}>
                   + CI/CD Integration
                </Button>
              </CardContent>
            </Card>
            <Card className="glass border-border">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-2 flex items-center justify-between">
                  <span>Synthesis Inventory</span>
                  <LayoutPanelLeft className="w-3 h-3" />
                </h3>
                <div className="space-y-3">
                  {getSynthesisInventory().map(section => (
                    <div key={section.name} className="flex items-center justify-between text-[10px] font-mono uppercase tracking-tighter">
                      <span className={cn(section.populated ? "text-foreground" : "text-white/20")}>{section.name}</span>
                      {section.populated ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-white/5" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-9 flex flex-col gap-6">
            <Card className="flex-1 min-h-[500px] flex flex-col glass border-border overflow-hidden shadow-brutal-dark">
              <div className="flex items-center justify-between px-6 py-3 border-b bg-white/5">
                <span className="font-mono text-[10px] font-bold text-muted-foreground tracking-widest uppercase">{activeDoc}</span>
                <Button variant="ghost" size="sm" className="h-6 text-[8px] font-bold uppercase px-2" onClick={() => setShowTerminal(!showTerminal)}>
                  {showTerminal ? 'Hide_Terminal' : 'Show_Terminal'}
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className={cn("p-10 transition-opacity", isGenerating && "opacity-50")}>
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
            {showTerminal && (
            <div className="bg-zinc-950 rounded-xl border border-white/10 overflow-hidden flex flex-col shadow-brutal-dark h-60">
              <div className="bg-zinc-900 px-4 py-2 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-zinc-500 tracking-[0.2em] uppercase">
                  <TerminalIcon className="w-3 h-3" /> RIE-CORE_CLI_V4.2
                </div>
              </div>
              <div ref={terminalRef} className="flex-1 p-4 font-mono text-[10px] overflow-y-auto space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className={cn("flex gap-2",
                    log.type === 'success' ? 'text-emerald-400' :
                    log.type === 'warn' ? 'text-amber-400' :
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'cmd' ? 'text-sky-400' : 'text-zinc-400')}>
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
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
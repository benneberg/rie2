import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JSZip from 'jszip';
import { FileText, Download, Sparkles, Loader2, ChevronLeft, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { chatService } from '@/lib/chat';
import { toast } from 'sonner';
export function DocumentationStudio() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [activeDoc, setActiveDoc] = useState<string>('README.md');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    fetchDocs();
  }, [sessionId, navigate]);
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
    const toastId = toast.loading(`Synthesizing ${docType}...`);
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
        toast.success(`${docType} generated!`, { id: toastId });
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error('Synthesis failed: ' + (err as Error).message, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };
  const handleExportZip = async () => {
    if (Object.keys(docs).length === 0) {
      toast.error('No documentation to export');
      return;
    }
    setIsExporting(true);
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
      link.download = `archlens-documentation-${sessionId?.slice(0, 8)}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Documentation bundle exported!');
    } catch (err) {
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
      <div className="py-8 md:py-10 lg:py-12 space-y-8">
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
            <Button variant="outline" onClick={handleExportZip} disabled={isExporting || Object.keys(docs).length === 0}>
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export ZIP
            </Button>
            <Button variant="default" className="bg-primary shadow-soft">
              <Save className="w-4 h-4 mr-2" /> Save to Cloud
            </Button>
          </div>
        </header>
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary animate-pulse" /> AI Synthesis in progress...</span>
              <span>Please wait</span>
            </div>
            <Progress value={45} className="h-1 animate-pulse" />
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
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
                          onClick={(e) => {
                            e.stopPropagation();
                            generateDoc(doc);
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-3">
            <Card className="min-h-[700px] flex flex-col bg-card/40 backdrop-blur-md border-border overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                   <div className="flex gap-1.5 mr-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                     <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                     <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                   </div>
                   <span className="font-mono text-xs font-semibold text-muted-foreground">{activeDoc}</span>
                </div>
                {isGenerating && (
                  <div className="flex items-center gap-2 text-primary text-xs font-bold animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    SYNTHESIZING...
                  </div>
                )}
              </div>
              <ScrollArea className="flex-1 p-8">
                {docs[activeDoc] ? (
                  <article className="prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {docs[activeDoc]}
                    </ReactMarkdown>
                  </article>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="p-8 rounded-full bg-primary/5 border border-primary/10 shadow-glow">
                      <Sparkles className="w-12 h-12 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tight">Ready for AI Synthesis</h3>
                      <p className="text-muted-foreground max-w-xs mx-auto text-sm">
                        Our intelligence engine will parse your metadata and file structure to draft a technical {activeDoc}.
                      </p>
                    </div>
                    <Button 
                      onClick={() => generateDoc(activeDoc)} 
                      disabled={isGenerating}
                      className="px-8 bg-primary shadow-soft hover:scale-105 transition-transform"
                    >
                      Initialize {activeDoc} Draft
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
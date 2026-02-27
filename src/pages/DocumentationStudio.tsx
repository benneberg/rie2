import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Download, Sparkles, Loader2, ChevronLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    fetchDocs();
  }, [sessionId]);
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
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" /> Export ZIP
            </Button>
            <Button variant="default" className="bg-gradient-primary">
              <Save className="w-4 h-4 mr-2" /> Save to Repo
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Artifacts</h3>
                <div className="space-y-2">
                  {['README.md', 'ARCHITECTURE.md', 'SECURITY.md'].map(doc => (
                    <button
                      key={doc}
                      onClick={() => setActiveDoc(doc)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all ${
                        activeDoc === doc ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{doc}</span>
                      </div>
                      {docs[doc] ? (
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      ) : (
                        <Sparkles
                          className="w-4 h-4 opacity-50 cursor-pointer hover:opacity-100"
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
            <Card className="min-h-[700px] flex flex-col bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <span className="font-mono text-sm font-medium">{activeDoc}</span>
                {isGenerating && (
                  <div className="flex items-center gap-2 text-primary text-sm font-medium animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synthesizing...
                  </div>
                )}
              </div>
              <ScrollArea className="flex-1 p-8">
                {docs[activeDoc] ? (
                  <article className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {docs[activeDoc]}
                    </ReactMarkdown>
                  </article>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-6">
                    <div className="p-6 rounded-full bg-secondary">
                      <Sparkles className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">Ready to Synthesize</h3>
                      <p className="text-muted-foreground max-w-xs">
                        ArchLens will analyze your metadata and code patterns to draft a professional {activeDoc}.
                      </p>
                    </div>
                    <Button onClick={() => generateDoc(activeDoc)} disabled={isGenerating}>
                      Start Synthesis
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
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Link as LinkIcon, Sparkles, Zap, Search, Fingerprint, Map, Cpu } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster, toast } from 'sonner';
import { cn } from '@/lib/utils';
export function HomePage() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || isUploading) return;
    setIsUploading(true);
    const toastId = toast.loading('Reading repository contents...');
    try {
      const sessionId = crypto.randomUUID();
      console.log(`[ArchLens] Starting analysis for session: ${sessionId}`);
      const response = await fetch(`/api/analyze/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: acceptedFiles[0]?.name.split('.')[0] || "Repository",
          files: acceptedFiles.map(f => ({ name: f.name, size: f.size, type: 'file' }))
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        toast.success('Analysis complete!', { id: toastId });
        navigate(`/dashboard?session=${sessionId}`);
      } else {
        throw new Error(result.error || 'Unknown analysis error');
      }
    } catch (error) {
      console.error('[ArchLens] Scan error:', error);
      toast.error('Scan failed: ' + (error as Error).message, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  }, [navigate, isUploading]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/zip': ['.zip'] },
    multiple: false,
    disabled: isUploading
  });
  const features = [
    { icon: Fingerprint, title: "Deep Scan", desc: "Binary-level structural analysis" },
    { icon: Map, title: "Graph Viz", desc: "Interactive dependency mapping" },
    { icon: Cpu, title: "AI Docs", desc: "Context-aware artifact generation" }
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-background selection:bg-primary/20">
      <div className="py-8 md:py-10 lg:py-12 min-h-screen flex flex-col justify-center items-center relative overflow-hidden">
        <ThemeToggle />
        <div className="absolute inset-0 bg-gradient-mesh opacity-5 dark:opacity-10 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-8 z-10 w-full max-w-4xl"
        >
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-glow-lg floating group">
              <Sparkles className="w-10 h-10 text-primary-foreground group-hover:rotate-12 transition-transform" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-balance">
              Understand any <span className="text-gradient">Codebase</span> in seconds
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
              Transform messy repositories into interactive architectural maps, technical documentation, and AI-powered insights.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <Card
              {...getRootProps()}
              className={cn(
                "p-8 border-2 border-dashed transition-all cursor-pointer group bg-card/40 backdrop-blur-md relative overflow-hidden",
                isDragActive ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:border-primary/50",
                isUploading && "opacity-50 cursor-wait"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors">
                  <Upload className={cn("w-8 h-8 text-primary group-hover:scale-110 transition-transform", isUploading && "animate-bounce")} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Upload ZIP</h3>
                  <p className="text-sm text-muted-foreground">Drag & drop your repository archive</p>
                </div>
              </div>
            </Card>
            <Card className="p-8 border border-border bg-card/40 backdrop-blur-md flex flex-col justify-center">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary"><LinkIcon className="w-5 h-5 text-primary" /></div>
                  <h3 className="text-lg font-bold">Git URL</h3>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://github.com/user/repo"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="bg-secondary/30"
                    disabled={isUploading}
                  />
                  <Button disabled={!githubUrl || isUploading} className="shrink-0" onClick={() => toast.info('URL scanning coming soon!')}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-left">Public GitHub repositories only</p>
              </div>
            </Card>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 pt-10 border-t border-border/40">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center sm:items-start text-center sm:text-left gap-3 group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                   <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight">{feature.title}</p>
                  <p className="text-xs text-muted-foreground font-medium">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <footer className="mt-20 w-full max-w-3xl">
          <div className="bg-secondary/50 border border-border rounded-2xl p-6 text-center">
            <p className="text-sm font-semibold flex items-center justify-center gap-2 mb-2">
               <Zap className="w-4 h-4 text-amber-500" /> Usage Policy
            </p>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Important: Although this project has AI capabilities, there is a limit on the total number of requests that can be made to the AI servers across all user apps in a given time period.
            </p>
          </div>
        </footer>
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}
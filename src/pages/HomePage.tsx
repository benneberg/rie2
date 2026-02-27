import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Link as LinkIcon, Sparkles, ArrowRight, Shield, Zap, Search } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster, toast } from 'sonner';
import { chatService } from '@/lib/chat';
export function HomePage() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsUploading(true);
    const toastId = toast.loading('Reading repository contents...');
    try {
      const sessionId = crypto.randomUUID();
      // In a real implementation, we'd use JSZip to read the files
      // For Phase 1, we simulate the flow
      toast.info('Analyzing structure...', { id: toastId });
      const response = await fetch(`/api/analyze/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          files: acceptedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })) 
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Analysis complete!', { id: toastId });
        navigate(`/?session=${sessionId}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error('Scan failed: ' + (error as Error).message, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  }, [navigate]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/zip': ['.zip'] },
    multiple: false
  });
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <div className="w-20 h-20 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow-lg floating">
              <Sparkles className="w-10 h-10 text-white rotating" />
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
                "p-8 border-2 border-dashed transition-all cursor-pointer group hover:border-primary/50 bg-card/50 backdrop-blur-sm",
                isDragActive ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Upload ZIP</h3>
                  <p className="text-sm text-muted-foreground">Drag & drop your repository archive</p>
                </div>
              </div>
            </Card>
            <Card className="p-8 border border-border bg-card/50 backdrop-blur-sm flex flex-col justify-center">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary">
                    <LinkIcon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Git URL</h3>
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://github.com/user/repo" 
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="bg-secondary/50"
                  />
                  <Button disabled={!githubUrl}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Public repositories only for now</p>
              </div>
            </Card>
          </div>
          <div className="flex flex-wrap justify-center gap-8 mt-16 pt-8 border-t border-border/50">
            {[
              { icon: Zap, label: "Instant Analysis", desc: "RIE Engine v1.0" },
              { icon: Shield, label: "Private & Secure", desc: "In-memory processing" },
              { icon: ArrowRight, label: "Interactive Docs", desc: "Auto-generated" }
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <feature.icon className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-semibold">{feature.label}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        <footer className="mt-20 text-sm text-muted-foreground text-center">
          <p>Important Note: There is a limit on AI requests across all user apps in a given time period.</p>
          <p className="mt-2">Powered by Cloudflare Workers & Durable Objects</p>
        </footer>
      </div>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
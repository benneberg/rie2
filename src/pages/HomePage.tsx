import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Link as LinkIcon, Sparkles, Search, Loader2, ArrowRight, Zap, Globe, Cpu, Fingerprint } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast, Toaster } from 'sonner';
import { chatService } from '@/lib/chat';
import { cn } from '@/lib/utils';
import { OrbitalBackground } from '@/components/OrbitalBackground';
export function HomePage() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || isUploading) return;
    setIsUploading(true);
    const toastId = toast.loading('ARCHIVING PROJECT CHUNKS...');
    try {
      const sessionId = crypto.randomUUID();
      const name = acceptedFiles[0]?.name.split('.')[0] || "Repository";
      const response = await fetch(`/api/analyze/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          files: acceptedFiles.map(f => ({ name: f.name, size: f.size, type: 'file' }))
        }),
      });
      if (response.ok) {
        await chatService.createSession(name, sessionId);
        toast.success('CORE ANALYSIS COMPLETE', { id: toastId });
        navigate(`/dashboard?session=${sessionId}`);
      }
    } catch (error) {
      toast.error('SCAN_FAILURE_CORE', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  }, [navigate, isUploading]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/zip': ['.zip'] },
    multiple: false
  });
  return (
    <div className="min-h-screen selection:bg-[#f59e0b] selection:text-[#070911]">
      <OrbitalBackground />
      <Toaster richColors position="top-center" theme="dark" />
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
        {/* Brutalist Logo Chip */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 relative group"
        >
          <div className="bg-[#f59e0b] text-[#070911] px-6 py-2 font-display font-black text-4xl uppercase tracking-tighter shadow-brutal-dark group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
            ArchLens
          </div>
          <div className="absolute -top-4 -right-8 bg-white/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/50 border border-white/5">
            RC_4.0.1
          </div>
        </motion.div>
        {/* Hero Tagline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-8xl font-display font-extrabold tracking-tighter mb-8 leading-[0.9] uppercase max-w-5xl"
        >
          Visual <span className="text-[#f59e0b]">Intelligence</span> for Dirty Code.
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-[#dde4f4]/60 max-w-2xl font-medium tracking-tight mb-16"
        >
          X-ray your repository. Map dependencies in high-definition. Generate documentation that doesn't suck. All in seconds.
        </motion.p>
        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-24">
          <div 
            {...getRootProps()}
            className={cn(
              "p-12 glass border-2 border-dashed transition-all group flex flex-col items-center justify-center min-h-[300px]",
              isDragActive ? "border-[#f59e0b] bg-[#f59e0b]/5" : "border-white/10 hover:border-[#f59e0b]/50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-[#f59e0b] mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-display font-bold uppercase mb-2">Ingest Archive</h3>
            <p className="text-xs font-mono opacity-50 uppercase tracking-widest">Supports .ZIP repositories</p>
          </div>
          <div className="p-12 glass border border-white/10 flex flex-col justify-center min-h-[300px]">
            <div className="flex items-center gap-3 mb-8">
              <Globe className="w-6 h-6 text-[#f59e0b]" />
              <h3 className="text-xl font-display font-bold uppercase">Clone Repo</h3>
            </div>
            <div className="space-y-4">
              <Input 
                placeholder="HTTPS://GITHUB.COM/..." 
                className="bg-black/40 border-white/10 text-xs font-mono py-6 tracking-widest"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
              <Button 
                onClick={() => toast.info('REMOTE_CLONE_WIP')}
                className="w-full btn-brutal-amber h-14"
              >
                Execute Analysis <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-12 w-full max-w-4xl py-12 border-y border-white/5 mb-24">
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-6xl font-stats text-[#f59e0b]">3s</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Avg. Scan Time</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-6xl font-stats">∞</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Insight Depth</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-6xl font-stats">100%</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Structural Truth</span>
          </div>
        </div>
        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {[
            { icon: Fingerprint, title: "Deterministic Scan", desc: "No fuzzy logic. Exact architectural extraction." },
            { icon: Cpu, title: "LLM Enrichment", desc: "Context-aware narratives for your codebase." },
            { icon: Zap, title: "Instant Docs", desc: "READMEs and ARCHITECTURE.md generated instantly." }
          ].map((feat, i) => (
            <div key={i} className="p-8 glass-border glass text-left group">
              <div className="w-10 h-10 bg-[#f59e0b]/10 flex items-center justify-center mb-6 border border-[#f59e0b]/20">
                <feat.icon className="w-5 h-5 text-[#f59e0b]" />
              </div>
              <h4 className="font-display font-bold uppercase text-lg mb-2">{feat.title}</h4>
              <p className="text-sm opacity-50 font-medium leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
        <footer className="mt-40 opacity-30 text-[10px] font-mono uppercase tracking-[0.3em]">
          ArchLens Terminal • Established 2024 • Build_System_V4
        </footer>
      </div>
    </div>
  );
}
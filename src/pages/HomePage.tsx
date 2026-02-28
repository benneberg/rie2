import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowRight, Loader2, Github, Fingerprint, Cpu, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast, Toaster } from 'sonner';
import { chatService } from '@/lib/chat';
import { cn, parseGitHubUrl } from '@/lib/utils';
import { OrbitalBackground } from '@/components/OrbitalBackground';
import JSZip from 'jszip';
export function HomePage() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const uploadingRef = useRef(false);
  useEffect(() => {
    uploadingRef.current = isUploading;
  }, [isUploading]);
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || uploadingRef.current) return;
    setIsUploading(true);
    const toastId = toast.loading('PARSING_ARCHIVE_TOPOLOGY...');
    try {
      const zipFile = acceptedFiles[0];
      const jszip = new JSZip();
      const zipContent = await jszip.loadAsync(zipFile);
      const fileManifest = await Promise.all(
        Object.entries(zipContent.files)
          .filter(([path, file]) => !file.dir && !path.includes('__MACOSX') && !path.split('/').some(p => p.startsWith('.')))
          .map(async ([path, file]) => {
            let content = undefined;
            if (path === 'package.json' || path.endsWith('/package.json')) {
              content = await file.async("string");
            }
            return {
              name: path,
              size: (file as any)._data?.uncompressedSize || 0,
              type: 'file' as const,
              content
            };
          })
      );
      if (fileManifest.length === 0) throw new Error('EMPTY_OR_INVALID_ZIP');
      const sessionId = crypto.randomUUID();
      const name = zipFile.name.replace(/\.[^/.]+$/, "");
      const response = await fetch(`/api/analyze/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, files: fileManifest }),
      });
      if (response.ok) {
        await chatService.createSession(name, sessionId);
        toast.success('ARCHIVE_INGESTED', { id: toastId });
        navigate(`/dashboard?session=${sessionId}`);
      } else {
        throw new Error('SERVER_ANALYSIS_FAILED');
      }
    } catch (error) {
      toast.error('INGEST_FAILURE', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Ensure the ZIP file is valid and readable.'
      });
    } finally {
      setIsUploading(false);
    }
  }, [navigate]);
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dropRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragActive(false);
    }
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
      onDrop(files);
    } else {
      toast.error('Please drop a single .ZIP file');
    }
  };
  const handleGithubClone = async () => {
    if (!githubUrl || isFetchingUrl) return;
    const parsed = parseGitHubUrl(githubUrl);
    if (!parsed) {
      toast.error('INVALID_GITHUB_URL', { description: 'Provide a valid https://github.com/user/repo URL' });
      return;
    }
    setIsFetchingUrl(true);
    const toastId = toast.loading('REQUESTING_REMOTE_MIRROR...');
    try {
      const sessionId = crypto.randomUUID();
      const name = parsed.repo;
      const response = await fetch(`/api/analyze/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: githubUrl, name: name }),
      });
      const result = await response.json();
      if (result.success) {
        await chatService.createSession(name, sessionId);
        toast.success('REMOTE_ANALYSIS_SYNCED', { id: toastId });
        navigate(`/dashboard?session=${sessionId}`);
      } else {
        throw new Error(result.error || 'ANALYSIS_FAILED');
      }
    } catch (error) {
      toast.error('CLONE_FAILURE', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Ensure the repository is public.'
      });
    } finally {
      setIsFetchingUrl(false);
    }
  };
  return (
    <div className="min-h-screen selection:bg-primary/30 selection:text-primary">
      <OrbitalBackground />
      <Toaster richColors position="top-center" theme="dark" />
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
        <div className="mb-12 relative group opacity-0 animate-reveal">
          <div className="bg-primary text-primary-foreground px-6 py-2 font-display font-black text-4xl uppercase tracking-tighter shadow-brutal-dark group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
            ArchLens
          </div>
          <div className="absolute -top-4 -right-8 bg-white/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white/50 border border-white/5">
            PRO_4.2.1
          </div>
        </div>
        <h1 className="text-5xl md:text-8xl font-display font-extrabold tracking-tighter mb-8 leading-[0.9] uppercase max-w-5xl opacity-0 animate-reveal [animation-delay:0.1s]">
          Visual <span className="text-primary">Intelligence</span> for Dirty Code.
        </h1>
        <p className="text-lg md:text-xl text-[#dde4f4]/60 max-w-2xl font-medium tracking-tight mb-16 opacity-0 animate-reveal [animation-delay:0.2s]">
          X-ray your repository. Map dependencies in high-definition. Generate documentation that doesn't suck. All in seconds.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-24">
          <div
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "p-12 glass border-2 border-dashed transition-all group flex flex-col items-center justify-center min-h-[300px] cursor-pointer",
              isDragActive ? "border-primary bg-primary/5" : "border-white/10 hover:border-primary/50"
            )}
          >
            <Upload className="w-12 h-12 text-primary mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-display font-bold uppercase mb-2">Ingest Archive</h3>
            <p className="text-[10px] font-mono opacity-50 uppercase tracking-[0.2em]">Drop .ZIP Repository</p>
          </div>
          <div className="p-12 glass border border-white/10 flex flex-col justify-center min-h-[300px]">
            <div className="flex items-center gap-3 mb-8">
              <Github className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-display font-bold uppercase">Clone Remote</h3>
            </div>
            <div className="space-y-4">
              <Input
                placeholder="HTTPS://GITHUB.COM/USER/REPO"
                className="bg-black/40 border-white/10 text-xs font-mono py-6 tracking-widest uppercase"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
              <Button
                onClick={handleGithubClone}
                disabled={isFetchingUrl}
                className="w-full btn-brutal-amber h-14"
              >
                {isFetchingUrl ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <>Execute Analysis <ArrowRight className="ml-2 w-4 h-4" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-12 w-full max-w-4xl py-12 border-y border-white/5 mb-24">
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-6xl font-stats text-primary">~3s</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Scan_Latency</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-6xl font-stats">Deep</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Graph_Insight</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-6xl font-stats">100%</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Structural_Truth</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {[
            { icon: Fingerprint, title: "Deterministic Scan", desc: "No fuzzy logic. Exact architectural extraction from source." },
            { icon: Cpu, title: "LLM Enrichment", desc: "AI-driven technical narratives for complex system logic." },
            { icon: Zap, title: "Instant Docs", desc: "READMEs and Architecture blueprints generated instantly." }
          ].map((feat, i) => (
            <div key={i} className="p-8 glass-border glass text-left group">
              <div className="w-10 h-10 bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                <feat.icon className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-display font-bold uppercase text-lg mb-2">{feat.title}</h4>
              <p className="text-xs opacity-50 font-medium leading-relaxed uppercase tracking-tight">{feat.desc}</p>
            </div>
          ))}
        </div>
        <footer className="mt-40 opacity-30 text-[9px] font-mono uppercase tracking-[0.4em] pb-10">
          ArchLens Terminal • v4.2.1_PRODUCTION • Note: AI usage limits apply globally.
        </footer>
      </div>
    </div>
  );
}
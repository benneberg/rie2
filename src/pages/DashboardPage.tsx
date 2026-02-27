import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/rie/StatsCard';
import { DependencyGraph } from '@/components/rie/DependencyGraph';
import { RepositoryMetadata } from '@/lib/rie-types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Files, Code2, Database, Sparkles, AlertTriangle, Github, HardDrive } from 'lucide-react';
import { chatService } from '@/lib/chat';
import { cn } from '@/lib/utils';
export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');
  const [metadata, setMetadata] = useState<RepositoryMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchMetadata = useCallback(async () => {
    try {
      const response = await chatService.getMessages();
      if (response.success && response.data?.metadata) {
        setMetadata(response.data.metadata);
      }
    } catch (error) {
      console.error('FETCH_ERR', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (sessionId) {
      chatService.switchSession(sessionId);
      fetchMetadata();
    } else {
      navigate('/');
    }
  }, [sessionId, navigate, fetchMetadata]);
  if (isLoading) return <AppLayout container><Skeleton className="h-[600px] w-full glass animate-pulse" /></AppLayout>;
  if (!metadata) return <AppLayout container><div className="text-center py-20 font-display text-4xl uppercase opacity-20">No active session</div></AppLayout>;
  const healthScore = metadata.validation?.score || 0;
  const source = metadata.source;
  return (
    <AppLayout container>
      <div className="space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-reveal">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-[#f59e0b]/30 text-[#f59e0b]">LIVE_SCAN_REPORT</Badge>
              {source?.type === 'github' ? (
                <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-cyan-500/30 text-cyan-400 flex gap-1.5 items-center">
                  <Github className="w-3 h-3" /> GITHUB: {source.repo?.toUpperCase()}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-white/20 text-white/50 flex gap-1.5 items-center">
                  <HardDrive className="w-3 h-3" /> LOCAL_ARCHIVE
                </Badge>
              )}
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter leading-none">{metadata.name}</h1>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate(`/studio?session=${sessionId}`)} className="btn-brutal-dark">Documentation</Button>
            <Button onClick={() => navigate(`/settings?session=${sessionId}`)} className="btn-brutal-amber">Configuration</Button>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Card className="lg:col-span-3 glass border-l-4 border-l-[#f59e0b] shadow-brutal-dark">
            <CardContent className="p-8">
              <div className="flex items-center gap-2 mb-4 opacity-50">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Architectural Synthesis</span>
              </div>
              <p className="text-2xl font-display font-medium leading-tight">
                {metadata.documentation?.['summary'] || "A highly structured codebase exhibiting deep modularity."}
              </p>
            </CardContent>
          </Card>
          <Card className={cn(
            "p-8 flex flex-col justify-center text-center shadow-brutal-dark transition-colors duration-500",
            healthScore > 80 ? "bg-emerald-600" : "bg-amber-600"
          )}>
            <span className="text-[10px] font-black uppercase tracking-widest mb-2 text-white/60">Core Health</span>
            <div className="text-7xl font-stats leading-none text-white">{healthScore}</div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-2">Scale / 100</span>
          </Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard label="Files" value={metadata.totalFiles.toString()} icon={<Files className="w-4 h-4" />} />
          <StatsCard label="Language" value={metadata.primaryLanguage} icon={<Code2 className="w-4 h-4" />} />
          <StatsCard label="Binary Size" value={`${(metadata.totalSize / 1024).toFixed(1)} KB`} icon={<Database className="w-4 h-4" />} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 glass shadow-brutal-dark min-h-[500px] overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <span className="font-display font-bold uppercase tracking-widest text-xs">Dependency Topology</span>
              <div className="flex gap-1">
                {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/10" />)}
              </div>
            </div>
            <DependencyGraph dependencies={metadata.dependencies} />
          </div>
          <div className="lg:col-span-4 space-y-8">
            <div className="glass p-6 space-y-6">
              <h3 className="font-display font-bold uppercase tracking-widest text-xs border-b border-white/5 pb-4">Validation Logs</h3>
              <div className="space-y-4">
                {metadata.validation?.issues.map((issue, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                    <AlertTriangle className={cn("w-4 h-4 shrink-0", issue.severity === 'high' ? "text-red-500" : "text-amber-500")} />
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest leading-none">{issue.message}</p>
                      <p className="text-[9px] font-mono opacity-50 uppercase tracking-tighter">{issue.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
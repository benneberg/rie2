import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/rie/StatsCard';
import { DependencyGraph } from '@/components/rie/DependencyGraph';
import { RepositoryMetadata, ValidationIssue } from '@/lib/rie-types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Files, Code2, Database, Sparkles, AlertTriangle, Github, HardDrive, ShieldCheck, Box, Zap, ChevronRight } from 'lucide-react';
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
  const report = metadata.validation;
  const source = metadata.source;
  const scoreColor = (s: number) => s > 85 ? 'text-emerald-500' : s > 60 ? 'text-amber-500' : 'text-red-500';
  return (
    <AppLayout container>
      <div className="space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-reveal">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-primary/30 text-primary uppercase">Report_V4.2</Badge>
              {metadata.isMonorepo && (
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px] font-bold tracking-widest">
                  <Box className="w-3 h-3 mr-1.5" /> MONOREPO: {metadata.workspaces?.length} WORKSPACES
                </Badge>
              )}
              {source?.type === 'github' ? (
                <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-white/20 text-white/50 flex gap-1.5 items-center">
                  <Github className="w-3 h-3" /> {source.repo?.toUpperCase()}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-white/20 text-white/50 flex gap-1.5 items-center">
                  <HardDrive className="w-3 h-3" /> LOCAL_FS
                </Badge>
              )}
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter leading-none">{metadata.name}</h1>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate(`/studio?session=${sessionId}`)} className="btn-brutal-dark">Artifact Workspace</Button>
            <Button onClick={() => navigate(`/settings?session=${sessionId}`)} className="btn-brutal-amber">Configure Engine</Button>
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {report && Object.entries(report.categories).map(([cat, score]) => (
            <Card key={cat} className="glass overflow-hidden border-b-2 border-b-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{cat}</span>
                  <div className={cn("text-2xl font-stats", scoreColor(score))}>{score}%</div>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all duration-1000", score > 85 ? 'bg-emerald-500' : score > 60 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${score}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="glass shadow-brutal-dark min-h-[500px] overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <span className="font-display font-bold uppercase tracking-widest text-xs">Structural Topology</span>
                <Badge variant="secondary" className="text-[9px] font-mono">MERMAID_ENGINE_RENDER</Badge>
              </div>
              <DependencyGraph dependencies={metadata.dependencies} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard label="Files_Count" value={metadata.totalFiles.toString()} icon={<Files className="w-4 h-4" />} />
              <StatsCard label="Language_Core" value={metadata.primaryLanguage} icon={<Code2 className="w-4 h-4" />} />
              <StatsCard label="Total_Payload" value={`${(metadata.totalSize / 1024).toFixed(1)} KB`} icon={<Database className="w-4 h-4" />} />
            </div>
          </div>
          <div className="lg:col-span-4">
            <Card className="glass h-full border-l-4 border-l-primary shadow-brutal-dark">
              <CardContent className="p-0">
                <Tabs defaultValue="all" className="w-full">
                  <div className="p-6 border-b border-white/5">
                    <h3 className="font-display font-bold uppercase tracking-widest text-xs mb-4">Issues Explorer</h3>
                    <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/5 h-10">
                      <TabsTrigger value="all" className="text-[9px] font-bold uppercase tracking-widest">All</TabsTrigger>
                      <TabsTrigger value="high" className="text-[9px] font-bold uppercase tracking-widest text-red-400">High</TabsTrigger>
                      <TabsTrigger value="security" className="text-[9px] font-bold uppercase tracking-widest text-amber-400">Security</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="all" className="p-0">
                    <div className="divide-y divide-white/5">
                      {report?.issues.map((issue, idx) => (
                        <div key={idx} className="p-6 hover:bg-white/5 transition-colors group">
                          <div className="flex items-start gap-4">
                            <AlertTriangle className={cn("w-5 h-5 mt-0.5", issue.severity === 'critical' || issue.severity === 'high' ? "text-red-500" : "text-amber-500")} />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0 border-white/20 opacity-60">
                                  {issue.category}
                                </Badge>
                                {issue.autoFixable && (
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[8px] font-black">AUTO_FIX_READY</Badge>
                                )}
                              </div>
                              <p className="text-[11px] font-bold uppercase tracking-wider leading-tight text-white/90">{issue.message}</p>
                              <p className="text-[10px] font-mono opacity-50 uppercase tracking-tighter bg-black/20 p-2 rounded">{issue.suggestion}</p>
                              {issue.autoFixable && (
                                <Button size="sm" variant="outline" className="w-full mt-2 h-8 text-[9px] font-black uppercase tracking-widest border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400" onClick={() => navigate(`/studio?session=${sessionId}`)}>
                                  EXECUTE_FIX <ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
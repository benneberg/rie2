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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Github, HardDrive, LayoutGrid, TrendingUp, TrendingDown, Anchor, Activity, Wrench, BarChart3, PieChart as PieChartIcon, History } from 'lucide-react';
import { chatService } from '@/lib/chat';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LanguageDistributionChart, RiskRadarChart, FanInFanOutChart } from '@/components/rie/DashboardCharts';
import { DriftComparison } from '@/components/rie/DriftComparison';
export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');
  const [metadata, setMetadata] = useState<RepositoryMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);
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
  const applyFix = async (issueId: string) => {
    if (!sessionId) return;
    setFixingId(issueId);
    const toastId = toast.loading('EXECUTING_AUTO_FIX_SEQUENCE...');
    try {
      const response = await fetch(`/api/chat/${sessionId}/apply-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId })
      });
      if (response.ok) {
        toast.success('ISSUE_RESOLVED_SIMULATED', { id: toastId });
        await fetchMetadata();
      }
    } finally {
      setFixingId(null);
    }
  };
  const setAsBaseline = async () => {
    if (!sessionId) return;
    const toastId = toast.loading('STAMPING_CURRENT_AS_BASELINE...');
    try {
      const response = await fetch(`/api/chat/${sessionId}/create-baseline`, { method: 'POST' });
      if (response.ok) {
        toast.success('BASELINE_ESTABLISHED', { id: toastId });
        await fetchMetadata();
      }
    } catch (e) {
      toast.error('BASELINE_FAILED');
    }
  };
  if (isLoading) return <AppLayout container><Skeleton className="h-[600px] w-full glass" /></AppLayout>;
  if (!metadata) return <AppLayout container><div className="text-center py-20 uppercase opacity-20">No active session</div></AppLayout>;
  const report = metadata.validation;
  const source = metadata.source;
  return (
    <AppLayout container>
      <div className="space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-reveal">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-primary/30 text-primary uppercase">Report_V4.2</Badge>
              {metadata.isMonorepo && <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px] font-bold uppercase tracking-widest">MONOREPO</Badge>}
              <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-white/20 text-white/50 uppercase">
                {source?.type === 'github' ? <><Github className="w-3.5 h-3.5 mr-1" /> {source.repo}</> : <><HardDrive className="w-3.5 h-3.5 mr-1" /> ARCHIVE</>}
              </Badge>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter leading-none">{metadata.name}</h1>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setIsComparing(!isComparing)} className={cn("btn-brutal-dark", isComparing && "bg-primary/20")}>
              {isComparing ? 'Close_Drift' : 'Drift_Analysis'}
            </Button>
            {!metadata.baseline && (
              <Button variant="outline" onClick={setAsBaseline} className="btn-brutal-dark">Set_Baseline</Button>
            )}
            <Button onClick={() => navigate(`/studio?session=${sessionId}`)} className="btn-brutal-amber">Artifact Studio</Button>
          </div>
        </header>
        {isComparing && (
          <DriftComparison 
            current={metadata} 
            baseline={metadata.baseline} 
            onClose={() => setIsComparing(false)} 
          />
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="glass border-l-4 border-l-primary shadow-brutal-dark">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <PieChartIcon className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">DNA_Language_Mix</h3>
              </div>
              <div className="h-[200px] min-h-[200px]">
                <LanguageDistributionChart languages={metadata.languages} />
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-l-4 border-l-cyan-500 shadow-brutal-dark">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Health_Radar</h3>
              </div>
              <div className="h-[200px] min-h-[200px]">
                <RiskRadarChart categories={report?.categories || {}} />
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-l-4 border-l-emerald-500 shadow-brutal-dark">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-4 h-4 text-emerald-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Top_Coupling_Nodes</h3>
              </div>
              <div className="h-[200px] min-h-[200px]">
                <FanInFanOutChart dependencies={metadata.dependencies || []} />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass border-l-4 border-l-emerald-500">
                <CardContent className="p-6">
                   <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 flex items-center gap-2"><Anchor className="w-3 h-3" /> Isolation_Score</div>
                   <div className="text-4xl font-stats">{metadata.validation?.riskMetrics?.isolationScore || 0}%</div>
                </CardContent>
              </Card>
              <Card className="glass border-l-4 border-l-amber-500">
                <CardContent className="p-6">
                   <div className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-2"><Activity className="w-3 h-3" /> Coupling_Index</div>
                   <div className="text-4xl font-stats">{(metadata.validation?.riskMetrics?.couplingIndex || 0).toFixed(1)}</div>
                </CardContent>
              </Card>
            </div>
            <Card className="glass shadow-brutal-dark">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Risk_Entropy_Heatmap</h3>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  <TooltipProvider>
                    {report?.heatmap.map((node, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "aspect-square rounded border flex items-center justify-center font-mono text-[8px] font-bold p-1 cursor-help transition-transform hover:scale-105",
                            node.riskLevel === 'critical' ? 'bg-red-500/60 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' :
                            node.riskLevel === 'high' ? 'bg-orange-500/40 border-orange-500/50' :
                            'bg-emerald-500/10 border-emerald-500/20'
                          )}>
                            {node.path.slice(0, 8)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-background border-primary/20">
                          <p className="font-mono text-[10px]">{node.path}</p>
                          <p className="text-[10px] text-primary">Risk Score: {node.riskScore}%</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
            <div className="glass shadow-brutal-dark overflow-hidden min-h-[500px]">
              <div className="p-6 border-b border-white/5 bg-white/5 font-display font-bold uppercase text-xs">Structural Topology</div>
              <DependencyGraph dependencies={metadata.dependencies || []} />
            </div>
          </div>
          <div className="lg:col-span-4">
            <Card className="glass h-full border-l-4 border-l-primary shadow-brutal-dark sticky top-24">
              <CardContent className="p-0 flex flex-col h-full max-h-[calc(100vh-200px)]">
                <div className="p-6 border-b border-white/5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display font-bold uppercase tracking-widest text-xs">Issues Explorer</h3>
                    <Button variant="outline" size="sm" className="h-7 text-[8px] font-bold uppercase px-2 border-primary/40 text-primary" onClick={() => applyFix('all')}>
                      <Wrench className="w-3 h-3 mr-1" /> Fix_All
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-primary/20">
                  <AnimatePresence initial={false}>
                    {report?.issues?.map((issue) => (
                      <motion.div
                        key={issue.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: fixingId === issue.id ? 0.5 : 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-6 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={cn("w-4 h-4 mt-0.5", 
                            issue.severity === 'critical' ? "text-red-500" : 
                            issue.severity === 'high' ? "text-orange-500" : "text-amber-500"
                          )} />
                          <div className="flex-1 space-y-1">
                            <p className="text-[11px] font-bold uppercase leading-tight text-white/90">{issue.message}</p>
                            <p className="text-[10px] font-mono opacity-40 uppercase tracking-tighter">{issue.suggestion}</p>
                          </div>
                        </div>
                        {issue.autoFixable && (
                          <Button
                            size="sm"
                            className="w-full h-8 text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20"
                            onClick={() => applyFix(issue.id)}
                            disabled={!!fixingId}
                          >
                            {fixingId === issue.id ? 'Fixing...' : 'Execute_AutoFix'}
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {report?.issues?.length === 0 && (
                    <div className="p-12 text-center opacity-20 uppercase font-bold text-xs">
                      No architectural violations detected.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
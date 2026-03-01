import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RepositoryMetadata } from '@/lib/rie-types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Fingerprint, Brain, Target, ShieldCheck, Activity, Wrench, BarChart3, Info, Cpu, Globe, Terminal } from 'lucide-react';
import { chatService } from '@/lib/chat';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LanguageDistributionChart, RiskRadarChart } from '@/components/rie/DashboardCharts';
import { generateV2Spec } from '@/lib/specs-generator';
export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');
  const [metadata, setMetadata] = useState<RepositoryMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const fetchMetadata = useCallback(async () => {
    try {
      const response = await chatService.getMessages();
      if (response.success && response.data?.metadata) {
        setMetadata(response.data.metadata);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (sessionId) { chatService.switchSession(sessionId); fetchMetadata(); }
    else navigate('/');
  }, [sessionId, navigate, fetchMetadata]);
  if (isLoading) return <AppLayout container><Skeleton className="h-[600px] w-full glass" /></AppLayout>;
  if (!metadata) return <AppLayout container><div className="text-center py-20 opacity-20 uppercase">No session context</div></AppLayout>;
  const groundingScore = metadata.validation?.categories.grounding || 0;
  return (
    <AppLayout container>
      <div className="space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-reveal">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold uppercase tracking-widest">v2.0_CORE_SPEC</Badge>
              <Badge variant="outline" className="text-[10px] font-bold tracking-widest uppercase">{metadata.primaryLanguage}</Badge>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter leading-none">{metadata.name}</h1>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => generateV2Spec(metadata)} className="btn-brutal-dark">Export Spec v2.0</Button>
            <Button onClick={() => navigate(`/studio?session=${sessionId}`)} className="btn-brutal-amber">Artifact Studio</Button>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           <Card className="glass border-l-4 border-l-emerald-500 lg:col-span-2">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-emerald-500" />
                <h3 className="text-[11px] font-black uppercase tracking-widest">Project Philosophy</h3>
              </div>
              <p className="text-sm font-medium leading-relaxed italic opacity-80">"{metadata.philosophy?.purpose}"</p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <span className="text-[9px] font-bold uppercase opacity-30 block">Positioning</span>
                  <span className="text-[10px] font-mono uppercase">{metadata.philosophy?.positioning}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase opacity-30 block">Evolution</span>
                  <span className="text-[10px] font-mono uppercase">{metadata.philosophy?.evolution}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-l-4 border-l-amber-500">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-2 mb-4">
                <Fingerprint className="w-4 h-4 text-amber-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Grounding</h3>
              </div>
              <div className="text-6xl font-stats text-amber-500">{groundingScore}%</div>
              <span className="text-[9px] font-mono uppercase opacity-40 mt-2">Claim Integrity</span>
            </CardContent>
          </Card>
          <Card className="glass border-l-4 border-l-cyan-500">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
               <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-cyan-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Strategy</h3>
              </div>
              <div className="text-6xl font-stats text-cyan-500">{metadata.roadmap?.length || 0}</div>
              <span className="text-[9px] font-mono uppercase opacity-40 mt-2">Target Milestones</span>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
             <div className="glass shadow-brutal-dark overflow-hidden min-h-[500px]">
              <div className="p-6 border-b border-white/5 bg-white/5 font-display font-bold uppercase text-xs">Architectural Grounding Proof</div>
              <div className="p-12 h-full flex items-center justify-center">
                 <RiskRadarChart categories={metadata.validation?.categories || {}} />
              </div>
            </div>
          </div>
          <div className="lg:col-span-4">
             <Card className="glass h-full border-l-4 border-l-primary shadow-brutal-dark">
              <CardContent className="p-0 flex flex-col h-full max-h-[600px]">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="font-display font-bold uppercase tracking-widest text-xs">Validation Issues</h3>
                  <Badge className="bg-red-500/20 text-red-400">{metadata.validation?.issues.length}</Badge>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                  {metadata.validation?.issues.map((issue) => (
                    <div key={issue.id} className="p-6 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={cn("w-4 h-4 mt-0.5", issue.severity === 'critical' ? 'text-red-500' : 'text-amber-500')} />
                        <div className="flex-1">
                          <p className="text-[11px] font-bold uppercase leading-tight">{issue.message}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-tighter">Fix: {issue.fix || issue.suggestion}</p>
                            <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-tighter">Impact: {issue.impact}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
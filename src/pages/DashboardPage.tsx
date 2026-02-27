import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/rie/StatsCard';
import { DependencyGraph } from '@/components/rie/DependencyGraph';
import { RepositoryMetadata } from '@/lib/rie-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Files, Code2, Database, Activity, Sparkles, PieChart as PieIcon, Info, ShieldCheck, AlertTriangle } from 'lucide-react';
import { chatService } from '@/lib/chat';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');
  const [metadata, setMetadata] = useState<RepositoryMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (sessionId) {
      chatService.switchSession(sessionId);
      fetchMetadata();
    } else {
      navigate('/');
    }
  }, [sessionId, navigate]);
  const fetchMetadata = async () => {
    try {
      const response = await chatService.getMessages();
      if (response.success && response.data) {
        const stateData = response.data as any;
        if (stateData.metadata) {
          setMetadata(stateData.metadata);
        }
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };
  if (isLoading) {
    return (
      <AppLayout container>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }
  if (!metadata) {
    return (
      <AppLayout container>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <Activity className="w-12 h-12 text-muted-foreground animate-pulse" />
          <h2 className="text-2xl font-semibold">No active analysis session</h2>
          <p className="text-muted-foreground">Upload a repository from the home page to start.</p>
        </div>
      </AppLayout>
    );
  }
  const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  return (
    <AppLayout container>
      <div className="space-y-8 animate-fade-in relative">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 z-10 relative">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{metadata.name}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              Repository Insights Dashboard <Info className="w-3 h-3" />
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/settings?session=${sessionId}`)}>Configure</Button>
            <Button
              onClick={() => navigate(`/studio?session=${sessionId}`)}
              className="bg-primary text-primary-foreground shadow-glow hover:scale-105 transition-all"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Documentation Studio
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 z-10 relative">
          <StatsCard label="Total Files" value={metadata.totalFiles.toString()} icon={<Files className="w-4 h-4" />} />
          <StatsCard label="Main Language" value={metadata.primaryLanguage} icon={<Code2 className="w-4 h-4" />} />
          <StatsCard label="Project Size" value={`${(metadata.totalSize / 1024).toFixed(1)} KB`} icon={<Database className="w-4 h-4" />} />
          <Card className="bg-primary text-primary-foreground border-none shadow-glow flex flex-col justify-center p-6">
            <div className="flex items-center justify-between mb-2">
               <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Health Score</span>
               <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex items-end gap-2">
               <h2 className="text-4xl font-black">{metadata.validation?.score || 0}</h2>
               <span className="text-sm font-bold opacity-60 mb-1.5">/ 100</span>
            </div>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 relative">
          <Card className="lg:col-span-8 bg-card/40 backdrop-blur-md border-border overflow-hidden flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Architecture Map</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><Info className="w-4 h-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                  <TooltipContent>Visualization of the top file-level relationships</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent className="flex-1">
              <DependencyGraph dependencies={metadata.dependencies} />
            </CardContent>
          </Card>
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-card/40 backdrop-blur-md border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Validation Engine</CardTitle>
                <Badge variant={metadata.validation?.score && metadata.validation.score > 80 ? 'default' : 'destructive'}>
                  {metadata.validation?.score && metadata.validation.score > 80 ? 'Healthy' : 'Issues Found'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                 {metadata.validation?.issues.slice(0, 3).map((issue, idx) => (
                   <div key={idx} className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex gap-3">
                      <AlertTriangle className={cn("w-4 h-4 shrink-0 mt-0.5", issue.severity === 'high' ? "text-destructive" : "text-amber-500")} />
                      <div className="space-y-1">
                        <p className="text-xs font-bold leading-none">{issue.message}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{issue.suggestion}</p>
                      </div>
                   </div>
                 ))}
                 {metadata.validation?.issues.length === 0 && (
                   <div className="text-center py-6 text-sm text-muted-foreground italic">No structural issues detected</div>
                 )}
              </CardContent>
            </Card>
            <Card className="bg-card/40 backdrop-blur-md border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Language DNA</CardTitle>
                <PieIcon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metadata.languages}
                      dataKey="fileCount"
                      nameKey="language"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      stroke="none"
                    >
                      {metadata.languages.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
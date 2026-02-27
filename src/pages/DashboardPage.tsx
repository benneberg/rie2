import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/rie/StatsCard';
import { DependencyGraph } from '@/components/rie/DependencyGraph';
import { RepositoryMetadata } from '@/lib/rie-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Files, Code2, Database, Activity, Sparkles, PieChart as PieIcon } from 'lucide-react';
import { chatService } from '@/lib/chat';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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
  }, [sessionId]);
  const fetchMetadata = async () => {
    try {
      const response = await chatService.getMessages();
      if (response.success && response.data) {
        // Correct casting to handle the metadata existence in ChatState
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
  const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  return (
    <AppLayout container>
      <div className="space-y-8 animate-fade-in">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{metadata.name}</h1>
            <p className="text-muted-foreground">Repository Insights Dashboard</p>
          </div>
          <Button 
            onClick={() => navigate(`/studio?session=${sessionId}`)}
            className="bg-gradient-primary shadow-glow hover:scale-105 transition-all"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Documentation Studio
          </Button>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard label="Total Files" value={metadata.totalFiles.toString()} icon={<Files className="w-4 h-4" />} />
          <StatsCard label="Main Language" value={metadata.primaryLanguage} icon={<Code2 className="w-4 h-4" />} />
          <StatsCard label="Project Size" value={`${(metadata.totalSize / 1024).toFixed(1)} KB`} icon={<Database className="w-4 h-4" />} />
          <StatsCard label="Dependencies" value={metadata.dependencies.length.toString()} icon={<Activity className="w-4 h-4" />} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Architecture Graph</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <DependencyGraph dependencies={metadata.dependencies} />
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Language DNA</CardTitle>
                <PieIcon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metadata.languages}
                      dataKey="fileCount"
                      nameKey="language"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {metadata.languages.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metadata.languages.slice(0, 5).map((lang, idx) => (
                  <div key={lang.language} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      <span>{lang.language}</span>
                    </div>
                    <span className="text-muted-foreground font-mono">{lang.percentage}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/rie/StatsCard';
import { FileTree } from '@/components/rie/FileTree';
import { RepositoryMetadata } from '@/lib/rie-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Files, Code2, Database, Activity } from 'lucide-react';
import { chatService } from '@/lib/chat';
export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const [metadata, setMetadata] = useState<RepositoryMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (sessionId) {
      chatService.switchSession(sessionId);
      fetchMetadata();
    }
  }, [sessionId]);
  const fetchMetadata = async () => {
    try {
      const response = await chatService.getMessages();
      if (response.success && response.data?.metadata) {
        setMetadata(response.data.metadata as any);
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
  return (
    <AppLayout container>
      <div className="space-y-8 animate-fade-in">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{metadata.name}</h1>
          <p className="text-muted-foreground">Repository Insights Dashboard</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard 
            label="Total Files" 
            value={metadata.totalFiles.toString()} 
            icon={<Files className="w-4 h-4" />} 
          />
          <StatsCard 
            label="Main Language" 
            value={metadata.primaryLanguage} 
            icon={<Code2 className="w-4 h-4" />} 
          />
          <StatsCard 
            label="Project Size" 
            value={`${(metadata.totalSize / 1024).toFixed(1)} KB`} 
            icon={<Database className="w-4 h-4" />} 
          />
          <StatsCard 
            label="Languages" 
            value={metadata.languages.length.toString()} 
            icon={<Activity className="w-4 h-4" />} 
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 overflow-hidden bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle>Architecture Map</CardTitle>
            </CardHeader>
            <CardContent>
              <FileTree structure={metadata.structure} />
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle>Language DNA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {metadata.languages.map((lang) => (
                <div key={lang.language} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{lang.language}</span>
                    <span className="text-muted-foreground">{lang.percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000" 
                      style={{ width: `${lang.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Save, RefreshCw, Layers, Shield, Zap, Filter } from 'lucide-react';
import { chatService } from '@/lib/chat';
import { toast } from 'sonner';
export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');
  const [config, setConfig] = useState({
    excludePatterns: ['node_modules', '.git'],
    analysisMode: 'standard' as 'standard' | 'deep',
    llmAugmentation: true,
    maxFileSize: 10
  });
  const [newPattern, setNewPattern] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadConfig = useCallback(async () => {
    try {
      const response = await chatService.getMessages();
      if (response.success && response.data?.config) {
        setConfig(response.data.config);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }, []);
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    loadConfig();
  }, [sessionId, navigate, loadConfig]);
  const handleSave = async () => {
    if (!sessionId) return;
    const toastId = toast.loading('Persisting configuration...');
    try {
      const response = await fetch(`/api/chat/${sessionId}/update-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Configuration updated!', { id: toastId });
      } else {
        throw new Error(result.error || 'Failed to update');
      }
    } catch (err) {
      toast.error('Failed to update settings: ' + (err as Error).message, { id: toastId });
    }
  };
  const triggerRescan = async () => {
    if (!sessionId || isRefreshing) return;
    setIsRefreshing(true);
    const toastId = toast.loading('Re-scanning repository with new configuration...');
    try {
      const stateResponse = await chatService.getMessages();
      const currentMetadata = stateResponse.data?.metadata;
      if (!currentMetadata) throw new Error('No repository metadata found for this session');
      const response = await fetch(`/api/analyze/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentMetadata.name,
          files: currentMetadata.structure
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Re-analysis complete!', { id: toastId });
        navigate(`/dashboard?session=${sessionId}`);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error('Re-scan failed: ' + (err as Error).message, { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  };
  const addPattern = () => {
    if (newPattern && !config.excludePatterns.includes(newPattern)) {
      setConfig({ ...config, excludePatterns: [...config.excludePatterns, newPattern] });
      setNewPattern('');
    }
  };
  const removePattern = (p: string) => {
    setConfig({ ...config, excludePatterns: config.excludePatterns.filter(item => item !== p) });
  };
  return (
    <AppLayout container>
      <div className="space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Session Settings</h1>
          <p className="text-muted-foreground">Manage analysis parameters and operational behavior for this repository.</p>
        </header>
        <Tabs defaultValue="patterns" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-secondary/30 mb-8 p-1">
            <TabsTrigger value="patterns" className="flex gap-2"><Filter className="w-4 h-4" /> Scan Patterns</TabsTrigger>
            <TabsTrigger value="analysis" className="flex gap-2"><Layers className="w-4 h-4" /> Analysis Mode</TabsTrigger>
            <TabsTrigger value="safety" className="flex gap-2"><Shield className="w-4 h-4" /> Guardrails</TabsTrigger>
          </TabsList>
          <TabsContent value="patterns">
            <Card className="bg-card/40 backdrop-blur-md border-border">
              <CardHeader>
                <CardTitle>Exclusion Patterns</CardTitle>
                <CardDescription>Files matching these patterns will be ignored during RIE analysis.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. dist, .next, *.log" 
                    value={newPattern} 
                    onChange={(e) => setNewPattern(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && addPattern()}
                  />
                  <Button onClick={addPattern}>Add Pattern</Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {config.excludePatterns.map(p => (
                    <Badge key={p} variant="secondary" className="pl-3 pr-2 py-1.5 flex items-center gap-2 border border-border/50">
                      <span className="font-mono text-xs">{p}</span>
                      <button onClick={() => removePattern(p)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analysis">
            <Card className="bg-card/40 backdrop-blur-md border-border">
              <CardHeader>
                <CardTitle>Scan Depth & Intelligence</CardTitle>
                <CardDescription>Control how the RIE engine processes source files.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-secondary/20 hover:bg-secondary/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">Deep Analysis Mode</Label>
                    <p className="text-xs text-muted-foreground">Enables multi-pass structural resolution for complex projects.</p>
                  </div>
                  <Switch 
                    checked={config.analysisMode === 'deep'} 
                    onCheckedChange={(checked) => setConfig({...config, analysisMode: checked ? 'deep' : 'standard'})} 
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-secondary/20 hover:bg-secondary/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">LLM Context Enrichment</Label>
                    <p className="text-xs text-muted-foreground">Allows AI to ingest architectural metadata during conversations.</p>
                  </div>
                  <Switch 
                    checked={config.llmAugmentation} 
                    onCheckedChange={(checked) => setConfig({...config, llmAugmentation: checked})} 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="safety">
            <Card className="bg-card/40 backdrop-blur-md border-border">
              <CardHeader>
                <CardTitle>Resource Guardrails</CardTitle>
                <CardDescription>Limit system intensity to stay within Cloudflare Worker limits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                     <Label>Max Individual File Size (MB)</Label>
                     <span className="text-xs font-mono font-bold text-primary">{config.maxFileSize}MB</span>
                   </div>
                   <Input 
                     type="range"
                     min="1"
                     max="50"
                     value={config.maxFileSize} 
                     onChange={(e) => setConfig({...config, maxFileSize: parseInt(e.target.value)})} 
                     className="cursor-pointer"
                   />
                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-1.5">
                     <Zap className="w-3 h-3 text-amber-500" /> Optimal Range: 5MB - 20MB
                   </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <div className="flex justify-between items-center pt-8 border-t">
           <Button variant="ghost" onClick={() => navigate(-1)}>Discard Changes</Button>
           <div className="flex gap-3">
             <Button variant="outline" onClick={triggerRescan} disabled={isRefreshing}>
               <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} /> 
               Apply & Re-scan
             </Button>
             <Button className="bg-primary shadow-glow px-8" onClick={handleSave}>
               <Save className="w-4 h-4 mr-2" /> Save Configuration
             </Button>
           </div>
        </div>
      </div>
    </AppLayout>
  );
}
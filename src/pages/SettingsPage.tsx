import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
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
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    loadConfig();
  }, [sessionId]);
  const loadConfig = async () => {
    const response = await chatService.getMessages();
    if (response.success && response.data?.config) {
      setConfig(response.data.config);
    }
  };
  const handleSave = async () => {
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
      }
    } catch (err) {
      toast.error('Failed to update settings', { id: toastId });
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
          <TabsList className="grid w-full grid-cols-3 bg-secondary/30 mb-8">
            <TabsTrigger value="patterns" className="flex gap-2"><Filter className="w-4 h-4" /> Scan Patterns</TabsTrigger>
            <TabsTrigger value="analysis" className="flex gap-2"><Layers className="w-4 h-4" /> Analysis Mode</TabsTrigger>
            <TabsTrigger value="safety" className="flex gap-2"><Shield className="w-4 h-4" /> Safety & Safety</TabsTrigger>
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
                  <Button onClick={addPattern} size="sm">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.excludePatterns.map(p => (
                    <Badge key={p} variant="secondary" className="pl-3 pr-1 py-1 flex items-center gap-2">
                      {p}
                      <button onClick={() => removePattern(p)} className="hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analysis">
            <Card className="bg-card/40 backdrop-blur-md border-border">
              <CardHeader>
                <CardTitle>Scan Depth</CardTitle>
                <CardDescription>Determine how deep the RIE engine should traverse the file graph.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-secondary/20">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">Deep Analysis Mode</Label>
                    <p className="text-xs text-muted-foreground">Increases CPU usage to resolve complex class inheritance.</p>
                  </div>
                  <Switch 
                    checked={config.analysisMode === 'deep'} 
                    onCheckedChange={(checked) => setConfig({...config, analysisMode: checked ? 'deep' : 'standard'})} 
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-secondary/20">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">AI Context Augmentation</Label>
                    <p className="text-xs text-muted-foreground">Injects repo structure into every chat prompt.</p>
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
                <CardDescription>Limit analysis intensity to stay within Worker limits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                   <Label>Max File Size (MB)</Label>
                   <Input 
                     type="number" 
                     value={config.maxFileSize} 
                     onChange={(e) => setConfig({...config, maxFileSize: parseInt(e.target.value)})} 
                   />
                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Recommended: 10-25MB</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <div className="flex justify-between items-center pt-8 border-t">
           <Button variant="outline" onClick={() => navigate(-1)}>Discard Changes</Button>
           <div className="flex gap-2">
             <Button variant="secondary" onClick={() => toast.info('Re-scan triggered')}><RefreshCw className="w-4 h-4 mr-2" /> Re-scan Now</Button>
             <Button className="bg-primary shadow-soft px-8" onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Config</Button>
           </div>
        </div>
      </div>
    </AppLayout>
  );
}
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
import { Trash2, Save, RefreshCw, Layers, Shield, Filter } from 'lucide-react';
import { chatService } from '@/lib/chat';
import { toast, Toaster } from 'sonner';
import { cn } from '@/lib/utils';
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
      console.error('CFG_ERR', err);
    }
  }, []);
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    loadConfig();
  }, [sessionId, loadConfig]);
  const handleSave = async () => {
    if (!sessionId) return;
    const toastId = toast.loading('PERSISTING_SESSION_CONFIG...');
    try {
      const response = await fetch(`/api/chat/${sessionId}/update-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });
      if (response.ok) {
        toast.success('CONFIG_SYNC_SUCCESS', { id: toastId });
      }
    } catch (err) {
      toast.error('SYNC_FAILURE', { id: toastId });
    }
  };
  return (
    <AppLayout container>
      <Toaster richColors position="top-center" theme="dark" />
      <div className="space-y-12">
        <header className="space-y-2">
          <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-white/20">SYSTEM_PARAMETERS</Badge>
          <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter leading-none">Settings</h1>
        </header>
        <Tabs defaultValue="patterns" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/5 h-14 mb-12">
            <TabsTrigger value="patterns" className="text-[10px] font-black uppercase tracking-widest">Exclude Filters</TabsTrigger>
            <TabsTrigger value="analysis" className="text-[10px] font-black uppercase tracking-widest">Core Engine</TabsTrigger>
            <TabsTrigger value="safety" className="text-[10px] font-black uppercase tracking-widest">Guardrails</TabsTrigger>
          </TabsList>
          <TabsContent value="patterns">
            <Card className="glass shadow-brutal-dark">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-display font-bold uppercase tracking-widest text-xs">Exclusion Matrix</CardTitle>
                <CardDescription className="text-[10px] font-mono opacity-50">PATTERNS_IGNORED_BY_RIE_ENGINE</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex gap-4">
                  <Input 
                    placeholder="E.G. NODE_MODULES, *.LOG" 
                    className="bg-black/40 border-white/10 font-mono text-xs tracking-widest"
                    value={newPattern}
                    onChange={(e) => setNewPattern(e.target.value)}
                    onKeyDown={(e) => {
                      if(e.key === 'Enter' && newPattern) {
                        setConfig({...config, excludePatterns: [...config.excludePatterns, newPattern]});
                        setNewPattern('');
                      }
                    }}
                  />
                  <Button onClick={() => {
                    if(newPattern) {
                      setConfig({...config, excludePatterns: [...config.excludePatterns, newPattern]});
                      setNewPattern('');
                    }
                  }} className="btn-brutal-dark px-8">Add</Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {config.excludePatterns.map(p => (
                    <Badge key={p} className="bg-white/5 border border-white/10 px-4 py-2 flex items-center gap-3">
                      <span className="font-mono text-[10px] tracking-widest">{p}</span>
                      <Trash2 className="w-3 h-3 opacity-30 cursor-pointer hover:opacity-100 hover:text-red-500" onClick={() => setConfig({...config, excludePatterns: config.excludePatterns.filter(i => i !== p)})} />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analysis">
             <Card className="glass shadow-brutal-dark">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center justify-between p-6 bg-white/5 border border-white/5">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Deep Resolution Mode</Label>
                      <p className="text-[9px] font-mono opacity-50">ENABLE_MULTI_PASS_STRUCTURAL_WALK</p>
                    </div>
                    <Switch checked={config.analysisMode === 'deep'} onCheckedChange={(v) => setConfig({...config, analysisMode: v ? 'deep' : 'standard'})} />
                  </div>
                  <div className="flex items-center justify-between p-6 bg-white/5 border border-white/5">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Context Augmentation</Label>
                      <p className="text-[9px] font-mono opacity-50">INJECT_METADATA_INTO_LLM_LAYERS</p>
                    </div>
                    <Switch checked={config.llmAugmentation} onCheckedChange={(v) => setConfig({...config, llmAugmentation: v})} />
                  </div>
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
        <div className="flex justify-between items-center pt-12 border-t border-white/5">
           <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100" onClick={() => navigate(-1)}>Cancel</Button>
           <div className="flex gap-4">
             <Button variant="outline" className="btn-brutal-dark px-8">Reset_Defaults</Button>
             <Button onClick={handleSave} className="btn-brutal-amber px-12">Commit_Config</Button>
           </div>
        </div>
      </div>
    </AppLayout>
  );
}
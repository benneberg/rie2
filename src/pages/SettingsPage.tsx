import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Save, Download, Cpu, Shield } from 'lucide-react';
import { chatService } from '@/lib/chat';
import { toast, Toaster } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { RIEConfig } from '@/lib/rie-types';
export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');
  const [config, setConfig] = useState<RIEConfig>({
    excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next'],
    analysisMode: 'standard',
    llmAugmentation: true,
    maxFileSize: 10 * 1024 * 1024,
    aiModel: 'gpt-4o-mini',
    maxTokens: 4000
  });
  const [rawConfig, setRawConfig] = useState('');
  const loadConfig = useCallback(async () => {
    try {
      const response = await chatService.getMessages();
      if (response.success && response.data?.config) {
        const remoteConfig = response.data.config as RIEConfig;
        setConfig(remoteConfig);
        setRawConfig(JSON.stringify(remoteConfig, null, 2));
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
  }, [sessionId, loadConfig, navigate]);
  const handleSave = async () => {
    if (!sessionId) return;
    const toastId = toast.loading('COMMITTING_ENGINE_PARAMETERS...');
    try {
      const updatedConfig: RIEConfig = JSON.parse(rawConfig);
      const response = await fetch(`/api/chat/${sessionId}/update-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updatedConfig })
      });
      if (response.ok) {
        setConfig(updatedConfig);
        toast.success('CONFIGURATION_SYNCED', { id: toastId });
      } else {
        throw new Error('SERVER_REJECTED_CONFIG');
      }
    } catch (err) {
      toast.error('INVALID_CONFIGURATION_STRUCTURE', { 
        id: toastId, 
        description: 'Ensure JSON is valid and matches RIEConfig schema.' 
      });
    }
  };
  const updateField = (updates: Partial<RIEConfig>) => {
    const next = { ...config, ...updates };
    setConfig(next);
    setRawConfig(JSON.stringify(next, null, 2));
  };
  const handleExport = () => {
    const blob = new Blob([rawConfig], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rie.${sessionId?.slice(0, 8)}.config.json`;
    a.click();
  };
  return (
    <AppLayout container>
      <Toaster richColors position="top-center" theme="dark" />
      <div className="space-y-12">
        <header className="space-y-2 flex justify-between items-end">
          <div>
            <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-primary/20 text-primary uppercase">Core_Config_V4.2</Badge>
            <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter leading-none">System</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="btn-brutal-dark h-auto py-2"><Download className="w-4 h-4 mr-2" /> Export</Button>
            <Button onClick={handleSave} className="btn-brutal-amber h-auto py-2"><Save className="w-4 h-4 mr-2" /> Commit</Button>
          </div>
        </header>
        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/5 h-14 mb-8">
            <TabsTrigger value="visual" className="text-[10px] font-black uppercase tracking-widest">Visual Editor</TabsTrigger>
            <TabsTrigger value="raw" className="text-[10px] font-black uppercase tracking-widest">Raw Config (.json)</TabsTrigger>
          </TabsList>
          <TabsContent value="visual">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="glass border-l-4 border-l-cyan-500 shadow-brutal-dark">
                <CardHeader>
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> AI_ENGINE_PARAMETERS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Core_Model</Label>
                    <Input
                      value={config.aiModel}
                      onChange={(e) => updateField({ aiModel: e.target.value })}
                      className="bg-black/40 border-white/10 text-xs font-mono py-6"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                    <span className="text-[10px] font-black uppercase tracking-widest">Context_Injection</span>
                    <Switch 
                      checked={config.llmAugmentation} 
                      onCheckedChange={(v) => updateField({ llmAugmentation: v })} 
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass border-l-4 border-l-amber-500 shadow-brutal-dark">
                <CardHeader>
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> SECURITY_FILTERS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Exclusion_Matrix</Label>
                    <div className="flex flex-wrap gap-2">
                      {config.excludePatterns.map(p => (
                        <Badge key={p} className="bg-white/5 border border-white/10 text-[9px] font-mono py-1 px-3">
                          {p} <Trash2 className="w-3 h-3 ml-2 cursor-pointer hover:text-red-500" onClick={() => {
                            updateField({ excludePatterns: config.excludePatterns.filter(i => i !== p) });
                          }} />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="raw">
            <Card className="glass shadow-brutal-dark overflow-hidden">
              <div className="bg-zinc-950 p-6">
                <Textarea
                  value={rawConfig}
                  onChange={(e) => setRawConfig(e.target.value)}
                  className="min-h-[500px] font-mono text-xs bg-transparent border-none focus-visible:ring-0 text-emerald-500 leading-relaxed scrollbar-thin"
                />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Download, Cpu, Shield, Brain, ListPlus, Trash2 } from 'lucide-react';
import { chatService } from '@/lib/chat';
import { toast, Toaster } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { RIEConfig, ProjectDomainType, ProjectPhilosophy, RoadmapItem } from '@/lib/rie-types';
export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');
  const [config, setConfig] = useState<RIEConfig>({
    excludePatterns: ['node_modules', '.git'],
    analysisMode: 'standard',
    llmAugmentation: true,
    maxFileSize: 10 * 1024 * 1024,
    aiModel: 'gpt-4o-mini',
    maxTokens: 4000,
    maxDepth: 10,
    temperature: 0.7,
    outputDir: '.rie',
    strictValidation: false,
    projectType: 'auto',
    includeGlossary: true,
    includeRoadmap: true,
    customPhilosophy: {
      purpose: '',
      positioning: '',
      constraints: [],
      evolution: '',
      interoperability: ''
    },
    targetRoadmap: []
  });
  const loadConfig = useCallback(async () => {
    const response = await chatService.getMessages();
    if (response.success && response.data?.config) {
      setConfig(response.data.config as RIEConfig);
    }
  }, []);
  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    loadConfig();
  }, [sessionId, loadConfig, navigate]);
  const handleSave = async () => {
    if (!sessionId) return;
    const toastId = toast.loading('SYNCING_v2.0_ENGINE...');
    try {
      const response = await fetch(`/api/chat/${sessionId}/update-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });
      if (response.ok) toast.success('v2.0_CONFIG_COMMITTED', { id: toastId });
    } catch (err) {
      toast.error('SYNC_FAILURE', { id: toastId });
    }
  };
  const updatePhilosophy = (field: keyof ProjectPhilosophy, val: any) => {
    setConfig({ ...config, customPhilosophy: { ...(config.customPhilosophy || {}), [field]: val } } as RIEConfig);
  };
  return (
    <AppLayout container>
      <Toaster richColors position="top-center" theme="dark" />
      <div className="space-y-12">
        <header className="flex justify-between items-end">
          <div>
            <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-primary/20 text-primary">v2.0_GOVERNANCE</Badge>
            <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter">Governance</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} className="btn-brutal-amber h-12"><Save className="w-4 h-4 mr-2" /> Commit v2.0</Button>
          </div>
        </header>
        <Tabs defaultValue="intelligence">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/5 h-14">
            <TabsTrigger value="intelligence" className="text-[10px] font-black uppercase tracking-widest">Domain Intelligence</TabsTrigger>
            <TabsTrigger value="policy" className="text-[10px] font-black uppercase tracking-widest">Thresholds</TabsTrigger>
            <TabsTrigger value="roadmap" className="text-[10px] font-black uppercase tracking-widest">Roadmap Override</TabsTrigger>
          </TabsList>
          <TabsContent value="intelligence" className="space-y-8 mt-8">
            <Card className="glass border-l-4 border-l-cyan-500">
              <CardHeader><CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Brain className="w-4 h-4" /> Philosophy Definition</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold opacity-50">Project Purpose</Label>
                  <Input value={config.customPhilosophy?.purpose} onChange={(e) => updatePhilosophy('purpose', e.target.value)} placeholder="Mission statement..." className="bg-black/40 border-white/10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold opacity-50">Evolution Strategy</Label>
                    <Input value={config.customPhilosophy?.evolution} onChange={(e) => updatePhilosophy('evolution', e.target.value)} className="bg-black/40 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold opacity-50">Interoperability</Label>
                    <Input value={config.customPhilosophy?.interoperability} onChange={(e) => updatePhilosophy('interoperability', e.target.value)} className="bg-black/40 border-white/10" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="roadmap" className="mt-8">
            <Card className="glass border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><ListPlus className="w-4 h-4" /> Target Roadmap</CardTitle>
                <Button size="sm" variant="outline" className="text-[8px] font-bold h-7" onClick={() => setConfig({...config, targetRoadmap: [...(config.targetRoadmap || []), { version: 'v1.1', status: 'planned', features: [] }]})}>
                  Add Entry
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.targetRoadmap?.map((item, i) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-lg grid grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label className="text-[8px] uppercase opacity-40">Ver</Label>
                      <Input value={item.version} className="bg-black/40 h-8" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[8px] uppercase opacity-40">Status</Label>
                      <Select value={item.status}>
                        <SelectTrigger className="bg-black/40 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-midnight"><SelectItem value="current">Current</SelectItem><SelectItem value="queued">Queued</SelectItem><SelectItem value="planned">Planned</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <Button variant="ghost" className="text-red-500 h-8" onClick={() => {
                        const next = [...(config.targetRoadmap || [])]; next.splice(i, 1); setConfig({...config, targetRoadmap: next});
                      }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
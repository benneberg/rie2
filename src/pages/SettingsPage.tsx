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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save, Download, Cpu, Shield, Gavel, History, Globe, CpuIcon, TerminalSquare } from 'lucide-react';
import { chatService } from '@/lib/chat';
import { toast, Toaster } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { RIEConfig, ProjectDomainType } from '@/lib/rie-types';
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
    maxTokens: 4000,
    maxDepth: 10,
    temperature: 0.7,
    outputDir: '.rie',
    strictValidation: false,
    docVerbosity: 'standard',
    docMode: 'technical',
    projectType: 'auto',
    includeGlossary: true,
    includeRoadmap: true,
    policy: {
      minSecurityScore: 70,
      minStructureScore: 60,
      minCompletenessScore: 50,
      minConsistencyScore: 60,
      maxRiskIndex: 80,
      failOnCritical: true
    }
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
  const updatePolicy = (policyUpdates: any) => {
    const nextPolicy = { ...(config.policy || {}), ...policyUpdates };
    const next = { ...config, policy: nextPolicy };
    setConfig(next as RIEConfig);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12 space-y-12">
        <header className="space-y-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-primary/20 text-primary uppercase">Core_Config_V4.2.1</Badge>
            <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter leading-none">System</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="btn-brutal-dark h-auto py-2"><Download className="w-4 h-4 mr-2" /> Export</Button>
            <Button onClick={handleSave} className="btn-brutal-amber h-auto py-2"><Save className="w-4 h-4 mr-2" /> Commit</Button>
          </div>
        </header>
        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/5 h-14 mb-8">
            <TabsTrigger value="visual" className="text-[10px] font-black uppercase tracking-widest">Visual Editor</TabsTrigger>
            <TabsTrigger value="policy" className="text-[10px] font-black uppercase tracking-widest">Governance & Policy</TabsTrigger>
            <TabsTrigger value="raw" className="text-[10px] font-black uppercase tracking-widest">Raw Config (.json)</TabsTrigger>
          </TabsList>
          <TabsContent value="visual">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-8">
                <Card className="glass border-l-4 border-l-cyan-500 shadow-brutal-dark">
                  <CardHeader>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                      <Cpu className="w-4 h-4" /> DOMAIN_CONTEXT_ENGINE
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Project Type Archetype</Label>
                      <Select 
                        value={config.projectType} 
                        onValueChange={(v) => updateField({ projectType: v as ProjectDomainType })}
                      >
                        <SelectTrigger className="bg-black/40 border-white/10 h-12 font-mono text-xs uppercase tracking-widest">
                          <SelectValue placeholder="Select Domain" />
                        </SelectTrigger>
                        <SelectContent className="bg-midnight border-white/10 text-foreground">
                          <SelectItem value="auto">Auto-Detect Domain</SelectItem>
                          <SelectItem value="web">Web Application</SelectItem>
                          <SelectItem value="firmware">Firmware / Embedded</SelectItem>
                          <SelectItem value="cli">CLI / System Tool</SelectItem>
                          <SelectItem value="general">General Software</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[9px] font-mono text-white/30 uppercase leading-relaxed">
                        Influences README synthesis templates, supported boards detection, and UI interop narratives.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass border-l-4 border-l-purple-500 shadow-brutal-dark">
                  <CardHeader>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                      <History className="w-4 h-4" /> README_V4_FEATURES
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest block">Automated Glossary</span>
                        <p className="text-[8px] font-mono opacity-40 uppercase">Define technical terms automatically</p>
                      </div>
                      <Switch
                        checked={config.includeGlossary}
                        onCheckedChange={(v) => updateField({ includeGlossary: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest block">Roadmap Tables</span>
                        <p className="text-[8px] font-mono opacity-40 uppercase">Generate version-status matrices</p>
                      </div>
                      <Switch
                        checked={config.includeRoadmap}
                        onCheckedChange={(v) => updateField({ includeRoadmap: v })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-8">
                <Card className="glass border-l-4 border-l-amber-500 shadow-brutal-dark">
                  <CardHeader>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> AI_ENGINE_PARAMETERS
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
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Synthesis Persona</Label>
                      <RadioGroup
                        value={config.docMode || 'technical'}
                        onValueChange={(v) => updateField({ docMode: v as any })}
                        className="grid grid-cols-1 gap-2"
                      >
                        <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer">
                          <RadioGroupItem value="technical" id="m-technical" />
                          <Label htmlFor="m-technical" className="text-xs font-bold cursor-pointer">Technical (Architectural focus)</Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer">
                          <RadioGroupItem value="project" id="m-project" />
                          <Label htmlFor="m-project" className="text-xs font-bold cursor-pointer">Project (Stakeholder focus)</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass border-l-4 border-l-red-500 shadow-brutal-dark">
                  <CardHeader>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" /> EXCLUSION_MATRIX
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {config.excludePatterns.map(p => (
                        <Badge key={p} className="bg-white/5 border border-white/10 text-[9px] font-mono py-1 px-3">
                          {p} <Trash2 className="w-3 h-3 ml-2 cursor-pointer hover:text-red-500" onClick={() => {
                            updateField({ excludePatterns: config.excludePatterns.filter(i => i !== p) });
                          }} />
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="policy">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <Card className="glass md:col-span-2 shadow-brutal-dark">
                 <CardHeader>
                   <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Gavel className="w-4 h-4" /> Threshold_Management</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                       {[
                         { label: 'Security_Threshold', field: 'minSecurityScore' },
                         { label: 'Structure_Threshold', field: 'minStructureScore' },
                         { label: 'Completeness_Threshold', field: 'minCompletenessScore' },
                         { label: 'Max_Risk_Index', field: 'maxRiskIndex' }
                       ].map(item => (
                         <div key={item.field} className="space-y-4">
                            <div className="flex justify-between text-[10px] font-mono font-bold uppercase tracking-widest">
                              <span>{item.label}</span>
                              <span className="text-primary">{(config.policy as any)?.[item.field] || 0}%</span>
                            </div>
                            <input
                              type="range" min="0" max="100"
                              value={(config.policy as any)?.[item.field] || 0}
                              onChange={(e) => updatePolicy({ [item.field]: parseInt(e.target.value) })}
                              className="w-full h-1 bg-white/10 appearance-none rounded-lg cursor-pointer accent-primary"
                            />
                         </div>
                       ))}
                    </div>
                 </CardContent>
               </Card>
               <Card className="glass shadow-brutal-dark">
                  <CardHeader>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><History className="w-4 h-4" /> Baseline_History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                     <History className="w-12 h-12" />
                     <span className="text-[10px] font-mono uppercase">V1_MASTER_SNAPSHOT<br/>2024-05-12 14:02</span>
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
import { Agent } from 'agents';
import JSZip from 'jszip';
import type { Env } from './core-utils';
import type { ChatState } from './types';
import { ChatHandler } from './chat';
import { API_RESPONSES } from './config';
import { createMessage, createStreamResponse, createEncoder } from './utils';
import { RIEAnalyzer } from './rie-analyzer';
import { RIEValidator } from './rie-validator';
import { RepositorySource, LLMContext, RIEConfig } from '../src/lib/rie-types';
import { parseGitHubUrl } from '../src/lib/utils';
export class ChatAgent extends Agent<Env, ChatState> {
  private chatHandler?: ChatHandler;
  initialState: ChatState = {
    messages: [],
    sessionId: crypto.randomUUID(),
    isProcessing: false,
    model: 'gpt-4o-mini',
    config: {
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
      policy: {
        minSecurityScore: 70,
        minStructureScore: 60,
        minCompletenessScore: 50,
        minConsistencyScore: 60,
        maxRiskIndex: 80,
        failOnCritical: true
      }
    }
  };
  async onStart(): Promise<void> {
    this.chatHandler = new ChatHandler(
      this.env.CF_AI_BASE_URL,
      this.env.CF_AI_API_KEY,
      this.state.model
    );
  }
  async onRequest(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const method = request.method;
      const path = url.pathname;
      if (method === 'GET' && path === '/messages') return this.handleGetMessages();
      if (method === 'POST' && path === '/chat') return this.handleChatMessage(await request.json());
      if (method === 'DELETE' && path === '/clear') return this.handleClearMessages();
      if (method === 'POST' && path === '/model') return this.handleModelUpdate(await request.json());
      if (method === 'POST' && path === '/analyze') return this.handleAnalyze(await request.json());
      if (method === 'POST' && path === '/generate-docs') return this.handleGenerateDocs(await request.json());
      if (method === 'POST' && path === '/save-docs') return this.handleSaveDocs(await request.json());
      if (method === 'POST' && path === '/update-config') return this.handleUpdateConfig(await request.json());
      if (method === 'POST' && path === '/create-baseline') return this.handleCreateBaseline();
      if (method === 'POST' && path === '/compare-baseline') return this.handleCompareBaseline();
      if (method === 'POST' && path === '/update-policy') return this.handleUpdatePolicy(await request.json());
      if (method === 'GET' && path === '/llm-context') return this.handleGetLLMContext();
      if (method === 'POST' && path === '/export-report') return this.handleExportReport();
      return Response.json({ success: false, error: API_RESPONSES.NOT_FOUND }, { status: 404 });
    } catch (error) {
      console.error('Agent Request Error:', error);
      return Response.json({ success: false, error: API_RESPONSES.INTERNAL_ERROR }, { status: 500 });
    }
  }
  private handleGetMessages(): Response {
    return Response.json({ success: true, data: this.state });
  }
  private async handleUpdateConfig(body: { config: RIEConfig }): Promise<Response> {
    if (!body.config || typeof body.config !== 'object') {
      return Response.json({ success: false, error: 'INVALID_CONFIG_FORMAT' }, { status: 400 });
    }
    this.setState({ ...this.state, config: { ...this.state.config, ...body.config } });
    return Response.json({ success: true, config: this.state.config });
  }
  private async handleUpdatePolicy(body: { policy: any }): Promise<Response> {
    const config = { ...this.state.config, policy: body.policy };
    this.setState({ ...this.state, config });
    if (this.state.metadata) {
      const metadata = { ...this.state.metadata, config };
      const validation = await RIEValidator.validate(metadata);
      this.setState({ ...this.state, metadata: { ...metadata, validation } });
    }
    return Response.json({ success: true, policy: config.policy });
  }
  private async handleCreateBaseline(): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false, error: 'Analyze first' }, { status: 400 });
    const metadata = { ...this.state.metadata, baseline: JSON.parse(JSON.stringify(this.state.metadata)) };
    this.setState({ ...this.state, metadata });
    return Response.json({ success: true });
  }
  private async handleCompareBaseline(): Promise<Response> {
    if (!this.state.metadata || !this.state.metadata.baseline) {
      return Response.json({ success: false, error: 'No baseline found' }, { status: 400 });
    }
    const { RIEDriftEngine } = await import('./rie-drift');
    const drift = RIEDriftEngine.compare(this.state.metadata, this.state.metadata.baseline);
    const metadata = { ...this.state.metadata, drift };
    this.setState({ ...this.state, metadata });
    return Response.json({ success: true, drift });
  }
  private async handleExportReport(): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false, error: 'No data to export' }, { status: 400 });
    return Response.json({ success: true, metadata: this.state.metadata });
  }
  private async handleGetLLMContext(): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false, error: 'Metadata empty' }, { status: 400 });
    const meta = this.state.metadata;
    const context: LLMContext = {
      projectName: meta.name || 'Unknown',
      summary: meta.documentation?.['summary'] || '',
      healthScore: meta.validation?.score || 0,
      primaryLanguage: meta.primaryLanguage || 'Unknown',
      structure: (meta.structure || []).slice(0, 100).map(f => f.path || ''),
      dependencies: meta.dependencies || [],
      excerpts: {}
    };
    return Response.json({ success: true, context });
  }
  private async handleSaveDocs(body: { documentation: Record<string, string> }): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false, error: 'Metadata not initialized' }, { status: 400 });
    const updatedMetadata = {
      ...this.state.metadata,
      documentation: { ...(this.state.metadata.documentation || {}), ...body.documentation }
    };
    this.setState({ ...this.state, metadata: updatedMetadata });
    return Response.json({ success: true, documentation: updatedMetadata.documentation });
  }
  private async handleAnalyze(body: { files?: any[], url?: string, name?: string }): Promise<Response> {
    const repoName = body.name || "Repository";
    let analysisFiles = body.files || [];
    let source: RepositorySource = { type: 'upload' };
    if (body.url) {
      const parsed = parseGitHubUrl(body.url);
      if (parsed) {
        const { owner, repo, ref } = parsed;
        const targetRef = ref || 'main';
        source = { type: 'github', url: body.url, repo: `${owner}/${repo}`, ref: targetRef };
        try {
          const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${targetRef}`;
          const res = await fetch(zipUrl, { headers: { 'User-Agent': 'ArchLens-Agent' } });
          if (!res.ok) throw new Error(`GitHub Fetch Failed: ${res.statusText}`);
          const zip = await JSZip.loadAsync(await res.arrayBuffer());
          analysisFiles = Object.entries(zip.files)
            .filter(([_, f]) => !f.dir)
            .map(([path, f]) => ({
              name: path.split('/').slice(1).join('/'),
              size: (f as any)._data?.uncompressedSize || 0,
              type: 'file'
            }))
            .filter(f => f.name);
        } catch (e) {
          return Response.json({ success: false, error: `Git Load Failed: ${e}` }, { status: 500 });
        }
      }
    }
    const metadata = await RIEAnalyzer.analyze(repoName, analysisFiles, this.state.config);
    metadata.validation = await RIEValidator.validate(metadata);
    metadata.source = source;
    metadata.status = 'completed';
    if (this.state.metadata?.baseline) {
      metadata.baseline = this.state.metadata.baseline;
      const { RIEDriftEngine } = await import('./rie-drift');
      metadata.drift = RIEDriftEngine.compare(metadata, metadata.baseline);
    }
    if (this.chatHandler) {
      const driftText = metadata.drift ? ` ARCH DRIFT: ${metadata.drift.delta > 0 ? '+' : ''}${metadata.drift.delta}%. Regressions: ${metadata.drift.regressions.join(', ')}.` : '';
      const summaryPrompt = `Perform an architectural summary for project "${repoName}". Health: ${metadata.validation?.score || 0}%. Files: ${metadata.totalFiles || 0}.${driftText} Highlight core tech debt based on risk metrics (coupling: ${metadata.validation?.riskMetrics?.couplingIndex || 'N/A'}).`;
      try {
        const summary = await this.chatHandler.processMessage(summaryPrompt, []);
        if (!metadata.documentation) metadata.documentation = {};
        metadata.documentation['summary'] = summary.content;
      } catch (e) {
        console.warn('AI Summary generation failed:', e);
      }
    }
    this.setState({ ...this.state, metadata });
    return Response.json({ success: true, metadata });
  }
  private async handleChatMessage(body: { message: string; model?: string; stream?: boolean }): Promise<Response> {
    const { message, model, stream } = body;
    if (model && model !== this.state.model) {
      this.setState({ ...this.state, model });
      this.chatHandler?.updateModel(model);
    }
    const userMessage = createMessage('user', message.trim());
    this.setState({ ...this.state, messages: [...this.state.messages, userMessage], isProcessing: true });
    const metaContext = this.state.metadata ?
      `CONTEXT: ArchLens Scan for "${this.state.metadata.name || 'Unknown'}". Health Score: ${this.state.metadata.validation?.score || 0}/100. Structure: ${this.state.metadata.isMonorepo ? 'Monorepo' : 'Monolith'}.`
      : `CONTEXT: General ArchLens Assistant.`;
    try {
      if (!this.chatHandler) throw new Error('Chat handler not initialized');
      if (stream) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = createEncoder();
        (async () => {
          try {
            const response = await this.chatHandler!.processMessage(`${metaContext}\n\nQUERY: ${message}`, this.state.messages, (chunk) => {
              writer.write(encoder.encode(chunk));
            });
            const assistantMessage = createMessage('assistant', response.content);
            this.setState({ ...this.state, messages: [...this.state.messages, assistantMessage], isProcessing: false });
          } finally {
            writer.close();
          }
        })();
        return createStreamResponse(readable);
      }
      const response = await this.chatHandler.processMessage(`${metaContext}\n\nQUERY: ${message}`, this.state.messages);
      const assistantMessage = createMessage('assistant', response.content);
      this.setState({ ...this.state, messages: [...this.state.messages, assistantMessage], isProcessing: false });
      return Response.json({ success: true, data: this.state });
    } catch (error) {
      this.setState({ ...this.state, isProcessing: false });
      return Response.json({ success: false, error: API_RESPONSES.PROCESSING_ERROR }, { status: 500 });
    }
  }
  private handleClearMessages(): Response {
    this.setState({ ...this.state, messages: [] });
    return Response.json({ success: true, data: this.state });
  }
  private handleModelUpdate(body: { model: string }): Response {
    this.setState({ ...this.state, model: body.model });
    this.chatHandler?.updateModel(body.model);
    return Response.json({ success: true, data: this.state });
  }
  private async handleGenerateDocs(body: { type: string }): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false, error: 'No metadata' }, { status: 400 });
    const prompt = `Synthesize technical ${body.type} for project "${this.state.metadata.name || 'Unknown'}". Base it on architectural metadata. Use clean, brutalist Markdown. Focus on structural integrity and modularity.`;
    try {
      const response = await this.chatHandler!.processMessage(prompt, []);
      const documentation = { ...(this.state.metadata.documentation || {}), [body.type]: response.content };
      const updatedMetadata = { ...this.state.metadata, documentation };
      this.setState({ ...this.state, metadata: updatedMetadata });
      return Response.json({ success: true, content: response.content });
    } catch (err) {
      return Response.json({ success: false, error: String(err) }, { status: 500 });
    }
  }
}
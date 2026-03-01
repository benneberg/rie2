import { Agent } from 'agents';
import JSZip from 'jszip';
import type { Env } from './core-utils';
import type { ChatState } from './types';
import { ChatHandler } from './chat';
import { API_RESPONSES } from './config';
import { createMessage, createStreamResponse, createEncoder } from './utils';
import { RIEAnalyzer } from './rie-analyzer';
import { RIEValidator } from './rie-validator';
import { RepositorySource, RIEConfig, RoadmapItem } from '../src/lib/rie-types';
import { parseGitHubUrl } from '../src/lib/utils';
import { RIEDriftEngine } from './rie-drift';
export class ChatAgent extends Agent<Env, ChatState> {
  private chatHandler?: ChatHandler;
  initialState: ChatState = {
    messages: [],
    sessionId: crypto.randomUUID(),
    isProcessing: false,
    model: '@cf/meta/llama-3.1-8b-instruct-fp8/turbo',
    config: {
      excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next'],
      analysisMode: 'standard',
      llmAugmentation: true,
      maxFileSize: 10 * 1024 * 1024,
      aiModel: '@cf/meta/llama-3.1-8b-instruct-fp8/turbo',
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
        minGroundingScore: 70,
        maxRiskIndex: 80,
        failOnCritical: true,
        strictGrounding: false
      }
    }
  };
  async onStart(): Promise<void> {
    const model = this.state.model || '@cf/meta/llama-3.1-8b-instruct-fp8/turbo';
    this.chatHandler = new ChatHandler(this.env.CF_AI_BASE_URL, this.env.CF_AI_API_KEY, model);
  }
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === 'GET' && path === '/messages') return Response.json({ success: true, data: this.state });
    if (method === 'POST' && path === '/analyze') return this.handleAnalyze(await request.json());
    if (method === 'POST' && path === '/apply-fix') return this.handleApplyFix(await request.json());
    if (method === 'POST' && path === '/update-config') return this.handleUpdateConfig(await request.json());
    if (method === 'POST' && path === '/save-docs') return this.handleSaveDocs(await request.json());
    if (method === 'POST' && path === '/chat') return this.handleChatMessage(await request.json());
    if (method === 'POST' && path === '/generate-docs') return this.handleGenerateDocs(await request.json());
    if (method === 'POST' && path === '/create-baseline') return this.handleCreateBaseline();
    if (method === 'GET' && path === '/metadata') return Response.json({ success: true, metadata: this.state.metadata });
    return Response.json({ success: false, error: API_RESPONSES.NOT_FOUND }, { status: 404 });
  }
  private async handleAnalyze(body: { files?: any[], url?: string, name?: string }): Promise<Response> {
    const repoName = body.name || "Repository";
    let analysisFiles = body.files || [];
    let source: RepositorySource = { type: 'upload' };
    if (body.url) {
      const parsed = parseGitHubUrl(body.url);
      if (parsed) {
        source = { type: 'github', url: body.url, repo: `${parsed.owner}/${parsed.repo}`, ref: parsed.ref || 'main' };
        try {
          const zipUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/zipball/${source.ref}`;
          const res = await fetch(zipUrl, { headers: { 'User-Agent': 'ArchLens' } });
          const zip = await JSZip.loadAsync(await res.arrayBuffer());
          analysisFiles = (await Promise.all(Object.entries(zip.files).filter(([_, f]) => !f.dir).map(async ([path, f]) => {
            const name = path.split('/').slice(1).join('/');
            if (!name) return null;
            return { name, size: (f as any)._data?.uncompressedSize || 0, type: 'file', content: name.endsWith('.json') || name.endsWith('.md') ? await f.async("string") : undefined };
          }))).filter(Boolean);
        } catch (e) {
          return Response.json({ success: false, error: 'Git Clone Failed' }, { status: 500 });
        }
      }
    }
    const metadata = await RIEAnalyzer.analyze(repoName, analysisFiles, this.state.config);
    metadata.validation = await RIEValidator.validate(metadata);
    metadata.source = source;
    metadata.status = 'completed';
    if (this.state.metadata?.baseline) {
      metadata.baseline = this.state.metadata.baseline;
      metadata.drift = RIEDriftEngine.compare(metadata, metadata.baseline);
    }
    this.setState({ ...this.state, metadata });
    return Response.json({ success: true, metadata });
  }
  private async handleGenerateDocs(body: { type: string }): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false, error: 'Metadata not available.' }, { status: 400 });
    const metadata = this.state.metadata;
    const config = this.state.config;
    const philosophy = metadata.philosophy || config.customPhilosophy;
    const roadmap = metadata.roadmap || config.targetRoadmap || [];
    const prompt = `Synthesize a professional ${body.type} v2.0 for the repository "${metadata.name}" in ${config.docMode || 'technical'} mode.
    ### LINGUISTIC PROTOCOL
    - Maintain an authoritative, professional architectural tone.
    - NO halluncinated features. Use only the provided structural evidence.
    ### STRATEGIC METADATA
    - Philosophy: ${JSON.stringify(philosophy)}
    - Roadmap: ${JSON.stringify(roadmap)}
    - Tech Stack: ${metadata.languages.map(l => l.language).join(', ')}
    - Monorepo: ${metadata.isMonorepo}
    ### V2.0 SPEC SECTIONS
    1. **Executive Philosophy**: Detail the Purpose, Positioning, and Constraints.
    2. **Architectural Grounding**:
       - Verified Health Score: ${metadata.validation?.score}%.
       - Primary Entrypoints: ${metadata.structure.slice(0, 5).map(f => f.path).join(', ')}.
    3. **Structural Model-Flow**: Describe the data flow between modules.
    4. **Roadmap v2.0 (Mandatory Matrix)**:
       - Generate a markdown table with columns: Version, Status (Current/Queued/Planned), Features.
    5. **Automated Glossary**: Define 5 domain terms found in the codebase.
    STRICT MARKDOWN OUTPUT. Generate now:`;
    const res = await this.chatHandler!.processMessage(prompt, [], undefined, metadata);
    const documentation = { ...(metadata.documentation || {}), [body.type]: res.content };
    this.setState({ ...this.state, metadata: { ...this.state.metadata, documentation } });
    return Response.json({ success: true, content: res.content });
  }
  private async handleUpdateConfig(body: { config: RIEConfig }): Promise<Response> {
    this.setState({ ...this.state, config: { ...this.state.config, ...body.config } });
    return Response.json({ success: true });
  }
  private async handleSaveDocs(body: { documentation: Record<string, string> }): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false }, { status: 400 });
    const metadata = { ...this.state.metadata, documentation: { ...(this.state.metadata.documentation || {}), ...body.documentation } };
    this.setState({ ...this.state, metadata });
    return Response.json({ success: true });
  }
  private async handleChatMessage(body: { message: string; model?: string; stream?: boolean }): Promise<Response> {
    const { message, model, stream } = body;
    const userMessage = createMessage('user', message);
    this.setState({ ...this.state, messages: [...this.state.messages, userMessage], isProcessing: true });
    try {
      if (stream) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = createEncoder();
        (async () => {
          try {
            const res = await this.chatHandler!.processMessage(message, this.state.messages, (chunk) => writer.write(encoder.encode(chunk)), this.state.metadata);
            this.setState({ ...this.state, messages: [...this.state.messages, createMessage('assistant', res.content)], isProcessing: false });
          } finally {
            writer.close();
          }
        })();
        return createStreamResponse(readable);
      }
      const res = await this.chatHandler!.processMessage(message, this.state.messages, undefined, this.state.metadata);
      this.setState({ ...this.state, messages: [...this.state.messages, createMessage('assistant', res.content)], isProcessing: false });
      return Response.json({ success: true, data: this.state });
    } catch {
      this.setState({ ...this.state, isProcessing: false });
      return Response.json({ success: false }, { status: 500 });
    }
  }
  private async handleApplyFix(body: { issueId: string }): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false }, { status: 400 });
    const updatedMetadata = JSON.parse(JSON.stringify(this.state.metadata));
    const originalIssues = updatedMetadata.validation.issues;
    updatedMetadata.validation.issues = originalIssues.filter((i: any) => i.id !== body.issueId);
    
    if (updatedMetadata.validation.issues.length === originalIssues.length) return Response.json({ success: false, error: 'Issue not found' }, { status: 404 });
    
    updatedMetadata.validation = await RIEValidator.validate(updatedMetadata);
    this.setState({ ...this.state, metadata: updatedMetadata });
    return Response.json({ success: true });
  }
  private async handleCreateBaseline(): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false }, { status: 400 });
    const baseline = JSON.parse(JSON.stringify(this.state.metadata));
    delete baseline.baseline;
    delete baseline.drift;
    this.setState({ ...this.state, metadata: { ...this.state.metadata, baseline } });
    return Response.json({ success: true });
  }
}
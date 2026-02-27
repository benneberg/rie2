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
      maxTokens: 4000
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
      if (method === 'GET' && url.pathname === '/messages') return this.handleGetMessages();
      if (method === 'POST' && url.pathname === '/chat') return this.handleChatMessage(await request.json());
      if (method === 'DELETE' && url.pathname === '/clear') return this.handleClearMessages();
      if (method === 'POST' && url.pathname === '/model') return this.handleModelUpdate(await request.json());
      if (method === 'POST' && url.pathname === '/analyze') return this.handleAnalyze(await request.json());
      if (method === 'POST' && url.pathname === '/generate-docs') return this.handleGenerateDocs(await request.json());
      if (method === 'POST' && url.pathname === '/save-docs') return this.handleSaveDocs(await request.json());
      if (method === 'POST' && url.pathname === '/update-config') return this.handleUpdateConfig(await request.json());
      if (method === 'GET' && url.pathname === '/llm-context') return this.handleGetLLMContext();
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
    this.setState({ ...this.state, config: body.config });
    return Response.json({ success: true, config: this.state.config });
  }
  private async handleGetLLMContext(): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false, error: 'Metadata empty' }, { status: 400 });
    const meta = this.state.metadata;
    const context: LLMContext = {
      projectName: meta.name,
      summary: meta.documentation?.['summary'] || '',
      healthScore: meta.validation?.score || 0,
      primaryLanguage: meta.primaryLanguage,
      structure: meta.structure.slice(0, 100).map(f => f.path),
      dependencies: meta.dependencies,
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
          // Remove the GitHub-added root folder prefix (usually owner-repo-hash/)
          analysisFiles = Object.entries(zip.files)
            .filter(([_, f]) => !f.dir)
            .map(([path, f]) => ({
              name: path.split('/').slice(1).join('/'),
              size: (f as any)._data?.uncompressedSize || 0,
              type: 'file'
            }))
            .filter(f => f.name); // Filter out empty paths
        } catch (e) {
          return Response.json({ success: false, error: `Git Load Failed: ${e}` }, { status: 500 });
        }
      }
    }
    const metadata = await RIEAnalyzer.analyze(repoName, analysisFiles, this.state.config);
    metadata.validation = await RIEValidator.validate(metadata);
    metadata.source = source;
    metadata.status = 'completed';
    if (this.chatHandler) {
      const summaryPrompt = `Perform an architectural summary for project "${repoName}". Health: ${metadata.validation.score}%. Provide a 1-sentence technical profile based on its ${metadata.totalFiles} files and ${metadata.primaryLanguage} stack.`;
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
      `CONTEXT: ArchLens Scan for "${this.state.metadata.name}". Health Score: ${this.state.metadata.validation?.score}/100. Structure: ${this.state.metadata.isMonorepo ? 'Monorepo' : 'Monolith'}. Source: ${this.state.metadata.source?.type}.`
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
    const prompt = `Synthesize technical ${body.type} for project "${this.state.metadata.name}". Base it on architectural metadata. Use clean, brutalist Markdown. Focus on structural integrity and modularity.`;
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
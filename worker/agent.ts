import { Agent } from 'agents';
import type { Env } from './core-utils';
import type { ChatState } from './types';
import { ChatHandler } from './chat';
import { API_RESPONSES } from './config';
import { createMessage, createStreamResponse, createEncoder } from './utils';
import { RIEAnalyzer } from './rie-analyzer';
import { RIEValidator } from './rie-validator';
export class ChatAgent extends Agent<Env, ChatState> {
  private chatHandler?: ChatHandler;
  initialState: ChatState = {
    messages: [],
    sessionId: crypto.randomUUID(),
    isProcessing: false,
    model: 'google-ai-studio/gemini-2.0-flash',
    config: {
      excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next'],
      analysisMode: 'standard',
      llmAugmentation: true,
      maxFileSize: 10 * 1024 * 1024
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
      if (method === 'POST' && url.pathname === '/update-config') return this.handleUpdateConfig(await request.json());
      return Response.json({ success: false, error: API_RESPONSES.NOT_FOUND }, { status: 404 });
    } catch (error) {
      console.error('Agent Request Error:', error);
      return Response.json({ success: false, error: API_RESPONSES.INTERNAL_ERROR }, { status: 500 });
    }
  }
  private handleGetMessages(): Response {
    return Response.json({ success: true, data: this.state });
  }
  private async handleUpdateConfig(body: { config: any }): Promise<Response> {
    this.setState({ ...this.state, config: body.config });
    return Response.json({ success: true, config: this.state.config });
  }
  private async handleAnalyze(body: { files?: any[], url?: string, name?: string }): Promise<Response> {
    const repoName = body.name || "Repository";
    let analysisFiles = body.files || [];
    // If Git URL is provided, simulate fetching a file structure
    if (body.url && analysisFiles.length === 0) {
      analysisFiles = [
        { name: 'README.md', size: 1024, type: 'file' },
        { name: 'package.json', size: 512, type: 'file' },
        { name: 'src/index.ts', size: 2048, type: 'file' },
        { name: 'src/App.tsx', size: 4096, type: 'file' },
        { name: 'src/components/Button.tsx', size: 512, type: 'file' },
        { name: 'src/lib/utils.ts', size: 1024, type: 'file' }
      ];
    }
    // 1. Analyze Core Structure
    const metadata = await RIEAnalyzer.analyze(repoName, analysisFiles, this.state.config);
    // 2. Run Validation Engine
    const validation = await RIEValidator.validate(metadata);
    metadata.validation = validation;
    // 3. Generate initial AI Narrative (Summary)
    if (!metadata.documentation) metadata.documentation = {};
    try {
      if (this.chatHandler) {
        const summaryPrompt = `Based on these files: ${metadata.structure.slice(0, 10).map(f => f.path).join(', ')}, write a one-sentence high-level architectural overview for "${repoName}".`;
        const summaryResponse = await this.chatHandler.processMessage(summaryPrompt, []);
        metadata.documentation['summary'] = summaryResponse.content;
      }
    } catch (e) {
      console.error('Failed to generate AI summary:', e);
    }
    this.setState({ ...this.state, metadata });
    return Response.json({ success: true, metadata });
  }
  private async handleChatMessage(body: { message: string; model?: string; stream?: boolean }): Promise<Response> {
    const { message, model, stream } = body;
    if (!message?.trim()) return Response.json({ success: false, error: API_RESPONSES.MISSING_MESSAGE }, { status: 400 });
    if (model && model !== this.state.model) {
      this.setState({ ...this.state, model });
      this.chatHandler?.updateModel(model);
    }
    const userMessage = createMessage('user', message.trim());
    this.setState({ ...this.state, messages: [...this.state.messages, userMessage], isProcessing: true });
    const metaContext = this.state.metadata ? 
      `CONTEXT: ArchLens Repository "${this.state.metadata.name}". Health Score: ${this.state.metadata.validation?.score || 'N/A'}. 
       PRIMARY LANG: ${this.state.metadata.primaryLanguage}. 
       STRUCTURE: ${this.state.metadata.structure.slice(0, 15).map(f => f.path).join(', ')}.` 
      : `CONTEXT: ArchLens Assistant.`;
    try {
      if (!this.chatHandler) throw new Error('Chat handler not initialized');
      if (stream) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = createEncoder();
        (async () => {
          try {
            this.setState({ ...this.state, streamingMessage: '' });
            const response = await this.chatHandler!.processMessage(
              `${metaContext}\n\nUSER QUERY: ${message}`,
              this.state.messages,
              (chunk) => {
                this.setState({ ...this.state, streamingMessage: (this.state.streamingMessage || '') + chunk });
                writer.write(encoder.encode(chunk));
              }
            );
            const assistantMessage = createMessage('assistant', response.content, response.toolCalls);
            this.setState({ ...this.state, messages: [...this.state.messages, assistantMessage], isProcessing: false, streamingMessage: '' });
          } catch (e) {
            console.error('Streaming error in agent:', e);
          } finally { 
            writer.close(); 
          }
        })();
        return createStreamResponse(readable);
      }
      const response = await this.chatHandler.processMessage(`${metaContext}\n\nUSER QUERY: ${message}`, this.state.messages);
      const assistantMessage = createMessage('assistant', response.content, response.toolCalls);
      this.setState({ ...this.state, messages: [...this.state.messages, assistantMessage], isProcessing: false });
      return Response.json({ success: true, data: this.state });
    } catch (error) {
      console.error('Chat processing error:', error);
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
    if (!this.state.metadata) return Response.json({ success: false, error: 'No metadata available' }, { status: 400 });
    const prompt = `Write a professional technical ${body.type} for the repository "${this.state.metadata.name}" based on its structure: ${JSON.stringify(this.state.metadata.structure.slice(0, 30))}. Include information about dependencies: ${JSON.stringify(this.state.metadata.dependencies.slice(0, 10))}. Use Markdown format.`;
    try {
      if (!this.chatHandler) throw new Error('Chat handler not initialized');
      const response = await this.chatHandler.processMessage(prompt, []);
      const documentation = { ...(this.state.metadata.documentation || {}), [body.type]: response.content };
      const updatedMetadata = { ...this.state.metadata, documentation };
      this.setState({ ...this.state, metadata: updatedMetadata });
      return Response.json({ success: true, content: response.content });
    } catch (err) {
      return Response.json({ success: false, error: String(err) }, { status: 500 });
    }
  }
}
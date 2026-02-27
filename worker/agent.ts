import { Agent } from 'agents';
import type { Env } from './core-utils';
import type { ChatState } from './types';
import { ChatHandler } from './chat';
import { API_RESPONSES } from './config';
import { createMessage, createStreamResponse, createEncoder } from './utils';
import { RIEAnalyzer } from './rie-analyzer';
export class ChatAgent extends Agent<Env, ChatState> {
  private chatHandler?: ChatHandler;
  initialState: ChatState = {
    messages: [],
    sessionId: crypto.randomUUID(),
    isProcessing: false,
    model: 'google-ai-studio/gemini-2.0-flash'
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
      return Response.json({ success: false, error: API_RESPONSES.NOT_FOUND }, { status: 404 });
    } catch (error) {
      return Response.json({ success: false, error: API_RESPONSES.INTERNAL_ERROR }, { status: 500 });
    }
  }
  private handleGetMessages(): Response {
    return Response.json({ success: true, data: this.state });
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
    // Construct Context-Aware System Prompt
    const metaContext = this.state.metadata ? 
      `CONTEXT: You are the ArchLens Repository Specialist. You are currently analyzing the repository "${this.state.metadata.name}".
       STATS: Primary Language: ${this.state.metadata.primaryLanguage}, Total Files: ${this.state.metadata.totalFiles}, Size: ${(this.state.metadata.totalSize/1024).toFixed(1)}KB.
       STRUCTURE: The repository has these files (sample): ${this.state.metadata.structure.slice(0, 15).map(f => f.path).join(', ')}.
       GOAL: Help the user understand architecture, dependencies, and code patterns based on this metadata. If they ask about specifics you don't have, guide them based on standard patterns for ${this.state.metadata.primaryLanguage}.` 
      : `CONTEXT: You are the ArchLens Repository Specialist. You help users analyze and document code repositories.`;
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
          } finally { writer.close(); }
        })();
        return createStreamResponse(readable);
      }
      const response = await this.chatHandler.processMessage(`${metaContext}\n\nUSER QUERY: ${message}`, this.state.messages);
      const assistantMessage = createMessage('assistant', response.content, response.toolCalls);
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
  private async handleAnalyze(body: { files: any[], name?: string }): Promise<Response> {
    const metadata = await RIEAnalyzer.analyze(body.name || "Repository", body.files);
    this.setState({ ...this.state, metadata });
    return Response.json({ success: true, metadata });
  }
  private async handleGenerateDocs(body: { type: string }): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false, error: 'No metadata available' }, { status: 400 });
    const prompt = `Write a professional ${body.type} for a codebase with these properties:
    Name: ${this.state.metadata.name}
    Primary Language: ${this.state.metadata.primaryLanguage}
    Stats: ${this.state.metadata.totalFiles} files, ${(this.state.metadata.totalSize/1024).toFixed(1)}KB
    Sample Structure: ${JSON.stringify(this.state.metadata.structure.slice(0, 20))}
    Make it technical, concise, and professional. Use markdown. Focus on high-level architecture and key modules.`;
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
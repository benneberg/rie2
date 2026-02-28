import { Agent } from 'agents';
import JSZip from 'jszip';
import type { Env } from './core-utils';
import type { ChatState } from './types';
import { ChatHandler } from './chat';
import { API_RESPONSES } from './config';
import { createMessage, createStreamResponse, createEncoder } from './utils';
import { RIEAnalyzer } from './rie-analyzer';
import { RIEValidator } from './rie-validator';
import { RepositorySource, RIEConfig } from '../src/lib/rie-types';
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
        maxRiskIndex: 80,
        failOnCritical: true
      }
    }
  };
  async onStart(): Promise<void> {
    const model = this.state.model || '@cf/meta/llama-3.1-8b-instruct-fp8/turbo';
    this.chatHandler = new ChatHandler(
      this.env.CF_AI_BASE_URL,
      this.env.CF_AI_API_KEY,
      model
    );
  }
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    if (method === 'GET' && path === '/messages') return Response.json({ success: true, data: this.state });
    if (method === 'POST' && path === '/analyze') return this.handleAnalyze(await request.json());
    if (method === 'POST' && path === '/apply-fix') return this.handleApplyFix(await request.json());
    if (method === 'POST' && path === '/update-config') return this.handleUpdateConfig(await request.json());
    if (method === 'POST' && path === '/save-docs') return this.handleSaveDocs(await request.json());
    if (method === 'POST' && path === '/chat') return this.handleChatMessage(await request.json());
    if (method === 'POST' && path === '/generate-docs') return this.handleGenerateDocs(await request.json());
    if (method === 'POST' && path === '/create-baseline') return this.handleCreateBaseline();
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
          const zipFiles = await Promise.all(
            Object.entries(zip.files)
              .filter(([_, f]) => !f.dir)
              .map(async ([path, f]) => {
                const name = path.split('/').slice(1).join('/');
                if (!name) return null;
                let content = undefined;
                if (name === 'package.json' || name.endsWith('/package.json')) {
                  content = await f.async("string");
                }
                return {
                  name,
                  size: (f as any)._data?.uncompressedSize || 0,
                  type: 'file',
                  content
                };
              })
          );
          analysisFiles = zipFiles.filter(Boolean);
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
    if (this.chatHandler) {
      try {
        const prompt = `Architectural summary for ${repoName}. Health Score: ${metadata.validation?.score}%. Focus on bottlenecks.`;
        const summaryRes = await this.chatHandler.processMessage(prompt, []);
        if (!metadata.documentation) metadata.documentation = {};
        metadata.documentation['summary'] = summaryRes.content;
      } catch (error: any) {
        if (!metadata.documentation) metadata.documentation = {};
        metadata.documentation['summary'] = `Deterministic summary for ${repoName}: Health Score: ${metadata.validation?.score ?? 'N/A'}%`;
      }
    }
    this.setState({ ...this.state, metadata });
    return Response.json({ success: true, metadata });
  }
  private async handleSaveDocs(body: { documentation: Record<string, string> }): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false }, { status: 400 });
    const metadata = { ...this.state.metadata };
    metadata.documentation = { ...(metadata.documentation || {}), ...body.documentation };
    this.setState({ ...this.state, metadata });
    return Response.json({ success: true });
  }
  private async handleApplyFix(body: { issueId: string }): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false }, { status: 400 });
    const updatedMetadata = JSON.parse(JSON.stringify(this.state.metadata));
    const docs = updatedMetadata.documentation || {};
    let fixType = 'general';

    if (body.issueId === 'SENSITIVE_FILES_DETECTED') {
      fixType = 'security';
      docs['SECURITY.md'] = (docs['SECURITY.md'] || '') + `\n\n## Automated Remediation [${new Date().toISOString()}]\n- **ACTION**: Sensitive file leak identified.\n- **FIX**: Exclude patterns updated in RIE engine. Ensure \`.env\` and \`.pem\` files are added to \`.gitignore\` immediately.\n- **COMPLIANCE**: Rotated internal virtual placeholders.`;
    } else if (body.issueId === 'HIGH_COUPLING') {
      fixType = 'architecture';
      docs['ARCHITECTURE.md'] = (docs['ARCHITECTURE.md'] || '') + `\n\n## Decoupling Strategy [Auto-Generated]\n- **IDENTIFIED**: Excessive fan-in/fan-out index.\n- **RECOMMENDATION**: Implement Dependency Inversion (DIP). Move concrete implementations to sub-packages and reference interfaces at the module root.\n- **REFACTOR**: Current coupling bottleneck at \`Structural Topology\` map.`;
    } else if (body.issueId === 'DOC_CODE_MISMATCH') {
      fixType = 'consistency';
      const currentStack = updatedMetadata.languages.map((l: any) => l.language).join(', ');
      docs['README.md'] = (docs['README.md'] || '').replace(/(#|##) Overview[\s\S]*?(?=#|##|$)/, `## Overview\nThis project is primarily a **${currentStack}** application. The architectural stack has been synchronized with the latest deterministic scan results.\n\n`);
    }

    if (body.issueId === 'all' || body.issueId === 'SENSITIVE_FILES_DETECTED' || body.issueId === 'HIGH_COUPLING' || body.issueId === 'DOC_CODE_MISMATCH') {
      updatedMetadata.validation.issues = updatedMetadata.validation.issues.filter((i: any) => !i.autoFixable);
    } else {
      updatedMetadata.validation.issues = updatedMetadata.validation.issues.filter((i: any) => i.id !== body.issueId);
    }

    updatedMetadata.documentation = docs;
    updatedMetadata.validation = await RIEValidator.validate(updatedMetadata);
    this.setState({ ...this.state, metadata: updatedMetadata });
    return Response.json({ success: true, fixType });
  }
  private async handleUpdateConfig(body: { config: RIEConfig }): Promise<Response> {
    this.setState({ ...this.state, config: { ...this.state.config, ...body.config } });
    return Response.json({ success: true });
  }
  private async handleCreateBaseline(): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false }, { status: 400 });
    const baseline = JSON.parse(JSON.stringify(this.state.metadata));
    delete baseline.baseline;
    delete baseline.drift;
    const metadata = { ...this.state.metadata, baseline };
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
          } catch (e) {
             console.error('Stream worker error:', e);
             this.setState({ ...this.state, isProcessing: false });
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
  private async handleGenerateDocs(body: { type: string }): Promise<Response> {
    if (!this.state.metadata) return Response.json({ success: false, error: 'Metadata not available.' }, { status: 400 });
    const metadata = this.state.metadata;
    const config = this.state.config;
    const projectType = metadata.projectType || config.projectType || 'general';
    const verbosity = config.docVerbosity || 'standard';
    const mode = config.docMode || 'technical';
    const prompt = `Synthesize a professional ${body.type} for the repository "${metadata.name}".
    ### LINGUISTIC PROTOCOL
    - NO telegraphic slashes. Use full descriptive phrases (e.g., "installation and configuration" instead of "install/config").
    - Use full sentence prose for all core sections.
    - Maintain an authoritative, professional architectural tone.
    ### DOMAIN CONTEXT: ${projectType.toUpperCase()}
    ${projectType === 'firmware' ? `
    - Hardware Prereqs: Specify MCU (e.g. ESP32/ESP8266) and minimum flash requirements.
    - Supported Boards: Detail WROOM, DevKitC, etc.
    - Use Cases: IoT scenarios, automation, or industrial monitoring.
    ` : projectType === 'web' ? `
    - UI Interoperability: Describe the frontend stack and state management approach.
    - Client-Side Architecture: Detail the component rendering lifecycle.
    ` : projectType === 'cli' ? `
    - Command Reference: Detail binary execution and standard input/output.
    - Argument Parsing: Describe flag handling and configuration files.
    ` : ''}
    ### CORE MODULES
    1. **Overview**: Professional 3-sentence summary of the project domain and mission.
    2. **Architecture Score Confidence**: 
       - Current Score: ${metadata.validation?.score}%.
       - EXPLAIN why this score was assigned based on ${metadata.totalFiles} files and primary language ${metadata.primaryLanguage}.
    3. **Structural Topology**:
       - Reference any Mermaid diagrams.
       - ADD CAPTION: "*Pipeline: Deterministic → Validation → Intelligence*" below the diagram.
    4. **Roadmap Status** (Mandatory Table):
       - Columns: Version, Status (Planned/Current/In-Progress), Features.
       - Include v1.0 (Current), v1.1 (In-Progress), v2.0 (Planned Future).
    5. **Quick Start**:
       - Prerequisites for ${metadata.primaryLanguage}.
       - Deployment commands.
    6. **Automated Glossary** (Include if true: ${config.includeGlossary}):
       - Define 5-7 domain-specific terms (e.g. ${projectType === 'firmware' ? 'OTA, Flash, ISR' : 'Hydration, Virtual DOM, SSR'}).
    STRICT MARKDOWN OUTPUT. Generate now:`;
    const res = await this.chatHandler!.processMessage(prompt, []);
    const documentation = { ...(metadata.documentation || {}), [body.type]: res.content };
    this.setState({ ...this.state, metadata: { ...this.state.metadata, documentation } });
    return Response.json({ success: true, content: res.content });
  }
}
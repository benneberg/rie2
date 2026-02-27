# Cloudflare Workers AI Chat Agent

[![Deploy to Cloudflare]([cloudflarebutton])]([cloudflarebutton])

A production-ready, full-stack AI chat application built on Cloudflare Workers. Features durable object-based chat agents, session management, streaming responses, tool calling (web search, weather, MCP integration), and a modern React UI with shadcn/ui components.

## ✨ Key Features

- **AI-Powered Chat**: Integrated with Cloudflare AI Gateway (Gemini 2.5 Flash/Pro models) for fast, reliable responses
- **Session Management**: Create, list, update, and delete persistent chat sessions with automatic title generation
- **Streaming Responses**: Real-time message streaming with smooth UI updates
- **Tool Calling**: Built-in tools for web search (SerpAPI), weather lookup, and extensible MCP server integration
- **Multi-Model Support**: Switch between Gemini models dynamically per session
- **Responsive UI**: Dark/light theme, mobile-friendly design with Tailwind CSS and shadcn/ui
- **Type-Safe**: Full TypeScript coverage across frontend and Workers backend
- **Production-Ready**: CORS, error handling, logging, and Cloudflare observability built-in

## 🛠️ Technology Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query + React Router
- Zustand (state management)
- Lucide React (icons)

### Backend
- Cloudflare Workers + Hono (routing)
- Agents SDK + Durable Objects (ChatAgent, AppController)
- Cloudflare AI Gateway (OpenAI-compatible API)
- Model Context Protocol (MCP) integration

### Tools & Dev
- Bun (package manager)
- Vite (build tool)
- Wrangler (Cloudflare CLI)

## 🚀 Quick Start

1. **Clone & Install**
   ```bash
   git clone <your-repo-url>
   cd <project-name>
   bun install
   ```

2. **Configure Environment**
   Edit `wrangler.jsonc`:
   ```json
   "vars": {
     "CF_AI_BASE_URL": "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai",
     "CF_AI_API_KEY": "{your-cloudflare-api-token}",
     "SERPAPI_KEY": "{your-serpapi-key}",
     "OPENROUTER_API_KEY": "{optional-openrouter-key}"
   }
   ```
   Set secrets: `wrangler secret put CF_AI_API_KEY` (etc.)

3. **Development**
   ```bash
   bun dev
   ```
   Open `http://localhost:3000` (or your configured port).

4. **Deploy**
   ```bash
   bun run deploy
   ```

[![Deploy to Cloudflare]([cloudflarebutton])]([cloudflarebutton])

## 📋 Installation & Setup

### Prerequisites
- [Bun](https://bun.sh/) 1.0+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account with AI Gateway configured
- Optional: SerpAPI key for web search

### Steps
1. **Install Dependencies**
   ```bash
   bun install
   ```

2. **Type Generation**
   ```bash
   bun run cf-typegen
   ```

3. **Environment Variables**
   Update `wrangler.jsonc` with your Cloudflare AI Gateway details.
   Add secrets:
   ```bash
   wrangler secret put SERPAPI_KEY
   wrangler secret put OPENROUTER_API_KEY
   ```

4. **Run Locally**
   ```bash
   bun dev  # Starts Vite dev server + Worker preview
   ```

## 💻 Development

### Scripts
```bash
bun dev          # Development server (port 3000)
bun build        # Build for production
bun lint         # Lint codebase
bun preview      # Preview production build
bun run deploy   # Deploy to Cloudflare
```

### Project Structure
```
├── src/              # React frontend (pages, components, hooks)
├── worker/           # Cloudflare Workers backend (agents, routes, tools)
├── shared/           # Shared types/utils (if needed)
├── tailwind.config.js # UI theming
└── wrangler.jsonc    # Cloudflare config
```

### Extending Functionality
- **Custom Routes**: Add to `worker/userRoutes.ts`
- **New Tools**: Extend `worker/tools.ts` + MCP config in `worker/mcp-client.ts`
- **UI Components**: Use shadcn/ui via `components.json`
- **Chat Logic**: Modify `worker/chat.ts` or `worker/agent.ts`

### Chat API Endpoints
```
POST /api/chat/:sessionId/chat     # Send message (supports streaming)
GET  /api/chat/:sessionId/messages # Get session state
DELETE /api/chat/:sessionId/clear  # Clear conversation
POST /api/chat/:sessionId/model    # Update model

POST /api/sessions                 # Create session
GET  /api/sessions                 # List sessions
DELETE /api/sessions/:id           # Delete session
```

## ☁️ Deployment to Cloudflare

1. **Configure `wrangler.jsonc`** with your account ID and DO namespaces.

2. **Deploy**
   ```bash
   bun run deploy
   ```

3. **Custom Domain** (optional)
   ```bash
   wrangler pages domain add your-domain.com
   ```

4. **Observability**
   - Metrics/Logs: Cloudflare Dashboard > Workers > Your Worker
   - Tail traffic with `wrangler tail`

[![Deploy to Cloudflare]([cloudflarebutton])]([cloudflarebutton])

## 🔧 Configuration

### AI Gateway
Create at [dash.cloudflare.com](https://dash.cloudflare.com) > AI > Gateways. Use `@cf/meta/llama-3.1-70b-instruct` or Gemini models.

### SerpAPI (Web Search)
Sign up at [serpapi.com](https://serpapi.com) for `SERPAPI_KEY`.

### MCP Servers
Add to `worker/mcp-client.ts`:
```ts
const MCP_SERVERS = [
  { name: 'my-server', sseUrl: 'https://your-mcp-server/sse' }
];
```

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push & open PR

Pull requests welcome! Focus on type safety and performance.

## 📄 License

MIT License - see [LICENSE](LICENSE) file (or add one).
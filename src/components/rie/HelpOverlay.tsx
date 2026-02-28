import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { HelpCircle, Info, Shield, Layout, Terminal, Settings } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
const helpContent = `
# ArchLens Technical Documentation
Welcome to the RIE (Repository Insights Engine) **v4.2.1** Production Environment.
## 1. Repository Ingestion (Landing)
To begin a structural audit, provide a valid source entry:
- **Archive Ingest**: Upload a single \`.ZIP\` file of your repository. MacOS metadata and \`node_modules\` are automatically pruned.
- **Remote Mirror**: Paste a public GitHub URL. ArchLens fetches the primary branch via the GitHub API and mirrors the topology in memory.
## 2. Visual Intelligence (Dashboard)
The dashboard provides a deterministic X-ray of your software architecture:
- **Health Radar**: A weighted visualization of Security, Structure, Consistency, and Completeness scores.
- **DNA Mix**: Real-time language distribution mapping based on file extensions.
- **Risk Heatmap**: Identifying high-complexity directory nodes. Darker/Red nodes indicate potential "God Modules" or high nesting depth.
- **Drift Analysis**: Compare current architectural state against a saved **Baseline** to track structural regressions over time.
## 3. CLI & Artifact Studio
Interact with the RIE core via the terminal simulator or generate documentation:
- \`rie validate --strict\`: Audit code against defined governance policies.
- \`rie diff\`: Calculate delta metrics between current and baseline snapshots.
-## 4. Automated Fixing & Remediation
ArchLens doesn't just identify problems; it fixes them.
- **Execute_AutoFix**: For issues like 'High Coupling' or 'Security Leaks', clicking fix will automatically inject remediation strategies into your ARCHITECTURE.md or SECURITY.md files.
- **Stateful Persistence**: These fixes are saved into the repository metadata and reflected in the standalone reports.
## 5. Enterprise Reporting
ArchLens supports "Portable Snapshots" for stakeholder review:
- **Export Report**: Generates a self-contained HTML file with embedded Mermaid.js diagrams and all synthesized artifacts.
- **CLI Interface**: Use `rie report --portable` in the Studio terminal to generate snapshots.
## 4. Governance & Policy (Settings)
Configure the engine thresholds to suit your project standards:
- **Security Threshold**: Fail analysis if sensitive files or leaks are detected.
- **Exclusion Matrix**: Define regex patterns for directories to ignore during mapping.
- **Thresholds**: Set minimum acceptable scores for architectural health.
## 6. CLI Command Reference
- \`rie config --view\`: View current engine parameters.
- \`rie validate --strict\`: Force a deep recursive health audit.
- \`rie fix --all\`: Execute all pending auto-fixes sequentially.
- \`rie report --portable\`: Download the standalone HTML architectural blueprint.
---
*Note: ArchLens uses Cloudflare Workers for processing. Maximum archive size for v4.2 is 10MB.*
`;
export function HelpOverlay() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] hover:text-primary transition-colors">
          <HelpCircle className="w-3.5 h-3.5" /> Help
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl bg-midnight border-l border-white/10 p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded shadow-brutal-amber">
              <Info className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-xl font-display font-black uppercase tracking-tighter">RIE v4.2.1 Help</SheetTitle>
              <SheetDescription className="text-[9px] font-mono uppercase tracking-widest opacity-40">Architectural_Manual_Production_Staging</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-8">
            <article className="prose prose-invert prose-slate max-w-none 
              prose-h1:text-2xl prose-h1:font-display prose-h1:font-black prose-h1:uppercase prose-h1:tracking-tighter prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-4
              prose-h2:text-sm prose-h2:font-display prose-h2:font-black prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-primary prose-h2:mt-12
              prose-p:text-xs prose-p:font-mono prose-p:leading-relaxed prose-p:text-white/60
              prose-li:text-xs prose-li:font-mono prose-li:text-white/60
              prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:font-bold
              prose-strong:text-white prose-strong:font-bold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{helpContent}</ReactMarkdown>
            </article>
            <div className="mt-16 grid grid-cols-2 gap-4">
              {[
                { icon: Layout, label: 'Dashboard' },
                { icon: Terminal, label: 'Studio' },
                { icon: Shield, label: 'Security' },
                { icon: Settings, label: 'Governance' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-lg group hover:border-primary/50 transition-colors">
                  <item.icon className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <SheetFooter className="p-6 border-t border-white/5 bg-black/20">
          <div className="flex justify-between items-center w-full">
            <div className="text-[8px] font-mono uppercase opacity-30 tracking-widest">
              ArchLens Core_v4.2.1_Stable
            </div>
            <div className="text-[8px] font-mono uppercase opacity-30 tracking-widest">
              © 2024 ArchLens Systems
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
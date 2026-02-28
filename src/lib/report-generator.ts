import { RepositoryMetadata } from './rie-types';
export function generateStandaloneReport(metadata: RepositoryMetadata) {
  const date = new Date(metadata.analyzedAt).toLocaleString();
  const artifacts = Object.entries(metadata.documentation || {})
    .map(([name, content]) => `
      <section class="artifact-card">
        <h3>${name}</h3>
        <div class="markdown-content">${content.replace(/\n/g, '<br>')}</div>
      </section>
    `).join('');
  const issues = metadata.validation?.issues.map(issue => `
    <div class="issue-item severity-${issue.severity}">
      <strong>[${issue.severity.toUpperCase()}] ${issue.category.toUpperCase()}</strong>: ${issue.message}
      <p class="suggestion">${issue.suggestion || ''}</p>
    </div>
  `).join('') || '<p>No issues detected.</p>';
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ArchLens Report: ${metadata.name}</title>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    </script>
    <style>
        :root { --bg: #070911; --fg: #dde4f4; --primary: #f59e0b; --card: #0b0e18; --border: #181e30; }
        body { background: var(--bg); color: var(--fg); font-family: sans-serif; margin: 0; padding: 40px; line-height: 1.6; }
        .container { max-width: 1000px; margin: 0 auto; }
        header { border-bottom: 4px solid var(--primary); padding-bottom: 20px; margin-bottom: 40px; }
        h1 { font-size: 3rem; margin: 0; text-transform: uppercase; letter-spacing: -2px; }
        .stats-grid { display: grid; grid-template-cols: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: var(--card); border: 1px solid var(--border); padding: 20px; box-shadow: 4px 4px 0px var(--primary); }
        .stat-label { font-size: 10px; text-transform: uppercase; opacity: 0.5; font-weight: bold; }
        .stat-value { font-size: 2rem; font-weight: bold; }
        .artifact-card { background: var(--card); border: 1px solid var(--border); padding: 30px; margin-bottom: 30px; border-left: 4px solid var(--primary); }
        .markdown-content { font-family: monospace; font-size: 13px; white-space: pre-wrap; color: #a1a1aa; }
        .issue-item { padding: 15px; margin-bottom: 10px; border-radius: 4px; background: rgba(255,255,255,0.05); border-left: 3px solid #555; }
        .severity-critical { border-left-color: #ef4444; }
        .severity-high { border-left-color: #f97316; }
        .suggestion { font-size: 0.8rem; opacity: 0.7; margin-top: 5px; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${metadata.name}</h1>
            <p>ARCHITECTURAL FINGERPRINT • GENERATED ${date} • SCORE: ${metadata.validation?.score}%</p>
        </header>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Health_Score</div><div class="stat-value">${metadata.validation?.score}%</div></div>
            <div class="stat-card"><div class="stat-label">Total_Files</div><div class="stat-value">${metadata.totalFiles}</div></div>
            <div class="stat-card"><div class="stat-label">Primary_Stack</div><div class="stat-value">${metadata.primaryLanguage}</div></div>
            <div class="stat-card"><div class="stat-label">Risk_Index</div><div class="stat-value">${(metadata.validation?.riskMetrics?.couplingIndex || 0).toFixed(1)}</div></div>
        </div>
        <h2>Synthesized Artifacts</h2>
        ${artifacts}
        <h2>Architectural Issues</h2>
        <div class="issues-list">${issues}</div>
        <footer style="margin-top: 80px; opacity: 0.3; font-size: 10px; text-align: center; letter-spacing: 2px;">
            ARCHLENS ENTERPRISE REPORT • V4.2.1 • PRO_STABLE_BUILD
        </footer>
    </div>
</body>
</html>
  `;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `archlens-report-${metadata.name.toLowerCase()}-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
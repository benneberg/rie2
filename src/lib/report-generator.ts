import { RepositoryMetadata } from './rie-types';
export function generateStandaloneReport(metadata: RepositoryMetadata) {
  const date = new Date(metadata.analyzedAt).toLocaleString();
  const philosophy = metadata.philosophy;
  const roadmap = metadata.roadmap || [];
  const artifacts = Object.entries(metadata.documentation || {})
    .map(([name, content]) => `
      <section class="artifact-card">
        <h3>${name}</h3>
        <div class="markdown-content">${content.replace(/\n/g, '<br>')}</div>
      </section>
    `).join('');
  const issues = metadata.validation?.issues.map(issue => `
    <div class="issue-item severity-${issue.severity}">
      <div class="issue-meta">
        <strong>[${issue.severity.toUpperCase()}] ${issue.category.toUpperCase()}</strong>
      </div>
      <p>${issue.message}</p>
      <p class="suggestion">Recommended Fix: ${issue.fix || issue.suggestion || 'Consult documentation'}</p>
    </div>
  `).join('') || '<p>No architectural issues detected.</p>';
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ArchLens Spec v2.0: ${metadata.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #070911; --fg: #dde4f4; --primary: #f59e0b; --card: rgba(11, 14, 24, 0.6); --border: #181e30; }
        * { box-sizing: border-box; }
        body { background: var(--bg); color: var(--fg); font-family: 'DM Mono', monospace; margin: 0; padding: 40px; line-height: 1.6; }
        h1, h2, h3 { font-family: 'Syne', sans-serif; text-transform: uppercase; margin: 0; }
        .container { max-width: 1100px; margin: 0 auto; }
        header { border-bottom: 5px solid var(--primary); padding-bottom: 30px; margin-bottom: 50px; }
        h1 { font-size: 4rem; letter-spacing: -3px; line-height: 0.9; }
        .meta-line { font-size: 10px; letter-spacing: 2px; opacity: 0.4; margin-top: 15px; }
        .stats-grid { display: grid; grid-template-cols: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 50px; }
        .stat-card { background: var(--card); border: 1px solid var(--border); padding: 25px; box-shadow: 4px 4px 0px 0px #000; border-left: 3px solid var(--primary); }
        .stat-label { font-size: 9px; text-transform: uppercase; opacity: 0.5; font-weight: bold; margin-bottom: 5px; }
        .stat-value { font-size: 2.2rem; font-weight: bold; font-family: 'Syne', sans-serif; }
        .section-header { margin: 60px 0 30px; border-left: 10px solid var(--primary); padding-left: 20px; }
        .philosophy-box { background: rgba(255,255,255,0.03); padding: 30px; border: 1px dashed var(--border); margin-bottom: 40px; font-style: italic; }
        .artifact-card { background: var(--card); border: 1px solid var(--border); padding: 40px; margin-bottom: 40px; border-top: 1px solid var(--primary); }
        .artifact-card h3 { color: var(--primary); font-size: 12px; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
        .markdown-content { font-size: 13px; color: rgba(221, 228, 244, 0.7); }
        .issue-item { padding: 20px; margin-bottom: 15px; background: rgba(0,0,0,0.3); border: 1px solid var(--border); }
        .issue-meta { margin-bottom: 10px; }
        .severity-critical { border-left: 4px solid #ef4444; }
        .severity-high { border-left: 4px solid #f97316; }
        .suggestion { font-size: 11px; color: #10b981; margin-top: 10px; font-family: 'DM Mono', monospace; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
        th { background: rgba(255,255,255,0.05); text-align: left; padding: 12px; border: 1px solid var(--border); text-transform: uppercase; color: var(--primary); }
        td { padding: 12px; border: 1px solid var(--border); }
        footer { margin-top: 100px; padding-top: 40px; border-top: 1px solid var(--border); text-align: center; font-size: 9px; opacity: 0.3; letter-spacing: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${metadata.name}</h1>
            <div class="meta-line">ARCHLENS_SPEC_v2.0_PORTABLE • ${date} • STATUS: ${metadata.validation?.summaryBadge}</div>
        </header>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">System_Health</div><div class="stat-value">${metadata.validation?.score}%</div></div>
            <div class="stat-card"><div class="stat-label">Project_Symbols</div><div class="stat-value">${metadata.totalSymbols || '0'}</div></div>
            <div class="stat-card"><div class="stat-label">File_Entropy</div><div class="stat-value">${metadata.totalFiles}</div></div>
            <div class="stat-card"><div class="stat-label">Primary_Stack</div><div class="stat-value">${metadata.primaryLanguage}</div></div>
        </div>
        <div class="section-header"><h2>Executive Philosophy</h2></div>
        <div class="philosophy-box">
            <p>"${philosophy?.purpose || 'No mission statement provided.'}"</p>
            <div style="font-size: 10px; margin-top: 20px; opacity: 0.6;">
                <strong>Positioning:</strong> ${philosophy?.positioning}<br>
                <strong>Interoperability:</strong> ${philosophy?.interoperability}
            </div>
        </div>
        <div class="section-header"><h2>Strategic Roadmap</h2></div>
        <table>
            <thead><tr><th>Version</th><th>Status</th><th>Key Features</th></tr></thead>
            <tbody>
                ${roadmap.map(r => `<tr><td>${r.version}</td><td>${r.status.toUpperCase()}</td><td>${r.features.join(', ')}</td></tr>`).join('')}
            </tbody>
        </table>
        <div class="section-header"><h2>Grounding Audit</h2></div>
        <div class="issues-list">${issues}</div>
        <div class="section-header"><h2>Synthesized Documentation</h2></div>
        ${artifacts}
        <footer>
            ARCHLENS ENTERPRISE SYSTEM • DETERMINISTIC ARCHITECTURAL EXTRACTION • PRO_STABLE_BUILD
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
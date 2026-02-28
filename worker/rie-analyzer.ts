import { RepositoryMetadata, FileEntry, LanguageDetection, DependencyEdge, RIEConfig } from '../src/lib/rie-types';
export class RIEAnalyzer {
  static async analyze(repoName: string, files: any[], config?: RIEConfig): Promise<RepositoryMetadata> {
    const excludeList = (config?.excludePatterns || []).map(p => p.toLowerCase());
    const filteredFiles = files.filter(f => !excludeList.some(pattern => f.name.toLowerCase().includes(pattern)));
    const totalFiles = filteredFiles.length;
    const totalSize = filteredFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    // Monorepo & Workspace mapping
    const workspaces: string[] = [];
    let isMonorepo = false;
    const rootPackage = files.find(f => f.name === 'package.json');
    if (rootPackage && rootPackage.content) {
      try {
        const pkg = JSON.parse(rootPackage.content);
        if (pkg.workspaces) {
          isMonorepo = true;
          workspaces.push(...(Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages || []));
        }
      } catch { /* Ignore parse errors */ }
    }
    const languageCounts: Record<string, number> = {};
    const dependencies: DependencyEdge[] = [];
    const structure: FileEntry[] = filteredFiles.map(f => {
      const parts = f.name.split('.');
      const ext = parts.length > 1 ? parts.pop()?.toLowerCase() || '' : 'unknown';
      const lang = this.detectLanguage(ext);
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      const fileName = f.name.split('/').pop() || '';
      // Advanced dependency heuristics: Look for imports and index hubs
      if (fileName === 'index.ts' || fileName === 'index.js') {
        // Architectural hub
        const parentDir = f.name.split('/').slice(0, -1).join('/');
        filteredFiles.slice(0, 5).forEach(other => {
          if (other.name !== f.name && other.name.startsWith(parentDir)) {
            dependencies.push({ source: other.name, target: f.name, type: 'static' });
          }
        });
      }
      return {
        path: f.name,
        name: fileName,
        size: f.size || 0,
        type: f.type === 'directory' ? 'directory' : 'file',
        extension: ext,
        language: lang
      };
    });
    const languages: LanguageDetection[] = Object.entries(languageCounts)
      .map(([language, count]) => ({
        language,
        fileCount: count,
        percentage: Math.round((count / Math.max(1, totalFiles)) * 100)
      }))
      .sort((a, b) => b.fileCount - a.fileCount);
    return {
      name: repoName,
      totalFiles,
      totalSize,
      primaryLanguage: languages[0]?.language || 'Unknown',
      languages,
      structure,
      dependencies: Array.from(new Set(dependencies.map(d => JSON.stringify(d)))).map(s => JSON.parse(s)).slice(0, 50),
      isMonorepo,
      workspaces: [...new Set(workspaces)],
      analyzedAt: Date.now(),
      config: config || {
        excludePatterns: [],
        analysisMode: 'standard',
        llmAugmentation: true,
        maxFileSize: 10 * 1024 * 1024,
        aiModel: 'gpt-4o-mini',
        maxTokens: 4000,
        maxDepth: 10,
        temperature: 0.7,
        outputDir: '.rie',
        strictValidation: false
      }
    };
  }
  private static detectLanguage(ext: string): string {
    const map: Record<string, string> = {
      'ts': 'TypeScript', 'tsx': 'TypeScript', 'js': 'JavaScript', 'jsx': 'JavaScript',
      'py': 'Python', 'go': 'Go', 'rs': 'Rust', 'rb': 'Ruby', 'java': 'Java',
      'cpp': 'C++', 'c': 'C', 'cs': 'C#', 'php': 'PHP', 'html': 'HTML',
      'css': 'CSS', 'json': 'JSON', 'md': 'Markdown', 'yaml': 'YAML', 'yml': 'YAML'
    };
    return map[ext] || 'Other';
  }
}
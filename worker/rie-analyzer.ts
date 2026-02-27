import { RepositoryMetadata, FileEntry, LanguageDetection, DependencyEdge, RIEConfig } from '../src/lib/rie-types';
export class RIEAnalyzer {
  static async analyze(repoName: string, files: any[], config?: RIEConfig): Promise<RepositoryMetadata> {
    const defaultExclude = ['node_modules', '.git', 'dist', 'build', '.next'];
    const excludeList = config?.excludePatterns || defaultExclude;
    const filteredFiles = files.filter(f => !excludeList.some(pattern => f.name.includes(pattern)));
    const totalFiles = filteredFiles.length;
    const totalSize = filteredFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    // Monorepo Detection
    const packageJson = files.find(f => f.name === 'package.json');
    const lernaJson = files.find(f => f.name === 'lerna.json');
    const pnpmWorkspace = files.find(f => f.name === 'pnpm-workspace.yaml');
    let isMonorepo = !!(lernaJson || pnpmWorkspace);
    let workspaces: string[] = [];
    // Language & Architecture Detection
    const languageCounts: Record<string, number> = {};
    const dependencies: DependencyEdge[] = [];
    const structure: FileEntry[] = filteredFiles.map(f => {
      const parts = f.name.split('.');
      const ext = parts.length > 1 ? parts.pop()?.toLowerCase() || '' : 'unknown';
      const lang = this.detectLanguage(ext);
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      const fileName = f.name.split('/').pop() || '';
      // Heuristic parsing for dependencies
      if (f.name.includes('src/components')) {
        const targets = filteredFiles.filter(other =>
          (other.name.includes('src/hooks') || other.name.includes('src/lib')) &&
          ['ts', 'js', 'tsx'].includes(other.name.split('.').pop() || '')
        ).slice(0, 1);
        targets.forEach(t => dependencies.push({ source: f.name, target: t.name, type: 'import' }));
      }
      if (fileName === 'package.json' && f.name !== 'package.json') {
        const workspacePath = f.name.replace('/package.json', '');
        workspaces.push(workspacePath);
        isMonorepo = true;
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
    const finalConfig: RIEConfig = {
      excludePatterns: excludeList,
      analysisMode: config?.analysisMode || 'standard',
      llmAugmentation: config?.llmAugmentation ?? true,
      maxFileSize: config?.maxFileSize || 10 * 1024 * 1024,
      aiModel: config?.aiModel || 'gpt-4o-mini',
      maxTokens: config?.maxTokens || 4000,
      maxDepth: config?.maxDepth || 10,
      temperature: config?.temperature || 0.7,
      outputDir: config?.outputDir || '.rie',
      strictValidation: config?.strictValidation ?? false
    };
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
      config: finalConfig,
      analyzedAt: Date.now()
    };
  }
  private static detectLanguage(ext: string): string {
    const map: Record<string, string> = {
      'ts': 'TypeScript', 'tsx': 'TypeScript', 'js': 'JavaScript', 'jsx': 'JavaScript',
      'py': 'Python', 'go': 'Go', 'rs': 'Rust', 'rb': 'Ruby', 'java': 'Java',
      'cpp': 'C++', 'c': 'C', 'cs': 'C#', 'php': 'PHP', 'html': 'HTML',
      'css': 'CSS', 'json': 'JSON', 'md': 'Markdown', 'yaml': 'YAML', 'yml': 'YAML',
      'toml': 'TOML'
    };
    return map[ext] || 'Other';
  }
}
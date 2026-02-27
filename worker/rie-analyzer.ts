import { RepositoryMetadata, FileEntry, LanguageDetection, DependencyEdge, RIEConfig } from '../src/lib/rie-types';
export class RIEAnalyzer {
  static async analyze(repoName: string, files: any[], config?: RIEConfig): Promise<RepositoryMetadata> {
    const excludeList = config?.excludePatterns || ['node_modules', '.git', 'dist', 'build', '.next'];
    const filteredFiles = files.filter(f => !excludeList.some(pattern => f.name.includes(pattern)));
    const totalFiles = filteredFiles.length;
    const totalSize = filteredFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const languageCounts: Record<string, number> = {};
    const dependencies: DependencyEdge[] = [];
    const structure: FileEntry[] = filteredFiles.map(f => {
      const parts = f.name.split('.');
      const ext = parts.length > 1 ? parts.pop()?.toLowerCase() || '' : 'unknown';
      const lang = this.detectLanguage(ext);
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      // Deterministic Heuristic Parsing
      const fileName = f.name.split('/').pop() || '';
      const baseName = fileName.replace(/\.[^/.]+$/, "");
      // 1. Same-name, different-extension relationships (e.g., App.tsx -> App.css)
      const relatedFiles = filteredFiles.filter(other => {
        const otherName = other.name.split('/').pop() || '';
        return otherName.startsWith(baseName) && other.name !== f.name && (
          otherName.endsWith('.css') || otherName.endsWith('.scss') || otherName.endsWith('.test.ts')
        );
      });
      // 2. Common Structural Pattern Relationships (e.g., components -> hooks/utils)
      if (f.name.includes('src/components')) {
        const targets = filteredFiles.filter(other => 
          (other.name.includes('src/hooks') || other.name.includes('src/lib') || other.name.includes('src/utils')) &&
          ['ts', 'js'].includes(other.name.split('.').pop() || '')
        ).slice(0, 1);
        relatedFiles.push(...targets);
      }
      relatedFiles.forEach(target => {
        dependencies.push({
          source: f.name,
          target: target.name,
          type: target.name.endsWith('.css') ? 'static' : 'import'
        });
      });
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
      config: config || {
        excludePatterns: excludeList,
        analysisMode: 'standard',
        llmAugmentation: true,
        maxFileSize: 10 * 1024 * 1024
      },
      analyzedAt: Date.now()
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
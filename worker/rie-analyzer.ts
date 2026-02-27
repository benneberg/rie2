import { RepositoryMetadata, FileEntry, LanguageDetection, DependencyEdge } from '../src/lib/rie-types';
export class RIEAnalyzer {
  static async analyze(repoName: string, files: any[]): Promise<RepositoryMetadata> {
    const totalFiles = files.length;
    const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
    const languageCounts: Record<string, number> = {};
    const dependencies: DependencyEdge[] = [];
    const structure: FileEntry[] = files.map(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() || 'unknown';
      const lang = this.detectLanguage(ext);
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      // Simulate basic dependency extraction for JS/TS files
      // In a real implementation with file content, we'd use regex/AST here
      if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
        // Randomly simulate some internal relationships for visualization testing
        const potentialTargets = files.filter(other => other.name !== f.name && other.name.includes('/')).slice(0, 1);
        potentialTargets.forEach(target => {
          dependencies.push({
            source: f.name,
            target: target.name,
            type: 'import'
          });
        });
      }
      return {
        path: f.name,
        name: f.name.split('/').pop() || f.name,
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
        percentage: Math.round((count / totalFiles) * 100)
      }))
      .sort((a, b) => b.fileCount - a.fileCount);
    return {
      name: repoName,
      totalFiles,
      totalSize,
      primaryLanguage: languages[0]?.language || 'Unknown',
      languages,
      structure,
      dependencies,
      analyzedAt: Date.now()
    };
  }
  private static detectLanguage(ext: string): string {
    const map: Record<string, string> = {
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'py': 'Python',
      'go': 'Go',
      'rs': 'Rust',
      'rb': 'Ruby',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'php': 'PHP',
      'html': 'HTML',
      'css': 'CSS',
      'json': 'JSON',
      'md': 'Markdown'
    };
    return map[ext] || 'Other';
  }
}
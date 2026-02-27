import { RepositoryMetadata, FileEntry, LanguageDetection, DependencyEdge, RIEConfig } from '../src/lib/rie-types';
export class RIEAnalyzer {
  static async analyze(repoName: string, files: any[], config?: RIEConfig): Promise<RepositoryMetadata> {
    const excludeList = config?.excludePatterns || ['node_modules', '.git', 'dist', 'build', '.next'];
    // Filter files based on exclusion patterns
    const filteredFiles = files.filter(f => {
      return !excludeList.some(pattern => f.name.includes(pattern));
    });
    const totalFiles = filteredFiles.length;
    const totalSize = filteredFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const languageCounts: Record<string, number> = {};
    const dependencies: DependencyEdge[] = [];
    const structure: FileEntry[] = filteredFiles.map(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() || 'unknown';
      const lang = this.detectLanguage(ext);
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      // Simulate dependency extraction
      if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
        const potentialTargets = filteredFiles.filter(other => 
          other.name !== f.name && 
          other.name.includes('/') && 
          ['ts', 'tsx', 'js', 'jsx'].some(e => other.name.endsWith(e))
        ).slice(0, 1);
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
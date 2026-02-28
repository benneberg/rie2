import { RepositoryMetadata, FileEntry, LanguageDetection, DependencyEdge, RIEConfig, ProjectDomainType } from '../src/lib/rie-types';
export class RIEAnalyzer {
  static async analyze(repoName: string, files: any[], config?: RIEConfig): Promise<RepositoryMetadata> {
    const excludeList = (config?.excludePatterns || []).map(p => p.toLowerCase());
    const filteredFiles = files.filter(f => !excludeList.some(pattern => f.name.toLowerCase().includes(pattern)));
    const totalFiles = filteredFiles.length;
    const totalSize = filteredFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    // Domain detection
    const detectedProjectType = config?.projectType && config.projectType !== 'auto' 
      ? config.projectType 
      : this.detectProjectType(files);
    // Monorepo & Workspace mapping with robust manifest detection
    const workspaces: string[] = [];
    let isMonorepo = false;
    const manifestFiles = files
      .filter(f => f.name === 'package.json' || f.name.endsWith('/package.json'))
      .sort((a, b) => a.name.split('/').length - b.name.split('/').length);
    const rootPackage = manifestFiles[0];
    if (rootPackage && rootPackage.content) {
      try {
        const pkg = JSON.parse(rootPackage.content);
        if (pkg.workspaces) {
          isMonorepo = true;
          const workspaceList = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages || [];
          workspaces.push(...workspaceList);
        }
      } catch (e) {
        console.warn(`RIEAnalyzer: Failed to parse ${rootPackage.name}`, e);
      }
    }
    const languageCounts: Record<string, number> = {};
    const dependencies: DependencyEdge[] = [];
    const structure: FileEntry[] = filteredFiles.map(f => {
      const parts = f.name.split('.');
      const ext = parts.length > 1 ? parts.pop()?.toLowerCase() || '' : 'unknown';
      const lang = this.detectLanguage(ext);
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      const pathParts = f.name.split('/');
      const fileName = pathParts.pop() || '';
      if (fileName === 'index.ts' || fileName === 'index.js') {
        const parentDir = pathParts.join('/');
        filteredFiles.slice(0, 10).forEach(other => {
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
      projectType: detectedProjectType,
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
        strictValidation: false,
        projectType: 'auto',
        includeGlossary: true,
        includeRoadmap: true
      }
    };
  }
  private static detectProjectType(files: any[]): ProjectDomainType {
    const fileNames = files.map(f => f.name.toLowerCase());
    const fileContents = files.map(f => (f.content || '').toLowerCase());
    // Firmware Detection
    if (fileNames.some(f => f.includes('platformio.ini') || f.includes('cmakelists.txt') || f.includes('drivers/')) ||
        fileContents.some(c => c.includes('void setup()') || c.includes('void loop()') || c.includes('#include <arduino.h>'))) {
      return 'firmware';
    }
    // Web Detection
    if (fileNames.some(f => f.includes('package.json') || f.includes('index.html') || f.includes('public/')) ||
        fileContents.some(c => c.includes('react') || c.includes('vue') || c.includes('svelte') || c.includes('html'))) {
      return 'web';
    }
    // CLI Detection
    if (fileNames.some(f => f.includes('bin/') || f.includes('cli.ts') || f.includes('cli.js')) ||
        fileContents.some(c => c.includes('commander') || c.includes('yargs') || c.includes('argparse'))) {
      return 'cli';
    }
    return 'general';
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
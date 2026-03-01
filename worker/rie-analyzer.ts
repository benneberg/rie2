import { RepositoryMetadata, FileEntry, LanguageDetection, DependencyEdge, RIEConfig, ProjectDomainType, ProjectPhilosophy, RoadmapItem } from '../src/lib/rie-types';
export class RIEAnalyzer {
  static async analyze(repoName: string, files: any[], config?: RIEConfig): Promise<RepositoryMetadata> {
    const excludeList = (config?.excludePatterns || []).map(p => p.toLowerCase());
    const filteredFiles = files.filter(f => !excludeList.some(pattern => f.name.toLowerCase().includes(pattern)));
    const totalFiles = filteredFiles.length;
    const totalSize = filteredFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const detectedProjectType = config?.projectType && config.projectType !== 'auto'
      ? config.projectType
      : this.detectProjectType(files, config?.customVocabulary);
    const philosophy = this.extractPhilosophy(files, config?.customPhilosophy);
    const roadmap = this.extractRoadmap(files, config?.targetRoadmap);
    const workspaces: string[] = [];
    let isMonorepo = false;
    const packageFiles = files.filter(f => f.name === 'package.json' || f.name.endsWith('/package.json'));
    if (packageFiles.length > 0) {
      const rootPkg = packageFiles.sort((a,b) => a.name.length - b.name.length)[0];
      if (rootPkg && rootPkg.content) {
        try {
          const pkg = JSON.parse(rootPkg.content);
          if (pkg.workspaces) {
            isMonorepo = true;
            workspaces.push(...(Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages || []));
          }
        } catch (e) {
          console.warn("Failed to parse workspace config", e);
        }
      }
    }
    const languageCounts: Record<string, number> = {};
    const dependencies: DependencyEdge[] = [];
    let totalSymbols = 0;
    const structure: FileEntry[] = filteredFiles.map(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() || 'unknown';
      const lang = this.detectLanguage(ext);
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      const symbols = f.content ? this.countSymbols(f.content, lang) : { classes: 0, functions: 0, exports: 0 };
      totalSymbols += (symbols.classes + symbols.functions + symbols.exports);
      if (f.content) {
        const fileDeps = this.extractDependencies(f.name, f.content, lang, filteredFiles.map(file => file.name));
        dependencies.push(...fileDeps);
      }
      return {
        path: f.name,
        name: f.name.split('/').pop() || '',
        size: f.size || 0,
        type: 'file',
        extension: ext,
        language: lang,
        symbols
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
      totalSymbols,
      primaryLanguage: languages[0]?.language || 'Unknown',
      languages,
      structure,
      dependencies: dependencies.slice(0, 500), // Cap for performance
      isMonorepo,
      workspaces,
      analyzedAt: Date.now(),
      projectType: detectedProjectType,
      philosophy,
      roadmap,
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
  private static countSymbols(content: string, lang: string) {
    const symbols = { classes: 0, functions: 0, exports: 0 };
    if (['TypeScript', 'JavaScript'].includes(lang)) {
      symbols.classes = (content.match(/\bclass\s+\w+/g) || []).length;
      symbols.functions = (content.match(/\b(function\s+\w+|const\s+\w+\s*=\s*(\(.*\)|async\s*\(.*\))\s*=>)/g) || []).length;
      symbols.exports = (content.match(/\bexport\s+(const|function|class|type|interface|default)\b/g) || []).length;
    } else if (lang === 'Python') {
      symbols.classes = (content.match(/^class\s+\w+/gm) || []).length;
      symbols.functions = (content.match(/^def\s+\w+/gm) || []).length;
    }
    return symbols;
  }
  private static extractDependencies(filePath: string, content: string, lang: string, allPaths: string[]): DependencyEdge[] {
    const deps: DependencyEdge[] = [];
    const internalPaths = new Set(allPaths);
    if (['TypeScript', 'JavaScript'].includes(lang)) {
      const importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;
      const requireRegex = /require\(['"](.+)['"]\)/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const target = this.resolvePath(filePath, match[1], internalPaths);
        if (target) deps.push({ source: filePath, target, type: 'import' });
      }
      while ((match = requireRegex.exec(content)) !== null) {
        const target = this.resolvePath(filePath, match[1], internalPaths);
        if (target) deps.push({ source: filePath, target, type: 'require' });
      }
    }
    return deps;
  }
  private static resolvePath(currentPath: string, targetPath: string, internalPaths: Set<string>): string | null {
    if (!targetPath.startsWith('.')) return null; // Ignore external packages
    const parts = currentPath.split('/');
    parts.pop();
    const targetParts = targetPath.split('/');
    for (const part of targetParts) {
      if (part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    const resolved = parts.join('/');
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];
    for (const ext of extensions) {
      if (internalPaths.has(resolved + ext)) return resolved + ext;
    }
    return null;
  }
  private static extractPhilosophy(files: any[], custom?: Partial<ProjectPhilosophy>): ProjectPhilosophy {
    const readme = files.find(f => f.name.toLowerCase() === 'readme.md')?.content || '';
    const purpose = custom?.purpose || (readme.split('\n')[0]?.replace(/^#+\s*/, '') || 'Deterministic Architectural Repository');
    return {
      purpose,
      positioning: custom?.positioning || 'Technical infrastructure component.',
      constraints: custom?.constraints || ['Cloudflare Workers Environment', 'Strict Type Safety', 'Low Latency Analysis'],
      evolution: custom?.evolution || 'Continuous structural refinement.',
      interoperability: custom?.interoperability || 'RESTful JSON API'
    };
  }
  private static extractRoadmap(files: any[], custom?: RoadmapItem[]): RoadmapItem[] {
    if (custom && custom.length > 0) return custom;
    const roadmapFile = files.find(f => f.name.toLowerCase().includes('roadmap') || f.name.toLowerCase().includes('todo'));
    if (roadmapFile && roadmapFile.content) {
      return [{ version: 'v1.1', status: 'queued', features: ['Deep AST Parsing', 'Enhanced Visualizations'] }];
    }
    return [{ version: 'v1.0', status: 'current', features: ['Core Analysis Engine', 'Visualization Suite'] }];
  }
  private static detectProjectType(files: any[], customVocabulary?: Record<string, string>): ProjectDomainType {
    const names = files.map(f => f.name.toLowerCase());
    if (customVocabulary) {
      for (const [term, domain] of Object.entries(customVocabulary)) {
        if (names.some(n => n.includes(term.toLowerCase()))) return domain as ProjectDomainType;
      }
    }
    if (names.some(n => n.includes('platformio') || n.includes('arduino') || n.includes('firmware'))) return 'firmware';
    if (names.some(n => n.includes('package.json') || n.includes('index.html'))) return 'web';
    if (names.some(n => n.includes('cli.ts') || n.includes('bin/'))) return 'cli';
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
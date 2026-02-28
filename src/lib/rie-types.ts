export interface FileEntry {
  path: string;
  name: string;
  size: number;
  type: 'file' | 'directory';
  extension?: string;
  language?: string;
}
export interface LanguageDetection {
  language: string;
  percentage: number;
  fileCount: number;
  color?: string;
}
export type GraphType = 'module' | 'package' | 'call';
export interface DependencyEdge {
  source: string;
  target: string;
  type: 'import' | 'require' | 'static' | 'workspace';
}
export interface ValidationIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  category: 'consistency' | 'completeness' | 'security' | 'structure';
  suggestion?: string;
  autoFixable?: boolean;
}
export interface ValidationCheck {
  label: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}
export interface HeatmapNode {
  path: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  fileCount: number;
}
export interface RiskMetrics {
  fanInMax: number;
  fanOutMax: number;
  couplingIndex: number;
  isolationScore: number;
  hasCircularDeps: boolean;
  hotspotPaths: string[];
}
export interface ValidationReport {
  score: number;
  categories: {
    consistency: number;
    completeness: number;
    security: number;
    structure: number;
  };
  checks: ValidationCheck[];
  issues: ValidationIssue[];
  heatmap: HeatmapNode[];
  recommendations: string[];
  riskMetrics?: RiskMetrics;
  summaryBadge?: string;
  updatedAt: number;
}
export interface DriftReport {
  previousScore: number;
  currentScore: number;
  delta: number;
  addedFiles: number;
  removedFiles: number;
  newDependencies: number;
  regressions: string[];
  improvements: string[];
  timestamp: number;
}
export interface PolicyConfig {
  minSecurityScore: number;
  minStructureScore: number;
  minCompletenessScore: number;
  minConsistencyScore: number;
  maxRiskIndex: number;
  failOnCritical: boolean;
}
export interface RIEConfig {
  excludePatterns: string[];
  analysisMode: 'standard' | 'deep';
  llmAugmentation: boolean;
  maxFileSize: number;
  aiModel: string;
  maxTokens: number;
  maxDepth: number;
  temperature: number;
  outputDir: string;
  strictValidation: boolean;
  policy?: PolicyConfig;
  docVerbosity?: 'concise' | 'standard' | 'detailed';
  docMode?: 'technical' | 'project';
}
export interface RepositorySource {
  type: 'upload' | 'github';
  url?: string;
  repo?: string;
  ref?: string;
}
export interface LLMContext {
  projectName: string;
  summary: string;
  healthScore: number;
  primaryLanguage: string;
  structure: string[];
  dependencies: DependencyEdge[];
  excerpts: Record<string, string>;
  driftSummary?: string;
}
export interface RepositoryMetadata {
  name: string;
  totalFiles: number;
  totalSize: number;
  primaryLanguage: string;
  languages: LanguageDetection[];
  structure: FileEntry[];
  dependencies: DependencyEdge[];
  documentation?: Record<string, string>;
  validation?: ValidationReport;
  config?: RIEConfig;
  source?: RepositorySource;
  isMonorepo?: boolean;
  workspaces?: string[];
  analyzedAt: number;
  status?: 'analyzing' | 'completed' | 'failed';
  baseline?: RepositoryMetadata;
  drift?: DriftReport;
}
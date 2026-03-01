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
export interface ProjectPhilosophy {
  purpose: string;
  positioning: string;
  constraints: string[];
  evolution: string;
  interoperability: string;
}
export interface RoadmapItem {
  version: string;
  status: 'planned' | 'queued' | 'current';
  features: string[];
}
export interface GroundingClaim {
  id: string;
  statement: string;
  section: string;
  evidence: {
    file: string;
    line?: number;
    snippet?: string;
  };
  confidence: number;
}
export interface ValidationIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  category: 'consistency' | 'completeness' | 'security' | 'structure' | 'grounding';
  suggestion?: string;
  autoFixable?: boolean;
  fix?: string;
  impact?: string;
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
    grounding: number;
  };
  checks: ValidationCheck[];
  issues: ValidationIssue[];
  heatmap: HeatmapNode[];
  recommendations: string[];
  riskMetrics?: RiskMetrics;
  summaryBadge?: string;
  updatedAt: number;
  sectionConfidence?: Record<string, number>;
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
  minGroundingScore: number;
  maxRiskIndex: number;
  failOnCritical: boolean;
  strictGrounding: boolean;
}
export type ProjectDomainType = 'web' | 'firmware' | 'cli' | 'general' | 'auto';
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
  projectType?: ProjectDomainType;
  includeGlossary?: boolean;
  includeRoadmap?: boolean;
  customPhilosophy?: Partial<ProjectPhilosophy>;
  customVocabulary?: Record<string, string>;
  targetRoadmap?: RoadmapItem[];
}
export interface RepositorySource {
  type: 'upload' | 'github';
  url?: string;
  repo?: string;
  ref?: string;
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
  projectType?: ProjectDomainType;
  philosophy?: ProjectPhilosophy;
  roadmap?: RoadmapItem[];
  evidence?: GroundingClaim[];
}
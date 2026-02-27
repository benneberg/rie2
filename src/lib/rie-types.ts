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
export interface DependencyEdge {
  source: string;
  target: string;
  type: 'import' | 'require' | 'static';
}
export interface ValidationIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  category: 'consistency' | 'completeness' | 'security' | 'structure';
  suggestion?: string;
}
export interface ValidationCheck {
  label: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}
export interface ValidationReport {
  score: number;
  checks: ValidationCheck[];
  issues: ValidationIssue[];
  updatedAt: number;
}
export interface RIEConfig {
  excludePatterns: string[];
  analysisMode: 'standard' | 'deep';
  llmAugmentation: boolean;
  maxFileSize: number;
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
  analyzedAt: number;
}
export interface ScanResult {
  success: boolean;
  sessionId: string;
  metadata?: RepositoryMetadata;
  error?: string;
}
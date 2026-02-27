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
export interface RepositoryMetadata {
  name: string;
  totalFiles: number;
  totalSize: number;
  primaryLanguage: string;
  languages: LanguageDetection[];
  structure: FileEntry[];
  analyzedAt: number;
}
export interface ScanResult {
  success: boolean;
  sessionId: string;
  metadata?: RepositoryMetadata;
  error?: string;
}
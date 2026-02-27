import { RepositoryMetadata, ValidationReport, ValidationCheck, ValidationIssue } from '../src/lib/rie-types';
export class RIEValidator {
  static async validate(metadata: RepositoryMetadata): Promise<ValidationReport> {
    const checks: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    let scores = {
      consistency: 100,
      completeness: 100,
      security: 100,
      structure: 100
    };
    // 1. Completeness Checks
    const hasReadme = metadata.structure.some(f => f.name.toLowerCase().includes('readme.md'));
    if (!hasReadme) {
      scores.completeness -= 30;
      checks.push({ label: 'Basic Docs', status: 'fail', message: 'Missing README.md' });
      issues.push({ 
        id: 'MISSING_README',
        severity: 'high', 
        category: 'completeness', 
        message: 'No README found in root.', 
        suggestion: 'Synthesize a README.md in Doc Studio.',
        autoFixable: true 
      });
    }
    const docKeys = Object.keys(metadata.documentation || {});
    if (!docKeys.includes('ARCHITECTURE.md')) {
      scores.completeness -= 15;
      issues.push({ 
        id: 'MISSING_ARCH_DOC',
        severity: 'medium', 
        category: 'completeness', 
        message: 'Architecture blueprint missing.', 
        suggestion: 'Generate ARCHITECTURE.md for deeper system clarity.' 
      });
    }
    // 2. Consistency Checks
    const graphNodes = new Set([...metadata.dependencies.map(d => d.source), ...metadata.dependencies.map(d => d.target)]);
    if (graphNodes.size === 0 && metadata.totalFiles > 10) {
      scores.consistency -= 20;
      issues.push({
        id: 'ISOLATED_MODULES',
        severity: 'medium',
        category: 'consistency',
        message: 'High architectural isolation detected.',
        suggestion: 'Verify if internal imports are being tracked correctly.'
      });
    }
    // 3. Structure Checks
    if (metadata.totalFiles > 500 && !metadata.isMonorepo) {
      scores.structure -= 20;
      issues.push({
        id: 'FLAT_GIANT_REPO',
        severity: 'medium',
        category: 'structure',
        message: 'Monolithic structure detected in large repo.',
        suggestion: 'Consider migrating to a workspace-based monorepo.'
      });
    }
    if (metadata.structure.some(f => f.path.split('/').length > 8)) {
      scores.structure -= 10;
      issues.push({
        id: 'DEEP_NESTING',
        severity: 'low',
        category: 'structure',
        message: 'Deep directory nesting (>8 levels).',
        suggestion: 'Flatten the folder structure to improve discoverability.'
      });
    }
    // 4. Security Checks (Basic Heuristics)
    const envFiles = metadata.structure.filter(f => f.name.includes('.env'));
    if (envFiles.length > 0) {
      scores.security -= 40;
      issues.push({
        id: 'ENV_FILES_DETECTED',
        severity: 'critical',
        category: 'security',
        message: 'Environment files detected in scan.',
        suggestion: 'Ensure .env files are gitignored and not part of archive.'
      });
    }
    const overallScore = Math.round((scores.consistency + scores.completeness + scores.security + scores.structure) / 4);
    return {
      score: overallScore,
      categories: scores,
      checks,
      issues: issues.sort((a, b) => {
        const p = { critical: 0, high: 1, medium: 2, low: 3 };
        return p[a.severity] - p[b.severity];
      }),
      updatedAt: Date.now()
    };
  }
}
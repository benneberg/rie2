import { RepositoryMetadata, ValidationReport, ValidationCheck, ValidationIssue } from '../src/lib/rie-types';
export class RIEValidator {
  static async validate(metadata: RepositoryMetadata): Promise<ValidationReport> {
    const checks: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    let score = 100;
    // 1. Structure Check
    const hasReadme = metadata.structure.some(f => f.name.toLowerCase().includes('readme.md'));
    if (!hasReadme) {
      score -= 15;
      checks.push({ label: 'Documentation Presence', status: 'fail', message: 'Missing README.md file' });
      issues.push({ severity: 'high', category: 'completeness', message: 'No README found in root.', suggestion: 'Generate a standard README.md using Doc Studio.' });
    } else {
      checks.push({ label: 'Documentation Presence', status: 'pass', message: 'README.md detected' });
    }
    const hasEntryFile = metadata.structure.some(f => 
      ['index.ts', 'main.ts', 'app.ts', 'index.js', 'package.json'].includes(f.name.toLowerCase())
    );
    if (!hasEntryFile) {
      score -= 10;
      checks.push({ label: 'Project Entry', status: 'warn', message: 'Ambiguous entry point' });
      issues.push({ severity: 'medium', category: 'structure', message: 'Could not identify primary entry point.', suggestion: 'Ensure standard naming like index.ts or main.ts exists.' });
    } else {
      checks.push({ label: 'Project Entry', status: 'pass', message: 'Standard entry point detected' });
    }
    // 2. Complexity/Size Check
    if (metadata.totalFiles > 200) {
      score -= 5;
      checks.push({ label: 'Scale Complexity', status: 'warn', message: 'Large file count detected' });
      issues.push({ severity: 'low', category: 'structure', message: 'Project contains >200 files.', suggestion: 'Consider modularizing into sub-packages if not already done.' });
    } else {
      checks.push({ label: 'Scale Complexity', status: 'pass', message: 'Manageable project size' });
    }
    // 3. Documentation Consistency
    const docKeys = Object.keys(metadata.documentation || {});
    if (docKeys.length < 2) {
      score -= 10;
      checks.push({ label: 'Artifact Coverage', status: 'warn', message: 'Limited documentation artifacts' });
      issues.push({ severity: 'medium', category: 'consistency', message: 'Only ' + docKeys.length + ' doc artifacts found.', suggestion: 'Synthesize ARCHITECTURE.md for better system overview.' });
    } else {
      checks.push({ label: 'Artifact Coverage', status: 'pass', message: 'Good documentation coverage' });
    }
    return {
      score: Math.max(0, score),
      checks,
      issues: issues.sort((a, b) => {
        const priority = { critical: 0, high: 1, medium: 2, low: 3 };
        return priority[a.severity] - priority[b.severity];
      }),
      updatedAt: Date.now()
    };
  }
}
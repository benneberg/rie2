import { z } from 'zod';
import { RepositoryMetadata, ValidationReport, ValidationCheck, ValidationIssue, HeatmapNode } from '../src/lib/rie-types';
const MetadataSchema = z.object({
  name: z.string(),
  totalFiles: z.number(),
  structure: z.array(z.any()),
  dependencies: z.array(z.any()),
  primaryLanguage: z.string()
});
export class RIEValidator {
  static async validate(metadata: RepositoryMetadata): Promise<ValidationReport> {
    // 0. Initial Schema Validation
    try {
      MetadataSchema.parse(metadata);
    } catch (e) {
      console.warn('Metadata Schema Mismatch', e);
    }
    const checks: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    const heatmap: HeatmapNode[] = [];
    const recommendations: string[] = [];
    // Weights: Structure (20%), Consistency (25%), Security (30%), Completeness (25%)
    let rawScores = {
      consistency: 100,
      completeness: 100,
      security: 100,
      structure: 100
    };
    // 1. Structural Auditing
    const maxNesting = Math.max(...metadata.structure.map(f => f.path.split('/').length));
    if (maxNesting > 8) {
      rawScores.structure -= 15;
      issues.push({
        id: 'DEEP_NESTING',
        severity: 'medium',
        category: 'structure',
        message: `Deep nesting detected: ${maxNesting} levels.`,
        suggestion: 'Flatten structure to improve module discoverability.'
      });
    }
    if (metadata.totalFiles > 300 && !metadata.isMonorepo) {
      rawScores.structure -= 10;
      issues.push({
        id: 'MONOLITHIC_OVERLOAD',
        severity: 'high',
        category: 'structure',
        message: 'Large monolith structure (>300 files).',
        suggestion: 'Consider migrating to a Workspace-based architecture.'
      });
    }
    // 2. Consistency (Docs vs Graph)
    const documentedFiles = new Set(metadata.structure.map(f => f.path));
    const undocumentedModules = metadata.dependencies.filter(d => !documentedFiles.has(d.target));
    if (undocumentedModules.length > 0) {
      rawScores.consistency -= 20;
      issues.push({
        id: 'GHOST_DEPENDENCIES',
        severity: 'high',
        category: 'consistency',
        message: `${undocumentedModules.length} ghost dependencies detected.`,
        suggestion: 'Verify node_modules or external bindings alignment.'
      });
    }
    // 3. Completeness (Weighted)
    const hasReadme = metadata.structure.some(f => f.name.toLowerCase().includes('readme.md'));
    const hasArch = metadata.structure.some(f => f.name.toLowerCase().includes('architecture.md'));
    if (!hasReadme) rawScores.completeness -= 40;
    if (!hasArch) rawScores.completeness -= 30;
    // 4. Security
    const sensitiveExtensions = ['.env', '.pem', '.key', '.p12'];
    const securityLeads = metadata.structure.filter(f => sensitiveExtensions.some(ext => f.path.endsWith(ext)));
    if (securityLeads.length > 0) {
      rawScores.security -= 50;
      issues.push({
        id: 'SENSITIVE_FILES',
        severity: 'critical',
        category: 'security',
        message: 'Potential secret/config exposure in archive.',
        suggestion: 'Scrub .env and private keys from distribution.'
      });
    }
    // 5. Heatmap Generation
    const dirs = new Map<string, { count: number; nesting: number }>();
    metadata.structure.forEach(f => {
      const parts = f.path.split('/');
      if (parts.length > 1) {
        const parent = parts[0];
        const current = dirs.get(parent) || { count: 0, nesting: 0 };
        current.count++;
        current.nesting = Math.max(current.nesting, parts.length);
        dirs.set(parent, current);
      }
    });
    dirs.forEach((val, key) => {
      const risk = Math.min(100, (val.count / 20) * 40 + (val.nesting * 5));
      heatmap.push({
        path: key,
        riskScore: Math.round(risk),
        riskLevel: risk > 75 ? 'critical' : risk > 50 ? 'high' : risk > 25 ? 'medium' : 'low',
        fileCount: val.count
      });
    });
    // Weighted Score
    const finalScore = Math.round(
      (rawScores.structure * 0.20) +
      (rawScores.consistency * 0.25) +
      (rawScores.security * 0.30) +
      (rawScores.completeness * 0.25)
    );
    // High Impact Recommendations
    if (!hasReadme) recommendations.push("Synthesize a Production README.md to define system purpose.");
    if (securityLeads.length > 0) recommendations.push("Immediate Audit: Remove .env and credential files from source.");
    if (maxNesting > 8) recommendations.push("Structural Debt: Re-index sub-packages to reduce nesting depth.");
    return {
      score: finalScore,
      categories: rawScores,
      checks,
      issues: issues.sort((a, b) => {
        const p = { critical: 0, high: 1, medium: 2, low: 3 };
        return p[a.severity] - p[b.severity];
      }),
      heatmap,
      recommendations,
      updatedAt: Date.now()
    };
  }
}
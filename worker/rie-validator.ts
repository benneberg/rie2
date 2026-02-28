import { z } from 'zod';
import { RepositoryMetadata, ValidationReport, ValidationCheck, ValidationIssue, HeatmapNode, RiskMetrics, PolicyConfig } from '../src/lib/rie-types';
const MetadataSchema = z.object({
  name: z.string(),
  totalFiles: z.number(),
  structure: z.array(z.any()),
  dependencies: z.array(z.any()),
  primaryLanguage: z.string()
});
export class RIEValidator {
  static async validate(metadata: RepositoryMetadata): Promise<ValidationReport> {
    try {
      MetadataSchema.parse(metadata);
    } catch (e) {
      console.warn('Metadata Schema Mismatch', e);
    }
    const checks: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    const heatmap: HeatmapNode[] = [];
    const recommendations: string[] = [];
    const policy: PolicyConfig = metadata.config?.policy || {
      minSecurityScore: 70,
      minStructureScore: 60,
      minCompletenessScore: 50,
      minConsistencyScore: 60,
      maxRiskIndex: 80,
      failOnCritical: true
    };
    let rawScores = {
      consistency: 100,
      completeness: 100,
      security: 100,
      structure: 100
    };
    // 1. Advanced Risk Metrics (Fan-in / Fan-out)
    const fanInMap = new Map<string, number>();
    const fanOutMap = new Map<string, number>();
    metadata.dependencies.forEach(d => {
      fanOutMap.set(d.source, (fanOutMap.get(d.source) || 0) + 1);
      fanInMap.set(d.target, (fanInMap.get(d.target) || 0) + 1);
    });
    const fanInMax = Math.max(0, ...Array.from(fanInMap.values()));
    const fanOutMax = Math.max(0, ...Array.from(fanOutMap.values()));
    const couplingIndex = (fanInMax + fanOutMax) / 2;
    // 2. Structural & Layer Violations
    const maxNesting = Math.max(0, ...metadata.structure.map(f => f.path.split('/').length));
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
    // 3. Completeness & Policy
    const hasReadme = metadata.structure.some(f => f.name.toLowerCase().includes('readme.md'));
    const hasArch = metadata.structure.some(f => f.name.toLowerCase().includes('architecture.md'));
    if (!hasReadme) rawScores.completeness -= 40;
    if (!hasArch) rawScores.completeness -= 30;
    // 4. Security Audit
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
    // 5. Governance Enforcement
    if (rawScores.security < policy.minSecurityScore) {
      issues.push({
        id: 'POLICY_VIOLATION_SECURITY',
        severity: 'critical',
        category: 'security',
        message: `Security score (${rawScores.security}) below policy threshold (${policy.minSecurityScore}).`,
        suggestion: 'Review security findings immediately.'
      });
    }
    // 6. Heatmap Generation
    const dirs = new Map<string, { count: number; nesting: number; coupling: number }>();
    metadata.structure.forEach(f => {
      const parts = f.path.split('/');
      if (parts.length > 1) {
        const parent = parts[0];
        const current = dirs.get(parent) || { count: 0, nesting: 0, coupling: 0 };
        current.count++;
        current.nesting = Math.max(current.nesting, parts.length);
        current.coupling += (fanInMap.get(f.path) || 0);
        dirs.set(parent, current);
      }
    });
    dirs.forEach((val, key) => {
      const risk = Math.min(100, (val.count / 20) * 30 + (val.nesting * 5) + (val.coupling * 2));
      heatmap.push({
        path: key,
        riskScore: Math.round(risk),
        riskLevel: risk > 75 ? 'critical' : risk > 50 ? 'high' : risk > 25 ? 'medium' : 'low',
        fileCount: val.count
      });
    });
    const finalScore = Math.round(
      (rawScores.structure * 0.20) +
      (rawScores.consistency * 0.25) +
      (rawScores.security * 0.30) +
      (rawScores.completeness * 0.25)
    );
    const riskMetrics: RiskMetrics = {
      fanInMax,
      fanOutMax,
      couplingIndex,
      isolationScore: 100 - couplingIndex,
      hasCircularDeps: couplingIndex > 40, // Heuristic
      hotspotPaths: Array.from(dirs.entries())
        .filter(([_, v]) => v.coupling > 10)
        .map(([k, _]) => k)
    };
    if (!hasReadme) recommendations.push("Synthesize a Production README.md to define system purpose.");
    if (securityLeads.length > 0) recommendations.push("Immediate Audit: Remove .env and credential files from source.");
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
      riskMetrics,
      updatedAt: Date.now()
    };
  }
}
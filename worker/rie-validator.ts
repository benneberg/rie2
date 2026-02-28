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
    let rawScores = {
      consistency: 100,
      completeness: 100,
      security: 100,
      structure: 100
    };
    // 1. Documentation vs Code Consistency Audit
    const docSummary = (metadata.documentation?.['summary'] || '').toLowerCase();
    const detectedLangs = metadata.languages.map(l => l.language.toLowerCase());
    const mismatchFound = detectedLangs.some(lang => lang !== 'other' && docSummary.length > 0 && !docSummary.includes(lang));
    if (mismatchFound && docSummary.length > 0) {
      rawScores.consistency -= 30;
      issues.push({
        id: 'DOC_CODE_MISMATCH',
        severity: 'medium',
        category: 'consistency',
        message: 'Documentation summary does not align with detected project stack.',
        suggestion: 'Re-generate documentation studio artifacts to sync with structural data.'
      });
    }
    // 2. Risk Metrics
    const fanInMap = new Map<string, number>();
    const fanOutMap = new Map<string, number>();
    metadata.dependencies.forEach(d => {
      fanOutMap.set(d.source, (fanOutMap.get(d.source) || 0) + 1);
      fanInMap.set(d.target, (fanInMap.get(d.target) || 0) + 1);
    });
    const fanInMax = Math.max(0, ...Array.from(fanInMap.values()));
    const fanOutMax = Math.max(0, ...Array.from(fanOutMap.values()));
    const couplingIndex = (fanInMax + fanOutMax) / 2;
    // 3. Structure & Layer Integrity
    if (couplingIndex > 15) {
      rawScores.structure -= 20;
      issues.push({
        id: 'HIGH_COUPLING',
        severity: 'high',
        category: 'structure',
        message: `High architectural coupling detected (Index: ${couplingIndex.toFixed(1)}).`,
        suggestion: 'Introduce interface abstractions to decouple component relationships.',
        autoFixable: true
      });
    }
    // 4. Security Audit
    const sensitiveFiles = metadata.structure.filter(f =>
      ['.env', '.pem', '.key', 'id_rsa'].some(pattern => f.name.toLowerCase().includes(pattern))
    );
    if (sensitiveFiles.length > 0) {
      rawScores.security -= 60;
      issues.push({
        id: 'SENSITIVE_FILES_DETECTED',
        severity: 'critical',
        category: 'security',
        message: 'Security leak: Sensitive files (keys/env) found in archive.',
        suggestion: 'Remove secrets from source control and rotate credentials immediately.',
        autoFixable: true
      });
    }
    // 5. Monorepo Specific Checks
    if (metadata.isMonorepo && (!metadata.workspaces || metadata.workspaces.length === 0)) {
      rawScores.structure -= 15;
      issues.push({
        id: 'INVALID_MONOREPO_CFG',
        severity: 'medium',
        category: 'structure',
        message: 'Monorepo detected but no workspace boundaries identified.',
        suggestion: 'Define "workspaces" field in root package.json for better mapping.'
      });
    }
    // 6. Weighted Scoring Calculation (Moved up to fix hoisting)
    const finalScore = Math.round(
      (rawScores.security * 0.35) +
      (rawScores.structure * 0.25) +
      (rawScores.consistency * 0.20) +
      (rawScores.completeness * 0.20)
    );
    const safeScore = Math.max(0, Math.min(100, finalScore));
    // 7. Summary Badge Logic
    let summaryBadge = "NEUTRAL_SCAN";
    if (safeScore >= 90) summaryBadge = "ELITE_ARCH";
    else if (safeScore >= 80) summaryBadge = "HIGH_INTEGRITY";
    else if (safeScore >= 70) summaryBadge = "STABLE_BUILD";
    else if (safeScore >= 50) summaryBadge = "DEBT_WARNING";
    else summaryBadge = "CRITICAL_FAILURE";
    // 8. Heatmap Generation
    const dirs = new Map<string, { count: number; nesting: number; coupling: number }>();
    metadata.structure.forEach(f => {
      const parts = f.path.split('/');
      const parent = parts.length > 1 ? parts[0] : 'root';
      const current = dirs.get(parent) || { count: 0, nesting: 0, coupling: 0 };
      current.count++;
      current.nesting = Math.max(current.nesting, parts.length);
      current.coupling += (fanInMap.get(f.path) || 0);
      dirs.set(parent, current);
    });
    dirs.forEach((val, key) => {
      const risk = Math.min(100, (val.count / 10) * 20 + (val.nesting * 5) + (val.coupling * 2));
      heatmap.push({
        path: key,
        riskScore: Math.round(risk),
        riskLevel: risk > 70 ? 'critical' : risk > 45 ? 'high' : risk > 20 ? 'medium' : 'low',
        fileCount: val.count
      });
    });
    return {
      score: safeScore,
      categories: rawScores,
      checks,
      issues: issues.sort((a, b) => (a.severity === 'critical' ? -1 : 1)),
      heatmap,
      summaryBadge,
      recommendations: issues.map(i => i.suggestion || ''),
      riskMetrics: {
        fanInMax,
        fanOutMax,
        couplingIndex,
        isolationScore: Math.max(0, 100 - couplingIndex * 5),
        hasCircularDeps: couplingIndex > 30,
        hotspotPaths: Array.from(dirs.entries()).filter(e => e[1].coupling > 5).map(e => e[0])
      },
      updatedAt: Date.now()
    };
  }
}
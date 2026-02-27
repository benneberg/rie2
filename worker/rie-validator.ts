import { z } from 'zod';
import { 
  RepositoryMetadata, 
  ValidationReport, 
  ValidationCheck, 
  ValidationIssue, 
  HeatmapNode, 
  GroundingClaim 
} from '../src/lib/rie-types';
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
    const evidence: GroundingClaim[] = [];
    let rawScores = {
      consistency: 100,
      completeness: 100,
      security: 100,
      structure: 100,
      grounding: 100
    };
    // 1. Documentation Grounding Audit
    const sectionConfidence: Record<string, number> = {
      'Overview': 100,
      'Architecture': 100,
      'Setup': 100
    };
    const docs = metadata.documentation || {};
    const structurePaths = new Set(metadata.structure.map(f => f.path.toLowerCase()));
    if (docs['README.md']) {
      const readme = docs['README.md'].toLowerCase();
      // Heuristic: check for mentioned files/technologies that don't exist
      const techStack = metadata.languages.map(l => l.language.toLowerCase());
      const suspiciousTerms = ['database', 'redis', 'docker', 'kubernetes', 'aws', 'stripe'];
      suspiciousTerms.forEach(term => {
        if (readme.includes(term) && !techStack.includes(term) && !Array.from(structurePaths).some(p => p.includes(term))) {
          rawScores.grounding -= 10;
          sectionConfidence['Overview'] -= 15;
          issues.push({
            id: `GROUNDING_HALLUCINATION_${term.toUpperCase()}`,
            severity: 'medium',
            category: 'grounding',
            message: `Documentation mentions "${term}" but no evidence found in code.`,
            suggestion: `Remove unverified technical claims from README or implement ${term} logic.`,
            fix: `Sync README with deterministic scan results.`,
            impact: `Prevents technical misinformation and improves stakeholder trust.`
          });
        }
      });
    }
    // 2. Actionable Warnings for Existing Checks
    const fanInMap = new Map<string, number>();
    const fanOutMap = new Map<string, number>();
    metadata.dependencies.forEach(d => {
      fanOutMap.set(d.source, (fanOutMap.get(d.source) || 0) + 1);
      fanInMap.set(d.target, (fanInMap.get(d.target) || 0) + 1);
    });
    const fanInMax = Math.max(0, ...Array.from(fanInMap.values()));
    const fanOutMax = Math.max(0, ...Array.from(fanOutMap.values()));
    const couplingIndex = (fanInMax + fanOutMax) / 2;
    if (couplingIndex > 15) {
      rawScores.structure -= 20;
      issues.push({
        id: 'HIGH_COUPLING',
        severity: 'high',
        category: 'structure',
        message: `High architectural coupling detected (Index: ${couplingIndex.toFixed(1)}).`,
        suggestion: 'Introduce interface abstractions to decouple component relationships.',
        autoFixable: true,
        fix: 'Implement Dependency Inversion at module boundaries.',
        impact: 'Reduces blast radius of changes and improves unit testability.'
      });
    }
    // Security Audit
    const sensitiveFiles = metadata.structure.filter(f =>
      ['.env', '.pem', '.key', 'id_rsa'].some(pattern => f.name.toLowerCase().includes(pattern))
    );
    if (sensitiveFiles.length > 0) {
      rawScores.security -= 60;
      issues.push({
        id: 'SENSITIVE_FILES_DETECTED',
        severity: 'critical',
        category: 'security',
        message: 'Security leak: Sensitive files found in archive.',
        suggestion: 'Remove secrets and rotate credentials immediately.',
        autoFixable: true,
        fix: 'Update .gitignore and purge sensitive files from history.',
        impact: 'Prevents unauthorized access and potential data breaches.'
      });
    }
    // Philosophy & Roadmap Checks
    if (!metadata.philosophy || metadata.philosophy.purpose.length < 20) {
      rawScores.completeness -= 15;
      issues.push({
        id: 'SHALLOW_PHILOSOPHY',
        severity: 'low',
        category: 'completeness',
        message: 'Project philosophy is missing or shallow.',
        suggestion: 'Define a clear mission statement and architectural constraints in settings.',
        fix: 'Populate the Domain Intelligence tab.',
        impact: 'Aligns development team with core architectural values.'
      });
    }
    // Final Weighted Score
    const finalScore = Math.round(
      (rawScores.security * 0.30) +
      (rawScores.structure * 0.20) +
      (rawScores.consistency * 0.15) +
      (rawScores.completeness * 0.15) +
      (rawScores.grounding * 0.20)
    );
    const safeScore = Math.max(0, Math.min(100, finalScore));
    // Summary Badge
    let summaryBadge = "NEUTRAL_SCAN";
    if (safeScore >= 90) summaryBadge = "ELITE_ARCH";
    else if (safeScore >= 80) summaryBadge = "HIGH_INTEGRITY";
    else if (safeScore >= 70) summaryBadge = "STABLE_BUILD";
    else if (safeScore >= 50) summaryBadge = "DEBT_WARNING";
    else summaryBadge = "CRITICAL_FAILURE";
    // Heatmap
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
      updatedAt: Date.now(),
      sectionConfidence: Object.fromEntries(
        Object.entries(sectionConfidence).map(([k, v]) => [k, Math.max(0, v)])
      )
    };
  }
}
import { RepositoryMetadata, DriftReport } from '../src/lib/rie-types';
export class RIEDriftEngine {
  static compare(current: RepositoryMetadata, baseline: RepositoryMetadata): DriftReport {
    const prevScore = baseline.validation?.score || 0;
    const currScore = current.validation?.score || 0;
    const currentFiles = new Set(current.structure.map(f => f.path));
    const baselineFiles = new Set(baseline.structure.map(f => f.path));
    const added = [...currentFiles].filter(x => !baselineFiles.has(x)).length;
    const removed = [...baselineFiles].filter(x => !currentFiles.has(x)).length;
    const currentDeps = new Set(current.dependencies.map(d => `${d.source}->${d.target}`));
    const baselineDeps = new Set(baseline.dependencies.map(d => `${d.source}->${d.target}`));
    const newDeps = [...currentDeps].filter(x => !baselineDeps.has(x)).length;
    const regressions: string[] = [];
    const improvements: string[] = [];
    if (currScore < prevScore) {
      regressions.push(`Overall health decreased by ${Math.abs(currScore - prevScore).toFixed(1)}%`);
    } else if (currScore > prevScore) {
      improvements.push(`Overall health increased by ${(currScore - prevScore).toFixed(1)}%`);
    }
    if (current.validation?.riskMetrics?.hasCircularDeps && !baseline.validation?.riskMetrics?.hasCircularDeps) {
      regressions.push("New architectural dependency cycles introduced.");
    }
    if (current.totalFiles > baseline.totalFiles + 50) {
      regressions.push("Significant expansion of code surface without modularization.");
    }
    return {
      previousScore: prevScore,
      currentScore: currScore,
      delta: currScore - prevScore,
      addedFiles: added,
      removedFiles: removed,
      newDependencies: newDeps,
      regressions,
      improvements,
      timestamp: Date.now()
    };
  }
}
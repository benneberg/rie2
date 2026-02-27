import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
/**
 * Parses a GitHub URL to extract owner, repo and optional ref.
 * Supports: 
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo/tree/branch
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string; ref?: string } | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'github.com') return null;
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, '');
    let ref = undefined;
    if (parts[2] === 'tree' && parts[3]) {
      ref = parts[3];
    }
    return { owner, repo, ref };
  } catch {
    return null;
  }
}
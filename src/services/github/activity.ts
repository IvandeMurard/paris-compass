/**
 * Minimal, unauthenticated GitHub API reader for the public "Work in progress" page.
 * We only request closed pull requests and open issues, with small page sizes,
 * so the endpoint stays within anonymous rate limits.
 */

export interface GitHubPullRequest {
  number: number;
  title: string;
  merged_at: string | null;
  html_url: string;
  user: { login: string };
}

export interface GitHubIssue {
  number: number;
  title: string;
  created_at: string;
  html_url: string;
  user: { login: string };
  labels: { name: string; color: string }[];
}

export interface RecentActivity {
  pullRequests: GitHubPullRequest[];
  issues: GitHubIssue[];
}

const GITHUB_API = 'https://api.github.com';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'unknown');
    throw new Error(`GitHub API ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchRecentActivity(owner: string, repo: string): Promise<RecentActivity> {
  const [pullRequests, issues] = await Promise.all([
    fetchJson<GitHubPullRequest[]>(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=15`,
    ),
    fetchJson<GitHubIssue[]>(
      `${GITHUB_API}/repos/${owner}/${repo}/issues?state=open&sort=created&direction=desc&per_page=15`,
    ),
  ]);

  return {
    pullRequests: pullRequests.filter((pr) => pr.merged_at).slice(0, 10),
    issues,
  };
}

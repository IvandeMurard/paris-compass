import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { format } from 'date-fns';
import { fr, enGB } from 'date-fns/locale';
import PageLayout from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Seo from '@/components/Seo';
import { useLocale } from '@/i18n/locale';
import { GITHUB_REPO } from '@/content/site';
import { fetchRecentActivity } from '@/services/github/activity';
import { ExternalLink, GitPullRequest, CircleDot } from 'lucide-react';

const DATE_LOCALES = { fr, en: enGB };

const Progress = () => {
  const { t, locale } = useLocale();
  const repo = GITHUB_REPO;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['github-activity', repo?.owner, repo?.repo],
    queryFn: () => {
      if (!repo) throw new Error('No repository configured');
      return fetchRecentActivity(repo.owner, repo.repo);
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
    enabled: !!repo,
  });

  return (
    <PageLayout title={t('progress.title')} intro={t('progress.intro')}>
      <Seo title={t('progress.metaTitle')} description={t('progress.metaDescription')} path="/travaux" />

        {!repo && (
          <div className="mt-10 rounded-xl border bg-muted/40 p-6 text-sm text-muted-foreground">
            {t('progress.repoMissing')}
          </div>
        )}

        {isError && repo && (
          <div className="mt-10 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {t('progress.error')}
          </div>
        )}

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
            <GitPullRequest size={20} className="text-primary" />
            {t('progress.recentTitle')}
          </h2>

          {isLoading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : data?.pullRequests.length ? (
            <ul className="mt-4 space-y-3">
              {data.pullRequests.map((pr) => (
                <li key={pr.number} className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-card-foreground">{pr.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        #{pr.number} · {t('progress.mergedAt')}{' '}
                        {format(new Date(pr.merged_at!), 'dd MMM yyyy', {
                          locale: DATE_LOCALES[locale],
                        })}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" asChild className="shrink-0">
                      <a href={pr.html_url} target="_blank" rel="noreferrer" aria-label={t('progress.seeOnGithub')}>
                        <ExternalLink size={16} />
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t('progress.empty')}</p>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
            <CircleDot size={20} className="text-primary" />
            {t('progress.plannedTitle')}
          </h2>

          {isLoading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : data?.issues.length ? (
            <ul className="mt-4 space-y-3">
              {data.issues.map((issue) => (
                <li key={issue.number} className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-card-foreground">{issue.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        #{issue.number} · {t('progress.openedAt')}{' '}
                        {format(new Date(issue.created_at), 'dd MMM yyyy', {
                          locale: DATE_LOCALES[locale],
                        })}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" asChild className="shrink-0">
                      <a href={issue.html_url} target="_blank" rel="noreferrer" aria-label={t('progress.seeOnGithub')}>
                        <ExternalLink size={16} />
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              {t('progress.plannedBody')}
            </div>
          )}
        </section>
    </PageLayout>
  );
};

export default Progress;

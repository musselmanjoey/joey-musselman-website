interface Commit {
  message: string;
  sha: string;
  url?: string;
}

interface ActivityItem {
  repo: string;
  date: string;
  commits: Commit[];
}

interface ActivityFeedProps {
  activity: ActivityItem[];
  updatedAt: string | null;
}

export function ActivityFeed({ activity, updatedAt }: ActivityFeedProps) {
  if (!activity.length) return null;

  // Format relative time
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Get first line of commit message, truncated
  const shortMessage = (msg: string) => {
    const firstLine = msg.split('\n')[0];
    return firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
  };

  return (
    <section className="mb-16">
      <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-4">
        What I&apos;ve Been Working On
      </h2>
      <div className="space-y-3">
        {activity.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm">
                <a
                  href={`https://github.com/${item.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-[var(--accent)] transition-colors"
                >
                  {item.repo.split('/')[1]}
                </a>
                <span className="text-[var(--muted)]"> · {formatDate(item.date)}</span>
              </p>
              {item.commits.slice(0, 2).map((commit, j) => (
                <p key={j} className="text-sm text-[var(--muted)] truncate">
                  {commit.url ? (
                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[var(--foreground)] transition-colors"
                    >
                      {shortMessage(commit.message)}
                    </a>
                  ) : (
                    shortMessage(commit.message)
                  )}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4">
        {updatedAt && (
          <p className="text-xs text-[var(--muted)]">
            Last commit {formatDate(updatedAt)}
          </p>
        )}
        <a
          href="https://github.com/musselmanjoey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
        >
          View all on GitHub →
        </a>
      </div>
    </section>
  );
}

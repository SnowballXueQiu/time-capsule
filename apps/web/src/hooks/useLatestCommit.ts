"use client";

import { useState, useEffect } from "react";

interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export function useLatestCommit() {
  const [commit, setCommit] = useState<CommitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestCommit = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          "https://api.github.com/repos/SnowballXueQiu/time-capsule/commits/main",
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();

        const commitInfo: CommitInfo = {
          sha: data.sha,
          message: data.commit.message.split("\n")[0], // 只取第一行
          author: data.commit.author.name,
          date: data.commit.author.date,
          url: data.html_url,
        };

        setCommit(commitInfo);
      } catch (err) {
        console.error("Failed to fetch latest commit:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchLatestCommit();

    // 每5分钟刷新一次
    const interval = setInterval(fetchLatestCommit, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { commit, loading, error };
}

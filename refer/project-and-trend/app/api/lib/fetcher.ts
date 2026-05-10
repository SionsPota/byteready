// 通用数据获取工具 - 集成多个免费公开API

// Hacker News API - 获取技术新闻
export async function fetchHackerNewsStories(query: string, limit: number = 5): Promise<any[]> {
  try {
    // 获取热门故事ID列表
    const topResponse = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!topResponse.ok) return [];

    const storyIds: number[] = await topResponse.json();
    const topIds = storyIds.slice(0, 30);

    // 并行获取故事详情
    const stories = await Promise.all(
      topIds.map(async (id) => {
        try {
          const res = await fetch(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      })
    );

    // 过滤有效故事并按相关性排序
    const validStories = stories
      .filter((s) => s && s.title && s.url && s.score > 50)
      .filter((s) => {
        const titleLower = s.title.toLowerCase();
        const queryLower = query.toLowerCase().split(/[\s,]+/);
        return queryLower.some((q: string) => titleLower.includes(q));
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return validStories.map((s) => ({
      title: s.title,
      url: s.url,
      score: s.score,
      source: "Hacker News",
      time: new Date(s.time * 1000).toISOString(),
    }));
  } catch {
    return [];
  }
}

// GitHub Search API - 获取热门仓库
export async function fetchGitHubRepos(query: string, limit: number = 5): Promise<any[]> {
  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${limit}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!response.ok) return [];

    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      title: item.name,
      description: item.description || "",
      url: item.html_url,
      stars: item.stargazers_count,
      language: item.language || "Unknown",
      source: "GitHub",
      updatedAt: item.updated_at,
    }));
  } catch {
    return [];
  }
}

// GitHub Trending - 获取每日热门（通过搜索API模拟）
export async function fetchGitHubTrending(language: string, limit: number = 5): Promise<any[]> {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  const since = date.toISOString().split("T")[0];

  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(language)}+created:>${since}&sort=stars&order=desc&per_page=${limit}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!response.ok) return [];

    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      title: item.name,
      description: item.description || "",
      url: item.html_url,
      stars: item.stargazers_count,
      language: item.language || "Unknown",
      source: "GitHub Trending",
      updatedAt: item.updated_at,
    }));
  } catch {
    return [];
  }
}

// arXiv API - 获取学术论文
export async function fetchArxivPapers(query: string, limit: number = 3): Promise<any[]> {
  try {
    const response = await fetch(
      `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&sortBy=submittedDate&sortOrder=descending&max_results=${limit}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) return [];

    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");
    const entries = xml.querySelectorAll("entry");

    const papers: any[] = [];
    entries.forEach((entry) => {
      const title = entry.querySelector("title")?.textContent?.trim() || "";
      const summary = entry.querySelector("summary")?.textContent?.trim() || "";
      const link = entry.querySelector("link[rel='alternate']")?.getAttribute("href") || "";
      const published = entry.querySelector("published")?.textContent || "";
      papers.push({
        title,
        summary: summary.slice(0, 200) + "...",
        url: link,
        source: "arXiv",
        published,
      });
    });

    return papers;
  } catch {
    return [];
  }
}

// 智能搜索 - 根据技术栈组合多个数据源
export async function fetchRealTimeTrends(skills: string[]): Promise<any[]> {
  const results: any[] = [];
  const query = skills.slice(0, 3).join(" "); // 取前3个技能作为搜索词

  // 并行请求多个数据源
  const [hnStories, githubRepos, trendingRepos] = await Promise.all([
    fetchHackerNewsStories(query, 3),
    fetchGitHubRepos(query, 3),
    fetchGitHubTrending(skills[0] || "javascript", 3),
  ]);

  // 合并结果
  results.push(
    ...hnStories.map((s) => ({
      title: s.title,
      summary: `来自 ${s.source} 的热门讨论，评分 ${s.score}。`,
      keyPoints: [s.source, `评分: ${s.score}`],
      learningAdvice: `阅读讨论了解社区对 ${skills.join(", ")} 的最新看法。`,
      sourceUrl: s.url,
      sourceTitle: s.source,
      relevanceScore: Math.min(10, Math.floor(s.score / 100) + 5),
    })),
    ...githubRepos.map((r) => ({
      title: `[GitHub] ${r.title}`,
      summary: `${r.description} - 使用 ${r.language} 开发，${r.stars} 个 stars。`,
      keyPoints: [`语言: ${r.language}`, `Stars: ${r.stars.toLocaleString()}`, "活跃维护中"],
      learningAdvice: `研究 ${r.title} 的源码，学习 ${r.language} 最佳实践。`,
      sourceUrl: r.url,
      sourceTitle: "GitHub",
      relevanceScore: Math.min(10, Math.floor(Math.log10(r.stars + 1)) + 3),
    })),
    ...trendingRepos.map((r) => ({
      title: `[Trending] ${r.title}`,
      summary: `近期热门项目: ${r.description} - ${r.stars} 个 stars。`,
      keyPoints: [`语言: ${r.language}`, `Stars: ${r.stars.toLocaleString()}`, "本周热门"],
      learningAdvice: `关注 ${r.title} 的发展趋势，了解 ${skills[0]} 生态的新方向。`,
      sourceUrl: r.url,
      sourceTitle: "GitHub Trending",
      relevanceScore: Math.min(10, Math.floor(Math.log10(r.stars + 1)) + 4),
    }))
  );

  return results;
}

// 获取真实项目参考
export async function fetchRealTimeProjects(skills: string[], role: string): Promise<any[]> {
  const results: any[] = [];
  const query = skills.slice(0, 2).join(" ");

  // 搜索相关的开源项目作为参考
  const [repos, trending] = await Promise.all([
    fetchGitHubRepos(`${query}+example`, 5),
    fetchGitHubTrending(skills[0] || "javascript", 5),
  ]);

  const allRepos = [...repos, ...trending].slice(0, 6);

  for (const repo of allRepos) {
    results.push({
      name: repo.title,
      type: repo.stars > 10000 ? "deep_dive" : repo.stars > 1000 ? "weekend_build" : "quick_win",
      difficulty: repo.stars > 10000 ? "advanced" : repo.stars > 1000 ? "intermediate" : "beginner",
      timeEstimate: repo.stars > 10000 ? "2-3周" : repo.stars > 1000 ? "1-2周" : "4-8小时",
      techStack: [repo.language, ...skills.slice(0, 2)],
      gapAddressed: `${role} 实战能力`,
      description: `${repo.description} 这是一个真实的热门开源项目，${repo.stars.toLocaleString()} 个 stars。`,
      coreFeatures: ["核心功能实现", "代码架构设计", "测试覆盖", "文档完善"],
      techHighlights: [`${repo.language} 高级特性应用`, "开源项目最佳实践", "社区驱动开发"],
      implementationSteps: [
        `克隆 ${repo.title} 仓库`,
        "阅读 README 和架构文档",
        "分析核心模块实现",
        "动手复刻核心功能",
        "添加个人创意改造",
      ],
      resumeTemplate: `参与 ${repo.title} 开源项目（${repo.stars.toLocaleString()} stars），深入理解 ${repo.language} 工程实践，复刻核心模块并贡献改进。`,
      impactScore: Math.min(10, Math.floor(Math.log10(repo.stars + 1)) + 3),
    });
  }

  return results;
}

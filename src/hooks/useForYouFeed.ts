import { useMemo } from "react";
import { useReadingHistory } from "@/hooks/useReadingHistory";
import { type NewsArticle } from "@/hooks/useNews";
import { type NewsItem } from "@/data/mockNews";

export function useForYouFeed(articles: NewsArticle[] | undefined, mockNews: NewsItem[]) {
  const { topCategories, totalRead } = useReadingHistory();

  const forYouArticles = useMemo(() => {
    if (!articles || articles.length === 0) return [];
    if (topCategories.length === 0) return articles.slice(0, 10);

    // Score articles based on user's reading preferences
    const scored = articles.map((article) => {
      let score = 0;
      const catIndex = topCategories.indexOf(article.category);
      if (catIndex !== -1) {
        score += (topCategories.length - catIndex) * 10;
      }
      if (article.is_trending) score += 15;
      if (article.total_votes > 100) score += 5;
      if (article.comment_count > 10) score += 5;
      // Recency bonus
      const hoursOld = (Date.now() - new Date(article.created_at).getTime()) / 3600000;
      if (hoursOld < 6) score += 20;
      else if (hoursOld < 24) score += 10;
      return { article, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.article);
  }, [articles, topCategories]);

  const forYouMock = useMemo(() => {
    if (articles && articles.length > 0) return [];
    if (topCategories.length === 0) return mockNews;

    const scored = mockNews.map((news) => {
      let score = 0;
      const catIndex = topCategories.indexOf(news.category);
      if (catIndex !== -1) {
        score += (topCategories.length - catIndex) * 10;
      }
      if (news.isTrending) score += 15;
      if (news.totalVotes > 100) score += 5;
      return { news, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.news);
  }, [mockNews, topCategories, articles]);

  return {
    forYouArticles,
    forYouMock,
    hasPreferences: topCategories.length > 0,
    topCategories: topCategories.slice(0, 3),
    totalRead,
  };
}

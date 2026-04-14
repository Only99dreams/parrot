import { useState, useCallback } from "react";

const REACTIONS_KEY = "parrotng-reactions";

type ReactionMap = Record<string, Record<string, number>>;
type UserReactionMap = Record<string, string>;

function loadReactions(): ReactionMap {
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadUserReactions(): UserReactionMap {
  try {
    const raw = localStorage.getItem(REACTIONS_KEY + "-user");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const REACTION_EMOJIS = [
  { key: "fire", emoji: "🔥", label: "Fire" },
  { key: "think", emoji: "🤔", label: "Thinking" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "angry", emoji: "😡", label: "Angry" },
  { key: "clap", emoji: "👏", label: "Clap" },
  { key: "laugh", emoji: "😂", label: "Laugh" },
];

export function useReactions(articleId: string) {
  const [reactions, setReactions] = useState<Record<string, number>>(() => {
    return loadReactions()[articleId] || {};
  });
  const [userReaction, setUserReaction] = useState<string | null>(() => {
    return loadUserReactions()[articleId] || null;
  });

  const react = useCallback(
    (key: string) => {
      setReactions((prev) => {
        const allReactions = loadReactions();
        const articleReactions = { ...prev };
        const userReactions = loadUserReactions();
        const prevReaction = userReactions[articleId];

        if (prevReaction === key) {
          articleReactions[key] = Math.max((articleReactions[key] || 0) - 1, 0);
          delete userReactions[articleId];
          setUserReaction(null);
        } else {
          if (prevReaction) {
            articleReactions[prevReaction] = Math.max((articleReactions[prevReaction] || 0) - 1, 0);
          }
          articleReactions[key] = (articleReactions[key] || 0) + 1;
          userReactions[articleId] = key;
          setUserReaction(key);
        }

        allReactions[articleId] = articleReactions;
        localStorage.setItem(REACTIONS_KEY, JSON.stringify(allReactions));
        localStorage.setItem(REACTIONS_KEY + "-user", JSON.stringify(userReactions));
        return articleReactions;
      });
    },
    [articleId]
  );

  return { reactions, userReaction, react };
}

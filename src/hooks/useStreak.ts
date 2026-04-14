import { useState, useEffect, useCallback } from "react";

const STREAK_KEY = "parrotng-streak";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastVisitDate: string;
  totalPoints: number;
  dailyCheckedIn: boolean;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastVisitDate: "",
    totalPoints: 0,
    dailyCheckedIn: false,
  };
}

function saveStreak(data: StreakData) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakData>(loadStreak);

  useEffect(() => {
    const today = getToday();
    const data = loadStreak();

    if (data.lastVisitDate === today) {
      setStreak(data);
      return;
    }

    const yesterday = getYesterday();
    let updated: StreakData;

    if (data.lastVisitDate === yesterday) {
      const newStreak = data.currentStreak + 1;
      updated = {
        currentStreak: newStreak,
        longestStreak: Math.max(data.longestStreak, newStreak),
        lastVisitDate: today,
        totalPoints: data.totalPoints,
        dailyCheckedIn: false,
      };
    } else if (data.lastVisitDate === "") {
      updated = {
        currentStreak: 1,
        longestStreak: 1,
        lastVisitDate: today,
        totalPoints: 0,
        dailyCheckedIn: false,
      };
    } else {
      updated = {
        currentStreak: 1,
        longestStreak: data.longestStreak,
        lastVisitDate: today,
        totalPoints: data.totalPoints,
        dailyCheckedIn: false,
      };
    }

    saveStreak(updated);
    setStreak(updated);
  }, []);

  const checkIn = useCallback(() => {
    setStreak((prev) => {
      if (prev.dailyCheckedIn) return prev;
      const bonus = Math.min(prev.currentStreak * 2, 20);
      const updated = {
        ...prev,
        totalPoints: prev.totalPoints + 10 + bonus,
        dailyCheckedIn: true,
      };
      saveStreak(updated);
      return updated;
    });
  }, []);

  return { ...streak, checkIn };
}

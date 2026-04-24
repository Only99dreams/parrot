import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const QUIZ_KEY = "parrotng-quiz";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
  explanation: string;
}

interface QuizState {
  date: string;
  answers: Record<string, number>;
  score: number;
  completed: boolean;
  totalQuizzesTaken: number;
  bestScore: number;
}

function getToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
  }).format(new Date());
}

function loadQuizState(): QuizState {
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore corrupt local cache and rebuild quiz state.
  }
  return {
    date: "",
    answers: {},
    score: 0,
    completed: false,
    totalQuizzesTaken: 0,
    bestScore: 0,
  };
}

function saveQuizState(state: QuizState) {
  localStorage.setItem(QUIZ_KEY, JSON.stringify(state));
}

// Daily quiz questions that rotate based on the date
const questionBank: QuizQuestion[] = [
  {
    id: "q1",
    question: "Which Nigerian city is the largest by population?",
    options: ["Abuja", "Lagos", "Kano", "Port Harcourt"],
    correctIndex: 1,
    category: "Geography",
    explanation: "Lagos has over 15 million people, making it Africa's largest city.",
  },
  {
    id: "q2",
    question: "What is the name of Nigeria's currency?",
    options: ["Cedi", "Naira", "Rand", "Shilling"],
    correctIndex: 1,
    category: "Economy",
    explanation: "The Naira (₦) has been Nigeria's currency since 1973.",
  },
  {
    id: "q3",
    question: "Which year did Nigeria gain independence?",
    options: ["1957", "1960", "1963", "1966"],
    correctIndex: 1,
    category: "History",
    explanation: "Nigeria gained independence from Britain on October 1, 1960.",
  },
  {
    id: "q4",
    question: "Who was the first President of Nigeria?",
    options: ["Nnamdi Azikiwe", "Obafemi Awolowo", "Tafawa Balewa", "Yakubu Gowon"],
    correctIndex: 0,
    category: "Politics",
    explanation: "Dr. Nnamdi Azikiwe became Nigeria's first President in 1963.",
  },
  {
    id: "q5",
    question: "What is the main export product of Nigeria?",
    options: ["Cocoa", "Gold", "Crude Oil", "Diamonds"],
    correctIndex: 2,
    category: "Economy",
    explanation: "Crude oil accounts for about 90% of Nigeria's export earnings.",
  },
  {
    id: "q6",
    question: "Which river is the longest in Nigeria?",
    options: ["Benue River", "Niger River", "Osun River", "Cross River"],
    correctIndex: 1,
    category: "Geography",
    explanation: "The Niger River at 4,180 km is West Africa's principal river.",
  },
  {
    id: "q7",
    question: "How many states does Nigeria have?",
    options: ["30", "33", "36", "40"],
    correctIndex: 2,
    category: "Politics",
    explanation: "Nigeria has 36 states plus the Federal Capital Territory (Abuja).",
  },
  {
    id: "q8",
    question: "Which Nigerian won the Nobel Prize in Literature?",
    options: ["Chinua Achebe", "Wole Soyinka", "Chimamanda Adichie", "Ben Okri"],
    correctIndex: 1,
    category: "Culture",
    explanation: "Wole Soyinka won the Nobel Prize in Literature in 1986.",
  },
  {
    id: "q9",
    question: "What is the capital city of Nigeria?",
    options: ["Lagos", "Ibadan", "Abuja", "Kaduna"],
    correctIndex: 2,
    category: "Geography",
    explanation: "Abuja became Nigeria's capital in 1991, replacing Lagos.",
  },
  {
    id: "q10",
    question: "Which ethnic group is the largest in Nigeria?",
    options: ["Igbo", "Yoruba", "Hausa", "Ijaw"],
    correctIndex: 2,
    category: "Culture",
    explanation: "The Hausa are the largest ethnic group, primarily in northern Nigeria.",
  },
  {
    id: "q11",
    question: "What does 'EFCC' stand for in Nigeria?",
    options: [
      "Economic and Financial Crimes Commission",
      "Environmental Federal Conservation Council",
      "Energy and Fuel Control Commission",
      "Electoral and Federal Control Centre",
    ],
    correctIndex: 0,
    category: "Politics",
    explanation: "EFCC was established in 2003 to combat financial crimes in Nigeria.",
  },
  {
    id: "q12",
    question: "Which Nigerian footballer won the African Footballer of the Year 3 times?",
    options: ["Jay-Jay Okocha", "Nwankwo Kanu", "Rashidi Yekini", "Victor Osimhen"],
    correctIndex: 1,
    category: "Sports",
    explanation: "Nwankwo Kanu won the award in 1996, 1999, and was a key player in Olympic gold.",
  },
  {
    id: "q13",
    question: "What is 'jollof rice' primarily associated with in Nigerian culture?",
    options: ["A political party", "A traditional celebration dish", "A currency unit", "A sports event"],
    correctIndex: 1,
    category: "Culture",
    explanation: "Jollof rice is Nigeria's beloved party staple and a source of national pride!",
  },
  {
    id: "q14",
    question: "Which Nigerian musician popularized 'Afrobeats' globally?",
    options: ["2Baba", "Fela Kuti", "Davido", "Burna Boy"],
    correctIndex: 1,
    category: "Entertainment",
    explanation: "Fela Kuti created the Afrobeat genre in the 1970s, inspiring today's Afrobeats movement.",
  },
  {
    id: "q15",
    question: "What percentage of Africa's population lives in Nigeria?",
    options: ["About 10%", "About 15%", "About 20%", "About 25%"],
    correctIndex: 1,
    category: "Geography",
    explanation: "With ~220 million people, Nigeria holds about 15% of Africa's total population.",
  },
  {
    id: "q16",
    question: "What is 'Nollywood'?",
    options: ["A music label", "Nigeria's film industry", "A fashion brand", "A TV network"],
    correctIndex: 1,
    category: "Entertainment",
    explanation: "Nollywood is the 2nd largest film industry in the world by volume.",
  },
  {
    id: "q17",
    question: "When was ASUU (Academic Staff Union of Universities) founded?",
    options: ["1978", "1980", "1985", "1990"],
    correctIndex: 0,
    category: "Education",
    explanation: "ASUU was founded in 1978 and has been a key voice in Nigerian education.",
  },
  {
    id: "q18",
    question: "Which Nigerian tech company became Africa's most valuable startup?",
    options: ["Paystack", "Flutterwave", "Jumia", "Interswitch"],
    correctIndex: 1,
    category: "Technology",
    explanation: "Flutterwave reached a $3B+ valuation, becoming Africa's most valuable startup.",
  },
  {
    id: "q19",
    question: "Nigeria's crude oil is primarily found in which region?",
    options: ["North-West", "South-West", "Niger Delta", "North-East"],
    correctIndex: 2,
    category: "Energy",
    explanation: "The Niger Delta region produces over 90% of Nigeria's crude oil.",
  },
  {
    id: "q20",
    question: "What is the meaning of 'Wahala' in Nigerian Pidgin?",
    options: ["Money", "Food", "Problem/Trouble", "Happiness"],
    correctIndex: 2,
    category: "Culture",
    explanation: "'Wahala' means problem or trouble and is one of the most used Pidgin words!",
  },
];

function getDailyQuestions(date: string): QuizQuestion[] {
  // Fallback: use date as seed to pick 5 questions deterministically from local bank
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = ((hash << 5) - hash + date.charCodeAt(i)) | 0;
  }
  const shuffled = [...questionBank].sort((a, b) => {
    const ha = ((hash + a.id.charCodeAt(1)) * 31) % 1000;
    const hb = ((hash + b.id.charCodeAt(1)) * 31) % 1000;
    return ha - hb;
  });
  return shuffled.slice(0, 5);
}

async function fetchDailyQuestions(date: string): Promise<QuizQuestion[] | null> {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null;

    const url = `${SUPABASE_URL}/rest/v1/daily_quiz_questions?quiz_date=eq.${date}&order=question_number.asc`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length < 5) return null;

    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      question: row.question as string,
      options: row.options as string[],
      correctIndex: row.correct_index as number,
      category: row.category as string,
      explanation: row.explanation as string,
    }));
  } catch {
    return null;
  }
}

async function fetchOrGenerateDailyQuestions(date: string): Promise<QuizQuestion[] | null> {
  const existing = await fetchDailyQuestions(date);
  if (existing && existing.length === 5) return existing;

  try {
    const { error } = await supabase.functions.invoke("generate-quiz", {
      body: { date },
    });
    if (error) return existing;

    return await fetchDailyQuestions(date);
  } catch {
    return existing;
  }
}

export function useDailyQuiz() {
  const [state, setState] = useState<QuizState>(loadQuizState);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const today = getToday();

  const isToday = state.date === today;

  // Fetch today's questions, and ask the backend to generate them if missing.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchOrGenerateDailyQuestions(today).then((dbQuestions) => {
      if (cancelled) return;
      if (dbQuestions && dbQuestions.length === 5) {
        setQuestions(dbQuestions);
      } else {
        setQuestions(getDailyQuestions(today));
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [today]);

  useEffect(() => {
    if (!isToday) {
      const fresh: QuizState = {
        date: today,
        answers: {},
        score: 0,
        completed: false,
        totalQuizzesTaken: state.totalQuizzesTaken,
        bestScore: state.bestScore,
      };
      saveQuizState(fresh);
      setState(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, isToday]);

  const answer = (questionId: string, optionIndex: number) => {
    if (state.answers[questionId] !== undefined) return;

    const q = questions.find((q) => q.id === questionId);
    if (!q) return;

    const correct = optionIndex === q.correctIndex;
    const newAnswers = { ...state.answers, [questionId]: optionIndex };
    const newScore = state.score + (correct ? 20 : 0);
    const allAnswered = questions.every((q) => newAnswers[q.id] !== undefined);

    const updated: QuizState = {
      ...state,
      answers: newAnswers,
      score: newScore,
      completed: allAnswered,
      totalQuizzesTaken: allAnswered ? state.totalQuizzesTaken + 1 : state.totalQuizzesTaken,
      bestScore: Math.max(state.bestScore, newScore),
    };

    saveQuizState(updated);
    setState(updated);
  };

  return {
    questions,
    answers: isToday ? state.answers : {},
    score: isToday ? state.score : 0,
    completed: isToday ? state.completed : false,
    totalQuizzesTaken: state.totalQuizzesTaken,
    bestScore: state.bestScore,
    loading,
    answer,
  };
}

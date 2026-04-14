export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  whyItMatters: string;
  pollQuestion: string;
  pollOptions: { id: string; text: string; votes: number }[];
  debateHook: string;
  perspectives: { label: string; text: string }[];
  category: string;
  source: string;
  imageUrl?: string;
  timeAgo: string;
  totalVotes: number;
  commentCount: number;
  isSponsored?: boolean;
  isTrending?: boolean;
}

export const mockNews: NewsItem[] = [
  {
    id: "1",
    headline: "FG Announces New Minimum Wage of ₦70,000 — But E Go Reach?",
    summary: "The Federal Government don finally announce new minimum wage of ₦70,000. Workers dey celebrate, but many dey ask if states go fit pay am.",
    whyItMatters: "This affects over 4 million civil servants across Nigeria. If states can't pay, it could lead to strikes that cripple public services nationwide.",
    pollQuestion: "You think ₦70,000 minimum wage go solve problem?",
    pollOptions: [
      { id: "1a", text: "Yes, na good start! 💪", votes: 3420 },
      { id: "1b", text: "No, e no still reach 😤", votes: 5891 },
      { id: "1c", text: "Make dem fix economy first 🤔", votes: 2103 },
    ],
    debateHook: "If you dey pay workers, you go start with ₦70k or you go demand more?",
    perspectives: [
      { label: "Workers Union", text: "We demanded ₦250,000. This na insult to Nigerian workers wey dey suffer." },
      { label: "State Governors", text: "Many states no fit even pay ₦30,000 consistently. Where the money go come from?" },
      { label: "Economists", text: "Without addressing inflation, any wage increase go just chase prices up." },
    ],
    category: "Economy",
    source: "Punch News",
    timeAgo: "2h ago",
    totalVotes: 11414,
    commentCount: 342,
    isTrending: true,
  },
  {
    id: "2",
    headline: "ASUU Strike Loading Again? Lecturers Give FG 2-Week Ultimatum",
    summary: "ASUU don give Federal Government another ultimatum over unpaid allowances and poor university funding. Students dey fear say another long strike fit happen.",
    whyItMatters: "Nigerian universities have lost over 5 years to ASUU strikes since 1999. Another strike could affect 2 million students currently in session.",
    pollQuestion: "Who you blame more for ASUU wahala?",
    pollOptions: [
      { id: "2a", text: "Federal Government 🏛️", votes: 6230 },
      { id: "2b", text: "ASUU leadership 🎓", votes: 1890 },
      { id: "2c", text: "Both of dem! 😒", votes: 4100 },
    ],
    debateHook: "Should Nigerian students start mass protest or just focus on private universities?",
    perspectives: [
      { label: "Students", text: "We dey suffer. Our mates wey go abroad don graduate, we still dey year 2." },
      { label: "ASUU", text: "We dey fight for the future of education. Government no dey keep agreement." },
      { label: "Parents", text: "We don spend millions, our children still dey house. This system don fail." },
    ],
    category: "Education",
    source: "The Guardian",
    timeAgo: "4h ago",
    totalVotes: 12220,
    commentCount: 567,
    isTrending: true,
  },
  {
    id: "3",
    headline: "Dangote Refinery Begins Petrol Supply — Fuel Queue Go Finally End?",
    summary: "Dangote Refinery don begin supply petrol to Nigerian market. Many Nigerians dey hope say this go end the long fuel queues wey don frustrate everybody.",
    whyItMatters: "Nigeria, Africa's largest oil producer, has spent over $10 billion on fuel imports annually. Local refining could save the economy and reduce pump prices.",
    pollQuestion: "Dangote Refinery go truly change things?",
    pollOptions: [
      { id: "3a", text: "Yes! Game changer! 🚀", votes: 7890 },
      { id: "3b", text: "Let's wait and see 🧐", votes: 3200 },
      { id: "3c", text: "Na still rich man business 💰", votes: 1950 },
    ],
    debateHook: "Should government allow more private refineries or should Dangote be enough?",
    perspectives: [
      { label: "Consumers", text: "If fuel price drop, everything go better. Transport, food, business — everything!" },
      { label: "Oil Marketers", text: "Competition good, but we need level playing field for all players." },
      { label: "Energy Experts", text: "One refinery no fit solve 200 million people problem. We need more investment." },
    ],
    category: "Energy",
    source: "Vanguard",
    timeAgo: "6h ago",
    totalVotes: 13040,
    commentCount: 423,
  },
  {
    id: "4",
    headline: "Lagos-Calabar Coastal Highway: Progress or Waste of Money?",
    summary: "Construction of the controversial Lagos-Calabar coastal highway don reach advanced stage. While some praise am, others question the cost and environmental impact.",
    whyItMatters: "At an estimated cost of ₦15.6 trillion, this is Nigeria's most expensive road project. It will connect 9 coastal states but environmental groups raise alarm.",
    pollQuestion: "Lagos-Calabar highway — worth the money?",
    pollOptions: [
      { id: "4a", text: "Yes! Infrastructure matters 🛣️", votes: 4560 },
      { id: "4b", text: "Too expensive, fix existing roads 🕳️", votes: 5230 },
      { id: "4c", text: "Good idea, bad execution 🤷", votes: 2100 },
    ],
    debateHook: "₦15.6 trillion for one road — wetin else we fit use that money do?",
    perspectives: [
      { label: "Government", text: "This highway go create 300,000 jobs and transform coastal economies." },
      { label: "Critics", text: "Fix the potholes wey dey kill people first before building new road." },
      { label: "Environmentalists", text: "The project dey destroy coastal ecosystems and displace communities." },
    ],
    category: "Infrastructure",
    source: "ThisDay",
    timeAgo: "8h ago",
    totalVotes: 11890,
    commentCount: 289,
  },
  {
    id: "5",
    headline: "Super Eagles New Coach: Can Jose Peseiro Successor Take Us to World Cup?",
    summary: "NFF don appoint new Super Eagles coach with mandate to qualify Nigeria for 2026 World Cup. Fans dey hopeful but skeptical based on past experience.",
    whyItMatters: "Nigeria missed the 2022 World Cup qualification. With 2026 expanded format, there's more hope but the team needs serious rebuilding.",
    pollQuestion: "Super Eagles go make 2026 World Cup?",
    pollOptions: [
      { id: "5a", text: "Yes! This time na our time! ⚽", votes: 5670 },
      { id: "5b", text: "With this NFF? No way 😂", votes: 4320 },
      { id: "5c", text: "Only if we fix the system 🔧", votes: 3100 },
    ],
    debateHook: "Should Nigeria invest in grassroot football or keep importing diaspora players?",
    perspectives: [
      { label: "Fans", text: "We get talent, we just need proper management. Stop the corruption!" },
      { label: "Former Players", text: "The local league is dead. How you wan build national team without strong foundation?" },
      { label: "NFF", text: "We have a comprehensive plan. Give us time and support." },
    ],
    category: "Sports",
    source: "Complete Sports",
    timeAgo: "10h ago",
    totalVotes: 13090,
    commentCount: 891,
    isTrending: true,
  },
  {
    id: "6",
    headline: "Naira Hits New Low: ₦1,800 to $1 — How Long We Go Suffer?",
    summary: "The Naira don depreciate again for black market, hitting ₦1,800 to one dollar. Businesses dey close, imports dey expensive, Nigerians dey feel the pain.",
    whyItMatters: "A weak Naira means everything imported becomes more expensive — from food to medicine to raw materials for manufacturers.",
    pollQuestion: "Wetin go fix the Naira?",
    pollOptions: [
      { id: "6a", text: "Stop importing everything! 🏭", votes: 4200 },
      { id: "6b", text: "CBN needs new strategy 🏦", votes: 3890 },
      { id: "6c", text: "Only God fit help us now 🙏", votes: 6700 },
    ],
    debateHook: "Should Nigeria adopt dollar or create new currency entirely?",
    perspectives: [
      { label: "Business Owners", text: "We can't plan anymore. Exchange rate change every day, pricing don become wahala." },
      { label: "CBN", text: "We dey implement reforms. The fundamentals go improve with time." },
      { label: "Diaspora", text: "At least our remittances dey worth more now. But our families still dey suffer." },
    ],
    category: "Economy",
    source: "BusinessDay",
    timeAgo: "1h ago",
    totalVotes: 14790,
    commentCount: 1203,
    isTrending: true,
  },
];

export interface Comment {
  id: string;
  author: string;
  text: string;
  likes: number;
  timeAgo: string;
  isAI?: boolean;
}

export const mockComments: Comment[] = [
  { id: "c1", author: "ChiefObiora", text: "This country no go kill person! But we must keep pushing sha. 💪", likes: 45, timeAgo: "30m ago" },
  { id: "c2", author: "LagosBigBoy", text: "Na the same story every year. Nothing go change until we change our leaders.", likes: 89, timeAgo: "1h ago" },
  { id: "c3", author: "AdaFromEast", text: "I tire for this country honestly. But I still believe say Nigeria go better.", likes: 67, timeAgo: "1h ago" },
  { id: "c4", author: "AbujaPolitician", text: "Make una calm down. Rome was not built in a day. Give the government time.", likes: 12, timeAgo: "2h ago" },
  { id: "c5", author: "NaijaOptimist", text: "E go be! We don survive worse. This generation go make am. 🇳🇬", likes: 120, timeAgo: "2h ago" },
  { id: "c6", author: "AI Summary", text: "📊 Nigerians are divided but hopeful. 62% want immediate action, while 38% advocate patience. The dominant sentiment is cautious optimism.", likes: 200, timeAgo: "Just now", isAI: true },
];

export const trendingTopics = [
  { tag: "#MinimumWage", posts: "12.4K posts" },
  { tag: "#NairaWatch", posts: "8.9K posts" },
  { tag: "#ASUUStrike", posts: "6.2K posts" },
  { tag: "#DangoteRefinery", posts: "5.8K posts" },
  { tag: "#SuperEagles", posts: "4.1K posts" },
  { tag: "#LagosTraffic", posts: "3.5K posts" },
];

export const leaderboard = [
  { rank: 1, name: "ChiefObiora", points: 2340, comments: 156, badge: "🏆" },
  { rank: 2, name: "LagosBigBoy", points: 1980, comments: 134, badge: "🥈" },
  { rank: 3, name: "AdaFromEast", points: 1750, comments: 121, badge: "🥉" },
  { rank: 4, name: "NaijaOptimist", points: 1420, comments: 98, badge: "⭐" },
  { rank: 5, name: "AbujaPolitician", points: 1200, comments: 87, badge: "⭐" },
];

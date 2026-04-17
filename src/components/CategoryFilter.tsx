import { useState } from "react";

const categories = [
  { label: "All", emoji: "🔥", value: "" },
  { label: "Politics", emoji: "🏛️", value: "Politics" },
  { label: "Economy", emoji: "💰", value: "Economy" },
  { label: "Security", emoji: "🛡️", value: "Security" },
  { label: "Governance", emoji: "⚖️", value: "Governance" },
  { label: "Education", emoji: "🎓", value: "Education" },
  { label: "Energy", emoji: "⛽", value: "Energy" },
  { label: "Health", emoji: "🏥", value: "Health" },
  { label: "Infrastructure", emoji: "🛣️", value: "Infrastructure" },
  { label: "Technology", emoji: "💻", value: "Technology" },
  { label: "Environment", emoji: "🌍", value: "Environment" },
  { label: "Sports", emoji: "⚽", value: "Sports" },
];

interface CategoryFilterProps {
  selected: string;
  onChange: (cat: string) => void;
}

const CategoryFilter = ({ selected, onChange }: CategoryFilterProps) => {
  return (
    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
      {categories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={`flex-shrink-0 flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 ${
            selected === cat.value
              ? "gradient-naija text-primary-foreground shadow-md scale-105"
              : "bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground active:scale-95"
          }`}
        >
          <span className="text-sm sm:text-base">{cat.emoji}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;

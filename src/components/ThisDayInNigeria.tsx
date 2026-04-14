import { Calendar, Share2, MessageCircle, Facebook } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface HistoricalEvent {
  year: number;
  event: string;
  category: string;
}

const historicalEvents: Record<string, HistoricalEvent[]> = {
  "01-01": [
    { year: 1914, event: "Amalgamation of Northern and Southern Protectorates to form Nigeria", category: "Politics" },
    { year: 1984, event: "Major General Buhari overthrows Shagari government", category: "Politics" },
  ],
  "01-15": [
    { year: 1966, event: "First military coup in Nigeria led by Major Chukwuma Kaduna Nzeogwu", category: "Politics" },
  ],
  "02-13": [
    { year: 1976, event: "Assassination of General Murtala Mohammed in failed coup", category: "Politics" },
  ],
  "03-29": [
    { year: 2015, event: "Muhammadu Buhari wins presidential election, defeating incumbent Goodluck Jonathan", category: "Politics" },
  ],
  "04-14": [
    { year: 2014, event: "276 schoolgirls kidnapped from Chibok by Boko Haram (#BringBackOurGirls)", category: "Security" },
  ],
  "05-29": [
    { year: 1999, event: "Democracy restored as Olusegun Obasanjo sworn in as President", category: "Politics" },
    { year: 2023, event: "Bola Ahmed Tinubu inaugurated as 16th President of Nigeria", category: "Politics" },
  ],
  "06-12": [
    { year: 1993, event: "MKO Abiola wins presidential election later annulled by Ibrahim Babangida", category: "Politics" },
    { year: 2018, event: "June 12 declared as Nigeria's new Democracy Day by President Buhari", category: "Politics" },
  ],
  "07-06": [
    { year: 1967, event: "Nigerian Civil War (Biafran War) begins", category: "History" },
  ],
  "07-29": [
    { year: 1966, event: "Counter-coup led by Northern military officers; Lt. Col. Yakubu Gowon becomes Head of State", category: "Politics" },
  ],
  "08-27": [
    { year: 2003, event: "Nigeria wins the FIFA U-17 World Cup hosted in Finland", category: "Sports" },
  ],
  "09-01": [
    { year: 2012, event: "Dangote Group listed on Nigerian Stock Exchange, becomes Africa's richest company", category: "Economy" },
  ],
  "10-01": [
    { year: 1960, event: "Nigeria gains independence from Britain! 🇳🇬", category: "History" },
    { year: 1963, event: "Nigeria becomes a Republic with Nnamdi Azikiwe as first President", category: "Politics" },
  ],
  "10-20": [
    { year: 2020, event: "Lekki Toll Gate incident during #EndSARS protests", category: "Politics" },
  ],
  "11-10": [
    { year: 1995, event: "Ken Saro-Wiwa executed by military government of Sani Abacha", category: "Politics" },
  ],
  "11-18": [
    { year: 2020, event: "Twitter banned in Nigeria after deleting President Buhari's tweet", category: "Technology" },
  ],
  "12-31": [
    { year: 1983, event: "Major General Buhari stages military coup, overthrows Shehu Shagari", category: "Politics" },
  ],
};

// Fallback events for dates without specific entries
const generalFacts: HistoricalEvent[] = [
  { year: 1960, event: "Nigeria gained independence from Britain on October 1, 1960, becoming Africa's most populous nation", category: "History" },
  { year: 1986, event: "Wole Soyinka becomes the first African to win the Nobel Prize in Literature", category: "Culture" },
  { year: 1996, event: "Nigeria wins Olympic Gold in Football at the Atlanta Olympics — the 'Dream Team'", category: "Sports" },
  { year: 2010, event: "Nigerian music begins its global takeover with artists like D'banj breaking international markets", category: "Entertainment" },
  { year: 2020, event: "#EndSARS movement becomes Nigeria's largest youth-led protest in modern history", category: "Politics" },
  { year: 2023, event: "Ngozi Okonjo-Iweala continues as first African and first woman to lead the WTO", category: "Economy" },
];

function getTodayKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

function getTodayEvents(): HistoricalEvent[] {
  const key = getTodayKey();
  if (historicalEvents[key] && historicalEvents[key].length > 0) {
    return historicalEvents[key];
  }
  // Pick a pseudo-random fact based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return [generalFacts[dayOfYear % generalFacts.length]];
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const ThisDayInNigeria = () => {
  const events = getTodayEvents();
  const dateStr = getFormattedDate();
  const { toast } = useToast();
  const [shared, setShared] = useState(false);

  const shareText = `🇳🇬 This Day in Nigeria — ${dateStr}\n\n${events
    .map((e) => `📌 ${e.year}: ${e.event}`)
    .join("\n\n")}\n\nLearn more Nigerian history daily on ParrotNG! 🦜`;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://parrot.com.ng";

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(baseUrl)}&quote=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(baseUrl)}&text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: `This Day in Nigeria — ${dateStr}`, text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        setShared(true);
        toast({ title: "Copied to clipboard! 📋" });
        setTimeout(() => setShared(false), 2000);
      }).catch(() => {});
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">This Day in Nigeria</h3>
            <p className="text-[10px] text-muted-foreground">{dateStr}</p>
          </div>
        </div>
        <button
          onClick={handleNativeShare}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Share"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2.5">
        {events.map((event, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex-shrink-0 flex flex-col items-center">
              <span className="text-xs font-bold text-primary">{event.year}</span>
              {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground leading-relaxed">{event.event}</p>
              <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {event.category}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Share buttons */}
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground mb-2">Share this piece of history</p>
        <div className="flex items-center gap-1.5">
          <button onClick={shareWhatsApp} className="rounded-lg p-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors" title="WhatsApp">
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
          <button onClick={shareTwitter} className="rounded-lg p-1.5 bg-foreground/5 text-foreground hover:bg-foreground/10 transition-colors" title="Twitter/X">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </button>
          <button onClick={shareFacebook} className="rounded-lg p-1.5 bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors" title="Facebook">
            <Facebook className="h-3.5 w-3.5" />
          </button>
          <button onClick={shareTelegram} className="rounded-lg p-1.5 bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 transition-colors" title="Telegram">
            <span className="text-xs">✈️</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThisDayInNigeria;

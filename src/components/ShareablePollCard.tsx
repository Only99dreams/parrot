import { useRef } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type NewsArticle } from "@/hooks/useNews";
import { useToast } from "@/hooks/use-toast";

interface ShareablePollCardProps {
  article: NewsArticle;
}

const ShareablePollCard = ({ article }: ShareablePollCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const totalVotes = article.poll_options.reduce((sum, o) => sum + o.votes, 0);

  const generateImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 640;
    const h = 460;
    canvas.width = w * 2;
    canvas.height = h * 2;
    ctx.scale(2, 2);

    // Outer background gradient — bold Nigerian green to teal
    const outerGrad = ctx.createLinearGradient(0, 0, w, h);
    outerGrad.addColorStop(0, "#004D2C");
    outerGrad.addColorStop(0.5, "#006B3F");
    outerGrad.addColorStop(1, "#008F5A");
    ctx.fillStyle = outerGrad;
    ctx.roundRect(0, 0, w, h, 20);
    ctx.fill();

    // Decorative accent stripe at top
    ctx.fillStyle = "#E8B030";
    ctx.fillRect(0, 0, w, 5);

    // Subtle pattern dots for texture
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let dx = 0; dx < w; dx += 20) {
      for (let dy = 0; dy < h; dy += 20) {
        ctx.beginPath();
        ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Inner white card
    ctx.fillStyle = "rgba(255,255,255,0.97)";
    ctx.beginPath();
    ctx.roundRect(24, 28, w - 48, h - 56, 14);
    ctx.fill();

    // Brand header bar
    const headerGrad = ctx.createLinearGradient(24, 28, w - 24, 28);
    headerGrad.addColorStop(0, "#006B3F");
    headerGrad.addColorStop(1, "#00A86B");
    ctx.fillStyle = headerGrad;
    ctx.beginPath();
    ctx.roundRect(24, 28, w - 48, 48, [14, 14, 0, 0]);
    ctx.fill();

    // Brand name
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px Inter, system-ui, sans-serif";
    ctx.fillText("🦜 ParrotNG", 44, 58);

    // Category pill
    const catText = article.category.toUpperCase();
    ctx.font = "bold 11px Inter, system-ui, sans-serif";
    const catW = ctx.measureText(catText).width + 16;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.roundRect(w - 44 - catW, 42, catW, 22, 11);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(catText, w - 44 - catW + 8, 57);

    // Question
    ctx.fillStyle = "#111";
    ctx.font = "bold 17px Inter, system-ui, sans-serif";
    const question = article.poll_question || article.headline;
    wrapText(ctx, question, 44, 105, w - 88, 24);

    // Poll bars
    let y = 170;
    const sorted = [...article.poll_options].sort((a, b) => b.votes - a.votes);
    const barColors = ["#006B3F", "#E8B030", "#3B82F6"];

    sorted.forEach((option, i) => {
      const pct = totalVotes > 0 ? option.votes / totalVotes : 0;
      const maxBarW = w - 108;
      const barW = maxBarW * pct;

      // Bar background
      ctx.fillStyle = "#F3F4F6";
      ctx.beginPath();
      ctx.roundRect(44, y, maxBarW, 40, 10);
      ctx.fill();

      // Bar fill with gradient
      if (barW > 0) {
        const barGrad = ctx.createLinearGradient(44, y, 44 + barW, y);
        const color = barColors[i] || "#ddd";
        barGrad.addColorStop(0, color);
        barGrad.addColorStop(1, color + "CC");
        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(44, y, Math.max(barW, 12), 40, 10);
        ctx.fill();
      }

      // Option text
      ctx.fillStyle = i === 0 && pct > 0.25 ? "#fff" : "#333";
      ctx.font = "600 13px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(option.option_text, 56, y + 25);

      // Percentage badge
      ctx.fillStyle = barColors[i] || "#999";
      ctx.font = "bold 14px Inter, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.round(pct * 100)}%`, w - 52, y + 26);
      ctx.textAlign = "left";

      y += 54;
    });

    // Divider line
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(44, h - 72);
    ctx.lineTo(w - 44, h - 72);
    ctx.stroke();

    // Footer — votes and source
    ctx.fillStyle = "#6B7280";
    ctx.font = "500 12px Inter, system-ui, sans-serif";
    ctx.fillText(`🗳️ ${totalVotes.toLocaleString()} votes · ${article.source}`, 44, h - 48);

    // Footer — CTA
    ctx.fillStyle = "#006B3F";
    ctx.font = "bold 13px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Vote at parrot.com.ng →", w - 44, h - 48);
    ctx.textAlign = "left";

    // Bottom accent stripe
    ctx.fillStyle = "#E8B030";
    ctx.fillRect(0, h - 5, w, 5);

    // Download
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parrot-poll-${article.id.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Downloaded! 📸", description: "Share it on social media!" });
    } catch {
      toast({ title: "Error", description: "Failed to generate image", variant: "destructive" });
    }
  };

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <Button variant="outline" size="sm" onClick={generateImage} className="gap-1.5">
        <Download className="h-3.5 w-3.5" />
        Share Results
      </Button>
    </>
  );
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, y);
      line = word + " ";
      y += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, y);
}

export default ShareablePollCard;

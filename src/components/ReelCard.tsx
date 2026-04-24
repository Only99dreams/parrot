import { Download, ExternalLink, ThumbsUp, Eye, Play } from "lucide-react";

export interface AIReel {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string | null;
  description?: string | null;
  source?: string | null;
  source_url?: string | null;
  downloadable_url?: string | null;
  channel_name?: string | null;
  category: string;
  views?: number | null;
  likes?: number | null;
  fetched_at: string;
}

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function ReelCard({ reel }: { reel: AIReel }) {
  const videoId = getYouTubeVideoId(reel.video_url);
  const isDirectVideo = /\.(mp4|webm|mov)(\?|$)/i.test(reel.video_url);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
    : null;

  return (
    <article className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      {/* Video embed or thumbnail fallback */}
      {isDirectVideo ? (
        <div className="aspect-video w-full bg-black">
          <video
            src={reel.video_url}
            controls
            preload="metadata"
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      ) : embedUrl ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title={reel.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="w-full h-full"
          />
        </div>
      ) : reel.thumbnail_url ? (
        <a
          href={reel.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative aspect-video w-full block bg-black group"
        >
          <img
            src={reel.thumbnail_url}
            alt={reel.title}
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/60 p-3 group-hover:bg-black/80 transition-colors">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>
        </a>
      ) : (
        <div className="aspect-video w-full bg-muted flex items-center justify-center">
          <Play className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {/* Content */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="font-semibold text-sm line-clamp-2 leading-snug">
          {reel.title}
        </p>
        {reel.channel_name && (
          <p className="text-xs text-muted-foreground">{reel.channel_name}</p>
        )}
        {reel.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {reel.description}
          </p>
        )}

        {/* Stats + link */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {reel.views != null && reel.views > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {reel.views.toLocaleString()}
              </span>
            )}
            {reel.likes != null && reel.likes > 0 && (
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                {reel.likes.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(reel.downloadable_url || isDirectVideo) && (
              <a
                href={reel.downloadable_url ?? reel.video_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Download className="h-3 w-3" />
                Download
              </a>
            )}
            <a
              href={reel.source_url ?? reel.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {reel.source ?? "Watch"}
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

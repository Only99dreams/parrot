import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Image, Video, X, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreatePostProps {
  onPostCreated?: () => void;
  defaultType?: "post" | "reel";
}

type MediaPreview = { url: string; type: "image" | "video" };

export default function CreatePost({
  onPostCreated,
  defaultType = "post",
}: CreatePostProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [postType, setPostType] = useState<"post" | "reel">(defaultType);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<MediaPreview[]>([]);
  const [uploading, setUploading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (valid.length + files.length > 4) {
      toast({ title: "Maximum 4 files per post", variant: "destructive" });
      return;
    }
    const newPreviews: MediaPreview[] = valid.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith("video/") ? "video" : "image",
    }));
    setFiles((prev) => [...prev, ...valid]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index].url);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setCaption("");
    setFiles([]);
    setPreviews([]);
    setPostType(defaultType);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!caption.trim() && files.length === 0) {
      toast({ title: "Add a caption or media before posting", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];

      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "bin";
        // Store under user's own folder so storage RLS allows the upload
        const path = `${user.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("user-media")
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("user-media").getPublicUrl(path);

        mediaUrls.push(publicUrl);
        mediaTypes.push(file.type.startsWith("video/") ? "video" : "image");
      }

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token ?? SUPABASE_KEY;

        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/user_posts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${token}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            user_id: user.id,
            caption: caption.trim(),
            media_urls: mediaUrls,
            media_types: mediaTypes,
            post_type: postType,
            is_published: true,
          }),
        });

        if (!insertRes.ok) {
          const errBody = await insertRes.json().catch(() => ({}));
          throw new Error((errBody as { message?: string }).message ?? `Insert failed (${insertRes.status})`);
        }

      toast({
        title: postType === "reel" ? "🎬 Reel posted!" : "📝 Post created!",
      });
      resetForm();
      setOpen(false);
      onPostCreated?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Failed to post", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Create Post
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a Post</DialogTitle>
        </DialogHeader>

        {/* Post type toggle */}
        <div className="flex gap-2">
          {(["post", "reel"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setPostType(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                postType === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t === "post" ? "📝 Post" : "🎬 Reel"}
            </button>
          ))}
        </div>

        <Textarea
          placeholder={
            postType === "reel" ? "Describe your reel…" : "What's on your mind?"
          }
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          maxLength={1000}
        />

        {/* Media previews */}
        {previews.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {previews.map((p, i) => (
              <div
                key={i}
                className="relative rounded-lg overflow-hidden bg-muted aspect-square"
              >
                {p.type === "image" ? (
                  <img
                    src={p.url}
                    alt={`preview-${i}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={p.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/avi"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />

        {/* Upload action bar */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => imageInputRef.current?.click()}
            disabled={files.length >= 4}
          >
            <Image className="h-4 w-4" />
            Photo
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => videoInputRef.current?.click()}
            disabled={files.length >= 4}
          >
            <Video className="h-4 w-4" />
            Video
          </Button>
          {files.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {files.length}/4 files
            </span>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={uploading} className="gap-2">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading
            ? "Uploading…"
            : postType === "reel"
            ? "Post Reel"
            : "Post"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

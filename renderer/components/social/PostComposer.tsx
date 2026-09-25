import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Smile, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from './Avatar';

interface PostComposerProps {
  username: string;
  onSubmit: (content: string, image?: File | null) => Promise<unknown>;
  compact?: boolean;
  replyTo?: string;
  autoFocus?: boolean;
}

export function PostComposer({
  username,
  onSubmit,
  compact = false,
  replyTo,
  autoFocus = false,
}: PostComposerProps) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = 500 - content.length;

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const chooseImage = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Choose a JPEG, PNG, WebP or GIF image');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('The image must be smaller than 8 MB');
      return;
    }
    setImage(file);
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !image) || remaining < 0 || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(content.trim(), image);
      setContent('');
      setImage(null);
      toast.success(replyTo ? 'Reply posted' : 'Post published');
    } catch (error: any) {
      toast.error(error.message || 'Could not publish your post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`flex gap-3 ${compact ? 'p-4' : 'px-5 py-4 border-b border-border-dark'}`}>
      <Avatar username={username} size="lg" />
      <div className="min-w-0 flex-1">
        {replyTo && (
          <p className="mb-2 text-[11px] text-zinc-500">
            Replying to <span className="text-zinc-300">@{replyTo}</span>
          </p>
        )}
        <textarea
          autoFocus={autoFocus}
          value={content}
          maxLength={540}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') handleSubmit();
          }}
          placeholder={replyTo ? 'Post your reply' : "What's happening in gaming?"}
          rows={compact ? 3 : 2}
          className="w-full resize-none bg-transparent text-[14px] leading-6 text-zinc-100 placeholder:text-zinc-600 outline-none"
        />

        {preview && (
          <div className="relative mt-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
            <img src={preview} alt="Image preview" className="max-h-72 w-full object-cover" />
            <button
              onClick={() => setImage(null)}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white backdrop-blur hover:bg-black"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center gap-1 border-t border-zinc-900 pt-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => chooseImage(event.target.files?.[0])}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            title="Add image"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setContent((value) => `${value}${value ? ' ' : ''}🎮`)}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            title="Add emoji"
          >
            <Smile className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          {content.length > 0 && (
            <span className={`mr-2 text-[10px] ${remaining < 0 ? 'text-red-400' : remaining < 40 ? 'text-amber-400' : 'text-zinc-600'}`}>
              {remaining}
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={(!content.trim() && !image) || remaining < 0 || submitting}
            className="flex h-8 items-center gap-2 rounded-full bg-zinc-100 px-4 text-xs font-bold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {replyTo ? 'Reply' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

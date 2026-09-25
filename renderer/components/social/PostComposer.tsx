import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Smile, X } from 'lucide-react';
import { toast } from 'sonner';
import { accentButton } from '../ui/styles';
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
      toast.error('Escolha uma imagem JPEG, PNG, WebP ou GIF');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('A imagem precisa ter menos de 8 MB');
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
      if (inputRef.current) inputRef.current.value = '';
      toast.success(replyTo ? 'Resposta publicada' : 'Post publicado');
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível publicar');
    } finally {
      setSubmitting(false);
    }
  };

  const toolButton = 'grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-raised-hover hover:text-zinc-100';

  return (
    <div className="flex gap-3 p-4">
      <Avatar username={username || 'V'} size="md" />
      <div className="min-w-0 flex-1">
        {replyTo && (
          <p className="mb-1 text-xs text-zinc-500">
            Respondendo a <span className="text-zinc-300">@{replyTo}</span>
          </p>
        )}
        <textarea
          autoFocus={autoFocus}
          value={content}
          maxLength={540}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void handleSubmit();
          }}
          aria-label={replyTo ? 'Sua resposta' : 'Novo post'}
          placeholder={replyTo ? 'Escreva sua resposta' : 'O que você está jogando?'}
          rows={compact ? 3 : 2}
          className="w-full resize-none bg-transparent py-1.5 text-[15px] leading-6 text-zinc-100 placeholder:text-zinc-500 outline-none"
        />

        {preview && (
          <div className="relative mt-2 overflow-hidden rounded-md border border-line bg-panel">
            <img src={preview} alt="Pré-visualização da imagem" className="max-h-72 w-full object-cover" />
            <button
              onClick={() => { setImage(null); if (inputRef.current) inputRef.current.value = ''; }}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md bg-black/70 text-white hover:bg-black"
              aria-label="Remover imagem"
              title="Remover imagem"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1 border-t border-line pt-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => chooseImage(event.target.files?.[0])}
          />
          <button onClick={() => inputRef.current?.click()} className={toolButton} aria-label="Adicionar imagem" title="Adicionar imagem">
            <ImagePlus className="h-4 w-4" />
          </button>
          <button onClick={() => setContent((value) => `${value}${value ? ' ' : ''}🎮`)} className={toolButton} aria-label="Adicionar emoji" title="Adicionar emoji">
            <Smile className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          {content.length > 0 && (
            <span className={`mr-2 text-xs tabular-nums ${remaining < 0 ? 'text-red-400' : remaining < 40 ? 'text-accent' : 'text-zinc-600'}`}>
              {remaining}
            </span>
          )}
          <button
            onClick={() => void handleSubmit()}
            disabled={(!content.trim() && !image) || remaining < 0 || submitting}
            className={`${accentButton} h-8 py-0`}
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {replyTo ? 'Responder' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}

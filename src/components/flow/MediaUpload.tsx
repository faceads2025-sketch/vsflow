"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, Link2 } from "lucide-react";

const ACCEPT: Record<string, string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
  file: "*/*",
};

export default function MediaUpload({
  type,
  value,
  onChange,
}: {
  type: "image" | "video" | "audio" | "file";
  value?: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no upload");
      onChange(data.url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[type]}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-xs font-medium text-ink-soft transition hover:border-brand-400 hover:text-brand-500 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? "Enviando..." : `Enviar ${type === "image" ? "imagem" : type === "video" ? "vídeo" : type === "audio" ? "áudio" : "arquivo"}`}
      </button>

      {/* alternativa: colar URL */}
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-2">
        <Link2 className="h-3.5 w-3.5 text-ink-faint" />
        <input
          className="w-full bg-transparent py-2 text-xs outline-none"
          placeholder="ou cole uma URL"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* preview */}
      {value && !uploading && (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          {type === "image" && <img src={value} alt="preview" className="max-h-40 w-full object-cover" />}
          {type === "video" && <video src={value} controls className="max-h-40 w-full" />}
          {type === "audio" && <audio src={value} controls className="w-full" />}
          {type === "file" && <p className="truncate p-2 text-xs text-ink-soft">{value}</p>}
        </div>
      )}
    </div>
  );
}

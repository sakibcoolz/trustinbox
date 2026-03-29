'use client';

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File, Archive, Film, Music, Code } from 'lucide-react';
import { Attachment } from '@/lib/chat-context';

// ── File type helpers ────────────────────────────────────────────────────────

interface FileIconMeta {
  Icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
}

function getFileMeta(fileType: string, fileName?: string): FileIconMeta {
  const ext = (fileName?.split('.').pop() ?? '').toLowerCase();

  if (fileType.startsWith('image/'))
    return { Icon: Film, color: 'text-sky-400', bg: 'bg-sky-500/10', label: 'Image' };
  if (fileType.startsWith('video/'))
    return { Icon: Film, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Video' };
  if (fileType.startsWith('audio/'))
    return { Icon: Music, color: 'text-pink-400', bg: 'bg-pink-500/10', label: 'Audio' };

  if (fileType === 'application/pdf')
    return { Icon: FileText, color: 'text-red-400', bg: 'bg-red-500/10', label: 'PDF' };

  if (
    fileType.includes('msword') ||
    fileType.includes('wordprocessingml') ||
    ext === 'doc' || ext === 'docx'
  )
    return { Icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Word' };

  if (
    fileType.includes('excel') ||
    fileType.includes('spreadsheetml') ||
    fileType === 'text/csv' ||
    ext === 'xls' || ext === 'xlsx' || ext === 'csv'
  )
    return { Icon: FileSpreadsheet, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Excel' };

  if (
    fileType.includes('zip') ||
    fileType.includes('tar') ||
    fileType.includes('gzip') ||
    fileType.includes('x-rar') ||
    ext === 'zip' || ext === 'rar' || ext === 'tar' || ext === 'gz' || ext === '7z'
  )
    return { Icon: Archive, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Archive' };

  if (
    fileType.startsWith('text/') ||
    ext === 'json' || ext === 'xml' || ext === 'yaml' || ext === 'yml' ||
    ext === 'ts' || ext === 'js' || ext === 'tsx' || ext === 'jsx' ||
    ext === 'go' || ext === 'py' || ext === 'rs' || ext === 'sh'
  )
    return { Icon: Code, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Code' };

  return { Icon: File, color: 'text-text-muted', bg: 'bg-bg-tertiary', label: 'File' };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

// ── Main component ────────────────────────────────────────────────────────────

interface FileAttachmentCardProps {
  attachment: Attachment;
  /** called when an inline image is clicked (opens lightbox in parent) */
  onImageClick?: (url: string) => void;
}

export function FileAttachmentCard({ attachment, onImageClick }: FileAttachmentCardProps) {
  const [videoErr, setVideoErr] = useState(false);

  const isImage = attachment.fileType.startsWith('image/');
  const isVideo = attachment.fileType.startsWith('video/');

  // ── Inline image ──────────────────────────────────────────────────────────
  if (isImage && attachment.url) {
    return (
      <div className="relative group rounded-xl overflow-hidden max-w-[260px] cursor-pointer" onClick={() => onImageClick?.(attachment.url!)}>
        <img
          src={attachment.url}
          alt={attachment.fileName}
          className="rounded-xl object-cover w-full max-h-[200px] hover:brightness-90 transition-all duration-200"
          loading="lazy"
        />
        {/* hover overlay with download */}
        <a
          href={attachment.url}
          download={attachment.fileName}
          onClick={e => e.stopPropagation()}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 rounded-lg p-1.5"
          title="Download"
        >
          <Download size={13} className="text-white" />
        </a>
      </div>
    );
  }

  // ── Inline video ──────────────────────────────────────────────────────────
  if (isVideo && attachment.url && !videoErr) {
    return (
      <div className="rounded-xl overflow-hidden border border-border-primary max-w-[300px] bg-black/20 group">
        <video
          controls
          preload="metadata"
          className="w-full max-h-[200px] rounded-t-xl bg-black"
          onError={() => setVideoErr(true)}
        >
          <source src={attachment.url} type={attachment.fileType} />
          Your browser does not support video playback.
        </video>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary/80">
          <Film size={12} className="text-purple-400 shrink-0" />
          <span className="text-xs text-text-secondary truncate flex-1">{attachment.fileName}</span>
          <a
            href={attachment.url}
            download={attachment.fileName}
            onClick={e => e.stopPropagation()}
            className="shrink-0 p-0.5 rounded text-text-muted hover:text-accent-blue transition-colors"
            title="Download"
          >
            <Download size={12} />
          </a>
        </div>
      </div>
    );
  }

  // ── Generic file card ─────────────────────────────────────────────────────
  const { Icon, color, bg } = getFileMeta(attachment.fileType, attachment.fileName);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-tertiary/60 border border-border-secondary hover:bg-bg-hover transition-colors max-w-[280px] group cursor-default">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={18} className={color} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-primary truncate">{attachment.fileName}</p>
        <p className="text-2xs text-text-muted mt-0.5">{formatFileSize(attachment.fileSize)}</p>
      </div>
      {attachment.url && (
        <a
          href={attachment.url}
          download={attachment.fileName}
          onClick={e => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-bg-hover rounded-lg text-text-muted hover:text-accent-blue"
          title="Download"
        >
          <Download size={14} />
        </a>
      )}
    </div>
  );
}

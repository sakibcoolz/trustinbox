'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, X, Send } from 'lucide-react';
import { Attachment } from '@/lib/chat-context';

interface VoiceRecorderProps {
  onSend: (attachment: Attachment, durationSecs: number) => void;
  onCancel: () => void;
  /** Called with the blob URL to upload; returns null on failure */
  uploadFile: (file: File) => Promise<Attachment | null>;
}

export function VoiceRecorder({ onSend, onCancel, uploadFile }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(20).fill(4));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(0);

  const stopAll = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animRef.current) clearInterval(animRef.current);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(200);

      startTimeRef.current = Date.now();
      setRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);

      animRef.current = setInterval(() => {
        setBars(Array(20).fill(0).map(() => 2 + Math.floor(Math.random() * 20)));
      }, 150);
    } catch {
      // Permission denied or unavailable
    }
  }, []);

  const cancelRecording = useCallback(() => {
    stopAll();
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
    onCancel();
  }, [stopAll, onCancel]);

  const sendRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    const durationSecs = Math.floor((Date.now() - startTimeRef.current) / 1000);
    stopAll();

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      setUploading(true);
      const att = await uploadFile(file);
      setUploading(false);
      if (att) {
        onSend(att, durationSecs);
      } else {
        onCancel();
      }
    };

    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current.stop();
    setRecording(false);
  }, [stopAll, uploadFile, onSend, onCancel]);

  useEffect(() => {
    startRecording();
    return () => stopAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (uploading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800 rounded-xl text-sm text-white/70">
        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        Uploading voice message…
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-zinc-800 rounded-xl">
      {/* Cancel */}
      <button onClick={cancelRecording} className="text-red-400 hover:text-red-300 transition-colors">
        <X size={20} />
      </button>

      {/* Waveform */}
      <div className="flex items-end gap-[2px] flex-1 h-8">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-full bg-red-500 transition-all duration-100"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      {/* Timer */}
      <span className="text-sm font-mono text-red-400 min-w-[40px] text-right">{fmt(elapsed)}</span>

      {/* Send / Mic icon */}
      <button
        onClick={sendRecording}
        disabled={elapsed < 1}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-full p-2 transition-colors"
      >
        <Send size={16} />
      </button>

      {recording && (
        <span className="absolute top-0 left-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
  );
}

/** Renders a recorded voice message as an audio player */
export function VoiceMessagePlayer({ url, durationSecs }: { url: string; durationSecs?: number }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const duration = durationSecs ?? 0;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s) % 60).padStart(2, '0')}`;
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => {}}
      />
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors flex-shrink-0"
      >
        {playing
          ? <span className="flex gap-0.5"><span className="w-[3px] h-4 bg-white rounded-sm" /><span className="w-[3px] h-4 bg-white rounded-sm" /></span>
          : <span className="ml-0.5 border-y-4 border-y-transparent border-l-[7px] border-l-white" />
        }
      </button>

      {/* progress bar */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="h-1 rounded-full bg-white/20 cursor-pointer"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            if (audioRef.current && duration > 0) {
              audioRef.current.currentTime = ratio * duration;
            }
          }}
        >
          <div className="h-1 bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-white/40">{fmt(playing ? currentTime : duration)}</span>
      </div>

      <Mic size={14} className="text-white/30 flex-shrink-0" />
    </div>
  );
}

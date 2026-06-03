'use client';

import React, { useState, useEffect } from 'react';
import { Play, Check, ChevronRight, Video, CheckCircle, Circle, RotateCcw } from 'lucide-react';

interface VideoMaterial {
  id: string;
  title: string;
  duration: string;
  durationSeconds: number;
  studied: boolean;
  savedPosition: number; // in seconds
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  videos: VideoMaterial[];
}

export default function VideoArchivePage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([
    {
      id: 'pl_1',
      name: 'Начало Пути',
      description: 'Базовые основы тишины, разбор первых ошибок и настройки внимания.',
      videos: [
        { id: 'v_1_1', title: 'Внимание как опора · «Сатсанг 14.05»', duration: '45:10', durationSeconds: 2710, studied: true, savedPosition: 1200 },
        { id: 'v_1_2', title: 'Разбор ошибок в Инкубаторе', duration: '28:15', durationSeconds: 1695, studied: false, savedPosition: 540 },
        { id: 'v_1_3', title: 'Осознание ума как инструмента', duration: '34:20', durationSeconds: 2060, studied: false, savedPosition: 0 },
      ],
    },
    {
      id: 'pl_2',
      name: 'Воинские Практики',
      description: 'Материалы для углубленной работы в группе Реанимации.',
      videos: [
        { id: 'v_2_1', title: 'Преодоление глухого сопротивления', duration: '52:40', durationSeconds: 3160, studied: false, savedPosition: 0 },
        { id: 'v_2_2', title: 'Фиксация состояния Присутствия', duration: '41:15', durationSeconds: 2475, studied: false, savedPosition: 0 },
      ],
    },
  ]);

  const [activeVideoId, setActiveVideoId] = useState<string>('v_1_1');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(1200); // Saved position for v_1_1

  // Find active video and playlist
  let activeVideo: VideoMaterial | null = null;
  let activePlaylist: Playlist | null = null;

  for (const pl of playlists) {
    const v = pl.videos.find((vid) => vid.id === activeVideoId);
    if (v) {
      activeVideo = v;
      activePlaylist = pl;
      break;
    }
  }

  // Simulated player timer
  useEffect(() => {
    let interval: any;
    if (isPlaying && activeVideo) {
      interval = setInterval(() => {
        setPlaybackTime((prev) => {
          if (activeVideo && prev >= activeVideo.durationSeconds) {
            setIsPlaying(false);
            // Auto mark as studied when finished
            toggleStudied(activeVideo.id);
            return activeVideo.durationSeconds;
          }
          // Save position periodically in model
          updateSavedPosition(activeVideoId, prev + 1);
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeVideoId]);

  const updateSavedPosition = (vidId: string, pos: number) => {
    setPlaylists((prev) =>
      prev.map((pl) => ({
        ...pl,
        videos: pl.videos.map((v) => (v.id === vidId ? { ...v, savedPosition: pos } : v)),
      }))
    );
  };

  const handleSelectVideo = (vidId: string) => {
    setIsPlaying(false);
    setActiveVideoId(vidId);
    const video = playlists.flatMap((pl) => pl.videos).find((v) => v.id === vidId);
    if (video) {
      setPlaybackTime(video.savedPosition);
    }
  };

  const toggleStudied = (vidId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => ({
        ...pl,
        videos: pl.videos.map((v) => (v.id === vidId ? { ...v, studied: !v.studied } : v)),
      }))
    );
  };

  const formatSeconds = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getPlaylistProgress = (pl: Playlist) => {
    const studiedCount = pl.videos.filter((v) => v.studied).length;
    return (studiedCount / pl.videos.length) * 100;
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-line pb-6 select-none">
        <h1 className="font-display font-bold text-2xl text-ink flex items-center gap-2">
          <Video className="w-6 h-6 text-amber" />
          Видеоархив
        </h1>
        <p className="font-mono text-[10px] text-ink-soft tracking-wider uppercase mt-1">
          Разделы видеоматериалов Сатсангов и разборов с сохранением вашей позиции
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Custom Simulated Premium Video Player */}
        {activeVideo && (
          <div className="lg:col-span-2 flex flex-col gap-4 bg-bg border border-line rounded-2xl p-5 shadow-sm">
            {/* Player Container */}
            <div className="h-64 rounded-xl bg-gradient-to-br from-[#3A332A] to-[#221E17] relative flex items-center justify-center overflow-hidden group select-none">
              <span className="absolute top-4 left-4 font-mono text-[9px] text-amber-bright uppercase tracking-wider font-semibold">
                Сатсанг · Воспроизведение
              </span>
              
              {/* Play / Pause button */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-14 h-14 rounded-full bg-white text-ink flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer z-10"
              >
                {isPlaying ? (
                  <span className="flex gap-1.5 justify-center items-center">
                    <span className="w-1.5 h-6 bg-ink rounded"></span>
                    <span className="w-1.5 h-6 bg-ink rounded"></span>
                  </span>
                ) : (
                  <Play className="w-6 h-6 fill-current ml-1" />
                )}
              </button>

              {/* Progress Bar Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                <div
                  className="h-full bg-amber-bright transition-all"
                  style={{ width: `${(playbackTime / activeVideo.durationSeconds) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Video Meta and Controls */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="font-display font-semibold text-base text-ink leading-snug">
                    {activeVideo.title}
                  </h2>
                  <p className="font-mono text-[9.5px] text-ink-soft mt-0.5">
                    Позиция: {formatSeconds(playbackTime)} / {activeVideo.duration}
                  </p>
                </div>

                <button
                  onClick={() => toggleStudied(activeVideoId)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                    activeVideo.studied
                      ? 'bg-green-50 border-green-200 text-green-700 font-bold'
                      : 'bg-transparent border-amber text-amber hover:bg-amber-wash/30'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {activeVideo.studied ? 'Изучено' : 'Отметить изученным'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Playlists List */}
        <div className="flex flex-col gap-5">
          <span className="font-mono text-[10px] text-ink-faint tracking-wider uppercase px-1 select-none">
            Плейлисты и видео
          </span>

          <div className="flex flex-col gap-4">
            {playlists.map((pl) => (
              <div key={pl.id} className="bg-bg border border-line rounded-2xl p-4 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                <div>
                  <h3 className="font-display font-bold text-sm text-ink leading-tight">{pl.name}</h3>
                  <p className="text-[11px] text-ink-soft mt-1 leading-normal font-body">{pl.description}</p>
                </div>

                {/* Progress bar */}
                <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-ink-faint select-none">
                  <div className="flex-1 h-1 bg-line rounded-full overflow-hidden">
                    <div className="h-full bg-amber-bright" style={{ width: `${getPlaylistProgress(pl)}%` }}></div>
                  </div>
                  <span>{Math.round(getPlaylistProgress(pl))}%</span>
                </div>

                {/* Videos list inside playlist */}
                <div className="flex flex-col gap-1.5 border-t border-line-soft pt-3 mt-1 select-none">
                  {pl.videos.map((vid) => {
                    const isActive = vid.id === activeVideoId;
                    return (
                      <button
                        key={vid.id}
                        onClick={() => handleSelectVideo(vid.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-wash/40 border-amber/35'
                            : 'bg-transparent border-transparent hover:bg-line-soft/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {vid.studied ? (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-ink-faint flex-shrink-0" />
                          )}
                          <span className={`text-[11.5px] truncate ${isActive ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
                            {vid.title}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-ink-faint flex-shrink-0 ml-2">{vid.duration}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

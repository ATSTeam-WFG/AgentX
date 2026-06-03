'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('agentx_admin_token') ?? '' : '';
}

interface AvatarEntry {
  id:        string;
  name:      string;
  avatarUrl: string;
}

interface AvatarPage {
  avatars: AvatarEntry[];
  total:   number;
  limit:   number;
  offset:  number;
}

async function fetchAvatars(search: string, offset: number): Promise<AvatarPage> {
  const params = new URLSearchParams({ limit: '100', offset: String(offset) });
  if (search) params.set('search', search);
  const res = await fetch(`${API_URL}/v1/admin/avatars?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch avatars');
  return res.json();
}

async function downloadImage(url: string, filename: string) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
  } catch {
    window.open(url, '_blank');
  }
}

function safeFilename(name: string) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_avatar.jpg';
}

export default function AdminAvatarsPage() {
  const [search,      setSearch]      = useState('');
  const [debouncedQ,  setDebouncedQ]  = useState('');
  const [offset,      setOffset]      = useState(0);
  const [allAvatars,  setAllAvatars]  = useState<AvatarEntry[]>([]);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(search);
      setOffset(0);
      setAllAvatars([]);
      setSelected(new Set());
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-avatars', debouncedQ, offset],
    queryFn:  () => fetchAvatars(debouncedQ, offset),
    staleTime: 30_000,
  });

  const page     = data ?? { avatars: [], total: 0, limit: 100, offset: 0 };
  const combined = offset === 0 ? page.avatars : [...allAvatars, ...page.avatars];
  const hasMore  = combined.length < page.total;

  function handleLoadMore() {
    setAllAvatars(combined);
    setOffset((o) => o + 100);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (selected.size === combined.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(combined.map((a) => a.id)));
    }
  }

  const handleCardClick = useCallback((avatar: AvatarEntry, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.aav-checkbox-wrap')) return;
    downloadImage(avatar.avatarUrl, safeFilename(avatar.name));
  }, []);

  async function handleDownloadSelected() {
    if (downloading || selected.size === 0) return;
    setDownloading(true);
    const toDownload = combined.filter((a) => selected.has(a.id));
    for (let i = 0; i < toDownload.length; i++) {
      const av = toDownload[i];
      await downloadImage(av.avatarUrl, safeFilename(av.name));
      if (i < toDownload.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    setDownloading(false);
  }

  const allSelected = combined.length > 0 && selected.size === combined.length;

  return (
    <>
      <style>{`
        .aav-header {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 16px;
          margin-bottom: 18px; flex-wrap: wrap;
        }
        .aav-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700; color: var(--t);
          margin: 0 0 4px; letter-spacing: -.02em;
        }
        .aav-sub { font-size: 14px; color: var(--t3); margin: 0; }

        .aav-toolbar {
          display: flex; gap: 8px; align-items: center;
          margin-bottom: 16px; flex-wrap: wrap;
        }
        .aav-search {
          flex: 1; min-width: 180px; max-width: 320px;
          height: 38px; padding: 0 12px;
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.22);
          border-radius: 10px;
          font-size: 14px; color: var(--t);
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color var(--tr);
        }
        .aav-search::placeholder { color: var(--t4); }
        .aav-search:focus { border-color: rgba(74,138,255,.55); }

        .aav-btn {
          height: 38px; padding: 0 16px;
          border-radius: 10px;
          font-size: 13px; font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; border: 1px solid transparent;
          transition: opacity var(--tr), background var(--tr);
          white-space: nowrap;
        }
        .aav-btn:disabled { opacity: .45; cursor: not-allowed; }
        .aav-btn-ghost {
          background: var(--surface);
          color: var(--t);
          border-color: rgba(255,255,255,.22);
        }
        .aav-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,.08); }
        .aav-btn-primary {
          background: #2a5cd4;
          color: #fff;
          border-color: rgba(74,138,255,.35);
        }
        .aav-btn-primary:hover:not(:disabled) { opacity: .88; }

        .aav-count-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 20px; height: 20px; padding: 0 5px;
          background: rgba(255,255,255,.18); border-radius: 20px;
          font-size: 11px; font-weight: 800; margin-left: 6px;
        }

        .aav-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }

        .aav-card {
          background: var(--surface);
          border: 2px solid rgba(255,255,255,.22);
          border-radius: var(--r-lg);
          overflow: hidden;
          cursor: pointer;
          transition: border-color var(--tr), box-shadow var(--tr);
          box-shadow: var(--shadow-card);
          position: relative;
        }
        .aav-card:hover { border-color: rgba(255,255,255,.40); }
        .aav-card.selected {
          border-color: #4a8aff;
          box-shadow: 0 0 0 1px #4a8aff, var(--shadow-card);
        }

        .aav-img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          background: rgba(28,40,60,.08);
          overflow: hidden;
        }
        .aav-img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
          transition: opacity .2s;
        }
        .aav-img-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,.0);
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          transition: opacity .18s, background .18s;
        }
        .aav-card:hover .aav-img-overlay {
          opacity: 1;
          background: rgba(0,0,0,.28);
        }
        .aav-download-icon {
          color: #fff;
          width: 28px; height: 28px;
          filter: drop-shadow(0 1px 3px rgba(0,0,0,.5));
        }

        .aav-checkbox-wrap {
          position: absolute; top: 8px; right: 8px;
          z-index: 2;
        }
        .aav-checkbox {
          width: 20px; height: 20px;
          border-radius: 6px;
          border: 2px solid rgba(255,255,255,.7);
          background: rgba(0,0,0,.30);
          display: flex; align-items: center; justify-content: center;
          transition: background .15s, border-color .15s;
          cursor: pointer;
          backdrop-filter: blur(4px);
        }
        .aav-checkbox.checked {
          background: #4a8aff;
          border-color: #4a8aff;
        }
        .aav-checkbox svg { display: none; }
        .aav-checkbox.checked svg { display: block; }

        .aav-name {
          padding: 8px 10px 10px;
          font-size: 13px; font-weight: 600;
          color: var(--t2);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-align: center;
          --t2: #2A3C52;
        }

        .aav-empty {
          text-align: center; padding: 60px 24px;
          color: var(--t4); font-size: 14px;
        }

        .aav-load-more {
          width: 100%; height: 48px; margin-top: 12px;
          background: var(--surface);
          border: 1px solid rgba(255,255,255,.22);
          border-radius: var(--r-lg);
          color: #2a5cd4; font-size: 14px; font-weight: 700;
          font-family: inherit; cursor: pointer;
          transition: background var(--tr);
        }
        .aav-load-more:hover { background: rgba(255,255,255,.06); }
        .aav-load-more:disabled { opacity: .5; cursor: not-allowed; }

        .aav-refresh-dot {
          display: inline-block; width: 6px; height: 6px;
          border-radius: 50%; background: #4a8aff;
          margin-left: 6px; vertical-align: middle;
          animation: aav-pulse 1.5s ease-in-out infinite;
        }
        @keyframes aav-pulse {
          0%, 100% { opacity: 1; } 50% { opacity: .3; }
        }
      `}</style>

      <div className="aav-header">
        <div>
          <h1 className="aav-title">
            Avatars
            {isFetching && <span className="aav-refresh-dot" />}
          </h1>
          <p className="aav-sub">
            {data ? `${data.total} generated` : 'AI portrait gallery'}
          </p>
        </div>
      </div>

      <div className="aav-toolbar">
        <input
          className="aav-search"
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {combined.length > 0 && (
          <button className="aav-btn aav-btn-ghost" onClick={handleSelectAll}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}

        {selected.size > 0 && (
          <button
            className="aav-btn aav-btn-primary"
            onClick={handleDownloadSelected}
            disabled={downloading}
          >
            {downloading ? 'Downloading…' : 'Download Selected'}
            {!downloading && (
              <span className="aav-count-badge">{selected.size}</span>
            )}
          </button>
        )}
      </div>

      {isLoading && <div className="aav-empty">Loading…</div>}
      {!isLoading && combined.length === 0 && (
        <div className="aav-empty">
          {debouncedQ ? `No avatars matching "${debouncedQ}".` : 'No avatars generated yet.'}
        </div>
      )}

      <div className="aav-grid">
        {combined.map((avatar) => {
          const isSelected = selected.has(avatar.id);
          return (
            <div
              key={avatar.id}
              className={`aav-card${isSelected ? ' selected' : ''}`}
              onClick={(e) => handleCardClick(avatar, e)}
            >
              <div className="aav-img-wrap">
                <img
                  className="aav-img"
                  src={avatar.avatarUrl}
                  alt={avatar.name}
                  loading="lazy"
                />
                <div className="aav-img-overlay">
                  <svg className="aav-download-icon" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>

                <div className="aav-checkbox-wrap" onClick={(e) => { e.stopPropagation(); toggleSelect(avatar.id); }}>
                  <div className={`aav-checkbox${isSelected ? ' checked' : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="aav-name">{avatar.name}</div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          className="aav-load-more"
          onClick={handleLoadMore}
          disabled={isFetching}
        >
          {isFetching ? 'Loading…' : `Load more (${page.total - combined.length} remaining)`}
        </button>
      )}
    </>
  );
}

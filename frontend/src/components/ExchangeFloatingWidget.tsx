'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/contexts/AuthContext';
import { TrendingUp, RefreshCw, ChevronDown, ChevronUp, ArrowLeftRight, GripHorizontal } from 'lucide-react';
import { usePathname } from 'next/navigation';

type Currency = 'USD' | 'EUR' | 'UAH';
interface RateSnapshot {
  USD: number; EUR: number; UAH: number;
  fetchedAt: string; exchangeDate: string; feePercent: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'exchange-widget-pos';
const DEFAULT_POS = { x: -16, y: -16 }; // negative = offset from right/bottom via CSS
const WIDGET_W = 256; // w-64
const WIDGET_H_MIN = 90;

const META: Record<Currency, { symbol: string; flag: string }> = {
  USD: { symbol: '$', flag: '🇺🇸' },
  EUR: { symbol: '€', flag: '🇪🇺' },
  UAH: { symbol: '₴', flag: '🇺🇦' },
};

const ALL_PAIRS: { from: Currency; to: Currency }[] = [
  { from: 'USD', to: 'UAH' }, { from: 'EUR', to: 'UAH' },
  { from: 'USD', to: 'EUR' }, { from: 'EUR', to: 'USD' },
  { from: 'UAH', to: 'USD' }, { from: 'UAH', to: 'EUR' },
];

function fmt(n: number, d = 4) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function crossRate(rates: RateSnapshot, from: Currency, to: Currency) {
  return rates[from] / rates[to];
}
function relativeTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// Read saved position from localStorage, validate it's still on-screen
function loadPosition(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPosition();
    const pos = JSON.parse(raw);
    // clamp to viewport in case window was resized since last visit
    return clampToViewport(pos.x, pos.y);
  } catch {
    return getDefaultPosition();
  }
}

function getDefaultPosition() {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return {
    x: window.innerWidth - WIDGET_W - 20,
    y: window.innerHeight - 200,      // rough default height
  };
}

function clampToViewport(x: number, y: number) {
  if (typeof window === 'undefined') return { x, y };
  return {
    x: Math.max(0, Math.min(x, window.innerWidth - WIDGET_W)),
    y: Math.max(0, Math.min(y, window.innerHeight - WIDGET_H_MIN)),
  };
}

export default function ExchangeFloatingWidget() {
  const { token, user } = useAuth();
  const pathname = usePathname();
  // Don't show on auth pages
  const [expanded, setExpanded] = useState(false);
  const [pairIndex, setPairIndex] = useState(0);
  const [, setTick] = useState(0);

  // Position state — initialised lazily from localStorage
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  // Drag bookkeeping in refs so drag handlers don't cause re-renders
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 }); // cursor offset within widget on mousedown
  const widgetRef = useRef<HTMLDivElement>(null);

  // Load saved position once on mount (client-only)
  useEffect(() => {
    setPos(loadPosition());
  }, []);

  // Persist whenever pos changes
  useEffect(() => {
    if (pos) localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, [pos]);

  // Relative-time ticker
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  // Re-clamp if window resizes
  useEffect(() => {
    const onResize = () => setPos(p => p ? clampToViewport(p.x, p.y) : p);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from the grip handle — don't steal clicks on buttons
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - (widgetRef.current?.getBoundingClientRect().left ?? 0),
      y: e.clientY - (widgetRef.current?.getBoundingClientRect().top ?? 0),
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      // Apply live transform directly on the DOM node for smoothness — no React state during drag
      if (widgetRef.current) {
        const clamped = clampToViewport(newX, newY);
        widgetRef.current.style.left = `${clamped.x}px`;
        widgetRef.current.style.top = `${clamped.y}px`;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      // Now commit the final position to state (and localStorage)
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setPos(clampToViewport(newX, newY));
    };

    // Touch support
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      const t = e.touches[0];
      const clamped = clampToViewport(
        t.clientX - dragOffset.current.x,
        t.clientY - dragOffset.current.y,
      );
      if (widgetRef.current) {
        widgetRef.current.style.left = `${clamped.x}px`;
        widgetRef.current.style.top = `${clamped.y}px`;
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const t = e.changedTouches[0];
      setPos(clampToViewport(
        t.clientX - dragOffset.current.x,
        t.clientY - dragOffset.current.y,
      ));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging.current = true;
    const t = e.touches[0];
    dragOffset.current = {
      x: t.clientX - (widgetRef.current?.getBoundingClientRect().left ?? 0),
      y: t.clientY - (widgetRef.current?.getBoundingClientRect().top ?? 0),
    };
  }, []);

  // ── Rates query ────────────────────────────────────────────────────────────

  const { data: rates, isFetching, refetch } = useQuery<RateSnapshot>({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/exchange/rates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch rates');
      return res.json();
    },
    enabled: !!token && !!user,
    staleTime: CACHE_TTL_MS,
    refetchInterval: CACHE_TTL_MS,
    retry: 2,
  });

  if (!user || !token || !pos) return null;

  const activePair = ALL_PAIRS[pairIndex];
  const activeRate = rates ? crossRate(rates, activePair.from, activePair.to) : null;

  // Don't render the widget on auth pages or if user isn't logged in or position isn't loaded yet
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/';

  if (!user || !token || isAuthPage || !pos) return null;

  return (
    <div
      ref={widgetRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{ position: 'fixed', left: pos.x, top: pos.y, width: WIDGET_W, zIndex: 50 }}
      className="rounded-2xl border border-white/10 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden select-none"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.07] cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          {/* Grip icon signals draggability */}
          <GripHorizontal className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
          <div className="h-6 w-6 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <TrendingUp className="h-3 w-3 text-primary" />
          </div>
          <span className="text-xs font-bold text-foreground">Exchange Rates</span>
          {!isFetching && rates && (
            <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-semibold">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => refetch()} disabled={isFetching}
            className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all disabled:opacity-40">
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setExpanded(e => !e)}
            className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* ── Collapsed: single pair + cycle ── */}
      {!expanded && (
        <div className="px-3.5 py-3">
          {rates && activeRate !== null ? (
            <div className="flex items-center justify-between">
              <button onClick={() => setPairIndex(i => (i - 1 + ALL_PAIRS.length) % ALL_PAIRS.length)}
                className="h-6 w-6 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
                <ArrowLeftRight className="h-3 w-3" />
              </button>
              <div className="flex-1 text-center px-2">
                <p className="text-[10px] text-muted-foreground/60 mb-0.5">
                  {META[activePair.from].flag} {activePair.from} → {META[activePair.to].flag} {activePair.to}
                </p>
                <p className="text-base font-bold text-foreground tabular-nums">
                  {META[activePair.from].symbol}1 ={' '}
                  {fmt(activeRate, activePair.to === 'UAH' ? 2 : 4)}
                  <span className="text-primary text-xs ml-1">{META[activePair.to].symbol}</span>
                </p>
              </div>
              <button onClick={() => setPairIndex(i => (i + 1) % ALL_PAIRS.length)}
                className="h-6 w-6 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
                <ArrowLeftRight className="h-3 w-3 scale-x-[-1]" />
              </button>
            </div>
          ) : (
            <div className="h-8 flex items-center justify-center">
              <div className="h-3 w-28 rounded bg-white/5 animate-pulse" />
            </div>
          )}
          <div className="flex justify-center gap-1 mt-2.5">
            {ALL_PAIRS.map((_, i) => (
              <button key={i} onClick={() => setPairIndex(i)}
                className={`h-1 rounded-full transition-all duration-200 ${i === pairIndex ? 'w-4 bg-primary' : 'w-1 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>
        </div>
      )}

      {/* ── Expanded: all pairs ── */}
      {expanded && rates && (
        <div className="divide-y divide-white/[0.05]">
          {ALL_PAIRS.map((pair, i) => (
            <button key={`${pair.from}-${pair.to}`}
              onClick={() => { setPairIndex(i); setExpanded(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 text-left transition-all hover:bg-white/[0.04] ${i === pairIndex ? 'bg-primary/10' : ''}`}>
              <span className="text-[11px] text-muted-foreground">
                {META[pair.from].flag} {pair.from}
                <span className="mx-1.5 text-muted-foreground/40">→</span>
                {META[pair.to].flag} {pair.to}
              </span>
              <span className="text-[11px] font-semibold text-foreground tabular-nums">
                {META[pair.from].symbol}1 = {fmt(crossRate(rates, pair.from, pair.to), pair.to === 'UAH' ? 2 : 4)}
                <span className="text-primary ml-0.5">{META[pair.to].symbol}</span>
              </span>
            </button>
          ))}
          <div className="flex justify-between px-3.5 py-2 bg-white/[0.015]">
            <span className="text-[9px] text-muted-foreground/40">NBU {rates.exchangeDate}</span>
            <span className="text-[9px] text-muted-foreground/40">{relativeTime(rates.fetchedAt)}</span>
          </div>
        </div>
      )}
      {expanded && !rates && (
        <div className="px-3.5 py-3 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
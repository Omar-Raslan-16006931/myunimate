import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const GAP = 10;
const MAX_SCALE = 3;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/**
 * Light PDF reader: the phone's own smooth scrolling, only the pages near the screen are drawn
 * (the rest are empty placeholders of the right size), pinch / double-tap zoom and a "3 / 12" page badge.
 */
export const PdfViewer = ({ file }: { file: string }) => {
  const box = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const pageEls = useRef<(HTMLDivElement | null)[]>([]);
  const [numPages, setNumPages] = useState(0);
  const [boxW, setBoxW] = useState(() => Math.min(window.innerWidth, 1000));
  const [scale, setScale] = useState(1);
  const [ratios, setRatios] = useState<Record<number, number>>({}); // page height / width
  const [near, setNear] = useState<Set<number>>(() => new Set([1, 2]));
  const [current, setCurrent] = useState(1);
  const [badge, setBadge] = useState(false);
  const badgeTimer = useRef<number | undefined>(undefined);
  const scaleRef = useRef(1);
  scaleRef.current = scale;

  const baseW = Math.min(boxW - 16, 960);
  const pageW = baseW * scale;
  const firstRatio = ratios[1] ?? 1.414;
  const ratioOf = (n: number) => ratios[n] ?? firstRatio;

  // width of the reading area
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth || window.innerWidth));
    ro.observe(el);
    setBoxW(el.clientWidth || window.innerWidth);
    return () => ro.disconnect();
  }, []);

  // which pages are close to the screen (only those are drawn)
  useEffect(() => {
    const root = box.current;
    if (!root || !numPages) return;
    const io = new IntersectionObserver(entries => {
      setNear(prev => {
        const next = new Set(prev);
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.page);
          if (e.isIntersecting) next.add(n); else next.delete(n);
        }
        return next;
      });
    }, { root, rootMargin: '120% 0px' });
    pageEls.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [numPages]);

  // page badge: follows the page in the middle of the screen, shows while scrolling
  const onScroll = useCallback(() => {
    const root = box.current;
    if (!root) return;
    const mid = root.scrollTop + root.clientHeight / 2;
    let best = 1;
    for (let i = 0; i < pageEls.current.length; i++) {
      const el = pageEls.current[i];
      if (el && el.offsetTop <= mid) best = i + 1; else break;
    }
    setCurrent(best);
    setBadge(true);
    window.clearTimeout(badgeTimer.current);
    badgeTimer.current = window.setTimeout(() => setBadge(false), 1400);
  }, []);
  useEffect(() => { if (numPages) onScroll(); }, [numPages, onScroll]); // flash the badge when it opens
  useEffect(() => () => window.clearTimeout(badgeTimer.current), []);

  // zoom keeps the middle of the screen where it was
  const zoomTo = useCallback((next: number) => {
    const root = box.current;
    const old = scaleRef.current;
    next = clamp(next, 1, MAX_SCALE);
    if (!root || next === old) return;
    const k = next / old;
    const cy = root.scrollTop + root.clientHeight / 2;
    const cx = root.scrollLeft + root.clientWidth / 2;
    setScale(next);
    requestAnimationFrame(() => {
      root.scrollTop = cy * k - root.clientHeight / 2;
      root.scrollLeft = cx * k - root.clientWidth / 2;
    });
  }, []);

  // pinch (live, no re-drawing until the fingers lift) and double-tap
  useEffect(() => {
    const root = box.current;
    const inner = content.current;
    if (!root || !inner) return;
    let startDist = 0;
    let live = 1;
    let lastTap = 0;
    let noTapUntil = 0; // lifting the fingers after a pinch is not a tap
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const hasGestures = 'ongesturestart' in window;
    const start = (e: TouchEvent) => {
      if (!hasGestures && e.touches.length === 2) { startDist = dist(e.touches); live = 1; }
    };
    const move = (e: TouchEvent) => {
      if (hasGestures || e.touches.length !== 2 || !startDist) return;
      e.preventDefault();
      const cur = scaleRef.current;
      live = clamp(cur * (dist(e.touches) / startDist), 1, MAX_SCALE) / cur;
      inner.style.transformOrigin = `${root.scrollLeft + root.clientWidth / 2}px ${root.scrollTop + root.clientHeight / 2}px`;
      inner.style.transform = `scale(${live})`;
    };
    const end = (e: TouchEvent) => {
      if (startDist && e.touches.length < 2) {
        const target = scaleRef.current * live;
        startDist = 0;
        inner.style.transform = '';
        if (live !== 1) zoomTo(target);
        live = 1;
        lastTap = 0;
        return;
      }
      if (e.touches.length === 0 && e.changedTouches.length === 1) {
        const now = Date.now();
        if (now < noTapUntil) return;
        if (now - lastTap < 280) { zoomTo(scaleRef.current > 1.2 ? 1 : 2.5); lastTap = 0; } else lastTap = now;
      }
    };
    // iPhone Safari / the app: its own pinch events are the reliable way to catch a two-finger pinch
    let gStart = 1;
    const gStartEv = (e: Event) => { e.preventDefault(); gStart = scaleRef.current; live = 1; };
    const gChange = (e: Event) => {
      e.preventDefault();
      const cur = scaleRef.current;
      live = clamp(gStart * (e as unknown as { scale: number }).scale, 1, MAX_SCALE) / cur;
      inner.style.transformOrigin = `${root.scrollLeft + root.clientWidth / 2}px ${root.scrollTop + root.clientHeight / 2}px`;
      inner.style.transform = `scale(${live})`;
    };
    const gEnd = (e: Event) => {
      e.preventDefault();
      const target = scaleRef.current * live;
      inner.style.transform = '';
      if (live !== 1) zoomTo(target);
      live = 1;
      lastTap = 0;
      noTapUntil = Date.now() + 500;
    };
    root.addEventListener('gesturestart', gStartEv);
    root.addEventListener('gesturechange', gChange);
    root.addEventListener('gestureend', gEnd);
    root.addEventListener('touchstart', start, { passive: true });
    root.addEventListener('touchmove', move, { passive: false });
    root.addEventListener('touchend', end, { passive: true });
    return () => {
      root.removeEventListener('gesturestart', gStartEv);
      root.removeEventListener('gesturechange', gChange);
      root.removeEventListener('gestureend', gEnd);
      root.removeEventListener('touchstart', start);
      root.removeEventListener('touchmove', move);
      root.removeEventListener('touchend', end);
    };
  }, [zoomTo]);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  return (
    <div className="relative h-full w-full bg-zinc-950 select-none">
      <div
        ref={box}
        onScroll={onScroll}
        className="h-full w-full overflow-auto"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-x pan-y' }}
      >
        <Document
          file={file}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="mt-20 flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
              <div className="text-sm font-medium text-zinc-400">Preparing document...</div>
            </div>
          }
          error={<div className="mt-20 text-center text-sm text-zinc-400">Could not open this PDF.</div>}
        >
          <div ref={content} style={{ width: pageW + 16, minWidth: '100%', padding: `${GAP}px 8px`, boxSizing: 'border-box', willChange: 'transform' }}>
            {Array.from({ length: numPages }, (_, i) => {
              const n = i + 1;
              return (
                <div
                  key={n}
                  data-page={n}
                  ref={el => { pageEls.current[i] = el; }}
                  style={{ width: pageW, height: pageW * ratioOf(n), marginBottom: GAP, marginLeft: 'auto', marginRight: 'auto', background: '#fff', borderRadius: 2, overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.45)' }}
                >
                  {near.has(n) && (
                    <Page
                      pageNumber={n}
                      width={pageW}
                      devicePixelRatio={dpr}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={null}
                      onLoadSuccess={p => {
                        const r = p.originalHeight / p.originalWidth;
                        setRatios(prev => (Math.abs((prev[n] ?? 0) - r) < 0.001 ? prev : { ...prev, [n]: r }));
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Document>
      </div>

      {numPages > 0 && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1.5 text-[0.82rem] font-bold tabular-nums text-white"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom) + 18px)',
            background: 'rgba(30,30,36,0.82)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            opacity: badge || numPages === 1 ? 1 : 0,
            transition: 'opacity 0.25s ease',
          }}
        >
          {current} / {numPages}
        </div>
      )}
    </div>
  );
};

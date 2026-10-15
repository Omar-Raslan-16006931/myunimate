import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const GAP = 10;
const PAD = 8;
const MAX_SCALE = 4;
const RENDER = 2; // pages are drawn once at 2x and only resized by zoom, so zooming never redraws (no flicker)
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/**
 * Light PDF reader: the phone's own smooth scrolling, only the pages near the screen are drawn,
 * pinch zoom around your fingers (with the rubber-band at the ends), double-tap zoom and a "3 / 12" page badge.
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

  const baseW = Math.min(boxW - PAD * 2, 960);
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

  // Real zoom: sizes change in one step and the scroll is set in the same frame so the point under
  // your fingers (mx, my = their position on screen) stays put. Pages are not redrawn, so nothing flickers.
  const commitZoom = useCallback((next: number, mx: number, my: number) => {
    const root = box.current;
    const old = scaleRef.current;
    next = clamp(next, 1, MAX_SCALE);
    if (!root || next === old) return;
    const k = next / old;
    const cx = root.scrollLeft + mx;
    const cy = root.scrollTop + my;
    flushSync(() => setScale(next));
    root.scrollLeft = cx * k - mx;
    root.scrollTop = cy * k - my;
  }, []);

  // hand gestures: pinch around the fingers (live, follows them, rubber-bands past the limits),
  // two-finger drag while pinching, double-tap to zoom in / back out at the tapped spot
  useEffect(() => {
    const root = box.current;
    if (!root) return;
    // the pages (and so this wrapper) only exist once the PDF has loaded, so it is looked up when needed
    const el = () => content.current;

    let pinching = false;
    let d0 = 1, mx0 = 0, my0 = 0, mxNow = 0, myNow = 0, ratio = 1;
    let ox = 0, oy = 0; // the content point that sits under the fingers when the pinch begins
    let lastTap = 0, lastX = 0, lastY = 0, noTapUntil = 0, settling = false;

    const pos = (t: TouchList) => {
      const r = root.getBoundingClientRect();
      return {
        d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY),
        x: (t[0].clientX + t[1].clientX) / 2 - r.left,
        y: (t[0].clientY + t[1].clientY) / 2 - r.top,
      };
    };
    const paint = (r: number, dx: number, dy: number) => {
      const c = el();
      if (!c) return;
      c.style.transformOrigin = `${ox}px ${oy}px`;
      c.style.transform = `translate(${dx}px, ${dy}px) scale(${r})`;
    };
    const clear = () => {
      const c = el();
      if (c) { c.style.transition = ''; c.style.transform = ''; }
    };

    // eased zoom to a target scale around a screen point, used for double-tap and for the rubber-band
    const animateTo = (target: number, mx: number, my: number) => {
      const c = el();
      const cur = scaleRef.current;
      target = clamp(target, 1, MAX_SCALE);
      if (!c || settling) return;
      if (target === cur) { clear(); return; }
      settling = true;
      ox = root.scrollLeft + mx; oy = root.scrollTop + my;
      c.style.transition = 'none';
      paint(1, 0, 0);
      void c.offsetWidth; // apply the start state, then ease to the end state
      c.style.transition = 'transform 0.22s ease-out';
      paint(target / cur, 0, 0);
      window.setTimeout(() => {
        clear();
        commitZoom(target, mx, my);
        settling = false;
      }, 230);
    };

    const start = (e: TouchEvent) => {
      if (settling) return;
      if (e.touches.length === 2) {
        const p = pos(e.touches);
        pinching = true;
        d0 = p.d || 1; mx0 = mxNow = p.x; my0 = myNow = p.y; ratio = 1;
        ox = root.scrollLeft + p.x; oy = root.scrollTop + p.y;
        root.style.overflow = 'hidden'; // the page stands still while you pinch (the iPhone would otherwise keep scrolling)
        const c = el();
        if (c) c.style.transition = 'none';
      }
    };
    const move = (e: TouchEvent) => {
      if (!pinching || e.touches.length !== 2) return;
      e.preventDefault();
      const p = pos(e.touches);
      mxNow = p.x; myNow = p.y;
      // a little stretch past the limits (like iOS), it springs back on release
      ratio = clamp(scaleRef.current * (p.d / d0), 0.75, MAX_SCALE * 1.2) / scaleRef.current;
      paint(ratio, mxNow - mx0, myNow - my0);
    };
    const end = (e: TouchEvent) => {
      if (pinching && e.touches.length < 2) {
        pinching = false;
        root.style.overflow = '';
        const target = scaleRef.current * ratio;
        const settled = clamp(target, 1, MAX_SCALE);
        noTapUntil = Date.now() + 500;
        lastTap = 0;
        if (settled !== target) {
          // past a limit: spring back to it, then lock the zoom in
          const c = el();
          if (c) {
            c.style.transition = 'transform 0.2s ease-out';
            paint(settled / scaleRef.current, mxNow - mx0, myNow - my0);
            settling = true;
            window.setTimeout(() => { clear(); commitZoom(settled, mxNow, myNow); settling = false; }, 210);
          }
        } else {
          clear();
          commitZoom(settled, mxNow, myNow);
        }
        return;
      }
      if (e.touches.length === 0 && e.changedTouches.length === 1 && !pinching) {
        const now = Date.now();
        const t = e.changedTouches[0];
        const r = root.getBoundingClientRect();
        const x = t.clientX - r.left, y = t.clientY - r.top;
        if (now < noTapUntil) return;
        if (now - lastTap < 300 && Math.hypot(x - lastX, y - lastY) < 40) {
          animateTo(scaleRef.current > 1.2 ? 1 : 2.5, x, y);
          lastTap = 0;
        } else { lastTap = now; lastX = x; lastY = y; }
      }
    };
    root.addEventListener('touchstart', start, { passive: true });
    root.addEventListener('touchmove', move, { passive: false });
    root.addEventListener('touchend', end, { passive: true });
    root.addEventListener('touchcancel', end, { passive: true });
    return () => {
      root.removeEventListener('touchstart', start);
      root.removeEventListener('touchmove', move);
      root.removeEventListener('touchend', end);
      root.removeEventListener('touchcancel', end);
      root.style.overflow = '';
    };
  }, [commitZoom]);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const gap = GAP * scale;
  const pad = PAD * scale;

  return (
    <div className="pdfv relative h-full w-full bg-zinc-950 select-none">
      {/* pages are drawn at a fixed size and stretched to fit, so changing the zoom never redraws them */}
      <style>{`.pdfv .react-pdf__Page{width:100%!important;height:100%!important}.pdfv .react-pdf__Page canvas{width:100%!important;height:100%!important;display:block}`}</style>
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
          <div ref={content} style={{ width: pageW + pad * 2, margin: '0 auto', padding: `${gap}px ${pad}px 0`, boxSizing: 'border-box', willChange: 'transform' }}>
            {Array.from({ length: numPages }, (_, i) => {
              const n = i + 1;
              return (
                <div
                  key={n}
                  data-page={n}
                  ref={el => { pageEls.current[i] = el; }}
                  style={{ width: pageW, height: pageW * ratioOf(n), marginBottom: gap, background: '#fff', borderRadius: 2, overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.45)' }}
                >
                  {near.has(n) && (
                    <Page
                      pageNumber={n}
                      width={baseW * RENDER}
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

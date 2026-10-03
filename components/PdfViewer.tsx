import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK       = '#1A1730';
const CARD_BG   = '#FAFAF6';
const PAPER_BG  = '#C7B2DB';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export const PdfViewer = ({ file }: { file: string }) => {
  const [numPages, setNumPages] = useState<number>();

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: PAPER_BG,
        overflow: 'hidden',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: CARD_BG,
          border: `1.5px solid ${INK}`,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          borderBottom: `1.5px solid ${INK}`,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: '0.85rem',
            color: INK,
          }}
        >
          Document
        </span>
        {numPages != null && (
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '0.72rem',
              color: `rgba(26,23,48,0.55)`,
              background: `rgba(26,23,48,0.07)`,
              border: `1.5px solid ${INK}`,
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            {numPages} {numPages === 1 ? 'page' : 'pages'}
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: '0.7rem',
            color: `rgba(26,23,48,0.4)`,
          }}
        >
          Pinch or scroll to zoom · Drag to pan
        </span>
      </div>

      {/* ── PDF canvas area ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TransformWrapper
          initialScale={1}
          minScale={1}
          maxScale={8}
          centerOnInit
          panning={{
            velocityDisabled: false,
            allowLeftClickPan: true,
            allowRightClickPan: true,
            allowMiddleClickPan: true,
            wheelPanning: false, // We want wheel to zoom or scroll naturally
          }}
          wheel={{
            step: 0.2,
            smoothStep: 0.02,
          }}
          pinch={{ step: 10 }}
          doubleClick={{
            mode: 'toggle',
            step: 3,
          }}
          alignmentAnimation={{
            sizeX: 0.2,
            sizeY: 0.2,
            velocityAlignmentTime: 300,
          }}
        >
          <TransformComponent
            wrapperClass="!w-full !h-full cursor-grab active:cursor-grabbing"
            contentClass="min-h-full w-full flex flex-col items-center gap-2 py-8"
          >
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              className="flex flex-col gap-6 items-center"
              loading={
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 14,
                    marginTop: 80,
                  }}
                >
                  {/* Paper-style spinner */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: `3px solid ${INK}`,
                      borderTopColor: 'transparent',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: "'Instrument Sans', sans-serif",
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      color: INK,
                    }}
                  >
                    Preparing document...
                  </div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              }
            >
              {Array.from(new Array(numPages), (_el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  style={{
                    boxShadow: `6px 6px 0 ${INK}`,
                    border: `1.5px solid ${INK}`,
                    borderRadius: 4,
                    overflow: 'hidden',
                    background: '#fff',
                    transition: 'transform 0.3s',
                  }}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  width={Math.min(window.innerWidth * 0.95, 1000)}
                  loading={
                    <div
                      style={{
                        width: 800,
                        height: 1100,
                        background: `rgba(26,23,48,0.08)`,
                        borderRadius: 4,
                        border: `1.5px solid ${INK}`,
                        animation: 'pulse 1.5s ease-in-out infinite',
                      }}
                    />
                  }
                />
              ))}
            </Document>
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
};

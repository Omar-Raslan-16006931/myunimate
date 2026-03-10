import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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
    <div className="w-full h-full bg-zinc-950 overflow-hidden select-none">
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
          wheelPanning: false // We want wheel to zoom or scroll naturally
        }}
        wheel={{ 
          step: 0.1,
          smoothStep: 0.01
        }}
        pinch={{ step: 5 }}
        doubleClick={{ 
          mode: "toggle",
          step: 2
        }}
        alignmentAnimation={{
          size: 0.3,
          velocityAlignmentTime: 400
        }}
      >
        <TransformComponent 
          wrapperClass="!w-full !h-full cursor-grab active:cursor-grabbing" 
          contentClass="min-h-full w-full flex flex-col items-center gap-4 py-12"
        >
          <Document 
            file={file} 
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col gap-6 items-center"
            loading={
              <div className="flex flex-col items-center gap-4 mt-20">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-zinc-400 text-sm font-medium">Preparing document...</div>
              </div>
            }
          >
            {Array.from(new Array(numPages), (el, index) => (
              <Page 
                key={`page_${index + 1}`} 
                pageNumber={index + 1} 
                className="shadow-2xl bg-white transition-transform duration-300"
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={Math.min(window.innerWidth * 0.95, 1000)}
                loading={<div className="w-[800px] h-[1100px] bg-zinc-800 animate-pulse rounded-sm" />}
              />
            ))}
          </Document>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};

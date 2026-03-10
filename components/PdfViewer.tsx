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
    <div className="w-full h-full overflow-auto custom-scrollbar">
        <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={5}
            centerOnInit
            wheel={{ step: 0.1 }}
            panning={{ velocityDisabled: true }}
        >
            <TransformComponent wrapperClass="!w-full !h-auto" contentClass="!w-full !h-auto flex flex-col items-center gap-4 py-4">
                <Document 
                    file={file} 
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex flex-col gap-4 items-center"
                    loading={<div className="text-white">Loading PDF...</div>}
                >
                    {Array.from(new Array(numPages), (el, index) => (
                        <Page 
                            key={`page_${index + 1}`} 
                            pageNumber={index + 1} 
                            className="shadow-xl bg-white"
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            width={Math.min(window.innerWidth - 32, 800)}
                        />
                    ))}
                </Document>
            </TransformComponent>
        </TransformWrapper>
    </div>
  );
};

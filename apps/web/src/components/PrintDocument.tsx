/**
 * Prints one Markdown document on its own: while printing, the page shows only the document (see
 * .print-report in index.css), and the browser's print dialog can save it as a PDF.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { MarkdownView } from './MarkdownView.tsx';

export function usePrinting(): [printing: boolean, print: () => void] {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return undefined;
    document.body.classList.add('printing-report');
    const finish = () => setPrinting(false);
    window.addEventListener('afterprint', finish, { once: true });
    window.print();
    return () => {
      window.removeEventListener('afterprint', finish);
      document.body.classList.remove('printing-report');
    };
  }, [printing]);
  return [printing, () => setPrinting(true)];
}

export function PrintDocument({ markdown, printing }: { markdown: string; printing: boolean }) {
  return printing
    ? createPortal(
        <div className="print-report">
          <MarkdownView markdown={markdown} />
        </div>,
        document.body,
      )
    : null;
}

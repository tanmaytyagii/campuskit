/**
 * Short confirmation messages ("Attendance saved") announced to screen
 * readers through an aria-live region and hidden again after a few seconds.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Tone = 'success' | 'info' | 'error';

interface Notice {
  id: number;
  message: string;
  tone: Tone;
}

const NoticeContext = createContext<(message: string, tone?: Tone) => void>(() => undefined);

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (message: string, tone: Tone = 'success') => {
      const id = nextId.current;
      nextId.current += 1;
      setNotices((current) => [...current.slice(-2), { id, message, tone }]);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), 4500),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <NoticeContext.Provider value={value}>
      {children}
      <div className="notices" aria-live="polite" role="status">
        {notices.map((notice) => (
          <div key={notice.id} className={`notice notice-${notice.tone}`}>
            <span>{notice.message}</span>
            <button
              type="button"
              className="notice-close"
              onClick={() => dismiss(notice.id)}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NoticeContext.Provider>
  );
}

export function useNotify(): (message: string, tone?: Tone) => void {
  return useContext(NoticeContext);
}

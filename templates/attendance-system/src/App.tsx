import { useEffect, useRef } from 'react';

import { NoticeProvider } from './components/Notices';
import type { AppConfig } from './config';
import { useHashRoute, viewHref, VIEWS, type ViewId } from './lib/useHashRoute';
import { AttendanceProvider, useAttendance } from './state/AttendanceContext';
import { DashboardView } from './views/DashboardView';
import { MarkAttendanceView } from './views/MarkAttendanceView';
import { RecordsView } from './views/RecordsView';
import { SettingsView } from './views/SettingsView';
import { StudentsView } from './views/StudentsView';

function StorageBanner() {
  const { storageState } = useAttendance();
  if (storageState.kind === 'ok') return null;
  const messages = {
    recovered: `Saved data couldn’t be read (${storageState.reason}), so the app started fresh. A copy of the old data was kept in localStorage.`,
    unavailable: `Changes can’t be saved because ${storageState.reason}. Data will be lost when you close this tab.`,
    'save-failed': `The latest change couldn’t be saved (${storageState.reason}).`,
  } as const;
  return (
    <div className="banner" role="alert">
      {messages[storageState.kind]}
    </div>
  );
}

function CurrentView({ view, config }: { view: ViewId; config: AppConfig }) {
  switch (view) {
    case 'dashboard':
      return <DashboardView config={config} />;
    case 'mark':
      return <MarkAttendanceView />;
    case 'students':
      return <StudentsView config={config} />;
    case 'records':
      return <RecordsView config={config} />;
    case 'settings':
      return <SettingsView config={config} />;
  }
}

interface AppProps {
  config: AppConfig;
  /** Injected in tests; defaults to window.localStorage. */
  storage?: Storage | null;
}

export function App({ config, storage }: AppProps) {
  const view = useHashRoute();
  const heading = useRef<HTMLHeadingElement>(null);
  const previousView = useRef(view);
  const current = VIEWS.find((item) => item.id === view) ?? VIEWS[0];

  useEffect(() => {
    document.title = `${current.label} | ${config.appName}`;
    // Move focus to the new view's heading so keyboard and screen-reader users know the page changed.
    if (previousView.current !== current.id) {
      previousView.current = current.id;
      heading.current?.focus();
    }
  }, [current, config.appName]);

  return (
    <AttendanceProvider
      seedDemoData={config.seedDemoData}
      {...(storage !== undefined ? { storage } : {})}
    >
      <NoticeProvider>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="app-header">
          <div className="container header-inner">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M6 12.5l4 4L18 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className="brand-name">{config.appName}</p>
                {config.institutionName ? (
                  <p className="brand-subtitle">{config.institutionName}</p>
                ) : null}
              </div>
            </div>
          </div>
          <nav className="container nav" aria-label="Main">
            {VIEWS.map((item) => (
              <a
                key={item.id}
                href={viewHref(item.id)}
                className="nav-link"
                aria-current={item.id === view ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <main id="main" className="container main">
          <StorageBanner />
          <h1 ref={heading} tabIndex={-1} className="page-title">
            {current.label}
          </h1>
          <CurrentView view={view} config={config} />
        </main>

        <footer className="container footer">
          <p>
            {config.authorName ? `Built by ${config.authorName}. ` : ''}Attendance data is stored
            only in this browser.
          </p>
          <p>Made with the CampusKit attendance-system template (MIT License).</p>
        </footer>
      </NoticeProvider>
    </AttendanceProvider>
  );
}

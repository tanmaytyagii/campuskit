import { ArrowRight } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';

import compareShot from '../../../../../docs/screenshots/compare.png';
import galleryShot from '../../../../../docs/screenshots/gallery.png';
import generatorShot from '../../../../../docs/screenshots/generator.png';
import studioShot from '../../../../../docs/screenshots/learning-studio.png';
import vivaShot from '../../../../../docs/screenshots/viva-practice.png';
import { cn } from '../../lib/cn.ts';

interface Stop {
  id: string;
  tab: string;
  title: string;
  text: string;
  image: string;
  alt: string;
  link: { to: string; label: string };
}

/** Real screenshots of CampusKit, captured from the running site with `pnpm screenshots`. */
const STOPS: Stop[] = [
  {
    id: 'discover',
    tab: 'Discover',
    title: 'Find a project that fits',
    text: 'Search and filter by audience, difficulty, language and category. Every card shows whether the template has been verified.',
    image: galleryShot,
    alt: 'The project gallery with filters, a search box and project cards',
    link: { to: '/projects', label: 'Browse the projects' },
  },
  {
    id: 'customize',
    tab: 'Customize',
    title: 'Make it yours before you download',
    text: 'Name the project and choose only the settings the template supports. A preview shows exactly which files each choice changes.',
    image: generatorShot,
    alt: 'The generator with a project name typed in and a preview of the app header and changed files',
    link: { to: '/generate', label: 'Open the generator' },
  },
  {
    id: 'learn',
    tab: 'Learn',
    title: 'Understand how it works',
    text: 'The learning studio explains the architecture, walks through the important files and links straight to each function in the source.',
    image: studioShot,
    alt: 'The learning studio’s architecture explorer with the storage component selected',
    link: { to: '/learn', label: 'Visit the learning center' },
  },
  {
    id: 'practise',
    tab: 'Practise',
    title: 'Rehearse your viva',
    text: 'Answer questions an examiner may ask, compare with model answers from the code, and rate yourself. Nothing you type is saved.',
    image: vivaShot,
    alt: 'A viva practice question with the student’s answer, key ideas and the model answer',
    link: { to: '/viva', label: 'Practise viva questions' },
  },
  {
    id: 'compare',
    tab: 'Compare',
    title: 'Choose with real facts',
    text: 'Put projects side by side, or start from a goal such as “my first project”. Suggestions follow written rules, not popularity.',
    image: compareShot,
    alt: 'The comparison page with a goal chosen and two projects selected',
    link: { to: '/compare', label: 'Compare projects' },
  },
];

/**
 * A tabbed tour of the product. Tabs follow the ARIA tabs pattern: arrow
 * keys move between them and the selected tab's panel shows its screenshot.
 */
export function ProductTour() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const base = useId();
  const stop = STOPS[selected] ?? STOPS[0];

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = STOPS.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? selected === last
          ? 0
          : selected + 1
        : event.key === 'ArrowLeft'
          ? selected === 0
            ? last
            : selected - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
  }

  if (!stop) return null;
  return (
    <div className="space-y-6">
      {/* The tab list scrolls sideways on narrow screens instead of wrapping into a jumble. */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div
          role="tablist"
          aria-label="CampusKit features"
          className="inline-flex min-w-max gap-1 rounded-xl border border-line bg-surface p-1"
        >
          {STOPS.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${item.id}`}
              aria-selected={index === selected}
              aria-controls={`${base}-panel`}
              tabIndex={index === selected ? 0 : -1}
              onClick={() => setSelected(index)}
              onKeyDown={onKeyDown}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                index === selected
                  ? 'bg-violet text-on-violet shadow-card'
                  : 'text-ink-2 hover:bg-raised hover:text-ink',
              )}
            >
              {item.tab}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${base}-panel`}
        aria-labelledby={`${base}-tab-${stop.id}`}
        className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,2fr)]"
      >
        <div className="space-y-3 lg:order-none">
          <h3 className="type-h2 text-ink">{stop.title}</h3>
          <p className="text-ink-2">{stop.text}</p>
          <Link to={stop.link.to} className="link inline-flex items-center gap-1.5">
            {stop.link.label}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <figure className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
          <div
            aria-hidden="true"
            className="flex items-center gap-1.5 border-b border-line bg-raised px-4 py-2.5"
          >
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </div>
          <img
            key={stop.id}
            src={stop.image}
            alt={stop.alt}
            width={1280}
            height={800}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full bg-raised"
          />
        </figure>
      </div>
      <p className="text-sm text-ink-3">
        Screenshots of the real pages, captured from this site with the demo data.
      </p>
    </div>
  );
}

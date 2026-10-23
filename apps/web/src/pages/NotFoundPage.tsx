import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

import { ButtonLink } from '../components/ui/Button.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';

const PLACES = [
  { to: '/generate', title: 'Generator', text: 'Customize a template and download it.' },
  { to: '/learn', title: 'Learning center', text: 'Studios, checklists and report drafts.' },
  { to: '/viva', title: 'Viva practice', text: 'Questions with model answers from the code.' },
  { to: '/docs', title: 'Documentation', text: 'Running, presenting and contributing.' },
];

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="container-page grid gap-12 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
      <div className="max-w-xl space-y-4">
        <p className="type-eyebrow text-violet">Error 404</p>
        <h1 className="type-title text-ink">This page doesn’t exist</h1>
        <p className="type-lead">
          The link may be mistyped, or the project may have been renamed. Start from the gallery or
          the generator instead.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <ButtonLink to="/projects">Browse projects</ButtonLink>
          <ButtonLink to="/" variant="secondary">
            Go to the home page
          </ButtonLink>
        </div>
      </div>
      <nav aria-label="Other pages">
        <ul className="divide-y divide-line border-y border-line">
          {PLACES.map((place) => (
            <li key={place.to}>
              <Link to={place.to} className="group flex items-center gap-4 py-4">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink group-hover:text-violet">
                    {place.title}
                  </span>
                  <span className="block text-sm text-ink-2">{place.text}</span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-violet motion-reduce:transition-none"
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

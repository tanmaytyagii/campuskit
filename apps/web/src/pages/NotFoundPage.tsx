import { ButtonLink } from '../components/ui/Button.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="container-page py-20">
      <div className="max-w-xl space-y-4">
        <p className="font-mono text-sm text-ink-3">404</p>
        <h1 className="display text-[1.9rem] text-ink min-[400px]:text-4xl">
          This page doesn’t exist
        </h1>
        <p className="text-lg text-ink-2">
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
    </div>
  );
}

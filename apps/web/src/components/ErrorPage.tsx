import { isRouteErrorResponse, useRouteError } from 'react-router';

import { Button, ButtonLink } from './ui/Button.tsx';

/** Shown when a page throws while rendering, instead of a blank screen. */
export function ErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something unexpected happened.';

  return (
    <div className="container-page py-16 md:py-24">
      <div className="max-w-xl space-y-4">
        <p className="type-eyebrow text-danger">Something went wrong</p>
        <h1 className="type-title text-ink">This page hit a problem</h1>
        <p className="type-lead">
          Reloading usually fixes it. If it keeps happening, please report it with the message
          below.
        </p>
        <pre
          tabIndex={0}
          className="overflow-x-auto rounded-xl bg-raised p-4 font-mono text-sm text-ink-2"
        >
          {message}
        </pre>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={() => window.location.reload()}>Reload the page</Button>
          <ButtonLink to="/" variant="secondary" reloadDocument>
            Go to the home page
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

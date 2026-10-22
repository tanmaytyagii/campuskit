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
    <div className="container-page py-20">
      <div className="max-w-xl space-y-4">
        <h1 className="display text-[1.9rem] min-[400px]:text-4xl">This page hit a problem</h1>
        <p className="text-lg text-ink-2">
          Reloading usually fixes it. If it keeps happening, please report it with the message
          below.
        </p>
        <pre
          tabIndex={0}
          className="overflow-x-auto rounded-xl bg-raised p-4 font-mono text-sm text-ink-2"
        >
          {message}
        </pre>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => window.location.reload()}>Reload the page</Button>
          <ButtonLink to="/" variant="secondary" reloadDocument>
            Go to the home page
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

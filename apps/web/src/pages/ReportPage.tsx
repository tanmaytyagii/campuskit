import { Link } from 'react-router';

import { PageHeader } from '../components/layout/PageHeader.tsx';
import { ReportBuilder } from '../features/documentation/ReportBuilder.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';

export function ReportPage() {
  useDocumentTitle('Submission workspace');
  return (
    <>
      <PageHeader
        title="Submission workspace"
        description="Draft your project report, presentation and demonstration. Drafts use only facts from the project’s documentation and verification records; everything you must write or measure yourself is left as a [bracketed prompt]."
      >
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-3">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/learn" className="hover:text-violet hover:underline">
                Learning center
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink-2">
              Submission workspace
            </li>
          </ol>
        </nav>
      </PageHeader>
      <section aria-labelledby="report-draft-heading" className="container-page">
        <h2 id="report-draft-heading" className="sr-only">
          Your report draft
        </h2>
        <ReportBuilder />
      </section>
    </>
  );
}

import { Breadcrumbs } from '../components/layout/Breadcrumbs.tsx';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { ReportBuilder } from '../features/documentation/ReportBuilder.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';

export function ReportPage() {
  useDocumentTitle('Submission workspace');
  return (
    <>
      <PageHeader
        eyebrow="Learn"
        title="Submission workspace"
        description="Draft your project report, presentation and demonstration. Drafts use only facts from the project’s documentation and verification records; everything you must write or measure yourself is left as a [bracketed prompt]."
      >
        <Breadcrumbs
          items={[{ label: 'Learning center', to: '/learn' }]}
          current="Submission workspace"
        />
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

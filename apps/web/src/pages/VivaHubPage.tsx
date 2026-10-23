import { catalog } from '@campuskit/project-catalog';

import { PageHeader } from '../components/layout/PageHeader.tsx';
import { ProjectLearningCard } from '../features/learning/ProjectLearningCard.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';

export function VivaHubPage() {
  useDocumentTitle('Viva practice');
  return (
    <>
      <PageHeader
        title="Viva practice"
        description="Practise the questions an examiner may ask about your project. Model answers come from each project’s code and documentation; no AI is involved and your answers are never saved or sent anywhere."
      />
      <div className="container-page">
        <h2 className="sr-only">Projects</h2>
        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {catalog.map((project) => (
            <li key={project.id}>
              <ProjectLearningCard project={project} emphasis="viva" />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

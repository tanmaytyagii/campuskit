import { catalog } from '@campuskit/project-catalog';

import { PageHeader } from '../components/layout/PageHeader.tsx';
import { ProjectLearningCard } from '../features/learning/ProjectLearningCard.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';

const STEPS = [
  {
    title: 'Answer in your own words',
    text: 'Write what you would say to the examiner. Nothing you type is saved or sent anywhere.',
  },
  {
    title: 'Compare with the model answer',
    text: 'See which key ideas your answer mentions. That check only looks for words; it can’t tell whether your explanation is right.',
  },
  {
    title: 'Rate yourself honestly',
    text: 'Your ratings decide which questions come back for review. Only the ratings are kept, in this browser.',
  },
];

export function VivaHubPage() {
  useDocumentTitle('Viva practice');
  return (
    <>
      <PageHeader
        eyebrow="Practise"
        title="Viva practice"
        description="Practise the questions an examiner may ask about your project. Model answers come from each project’s code and documentation; no AI is involved and your answers are never saved or sent anywhere."
      />
      <div className="container-page space-y-12">
        <section aria-labelledby="viva-steps" className="border-y border-line py-8">
          <h2 id="viva-steps" className="sr-only">
            How practice works
          </h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="space-y-2">
                <span className="font-mono text-sm font-medium text-violet">0{index + 1}</span>
                <h3 className="type-h3 text-ink">{step.title}</h3>
                <p className="max-w-[40ch] text-sm text-ink-2">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="viva-projects">
          <h2 id="viva-projects" className="type-h2 text-ink">
            Choose a project
          </h2>
          <ul className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {catalog.map((project) => (
              <li key={project.id}>
                <ProjectLearningCard project={project} emphasis="viva" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import type { RouteObject } from 'react-router';

import { ErrorPage } from './components/ErrorPage.tsx';
import { Layout } from './components/layout/Layout.tsx';
import { Skeleton } from './components/ui/Spinner.tsx';
import { GalleryPage } from './features/gallery/GalleryPage.tsx';
import { ProjectPage } from './features/project-details/ProjectPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';

// Pages with heavier dependencies (ZIP creation, Markdown rendering) load on demand.
const GeneratorPage = lazy(() =>
  import('./features/generator/GeneratorPage.tsx').then((module) => ({
    default: module.GeneratorPage,
  })),
);
const SourcePage = lazy(() =>
  import('./features/project-details/SourcePage.tsx').then((module) => ({
    default: module.SourcePage,
  })),
);
const TemplateDocPage = lazy(() =>
  import('./features/project-details/TemplateDocPage.tsx').then((module) => ({
    default: module.TemplateDocPage,
  })),
);
const LearnPage = lazy(() =>
  import('./pages/LearnPage.tsx').then((module) => ({ default: module.LearnPage })),
);
const ReportPage = lazy(() =>
  import('./pages/ReportPage.tsx').then((module) => ({ default: module.ReportPage })),
);
const VivaHubPage = lazy(() =>
  import('./pages/VivaHubPage.tsx').then((module) => ({ default: module.VivaHubPage })),
);
const LearningStudioPage = lazy(() =>
  import('./features/learning/LearningStudioPage.tsx').then((module) => ({
    default: module.LearningStudioPage,
  })),
);
const VivaPracticePage = lazy(() =>
  import('./features/viva/VivaPracticePage.tsx').then((module) => ({
    default: module.VivaPracticePage,
  })),
);
const ComparePage = lazy(() =>
  import('./features/compare/ComparePage.tsx').then((module) => ({
    default: module.ComparePage,
  })),
);
const DocsIndexPage = lazy(() =>
  import('./pages/DocsPages.tsx').then((module) => ({ default: module.DocsIndexPage })),
);
const DocPage = lazy(() =>
  import('./pages/DocsPages.tsx').then((module) => ({ default: module.DocPage })),
);

function PageLoading() {
  return (
    <div className="container-page space-y-4 py-14" role="status" aria-label="Loading page">
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function load(Component: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Component />
    </Suspense>
  );
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        // Errors inside a page keep the header and footer visible.
        errorElement: <ErrorPage />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'projects', element: <GalleryPage /> },
          { path: 'projects/:slug', element: <ProjectPage /> },
          { path: 'projects/:slug/docs/:kind', element: load(TemplateDocPage) },
          { path: 'projects/:slug/source', element: load(SourcePage) },
          // One route for every section, so moving between sections keeps the page (and focus).
          { path: 'projects/:slug/learn/:section?', element: load(LearningStudioPage) },
          { path: 'projects/:slug/viva', element: load(VivaPracticePage) },
          { path: 'compare', element: load(ComparePage) },
          { path: 'generate', element: load(GeneratorPage) },
          { path: 'learn', element: load(LearnPage) },
          { path: 'learn/report', element: load(ReportPage) },
          { path: 'viva', element: load(VivaHubPage) },
          { path: 'docs', element: load(DocsIndexPage) },
          { path: 'docs/:slug', element: load(DocPage) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

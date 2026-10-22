/**
 * Draft report sections. Drafts use only facts from the project manifest
 * (features, limitations, technologies, commands); everything a student must
 * write or measure themselves is left as a [bracketed prompt]. Nothing here
 * invents results, citations or test outcomes.
 */
import {
  AUDIENCE_LABELS,
  PROJECT_TYPE_LABELS,
  type ProjectManifest,
} from '@campuskit/project-catalog';

export interface ReportInfo {
  title: string;
  team: string;
  guide: string;
  institution: string;
  department: string;
  academicYear: string;
}

export const SECTION_IDS = [
  'abstract',
  'problem',
  'objectives',
  'requirements',
  'architecture',
  'database',
  'testCases',
  'results',
  'future',
  'presentation',
  'viva',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_TITLES: Record<SectionId, string> = {
  abstract: 'Abstract',
  problem: 'Problem statement',
  objectives: 'Objectives and scope',
  requirements: 'System requirements',
  architecture: 'Architecture and workflow',
  database: 'Database design',
  testCases: 'Test cases',
  results: 'Results and limitations',
  future: 'Future improvements',
  presentation: 'Presentation outline',
  viva: 'Viva questions and answers',
};

export function emptyInfo(project: ProjectManifest | null): ReportInfo {
  return {
    title: project?.name ?? '',
    team: '',
    guide: '',
    institution: '',
    department: '',
    academicYear: '',
  };
}

function technologies(project: ProjectManifest): string {
  return [...project.languages, ...project.frameworks].join(', ');
}

function bullets(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function testCommand(project: ProjectManifest): string {
  return project.testing.commands.map((command) => command.command).join(' && ');
}

const GENERIC_VIVA = [
  'What problem does your project solve, and who is it for?',
  'Why did you choose this technology stack?',
  'Walk us through the architecture. What are the main modules and how do they communicate?',
  'How is data stored, and what happens if it is invalid?',
  'How did you test the project? Show one test case.',
  'What was the hardest bug you fixed, and how did you find it?',
  'What are the limitations of your project?',
  'If you had another month, what would you improve first?',
];

/** Generates the draft text for one section. `viva` is the template's VIVA_QUESTIONS.md when available. */
export function draftSection(
  id: SectionId,
  project: ProjectManifest | null,
  info: ReportInfo,
  viva?: string,
): string {
  const title = info.title.trim() || project?.name || '[Project title]';

  if (!project) {
    const prompts: Record<SectionId, string> = {
      abstract: `This project presents **${title}**. [In 150–250 words, describe the problem, your approach, the technologies you used and your main results.]`,
      problem:
        '[Describe the problem in your own words: who faces it, how it is handled today, and what goes wrong.]',
      objectives:
        '### Objectives\n\n1. To [objective]\n2. To [objective]\n3. To [objective]\n\n### Scope\n\n[What the project includes, and what it deliberately leaves out.]',
      requirements:
        '### Software requirements\n\n| Item | Requirement |\n| --- | --- |\n| Language | [language and version] |\n| Frameworks and libraries | [names and versions] |\n| Tools | [editor, package manager, database] |\n\n### Hardware requirements\n\n[Processor, RAM and operating system of the computer you used.]',
      architecture:
        '[Insert a block diagram and describe each module.]\n\n### Workflow\n\n1. [First thing the user does]\n2. [What the system does in response]\n3. [...]',
      database:
        '[Describe how your project stores data. If it uses a database, list each table.]\n\n| Table | Column | Type | Description |\n| --- | --- | --- | --- |\n| [table] | [column] | [type] | [what it stores] |',
      testCases:
        '| ID | What is tested | Steps | Expected result | Actual result | Status |\n| --- | --- | --- | --- | --- | --- |\n| TC-01 | [feature] | [steps] | [expected] | [fill in after testing] | [Pass/Fail] |',
      results:
        '### Results\n\n[Describe what you observed, with screenshots you captured yourself.]\n\n### Limitations\n\n- [limitation]',
      future: '- [improvement]\n- [improvement]',
      presentation: presentationOutline(title, info, '[technologies]'),
      viva: `${GENERIC_VIVA.map((question, index) => `**${index + 1}. ${question}**\n\n[Your answer]`).join('\n\n')}`,
    };
    return prompts[id];
  }

  const type = PROJECT_TYPE_LABELS[project.projectType].toLowerCase();
  const audience = project.audience
    .map((value) => AUDIENCE_LABELS[value].toLowerCase())
    .join(' and ');

  switch (id) {
    case 'abstract':
      return [
        `This project presents **${title}**, a ${type} for ${audience} users. ${project.tagline}`,
        `It is built with ${technologies(project)}.`,
        '[Explain in two or three sentences why this problem matters and what your version adds or changes.]',
        '[Summarise your results in one sentence after you have tested the project.]',
      ].join(' ');
    case 'problem':
      return [
        '[Describe the problem in your own words: who faces it, how it is handled today, and what goes wrong.]',
        '',
        'Notes from the template description, to rewrite in your own words:',
        '',
        `> ${project.description}`,
      ].join('\n');
    case 'objectives':
      return [
        '### Objectives',
        '',
        '[Write three to five objectives that start with “To …”, based on the features below.]',
        '',
        '### Scope',
        '',
        'The project includes:',
        '',
        bullets(project.features),
        '',
        'Out of scope (known limitations):',
        '',
        bullets(project.limitations),
      ].join('\n');
    case 'requirements':
      return [
        '### Software requirements',
        '',
        '| Item | Requirement |',
        '| --- | --- |',
        ...project.prerequisites.map(
          (item) => `| ${item.name} | ${item.version ?? 'Any recent version'} |`,
        ),
        `| Languages | ${project.languages.join(', ')} |`,
        `| Frameworks and libraries | ${project.frameworks.join(', ')} |`,
        `| Package manager | ${project.template.packageManager} |`,
        '',
        '### Hardware requirements',
        '',
        '[List the computer you used for development and testing: processor, RAM and operating system.]',
      ].join('\n');
    case 'architecture':
      return [
        '[Insert a block diagram of the system. docs/ARCHITECTURE.md in your project has a text diagram you can redraw.]',
        '',
        `The system is a ${type} built with ${technologies(project)}. [Describe each main module in one or two sentences.]`,
        '',
        '### Workflow',
        '',
        '1. [What the user does first]',
        '2. [What the system does in response]',
        '3. [Continue until the main task is complete]',
      ].join('\n');
    case 'database':
      return [
        '[Describe how your project stores data.] The architecture document in your project (docs/ARCHITECTURE.md) explains the data model and suggests a relational design you can adapt if your institution asks for one.',
        '',
        '| Table | Column | Type | Description |',
        '| --- | --- | --- | --- |',
        '| [table] | [column] | [type] | [what it stores] |',
      ].join('\n');
    case 'testCases':
      return [
        `Automated tests: run \`${testCommand(project)}\` and record the result here: [number of tests passed, date, test tools: ${project.testing.tools.join(', ')}].`,
        '',
        '| ID | What is tested | Steps | Expected result | Actual result | Status |',
        '| --- | --- | --- | --- | --- | --- |',
        ...project.features
          .slice(0, 6)
          .map(
            (feature, index) =>
              `| TC-${String(index + 1).padStart(2, '0')} | ${feature.replace(/\|/g, '\\|')} | [steps] | [expected result] | [fill in after testing] | [Pass/Fail] |`,
          ),
      ].join('\n');
    case 'results':
      return [
        '### Results',
        '',
        '[Describe what you observed when you ran the project. Add screenshots you captured yourself and any measurements you took. Do not copy results from elsewhere.]',
        '',
        '### Limitations',
        '',
        bullets(project.limitations),
      ].join('\n');
    case 'future':
      return [
        bullets(project.ideasForExtension),
        '- [Add your own ideas, especially ones that address the limitations.]',
      ].join('\n');
    case 'presentation':
      return presentationOutline(title, info, technologies(project));
    case 'viva':
      return [
        'Practise answering these in your own words. The answers explain how the template works; add details about anything you changed.',
        '',
        viva
          ? embedDocument(viva)
          : '[The viva questions for this template are in docs/VIVA_QUESTIONS.md inside your project.]',
      ].join('\n');
  }
}

/** Removes the document title and moves headings one level down, to sit under the report's own section heading. */
function embedDocument(markdown: string): string {
  return markdown
    .replace(/^# .*\n+/, '')
    .replace(/^(#{2,5}) /gm, '#$1 ')
    .trim();
}

function presentationOutline(title: string, info: ReportInfo, tech: string): string {
  const team = info.team.trim() || '[team members]';
  const guide = info.guide.trim() || '[guide]';
  return [
    `1. **Title:** ${title}; ${team}; guided by ${guide}`,
    '2. **Problem statement:** [one slide, in plain language]',
    '3. **Objectives:** [three to five points]',
    `4. **Technology stack:** ${tech}`,
    '5. **Architecture:** [block diagram]',
    '6. **Live demo:** [list the three or four actions you will show]',
    '7. **Testing:** [test cases and automated test results]',
    '8. **Results:** [screenshots you captured]',
    '9. **Limitations and future work**',
    '10. **Questions**',
  ].join('\n');
}

/** Counts [bracketed prompts] that still need writing (Markdown links are ignored). */
export function countPrompts(text: string): number {
  return [...text.matchAll(/\[([^\]\n]{3,})\](?!\()/g)].filter(
    (match) => !/^(x| )$/i.test(match[1] ?? ''),
  ).length;
}

export function assembleReport(
  project: ProjectManifest | null,
  info: ReportInfo,
  sections: Record<SectionId, string>,
  generatedOn: string,
): string {
  const title = info.title.trim() || project?.name || 'Project report';
  const details: Array<[string, string]> = [
    ['Team', info.team],
    ['Guide', info.guide],
    ['Institution', info.institution],
    ['Department', info.department],
    ['Academic year', info.academicYear],
  ];
  const lines = [
    `# ${title}`,
    '',
    `> **Draft started with CampusKit on ${generatedOn}.** Review every section, replace each [bracketed prompt] with your own words and results, and follow your institution’s report format. Do not submit text you have not checked and understood.`,
    '',
  ];
  for (const [label, value] of details)
    if (value.trim()) lines.push(`**${label}:** ${value.trim()}  `);
  if (project)
    lines.push(
      `**Based on:** CampusKit template \`${project.id}\` (version ${project.version}, MIT License)  `,
    );
  lines.push('');
  SECTION_IDS.forEach((id, index) => {
    lines.push(`## ${index + 1}. ${SECTION_TITLES[id]}`, '', sections[id].trim(), '');
  });
  return `${lines.join('\n').trim()}\n`;
}

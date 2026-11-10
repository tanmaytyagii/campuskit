/**
 * English messages for the site chrome (header, footer, menus), the command palette, the keyboard
 * shortcut list, the dashboard and the language setting. English is the source: every other
 * language must have exactly these keys (checked by TypeScript). `{name}` is replaced by a value.
 */
export const en = {
  'skip.content': 'Skip to content',
  'english.only':
    'Template guides, viva questions, demos and documentation are in English for now.',

  'nav.main': 'Main',
  'nav.projects': 'Projects',
  'nav.demos': 'Demos',
  'nav.generator': 'Generator',
  'nav.learn': 'Learn',
  'nav.viva': 'Viva practice',
  'nav.compare': 'Compare',
  'nav.docs': 'Docs',

  'header.home': 'CampusKit home',
  'header.searchRegion': 'Sitewide',
  'header.search': 'Search projects',
  'header.palette': 'Go to anything',
  'header.openMenu': 'Open menu',
  'header.closeMenu': 'Close menu',
  'header.theme': 'Theme',

  'theme.legend': 'Colour theme',
  'theme.light': 'Light theme',
  'theme.dark': 'Dark theme',
  'theme.system': 'Match system theme',

  'footer.tagline': 'Free, open-source project templates for school and college students.',
  'footer.repository': 'Source code repository',
  'footer.newTab': ' (opens in a new tab)',
  'footer.use': 'Use CampusKit',
  'footer.documentation': 'Documentation',
  'footer.legal': 'Legal',
  'footer.gallery': 'Project gallery',
  'footer.demos': 'Interactive demos',
  'footer.generator': 'Project generator',
  'footer.compare': 'Compare projects',
  'footer.dashboard': 'Dashboard',
  'footer.learn': 'Learning center',
  'footer.myProjects': 'My projects',
  'footer.viva': 'Viva practice',
  'footer.submission': 'Submission workspace',
  'footer.vivaGuide': 'Viva preparation guide',
  'footer.settings': 'Settings',
  'footer.assistant': 'AI assistant',
  'footer.allDocs': 'All documentation',
  'footer.contributing': 'Contributing',
  'footer.addingTemplate': 'Adding a template',
  'footer.security': 'Security policy',
  'footer.license': 'MIT License',
  'footer.notices': 'Third-party notices',
  'footer.conduct': 'Code of conduct',
  'footer.honest': 'Using templates honestly',
  'footer.note':
    'CampusKit and its templates are released under the MIT License. Templates are starting points: follow your institution’s rules and make sure you can explain everything you submit.',

  'offline.notice':
    'You’re offline. Your projects, progress and pages you’ve opened still work; anything not stored yet needs a connection.',
  'toast.region': 'Notifications',
  'toast.dismiss': 'Dismiss notification',

  'palette.title': 'Go to anything',
  'palette.search': 'Search pages, projects, documents and actions',
  'palette.results': 'Results',
  'palette.count.one': '1 result',
  'palette.count.other': '{count} results',
  'palette.empty':
    'Nothing matches “{query}”. Try fewer words, or a template’s language, such as Python.',
  'palette.move': 'to move',
  'palette.open': 'to open',
  'palette.close': 'to close',
  'group.Recent': 'Recent',
  'group.Actions': 'Actions',
  'group.Pages': 'Pages',
  'group.Your projects': 'Your projects',
  'group.Templates': 'Templates',
  'group.Documentation': 'Documentation',

  'shortcuts.title': 'Keyboard shortcuts',
  'shortcuts.everywhere': 'Everywhere',
  'shortcuts.palette': 'Go to anything: pages, templates, your projects, documents and actions',
  'shortcuts.show': 'Show these shortcuts',
  'shortcuts.close': 'Close a dialog, menu or the palette',
  'shortcuts.demo': 'Demo Studio',
  'shortcuts.demoScreens': 'Move between the demo’s screens when the screen tabs have focus',
  'shortcuts.presentation': 'Presentation mode',
  'shortcuts.next': 'Next slide',
  'shortcuts.previous': 'Previous slide',
  'shortcuts.notes': 'Show or hide the speaking notes',
  'shortcuts.leave': 'Leave presentation mode',
  'shortcuts.typing': 'Shortcuts don’t fire while you’re typing in a text box, except {keys}.',

  'dashboard.title': 'Dashboard',
  'dashboard.welcome': 'Welcome back, {name}',
  'dashboard.yours': 'Your dashboard',
  'dashboard.description':
    'Your projects, deadlines and practice at a glance. Everything here comes from what this browser has saved.',
  'dashboard.newProject': 'New project',
  'dashboard.newTo': 'New to CampusKit?',
  'dashboard.setupText':
    'Answer three quick questions to get template suggestions and a sample project. Every step can be skipped and changed later in Settings.',
  'dashboard.setup': 'Set up CampusKit',
  'dashboard.notNow': 'Not now',
  'dashboard.projects': 'Projects',
  'dashboard.archived': '{count} archived',
  'dashboard.inProgress': 'In progress',
  'dashboard.done': 'Done',
  'dashboard.deadlines': 'Deadlines in the next 14 days',
  'dashboard.overdue': '{count} overdue',
  'dashboard.upcoming': 'Upcoming deadlines',
  'dashboard.noDeadlines':
    'No open milestones with a deadline. Add milestones to a project to see them here.',
  'dashboard.activity': 'Recent activity',
  'dashboard.noActivity':
    'What you do in your projects (milestones, notes, status changes) appears here.',
  'dashboard.quick': 'Quick actions',
  'dashboard.quickNew': 'Start a new project',
  'dashboard.quickBrowse': 'Browse templates',
  'dashboard.quickGenerate': 'Generate a project',
  'dashboard.quickViva': 'Practise viva questions',
  'dashboard.quickReport': 'Write your report',
  'dashboard.quickBackup': 'Back up your progress',
  'dashboard.continue': 'Continue where you left off',
  'dashboard.vivaPrep': 'Viva preparation',
  'dashboard.late': ', overdue',
  'dashboard.noRecent': 'Pages you open appear here.',
  'dashboard.noViva':
    'Rate yourself on a template’s viva questions and your practice shows here, including questions due for spaced review.',
  'dashboard.practised.one': '1 question practised, {confident} confident',
  'dashboard.practised.other': '{count} questions practised, {confident} confident',
  'dashboard.dueForReview': ', {count} due for review',

  'language.heading': 'Language',
  'language.description':
    'The menus, the dashboard, the command palette and the shortcut list are translated. Template guides, viva questions, demos and documentation stay in English for now.',
  'language.label': 'Language for CampusKit’s menus',
  'language.review':
    'The Hindi translation was drafted with the help of AI and hasn’t yet been reviewed by a native speaker. Report wording that reads badly in an issue.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

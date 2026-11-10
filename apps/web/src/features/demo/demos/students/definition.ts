import type { DemoDefinition } from '../../types.ts';

export const studentsDemo: DemoDefinition = {
  projectId: 'student-management-system',
  appName: 'Student Management System',
  fidelity: 'simulation',
  summary:
    'Add, find, enroll and delete students, mark attendance and watch the database tables and the SQL change, in an educational simulation of the Flask app.',
  notice:
    'An educational simulation. The real project is a Flask app with a SQLite database, which run on your computer, not in a browser. Here the pages and the database are simulated in TypeScript, and each change shows the SQL statement the real app runs. The browser runs no Python and no SQL.',
  runs: {
    files: [
      'studentms/validation.py',
      'studentms/repository.py',
      'studentms/db.py',
      'studentms/schema.sql',
    ],
    description:
      'The simulation reproduces the form validation, the sample data, the student search, filters, sorting and pages, the statistics and the database rules (unique values, cascading deletes, the attendance upsert). Tests check its validation, sample data, queries and statistics against results recorded from the template’s own Python code and SQLite.',
  },
  data: {
    description:
      'The template’s fictional sample data, as its first start creates it: 12 students, 4 courses, their enrollments and ten school days of attendance before today.',
    editable: true,
    persistence: 'session',
    reset: '“Reset to the example” brings back the sample data.',
  },
  features: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      explanation:
        'The figures on the template’s home page. Each one is a SQL query over the tables (COUNT, SUM and GROUP BY), run again every time the page opens, so the dashboard always agrees with the data.',
      tryThis: [
        'Note the number of students and the attendance rate, delete a student on the Students screen, then come back.',
      ],
      simplified: ['The real dashboard is an HTML page made by Flask from a Jinja template.'],
      source: [
        { file: 'studentms/views/dashboard.py', symbol: 'index' },
        { file: 'studentms/repository.py', symbol: 'statistics' },
        { file: 'studentms/repository.py', symbol: 'ATTENDED' },
      ],
      learn: {
        walkthrough: ['dashboard-views', 'repository'],
        architecture: ['repository'],
        viva: ['attendance-rate'],
      },
    },
    {
      id: 'students',
      label: 'Students',
      explanation:
        'The student list with the template’s search, class and status filters, sorting and pages of 10, and the add, edit and delete forms. Every form is checked with the same rules as validation.py, and the roll number and email must be unique, as the database’s UNIQUE constraints demand.',
      tryThis: [
        'Search for “sharma” or “23cs”, filter one class, then sort by admission date, newest first.',
        'Add a student with roll number 24CS001 to see the duplicate refused, then use another number.',
        'Open a student to enroll them in a course, or delete one and read what the deletion removes.',
      ],
      simplified: [
        'The real app uses separate pages and a confirmation page instead of dialogs.',
        'In the real app, filters live in the address, so a filtered list can be bookmarked.',
      ],
      source: [
        { file: 'studentms/views/students.py', symbol: 'list_students' },
        { file: 'studentms/views/students.py', symbol: 'new_student' },
        { file: 'studentms/views/students.py', symbol: 'delete_student' },
        { file: 'studentms/validation.py', symbol: 'validate_student' },
        { file: 'studentms/repository.py', symbol: 'list_students' },
        { file: 'studentms/repository.py', symbol: 'create_student' },
      ],
      learn: {
        walkthrough: ['students-views', 'validation', 'repository'],
        architecture: ['views', 'validation', 'repository'],
        viva: ['search', 'duplicate', 'validation', 'pagination'],
      },
    },
    {
      id: 'courses',
      label: 'Courses',
      explanation:
        'Courses with the number of students in each, and a form to add one. A course code must be unique and credits must be a whole number from 1 to 10, as in validation.py and the schema’s CHECK constraint.',
      tryThis: [
        'Add the course PY150 with 3 credits, then try the same code again.',
        'Enroll a student in it from their page on the Students screen.',
      ],
      simplified: ['Editing and deleting courses are left out; the real app has both.'],
      source: [
        { file: 'studentms/views/courses.py', symbol: 'new_course' },
        { file: 'studentms/validation.py', symbol: 'validate_course' },
        { file: 'studentms/repository.py', symbol: 'list_courses' },
      ],
      learn: {
        walkthrough: ['validation', 'schema'],
        architecture: ['schema'],
        viva: ['primary-foreign'],
      },
    },
    {
      id: 'attendance',
      label: 'Attendance',
      explanation:
        'The attendance sheet for one course and day: every active student taking the course, marked present, late or absent. Saving runs an upsert, INSERT … ON CONFLICT DO UPDATE, so marking a day again changes the existing marks. Future dates are refused.',
      tryThis: [
        'Mark one student late for today and save, then change them to present and save again.',
        'Open an earlier day to see its saved marks.',
      ],
      simplified: ['The real sheet is an HTML form with radio buttons that posts to the server.'],
      source: [
        { file: 'studentms/views/attendance.py', symbol: 'mark' },
        { file: 'studentms/repository.py', symbol: 'attendance_sheet' },
        { file: 'studentms/repository.py', symbol: 'save_attendance' },
        { file: 'studentms/validation.py', symbol: 'validate_attendance_date' },
      ],
      learn: {
        walkthrough: ['attendance-views', 'repository'],
        architecture: ['views', 'repository'],
        viva: ['upsert', 'attendance-rate'],
      },
    },
    {
      id: 'database',
      label: 'Database',
      explanation:
        'The four tables as they are now, how they relate, and a log of the SQL statements your changes would run in the real app, with their parameters. This is what happens inside instance/students.db.',
      tryThis: [
        'Delete a student and read the log: one DELETE, and the cascade removes their enrollments and attendance.',
        'Add a student with a duplicate roll number and see the refused INSERT.',
      ],
      simplified: [
        'The statements are simplified from repository.py; the real ones are the same apart from spacing and named parameters.',
      ],
      source: [
        { file: 'studentms/schema.sql' },
        { file: 'studentms/db.py', symbol: 'connect' },
        { file: 'studentms/repository.py', symbol: 'delete_student' },
      ],
      learn: {
        walkthrough: ['schema', 'db'],
        architecture: ['schema', 'database'],
        viva: ['schema', 'cascade', 'sql-injection'],
      },
    },
  ],
  tour: [
    {
      id: 'figures',
      feature: 'dashboard',
      title: 'Figures from queries',
      text: 'Each figure is calculated by a SQL query when the page opens. Nothing on the dashboard is stored.',
      highlight: 'dashboard-figures',
    },
    {
      id: 'find',
      feature: 'students',
      title: 'Search, filters, sorting and pages',
      text: 'The search becomes a LIKE condition with parameters; sorting picks from a fixed list of columns; pages use LIMIT and OFFSET.',
      highlight: 'student-filters',
    },
    {
      id: 'add',
      feature: 'students',
      title: 'Validation before saving',
      text: 'Forms are checked first, and the database refuses a roll number or email that is already used.',
      highlight: 'add-student',
    },
    {
      id: 'upsert',
      feature: 'attendance',
      title: 'Marks for one day',
      text: 'Saving inserts each mark, or updates it when that student already has one for the day.',
      highlight: 'attendance-sheet',
    },
    {
      id: 'tables',
      feature: 'database',
      title: 'Tables and SQL',
      text: 'The tables and the statements your changes would run. Deleting a student shows the cascade at work.',
      highlight: 'sql-log',
    },
  ],
  presentation: [
    {
      id: 'introduce',
      feature: 'dashboard',
      title: 'Introduce the project',
      say: 'This app keeps student records in a SQLite database: students, courses, enrollments and attendance. It is a Flask web app that runs on one computer.',
      action: 'Point at the figures and say that each one is a query over the tables.',
      expect: '12 students, 4 courses and an attendance rate for the last 30 days.',
      concept: 'The problem, the scope and the technology',
      learn: { viva: ['what', 'why-flask-sqlite'] },
    },
    {
      id: 'add-student',
      feature: 'students',
      title: 'Add a student, with validation',
      say: 'Input is validated before anything is saved, and the database itself refuses duplicate roll numbers.',
      action:
        'Select “Add student”, enter roll number 24CS001 to see it refused, then change it to 25CS201 and save.',
      expect:
        'The first attempt says another student has this roll number; the second adds the student.',
      concept: 'Validation and the UNIQUE constraint',
      learn: { walkthrough: ['validation'], viva: ['duplicate', 'validation'] },
    },
    {
      id: 'enroll',
      feature: 'students',
      title: 'Enroll the student in a course',
      say: 'Enrollments link students and courses: a many-to-many relationship in its own table.',
      action: 'Open the new student, choose a course and select “Enroll”.',
      expect:
        'The course appears in the student’s list, and the log shows an INSERT into enrollments.',
      concept: 'The many-to-many relationship',
      learn: { walkthrough: ['schema'], viva: ['schema'] },
    },
    {
      id: 'mark-attendance',
      feature: 'attendance',
      title: 'Mark attendance for today',
      say: 'Marks are saved with an upsert, so marking the same day again changes them.',
      action:
        'Choose the course, mark one student late, save, then change them to present and save again.',
      expect: 'The log shows inserted marks the first time and updated marks the second time.',
      concept: 'INSERT … ON CONFLICT DO UPDATE',
      learn: { walkthrough: ['repository'], viva: ['upsert'] },
    },
    {
      id: 'delete-student',
      feature: 'students',
      title: 'Delete a student',
      say: 'Deleting a student deletes their enrollments and attendance too, because the foreign keys cascade.',
      action: 'Delete the student you added, reading the confirmation first.',
      expect: 'The student disappears, and the log shows the DELETE and what the cascade removed.',
      concept: 'Foreign keys and ON DELETE CASCADE',
      learn: { walkthrough: ['db'], viva: ['cascade'] },
    },
    {
      id: 'database',
      feature: 'database',
      title: 'Show the tables and the SQL',
      say: 'Every value goes into the SQL as a parameter, never pasted into the text, which is how the app prevents SQL injection.',
      action: 'Open Database and point at the parameters in the log.',
      expect: 'Each statement uses ? placeholders, with the values listed separately.',
      concept: 'Parameterized queries',
      learn: { walkthrough: ['repository'], viva: ['sql-injection'] },
    },
  ],
  fullProjectAdds: [
    'A real SQLite database file, instance/students.db, that keeps everything between runs.',
    'Separate pages for each student and course, editing and deleting courses, a statistics page and error pages.',
    'CSRF protection on every form, security headers and escaped output.',
    'Commands to back up, reset and refill the database.',
    'pytest tests for validation, the queries, every page and the security behaviour.',
  ],
  limitations: [
    'The data is fictional and kept only in this browser tab. Reset, or closing the tab, brings back the sample data.',
    'This is a simulation: it doesn’t run the template’s Python or SQLite. Its validation, sample data, queries and statistics are tested against the real code on recorded cases; other behaviour is re-created.',
    'Dates come from your computer’s clock, so the sample school days are the ten weekdays before today.',
  ],
};

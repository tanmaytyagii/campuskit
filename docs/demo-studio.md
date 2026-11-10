# Demo Studio

The Demo Studio lets students try a project in the browser before they download it, practise demonstrating it, and present it. Every demo is a demonstration with fictional sample data, never a live system, and it says so on the page.

- **Demo Studio:** `/projects/<slug>/demo`, with a tour and a guided demo.
- **Presentation mode:** `/projects/<slug>/present`, slides built from the project's own data with the live demo on the demo slides.
- **Readiness check:** `/projects/<slug>/ready`, which brings the evidence together.
- **Demos page:** `/demos` lists every demo.

The code is in `apps/web/src/features/demo/`, `apps/web/src/features/presentation/` and `apps/web/src/features/readiness/`.

## What runs in a demo

A demo must never pretend to be more than it is. Each one declares its **fidelity**:

| Fidelity         | Meaning                                                                                                                                                                                                                                                                                                                          | Used by                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `template-logic` | The screens are re-created with CampusKit's components, but calculations, validation, data updates and sample data come from the template's own TypeScript modules, imported unchanged.                                                                                                                                          | Attendance, Expense tracker        |
| `browser-port`   | The template isn't JavaScript, so its logic is re-implemented in TypeScript. The port is compared with output produced by the real code, and the page says that the browser doesn't run the original language.                                                                                                                   | Result analyzer (Python)           |
| `simulation`     | The template is a server app that a browser can't run. Its pages and database are simulated in TypeScript: the rules, sample data and queries are tested against results recorded from the real code, every change shows the SQL statement the real app would run, and the page says that the browser runs no Python and no SQL. | Student management (Flask, SQLite) |

Only dependency-free template modules can be imported. A template's React components import `react` from the template's own `node_modules`, which doesn't exist in a clean checkout, so screens are always re-created. When a rule the demo needs lives inside a component file (the expense form's checks are in `TransactionForm.tsx`), the demo mirrors it and a test compares the mirror with the template source, so it can't drift silently.

## How a demo is put together

```text
features/demo/
  types.ts          DemoDefinition, features, tour and guided steps, checks
  registry.ts       DEMOS (definitions) and DEMO_LOADERS (implementations, loaded on demand)
  define.ts         defineDemo(): wraps an implementation so the studio can host any demo
  useDemoStore.ts   demo data in sessionStorage under campuskit:demo-studio:v1:<project>
  DemoStudioPage    the page: notice, frame, feature panel, tour, guided demo
  demos/<name>/
    definition.ts   the metadata: screens, what to try, what's simplified, source and
                    learning links, tour, guided steps, what the full project adds
    template.ts     re-exports the template modules the demo runs
    <Name>Demo.tsx  the screens and defineDemo({ createState, readState, View, checks })
```

- **Definition:** plain data, loaded with the page so project pages and cards can describe the demo.
- **Implementation:** loaded only when the demo opens.
- **State:** the template's own data type, such as `AttendanceData`.
  - `readState` uses the template's own `validateData`, so a hand-edited value in sessionStorage is rejected rather than crashing the page.
  - **Reset to the example** calls `createState()` again.
  - **Start with no data** calls `createEmptyState()`, when the demo has one.

### Guided steps and checks

Each guided step says what to **say**, what to **do** and what should **happen**, written from what the demo actually does. A step whose action changes the data can have a check, `(state, start) => { done, detail }`, comparing the data now with the data when the guided demo started. When a student finishes with every checked action done, today's date is saved in `campuskit:rehearsal:v1:<project>` as evidence for the readiness check. Opening a page is never counted.

## Adding a demo

1. Add `demos/<name>/template.ts` re-exporting the template modules the demo needs, `definition.ts` and the implementation.
2. Register the definition in `DEMOS` and the loader in `DEMO_LOADERS` (`registry.ts`).
3. Run `pnpm test`. `registry.test.ts` checks the new demo against the real template:
   - every file and function it names exists (with `findSymbolLine`, as the learning guides use);
   - every walkthrough, architecture and viva link resolves in the learning guide;
   - the tour and guided steps open real screens;
   - each file listed under "runs" is really imported (or is in the parity fixture, for a port or a simulation);
   - stored state survives a JSON round trip;
   - checks belong to real steps.
4. Add component tests for the main flows, as in `DemoStudioPage.test.tsx`.

## The result analyzer port

`demos/results/analyzer.ts` mirrors `validate_results` and the functions in `analysis.py`, `grading.py` and `explain.py`. The Python code is the reference, so the port also copies how pandas and numpy behave in the details:

- **Summing:**
  - numpy's pairwise summation;
  - for class averages, pandas 3's `reduceat` path when the rows are already in class order and no percentage is missing, otherwise Kahan summation.
- **Medians and quartiles:** linear quantiles, and a median that is the mean of the middle values, so a zero median is never `-0`.
- **Text:**
  - ranks, and Python's string order;
  - Python's whitespace for `strip()` and `\s`, which differs from JavaScript's (U+001C–U+001F and U+0085 count as spaces; U+FEFF doesn't);
  - inside names, pandas' choice of regular expression engine: with PyArrow, which every student has, an all-ASCII column is matched by RE2, whose `\s` leaves out U+000B and U+001C–U+001F;
  - Python's round-half-even number formatting.
- **Reading numbers:** pandas reads a column of plain integers as integers, so `-0` there becomes `0`. A number too large for a float, such as `1e400`, becomes infinity.
- **Reading files:**
  - pandas' CSV reader numbers records, not lines;
  - a file whose first line is blank is "empty";
  - a line of only spaces is a column without a name.

`analyzer.fixture.json` is the real Python code's output for both sample files and 26 edge cases. Most were added when a difference was found; a few cover file shapes that random files rarely have. `analyzer.test.ts` compares every message, number (the sign of zero included) and sentence with it. It also fails if any of the Python files or sample files change, until the fixture is regenerated:

```bash
pip install -r templates/student-result-analyzer/requirements.txt   # once, in the Python you use
CAMPUSKIT_PYTHON=python3 pnpm demo:fixtures
pnpm test
```

The fixture describes what a student installs today, so `pnpm demo:fixtures` refuses a pandas older than 3, or a Python without PyArrow. pandas 2.2, which the requirements also allow, reads numbers like `1e400` as "not a number" instead of infinity, and averages classes with Kahan summation only. Without PyArrow, which Streamlit installs, pandas 3 matches names with Python's regular expressions only.

### Comparing with generated files

`pnpm demo:compare` checks the port against the Python code on generated CSV files: header aliases, absent markers, boundary and malformed numbers, unusual whitespace, quoting, blank and ragged lines, CR and CRLF line endings, duplicates, ties and different pass marks. Some files also have shapes random ones rarely have (`--shapes`, 70 by default): one student, identical scores, a subject nobody sat, everyone absent, hundreds of ties, every subject, and averages that round. The files come from a seeded generator, so a run can be repeated exactly. Python's output is the reference: every file where the port gives a different value is listed with its first difference, and an exception in the Python code is reported too.

```bash
CAMPUSKIT_PYTHON=python3 pnpm demo:compare --cases 1000 --shapes 300 --seed 1
```

Run it after changing the port or the analyzer. When it finds a difference, fix the port and add a small file showing it to `EXTRA_CASES` in `scripts/python/analyzer_parity.py`, so the parity test keeps it fixed.

## The student management simulation

The Flask template needs Python and a SQLite file, so `demos/students/` simulates it. The page calls it an educational simulation and says that the browser runs no Python and no SQL.

- **`model.ts`** holds the data as the four tables of `schema.sql` and reproduces:
  - `validation.py`: every message, Python's whitespace and `len()`, upper- and lower-casing, digits 0 to 9 only, and real calendar dates, years 1 to 99 included;
  - `seed_db()`: the same 12 students, 4 courses, enrollments and ten school days of attendance before today;
  - `list_students()`: `LIKE` with `%` and `_` escaped (and ASCII-only case folding, as SQLite does), the class and status filters, the fixed list of sort columns with `COLLATE NOCASE`, and pages of 10;
  - `statistics()` and `percent()`, including Python's rounding of ties to the even digit (13 of 16 is 81.2%, not 81.3%);
  - the database rules: `UNIQUE COLLATE NOCASE`, `AUTOINCREMENT` never reusing an id, `ON DELETE CASCADE` and the attendance upsert.
- **The SQL log:** every change records the statement the real app runs, simplified from `repository.py`, with its parameters written as a Python tuple, and the result, a refused `UNIQUE` constraint included. Attendance is saved with `executemany()`, so the log shows the first row of parameters and how many rows ran.
- **Not modelled:** the `created_at` and `updated_at` timestamps, sessions, CSRF tokens and the request and redirect cycle. The screens are re-created; the flash messages are the template's own.

`scripts/python/sms_parity.py` runs the template's own code (validation, `seed_db()`, 18 student queries, the statistics and `percent()`) on an in-memory SQLite database and prints the results. `model.test.ts` compares the simulation with them case by case, and fails if `validation.py`, `repository.py`, `db.py` or `schema.sql` change until the fixture is regenerated:

```bash
pip install -r templates/student-management-system/requirements.txt   # once, in the Python you use
CAMPUSKIT_PYTHON=python3 pnpm demo:fixtures:students
pnpm test
```

When a test finds a difference, fix `model.ts` and add the case to the parity script, so it stays fixed.

## Presentation mode

`features/presentation/slides.ts` builds the slides in a fixed order: introduction, problem, objectives, features, architecture, workflow, technology, demo, limitations and conclusion.

- **Content:** comes only from the manifest, the learning guide and the demo definition.
- **Source label:** each slide shows where its content came from.
- **Speaking notes:** CampusKit's suggestions, labelled as such and shown separately; N hides them on a projector.
- **Demo slides:** embed the live demo and share its data with the Demo Studio.
- **Keyboard:** arrows and Page keys navigate, and Escape exits. Keys typed in a form, a dialog or the demo are left alone.

There is no PowerPoint or PDF export.

## Readiness check

`features/readiness/readiness.ts` works out each item from evidence. The statuses and the score are explained for students in [Present your project](guides/present-your-project.md).

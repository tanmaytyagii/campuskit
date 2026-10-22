# Template engine

`packages/template-engine` turns a template and a student's choices into a ZIP file. It runs in the browser on the CampusKit website, and in Node.js for tests and the verification scripts. It never executes template code or shell commands.

Generation happens in two steps, so the website can show a review screen before anything is downloaded:

1. `generateProject()` validates the bundle and the student's values, applies the declared edits, adds `GETTING_STARTED.md` and returns the final list of files.
2. `packageProject()` writes those files into a ZIP archive with a single root folder.

## Options: what a student may change

A template's manifest declares its options under `customization.options`. There are four types:

| Type      | Form control                                 | Validation                                                                                                                                                                            |
| --------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`    | Text field                                   | Required or optional, `minLength`, `maxLength`. Values are trimmed and normalised to Unicode NFC. Line breaks, control characters and bidirectional override characters are rejected. |
| `number`  | Number field                                 | `min`, `max`, `step`, and `integer: true` for whole numbers                                                                                                                           |
| `select`  | Radio buttons, with optional colour swatches | The value must be one of the declared `choices`                                                                                                                                       |
| `boolean` | Checkbox                                     | `true` or `false`                                                                                                                                                                     |

Every option has an `id` (camelCase), a `label`, an optional `description` and a `group`: `identity` options appear on the generator's “Name your project” step, and `appearance`, `data` and `behaviour` options on the “Choose options” step.

Every template must declare a required text option called `projectName`. The engine derives `projectSlug` from it: lowercase ASCII letters, digits and single hyphens, at most 48 characters, used for the ZIP's root folder and package names. `&` becomes `and`, accents are removed (`Ünïcode` becomes `unicode`), and a name written entirely in another script, such as Hindi, falls back to the template id. The original name is still used wherever it is displayed.

## Edits: exactly where each value is written

Options do nothing on their own. Each one is connected to files by `customization.edits`, and **nothing outside the declared edits is ever changed**. If a template has no edit for something, the generator offers no control for it.

### `json-set`

Replaces one existing value inside a JSON file, addressed with a [JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901):

```json
{
  "kind": "json-set",
  "label": "App name",
  "file": "src/app.config.json",
  "pointer": "/appName",
  "value": { "option": "projectName" }
}
```

- The value at the pointer must already exist and have the same type as the option's value (a number option can't overwrite a string).
- JSON escaping is correct by construction, because the file is parsed and serialised again.
- The file must already be formatted the way the engine writes it (two-space indentation and a final newline), so a generated copy differs from the template only in the edited values. The validator checks this.
- `"pointer": "/packages//name"` reaches `packages[""].name` in a `package-lock.json`.

### `replace`

Replaces an exact piece of text, escaped for the file type:

```json
{
  "kind": "replace",
  "label": "Browser tab title",
  "file": "index.html",
  "find": "Student Attendance System",
  "escape": "html",
  "expectedCount": 1,
  "value": { "option": "projectName" }
}
```

- `find` must occur exactly `expectedCount` times in the template file. If the template changes and the text moves, generation fails loudly instead of silently producing a half-customized project.
- All matches in a file are located in the original text before anything is written, so a value inserted by one edit is never matched by another, and overlapping edits are rejected.
- A file uses either `json-set` or `replace` edits, never both.

### Escaping

| `escape`      | Use it for                                               | `R&D <Lab> "v2"` becomes             |
| ------------- | -------------------------------------------------------- | ------------------------------------ |
| `html`        | HTML text and quoted attributes                          | `R&amp;D &lt;Lab&gt; &quot;v2&quot;` |
| `markdown`    | Markdown text                                            | `R\&D \<Lab\> "v2"`                  |
| `toml-string` | Inside a TOML `"…"` string                               | `R&D <Lab> \"v2\"`                   |
| `json-string` | Inside a JSON string in a non-JSON file                  | `R&D <Lab> \"v2\"`                   |
| `none`        | Values from `select`, `number` or `boolean` options only | unchanged                            |

Free-text options must use one of the escaping contexts; the schema rejects `none` for them.

### Value references

`value` points at an option (or `projectSlug`) and can transform it:

- `map` converts each choice of a `select` option to the text to write, for example `{ "inr": "INR", "usd": "USD" }`. It must have exactly one entry per choice.
- `whenEmpty` gives the text to write when an optional text option is left empty, for example `"_Add your name_"`.

`map` and `whenEmpty` texts come from the manifest, not from the student, so they are written exactly as declared and may contain Markdown.

## Paths and excluded files

Every path in a template must be a plain relative path: ASCII letters, digits, `.`, `_` and `-` in each segment, forward slashes, no `..`, no absolute paths or drive letters, no names that Windows reserves (such as `con` or `aux`), at most 12 levels deep and 200 characters long. Paths that differ only by letter case are rejected because they collide on Windows and macOS.

These are never copied into a generated project, even if a template folder contains them:

- **Folders:** `node_modules`, `dist`, `build`, `coverage`, `.git`, `.venv`, `venv`, `__pycache__`, `.pytest_cache` and other tool caches, `.idea`, `.vscode`, test reports.
- **Files:** `.env` and `.env.*` (except `.env.example`, `.env.sample` and `.env.template`), `secrets.toml`, `.npmrc`, `.pypirc`, `.netrc`, private keys and certificates (`.pem`, `.key`, `.p12`, …), SSH keys, local databases (`.sqlite`, `.db`), Python bytecode, logs and operating-system files such as `.DS_Store`.

Hidden files that are part of a working project, such as `.gitignore` and `.streamlit/config.toml`, are kept. The full list, with the reason for each rule, is in `packages/template-engine/src/paths.ts`.

## The ZIP file

- One root folder named after `projectSlug`, so “Extract here” always produces a single, clean folder.
- Files are sorted and every entry gets the same timestamp, so generating twice with the same values and date produces identical archives.
- `GETTING_STARTED.md` is added with the exact setup steps, prerequisites and the student's choices. It is rendered from the same data as the instructions on the website, so the two always match. A template may not contain its own `GETTING_STARTED.md`.
- Limits: 5 MB per template file, 25 MB per template bundle, 30 MB per generated project.

When an archive is read back (in tests and `scripts/verify-generated-projects.ts`), every entry name is checked again and extraction refuses to write outside the target folder, which protects against “zip slip” archives.

## Using the engine from code

```ts
import { generateProjectZip } from '@campuskit/template-engine';
import { buildTemplateBundle } from '@campuskit/template-engine/node';
import { buildSetupGuide, getProjectById } from '@campuskit/project-catalog';

const manifest = getProjectById('attendance-system');
if (!manifest) throw new Error('Unknown template');
const { bundle } = await buildTemplateBundle('templates/attendance-system', {
  templateId: manifest.id,
  templateVersion: manifest.version,
});
const { project, zip } = await generateProjectZip({
  bundle,
  customization: manifest.customization,
  input: { projectName: 'Riverside Attendance' },
  createGuide: (values) => buildSetupGuide(manifest, values, '2026-10-21'),
});
// project.rootFolder === 'riverside-attendance'; zip is a Uint8Array
```

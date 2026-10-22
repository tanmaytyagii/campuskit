# Security policy

## Reporting a vulnerability

Please report security problems privately. Do **not** open a public issue.

If the repository is hosted on GitHub, use **Security → Report a vulnerability** to send a private report (maintainers must turn on private vulnerability reporting in the repository settings for this button to appear). Otherwise, contact the maintainers privately through the contact details on the repository's profile page.

Include:

- what the problem is and where it is (a file, a page or a template);
- the steps to reproduce it, ideally with a template name, a project name or a ZIP file that triggers it;
- what an attacker could do with it.

Maintainers aim to reply within seven days and to fix confirmed problems in the next release of the website. You will be credited in the fix unless you ask not to be.

## Supported versions

Security fixes are made on the `main` branch and published with the next release of the website. Generated projects are not updated automatically: if a template had a security problem, the fix will say which templates and versions are affected, so students can regenerate or patch their copies.

## What CampusKit protects against

CampusKit is a static website. It has no server, accounts or database, and it never sends a student's details anywhere: projects are generated in the browser. The main risks, and how they are handled:

| Risk                                                                                     | Protection                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text typed into the generator ending up as code (HTML, Markdown, JSON or TOML injection) | Values are written only to locations the template's manifest declares, and every value is escaped for the file type it is written into. JSON files are edited by parsing and serialising them. Line breaks, control characters and bidirectional override characters are rejected.                 |
| A ZIP file writing outside its folder (“zip slip”)                                       | Every path is checked: no `..`, no absolute paths or drive letters, no backslashes, no reserved Windows names, ASCII names only, and one root folder. Reading an archive checks every entry again.                                                                                                 |
| Secrets or junk shipped to students                                                      | `.env` files, keys and certificates, `.npmrc`, `.pypirc`, Streamlit secrets, local databases, `node_modules`, build output, caches and virtual environments are excluded from template bundles and generated projects, even if a template folder contains them. Symbolic links are never followed. |
| Running untrusted code                                                                   | The generator never executes template code or shell commands. It only copies and edits text.                                                                                                                                                                                                       |
| Malicious content in Markdown documents                                                  | Markdown is rendered without raw HTML, and unsafe link protocols are removed.                                                                                                                                                                                                                      |
| Script injection in the website                                                          | React escapes rendered text. The production build sets a Content Security Policy that only allows the site's own scripts and its one inline script, by hash.                                                                                                                                       |
| Links to other sites                                                                     | External links open with `rel="noopener noreferrer"`.                                                                                                                                                                                                                                              |

The generated projects are learning projects. The React templates store data in the browser's `localStorage` with no login, and the Python template runs locally with no authentication. They are not designed to hold real student records on shared or public computers, and their READMEs say so.

## Out of scope

- Problems that need an already-compromised computer or browser extension.
- Vulnerabilities in third-party packages that CampusKit does not use in a vulnerable way. Please report those to the package's maintainers, and tell us if you think CampusKit is affected.
- Missing security headers that static hosts such as GitHub Pages do not allow us to set.

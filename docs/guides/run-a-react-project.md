# Run a React project

This guide is for the CampusKit React templates (Student Attendance System and Personal Expense Tracker). It takes about ten minutes the first time, most of it waiting for downloads.

Every generated project also contains a `GETTING_STARTED.md` file with the exact commands for that project. If anything here differs from that file, follow `GETTING_STARTED.md`.

## 1. Install Node.js

Download the LTS version from [nodejs.org](https://nodejs.org/) and install it with the default options. npm, the package manager, is included.

Then open a **new** terminal and check the versions:

```bash
node --version
npm --version
```

`node --version` must print `v22.12.0` or newer. Node.js 24 LTS is recommended.

## 2. Open a terminal in the project folder

1. Extract the ZIP. On Windows, right-click it and choose **Extract All…**. On macOS, double-click it.
2. Open the extracted folder: the one that contains `package.json`.
3. Open a terminal there:
   - **Windows 11:** right-click inside the folder and choose **Open in Terminal**.
   - **macOS:** open Terminal, type `cd ` (with a space), drag the folder onto the window and press Return.
   - **Linux:** right-click inside the folder and choose **Open in Terminal**, or use `cd`.

Check that you are in the right place: `dir package.json` (Windows) or `ls package.json` (macOS and Linux) should find the file.

## 3. Install the dependencies

```bash
npm install
```

This needs an internet connection. It downloads the libraries listed in `package.json` into a `node_modules` folder (130 to 180 MB, depending on the template) and can take a few minutes. You only do it once, or again after you change dependencies.

The exact versions are pinned in `package-lock.json`, so everyone gets the same set of packages.

## 4. Start the app

```bash
npm run dev
```

Vite prints an address such as `http://localhost:5173/`. Open it in your browser. The page reloads by itself when you save a file. Press `Ctrl+C` in the terminal to stop the server.

If port 5173 is busy, Vite picks the next free port and prints that address instead.

## 5. Run the tests and build

```bash
npm test
npm run build
npm run preview
```

- `npm test` runs the automated tests with Vitest and Testing Library.
- `npm run build` checks the TypeScript types and creates an optimised copy of the app in `dist/`.
- `npm run preview` serves that `dist/` folder so you can check the production version.

## Where your data is stored

Both React templates save their data in your browser's `localStorage`, on your computer only. Nothing is sent to a server. Data saved in one browser does not appear in another browser or on another computer, and clearing your browser's site data deletes it. Each app's Settings screen lets you export a backup and reset the data.

## Common problems

| What you see                                                                        | What to do                                                                                                                                                                |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'node' is not recognized` or `command not found: npm`                              | Node.js is not installed, or the terminal was opened before installing it. Install Node.js, then close and reopen the terminal.                                           |
| `npm.ps1 cannot be loaded because running scripts is disabled` (Windows PowerShell) | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use **Command Prompt** instead of PowerShell.                                                          |
| `ENOENT: no such file or directory, open '…package.json'`                           | The terminal is in the wrong folder. Go to the folder that contains `package.json`. If you extracted the ZIP inside another folder of the same name, go one level deeper. |
| `npm ERR! code ETIMEDOUT` or `ECONNRESET`                                           | npm could not reach the package registry. Check your internet connection. On a college network, ask whether a proxy is required.                                          |
| Errors mentioning `Unexpected token` or an unsupported engine                       | Your Node.js is too old. Install the current LTS version.                                                                                                                 |
| The browser shows a blank page                                                      | Look at the terminal and the browser's developer console (F12) for the first error message, then search for that message.                                                 |

If you are stuck, delete the `node_modules` folder and run `npm install` again. It recreates everything from `package-lock.json`.

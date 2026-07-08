# Code Debt Visualizer

> Find the files in your codebase that nobody wants to touch. Right inside VS Code.

[![License: MIT](https://img.shields.io/github/license/anupjos/code-debt-visualizer)](./LICENSE)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/anupjos.code-debt-visualizer.svg?label=marketplace)](https://marketplace.visualstudio.com/items?itemName=anupjos.code-debt-visualizer)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/anupjos.code-debt-visualizer.svg)](https://marketplace.visualstudio.com/items?itemName=anupjos.code-debt-visualizer)

Every codebase has files nobody wants to touch. Long ones. Stale ones. The ones with no tests. Files a dozen people have edited over the years, each leaving something a little worse than they found it.

**Code Debt Visualizer** surfaces those files before you go looking. Every file in your workspace gets a debt score computed from real Git history and file stats, then rendered as a green / amber / red heatmap you cannot miss.

No setup. No data leaves your machine. No context switching.

![demo placeholder](./media/demo.gif)

---

## Features

### Sidebar heatmap
A dedicated activity-bar panel lists every source file, worst first, colour-coded, with score and key stats at a glance.

### File explorer badges
A small coloured dot next to every file in the native VS Code file tree, so debt is visible while you navigate.

### Inline warning
Open a high-debt file and a diagnostic at the top of the editor tells you exactly why it scored high.

### Status bar
The project-wide average debt score is always visible. Click it to open the sidebar.

---

## How the score works

Each file gets a score between 0 and 1, computed from four inputs:

| Input                            | Weight | Normalised against |
| -------------------------------- | ------ | ------------------ |
| Lines of code                    | 30%    | 1000 lines         |
| Days since last Git commit       | 35%    | 600 days           |
| No matching test file (0 or 1)   | 25%    | binary             |
| Number of distinct contributors  | 10%    | 6 contributors     |

Files land in one of three bands:

| Band       | Score       | Meaning                                            |
| ---------- | ----------- | -------------------------------------------------- |
| **Green**  | below 0.33  | Low debt. Fine as-is.                              |
| **Amber**  | 0.33 to 0.66| Medium debt. Worth watching.                       |
| **Red**    | 0.66 and up | High debt. Refactor candidate; opening it warns you. |

A "matching test file" is a sibling named `foo.test.ext`, `foo.spec.ext`, `test_foo.ext`, `foo_test.ext`, or `foo_spec.ext`.

---

## Install

### From the VS Code marketplace

1. Open the Extensions view (`Cmd+Shift+X` on macOS, `Ctrl+Shift+X` elsewhere).
2. Search for **Code Debt Visualizer**.
3. Click Install.

### From a `.vsix` file

```bash
npm install
npm run compile
npm run package
code --install-extension code-debt-visualizer-*.vsix
```

### From source, for development

```bash
git clone https://github.com/anupjos/code-debt-visualizer.git
cd code-debt-visualizer
npm install
```

Open the folder in VS Code and press `F5`. A new Extension Development Host window will launch with the extension loaded.

---

## Usage

1. Open any folder that contains a Git repository.
2. Click the **Code Debt** icon in the activity bar.
3. The sidebar lists your files, worst first. Click one to open it.
4. Save any file to trigger a re-scan. Scores refresh automatically.

---

## Requirements

- VS Code `1.85` or newer.
- `git` on your `PATH`. Repos with no Git history still work: the age and contributor components fall back to zero and one.

## Works with

Any language. Any framework. Any Git repository. Tested on macOS, Linux, and Windows.

## Configuration

None. There are no settings to tune.

## Contributing

Issues and pull requests welcome at [github.com/anupjos/code-debt-visualizer](https://github.com/anupjos/code-debt-visualizer).

## License

[MIT](./LICENSE)

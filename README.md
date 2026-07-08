# Code Debt Visualizer

Every codebase has files nobody wants to touch. Long ones. Stale ones. The ones with no tests. The ones a dozen people have edited over the years, each one leaving something a little worse than they found it.

**Code Debt Visualizer** surfaces those files inside VS Code, before you go looking. Every file in your workspace gets a debt score computed from real Git history and file stats, then rendered as a green / amber / red heatmap you cannot miss.

No setup. No data leaves your machine. No context switching.

![demo placeholder](./media/demo.gif)

## What you get

- **Sidebar heatmap** — a dedicated activity-bar panel that lists every source file sorted by debt, colour-coded, with score and key stats at a glance.
- **File explorer badges** — a small coloured dot next to every file in the native VS Code file tree, so debt is visible while you navigate.
- **Inline warning** — open a high-debt file and a diagnostic at the top of the editor tells you exactly why it scored high.
- **Status bar** — the project-wide average debt score, always visible. Click it to jump to the sidebar.

## How the score is calculated

A debt score is a number between 0 and 1, computed per file from four inputs:

| Input                                | Weight | Normalised against |
| ------------------------------------ | ------ | ------------------ |
| Lines of code                        | 30%    | 1000 lines         |
| Days since last Git commit           | 35%    | 600 days           |
| No matching test file (0 or 1)       | 25%    | —                  |
| Number of distinct contributors      | 10%    | 6 contributors     |

Files are placed into three bands:

- **Green (low)** — score below 0.33
- **Amber (medium)** — score 0.33 to 0.66
- **Red (high)** — score 0.66 and above

A "matching test file" means a file in the same directory named `foo.test.ext`, `foo.spec.ext`, `test_foo.ext`, `foo_test.ext`, or `foo_spec.ext`.

## Install

### From the marketplace

Search for "Code Debt Visualizer" in the Extensions view and click Install.

### From a `.vsix` file

```bash
npm install
npm run compile
npm run package     # produces code-debt-visualizer-x.y.z.vsix
code --install-extension code-debt-visualizer-*.vsix
```

### From source, for development

```bash
git clone <this-repo>
cd code-debt-visualizer
npm install
```

Open the folder in VS Code and press `F5`. A new Extension Development Host window will launch with the extension loaded.

## Usage

1. Open any folder that contains a Git repository.
2. Click the Code Debt icon in the activity bar.
3. The sidebar lists your files, worst first. Click one to open it.
4. Save any file to trigger a re-scan; scores refresh automatically.

The status bar shows the project average. Click it to open the panel.

## Requirements

- VS Code `1.85` or newer.
- `git` on your `PATH`. Repos with no Git history still work — the age and contributor components fall back to zero and one respectively.

## Works with

Any language, any framework, any Git repository. Tested on macOS, Linux, and Windows.

## Configuration

None. The extension has no settings — it should work out of the box on any repo.

## Contributing

Issues and pull requests welcome.

## License

MIT

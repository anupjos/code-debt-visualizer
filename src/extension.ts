import * as vscode from 'vscode';
import { analyseWorkspace, AnalysisResult } from './analyser';
import { DebtTreeProvider } from './debtProvider';
import { DebtDecorationProvider } from './decorationProvider';
import { DebtDiagnosticProvider } from './diagnosticProvider';
import { DebtStatusBar } from './statusBar';

const REFRESH_DEBOUNCE_MS = 400;

export async function activate(context: vscode.ExtensionContext) {
  const treeProvider = new DebtTreeProvider();
  const decorationProvider = new DebtDecorationProvider();
  const diagnosticProvider = new DebtDiagnosticProvider();
  const statusBar = new DebtStatusBar();

  const treeView = vscode.window.createTreeView('codeDebtVisualizerView', {
    treeDataProvider: treeProvider,
    showCollapseAll: false
  });

  context.subscriptions.push(
    treeView,
    vscode.window.registerFileDecorationProvider(decorationProvider),
    diagnosticProvider,
    statusBar
  );

  let latestResult: AnalysisResult | null = null;
  let refreshTimer: NodeJS.Timeout | undefined;
  let refreshInFlight: Promise<void> | null = null;

  const applyResult = (result: AnalysisResult) => {
    latestResult = result;
    treeProvider.setResult(result);
    decorationProvider.setResult(result);
    diagnosticProvider.setResult(result);
    statusBar.setResult(result);
  };

  const runAnalysis = async () => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      applyResult({ files: [], averageScore: 0, byPath: new Map(), hasGitHistory: false });
      return;
    }
    try {
      const result = await analyseWorkspace(folder.uri.fsPath);
      applyResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showWarningMessage(`Code Debt Visualizer: analysis failed - ${msg}`);
    }
  };

  const scheduleRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      if (refreshInFlight) return;
      refreshInFlight = runAnalysis().finally(() => { refreshInFlight = null; });
    }, REFRESH_DEBOUNCE_MS);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('codeDebtVisualizer.refresh', () => {
      scheduleRefresh();
    }),
    vscode.commands.registerCommand('codeDebtVisualizer.openView', async () => {
      await vscode.commands.executeCommand('workbench.view.extension.codeDebtVisualizer');
    }),
    vscode.commands.registerCommand('codeDebtVisualizer.showAll', () => {
      treeProvider.setShowAll(true);
    }),
    vscode.commands.registerCommand('codeDebtVisualizer.showTop', () => {
      treeProvider.setShowAll(false);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => scheduleRefresh()),
    vscode.workspace.onDidChangeWorkspaceFolders(() => scheduleRefresh()),
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor && latestResult) diagnosticProvider.refreshForDocument(editor.document);
    }),
    vscode.workspace.onDidOpenTextDocument(doc => {
      if (latestResult) diagnosticProvider.refreshForDocument(doc);
    })
  );

  await runAnalysis();
}

export function deactivate() {
  // Subscriptions are disposed automatically by VS Code.
}

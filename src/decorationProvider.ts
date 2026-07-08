import * as vscode from 'vscode';
import { AnalysisResult, FileDebt } from './analyser';

const BADGE: Record<FileDebt['level'], string> = {
  low: '●',
  medium: '●',
  high: '●'
};

const COLOR: Record<FileDebt['level'], string> = {
  low: 'codeDebtVisualizer.low',
  medium: 'codeDebtVisualizer.medium',
  high: 'codeDebtVisualizer.high'
};

const TOOLTIP_PREFIX: Record<FileDebt['level'], string> = {
  low: 'Low debt',
  medium: 'Medium debt',
  high: 'High debt'
};

export class DebtDecorationProvider implements vscode.FileDecorationProvider {
  private readonly _onDidChange = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  readonly onDidChangeFileDecorations = this._onDidChange.event;

  private byPath: Map<string, FileDebt> = new Map();

  setResult(result: AnalysisResult) {
    const prev = this.byPath;
    this.byPath = result.byPath;
    const changed: vscode.Uri[] = [];
    for (const path of prev.keys()) changed.push(vscode.Uri.file(path));
    for (const path of this.byPath.keys()) changed.push(vscode.Uri.file(path));
    this._onDidChange.fire(changed);
  }

  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    if (uri.scheme !== 'file') return undefined;
    const file = this.byPath.get(uri.fsPath);
    if (!file) return undefined;

    const scorePct = Math.round(file.score * 100);
    return {
      badge: BADGE[file.level],
      color: new vscode.ThemeColor(COLOR[file.level]),
      tooltip: `${TOOLTIP_PREFIX[file.level]} — score ${scorePct}%`,
      propagate: false
    };
  }
}

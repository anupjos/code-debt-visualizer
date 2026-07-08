import * as vscode from 'vscode';
import { AnalysisResult, FileDebt } from './analyser';

export class DebtDiagnosticProvider {
  private readonly collection: vscode.DiagnosticCollection;
  private byPath: Map<string, FileDebt> = new Map();

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection('codeDebtVisualizer');
  }

  setResult(result: AnalysisResult) {
    this.byPath = result.byPath;
    this.collection.clear();
    for (const editor of vscode.window.visibleTextEditors) {
      this.refreshForDocument(editor.document);
    }
  }

  refreshForDocument(doc: vscode.TextDocument) {
    if (doc.uri.scheme !== 'file') return;
    const file = this.byPath.get(doc.uri.fsPath);
    if (!file || file.level !== 'high') {
      this.collection.set(doc.uri, []);
      return;
    }

    const scorePct = Math.round(file.score * 100);
    const summary = file.reasons.length > 0 ? file.reasons.join('; ') : 'multiple debt indicators';
    const message = `High technical debt (${scorePct}%): ${summary}.`;

    const range = new vscode.Range(0, 0, 0, Math.max(0, doc.lineAt(0).text.length));
    const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
    diagnostic.source = 'Code Debt Visualizer';
    diagnostic.code = 'high-debt';
    this.collection.set(doc.uri, [diagnostic]);
  }

  dispose() {
    this.collection.dispose();
  }
}

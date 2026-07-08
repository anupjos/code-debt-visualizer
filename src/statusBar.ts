import * as vscode from 'vscode';
import { AnalysisResult, THRESHOLD_AMBER, THRESHOLD_RED } from './analyser';

export class DebtStatusBar {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'codeDebtVisualizer.openView';
    this.item.text = '$(pulse) Debt: …';
    this.item.tooltip = 'Code Debt Visualizer - click to open the heatmap panel';
    this.item.show();
  }

  setResult(result: AnalysisResult) {
    if (result.files.length === 0) {
      this.item.text = '$(pulse) Debt: n/a';
      this.item.tooltip = 'Code Debt Visualizer - no source files analysed';
      return;
    }

    const avgPct = Math.round(result.averageScore * 100);
    const icon = result.averageScore >= THRESHOLD_RED
      ? '$(error)'
      : result.averageScore >= THRESHOLD_AMBER
        ? '$(warning)'
        : '$(pass)';

    this.item.text = `${icon} Debt: ${avgPct}%`;

    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**Code Debt Visualizer**\n\n`);
    tooltip.appendMarkdown(`- Files analysed: ${result.files.length}\n`);
    tooltip.appendMarkdown(`- Average debt score: **${avgPct}%**\n`);
    if (!result.hasGitHistory) {
      tooltip.appendMarkdown(`- _No Git history available - scores are estimates._\n`);
    }
    tooltip.appendMarkdown(`\nClick to open the heatmap panel.`);
    this.item.tooltip = tooltip;
  }

  dispose() {
    this.item.dispose();
  }
}

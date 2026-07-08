import * as vscode from 'vscode';
import * as path from 'path';
import { AnalysisResult, FileDebt } from './analyser';

const DEFAULT_TOP_N = 50;

const LEVEL_ICON_COLOR: Record<FileDebt['level'], string> = {
  low: 'codeDebtVisualizer.low',
  medium: 'codeDebtVisualizer.medium',
  high: 'codeDebtVisualizer.high'
};

export class DebtTreeProvider implements vscode.TreeDataProvider<DebtNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<DebtNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private result: AnalysisResult | null = null;
  private showAll = false;

  setResult(result: AnalysisResult) {
    this.result = result;
    this._onDidChangeTreeData.fire(undefined);
  }

  setShowAll(showAll: boolean) {
    this.showAll = showAll;
    this._onDidChangeTreeData.fire(undefined);
  }

  isShowingAll(): boolean {
    return this.showAll;
  }

  getTreeItem(element: DebtNode): vscode.TreeItem {
    return element.toTreeItem();
  }

  getChildren(element?: DebtNode): DebtNode[] {
    if (element) return [];
    if (!this.result) return [];

    const files = this.result.files;
    if (files.length === 0) return [new InfoNode('No source files found in this workspace.')];

    if (this.showAll || files.length <= DEFAULT_TOP_N) {
      return files.map(f => new FileNode(f));
    }

    const visible: DebtNode[] = files.slice(0, DEFAULT_TOP_N).map(f => new FileNode(f));
    visible.push(new ShowAllNode(files.length - DEFAULT_TOP_N));
    return visible;
  }
}

abstract class DebtNode {
  abstract toTreeItem(): vscode.TreeItem;
}

class FileNode extends DebtNode {
  constructor(private readonly file: FileDebt) {
    super();
  }

  toTreeItem(): vscode.TreeItem {
    const f = this.file;
    const item = new vscode.TreeItem(path.basename(f.relPath), vscode.TreeItemCollapsibleState.None);
    const scorePct = Math.round(f.score * 100);
    item.description = `${scorePct}%  ·  ${f.loc} loc  ·  ${f.daysSinceCommit}d  ·  ${f.contributors} contrib${f.hasTest ? '' : '  ·  no test'}`;
    item.tooltip = new vscode.MarkdownString(
      `**${f.relPath}**\n\n` +
      `- Debt score: **${scorePct}%** (${f.level})\n` +
      `- Lines of code: ${f.loc}\n` +
      `- Days since last commit: ${f.daysSinceCommit}\n` +
      `- Contributors: ${f.contributors}\n` +
      `- Test file: ${f.hasTest ? 'yes' : 'no'}\n`
    );
    item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor(LEVEL_ICON_COLOR[f.level]));
    item.resourceUri = vscode.Uri.file(f.absPath);
    item.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [item.resourceUri]
    };
    item.contextValue = `debtFile.${f.level}`;
    return item;
  }
}

class ShowAllNode extends DebtNode {
  constructor(private readonly hiddenCount: number) {
    super();
  }
  toTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(`Show all files (${this.hiddenCount} more)…`, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon('list-flat');
    item.command = {
      command: 'codeDebtVisualizer.showAll',
      title: 'Show All Files'
    };
    return item;
  }
}

class InfoNode extends DebtNode {
  constructor(private readonly text: string) {
    super();
  }
  toTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(this.text, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon('info');
    return item;
  }
}

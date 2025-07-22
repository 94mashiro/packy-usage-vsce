import * as vscode from "vscode"

export class UsageItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue?: string,
    iconPath?: string
  ) {
    super(label, collapsibleState)
    this.tooltip = this.getTooltip()
    this.contextValue = contextValue || "usageItem"

    if (iconPath) {
      this.iconPath = new vscode.ThemeIcon(
        iconPath.replace("$(", "").replace(")", "")
      )
    }

    // Add command for clickable items
    if (contextValue === "setToken") {
      this.command = {
        arguments: [],
        command: "packy-usage.setToken",
        title: "Set API Token"
      }
    } else if (contextValue === "noData") {
      this.command = {
        arguments: [],
        command: "packy-usage.refresh",
        title: "Refresh Budget Data"
      }
    }
  }

  private getTooltip(): string {
    switch (this.contextValue) {
      case "dailyBudget":
        return vscode.l10n.t("Today's budget usage")
      case "dailyPercentage":
        return vscode.l10n.t("Today's budget usage percentage")
      case "dailyTotal":
        return vscode.l10n.t("Today's total budget amount")
      case "dailyUsed":
        return vscode.l10n.t("Today's used budget amount")
      case "monthlyBudget":
        return vscode.l10n.t("This month's budget usage")
      case "monthlyPercentage":
        return vscode.l10n.t("This month's budget usage percentage")
      case "monthlyTotal":
        return vscode.l10n.t("This month's total budget amount")
      case "monthlyUsed":
        return vscode.l10n.t("This month's used budget amount")
      case "noData":
        return vscode.l10n.t("Click refresh to get the latest budget data")
      case "noToken":
        return vscode.l10n.t(
          "API Token needs to be configured to get budget data"
        )
      case "setToken":
        return vscode.l10n.t("Click to configure API Token")
      default:
        return this.label
    }
  }
}

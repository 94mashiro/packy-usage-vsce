import * as vscode from "vscode"

import { BudgetData } from "../models/budget.model"

export class StatusBarService {
  private hasDataLoaded: boolean = false
  private statusBarItem: vscode.StatusBarItem

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    )
    // 立即显示初始状态
    this.showInitialStatus()
  }

  dispose(): void {
    this.statusBarItem.dispose()
  }

  getStatusBarItem(): vscode.StatusBarItem {
    return this.statusBarItem
  }

  showErrorStatus(message?: string): void {
    this.statusBarItem.text = vscode.l10n.t("$(warning) Fetch failed")
    this.statusBarItem.tooltip =
      message || vscode.l10n.t("Budget data fetch failed, click to retry")
    this.statusBarItem.command = "packy-usage.refresh"
    this.statusBarItem.show()
  }

  showLoadingStatus(): void {
    this.statusBarItem.text = vscode.l10n.t("$(loading~spin) Fetching data...")
    this.statusBarItem.tooltip = vscode.l10n.t(
      "Fetching budget data, please wait"
    )
    this.statusBarItem.command = "packy-usage.refresh"
    this.statusBarItem.show()
  }

  showNoTokenStatus(): void {
    this.statusBarItem.text = vscode.l10n.t("$(key) Token configuration needed")
    this.statusBarItem.tooltip = vscode.l10n.t("Click to configure API Token")
    this.statusBarItem.command = "packy-usage.setToken"
    this.statusBarItem.show()
  }

  updateStatus(data: BudgetData | null, isDataLoaded: boolean): void {
    this.hasDataLoaded = isDataLoaded

    if (!isDataLoaded || !data) {
      this.statusBarItem.text = vscode.l10n.t("$(warning) No budget data")
      this.statusBarItem.tooltip = vscode.l10n.t("Click to get budget data")
      this.statusBarItem.command = "packy-usage.refresh"
    } else {
      const dailyPercentage = data.daily.percentage
      const dailyUsed = data.daily.used
      const dailyTotal = data.daily.total

      this.statusBarItem.text = vscode.l10n.t(
        "Daily Budget: {0}%",
        dailyPercentage.toFixed(1)
      )
      this.statusBarItem.tooltip = vscode.l10n.t(
        "Daily budget usage rate: {0}%\nUsed: ${1} / ${2}",
        dailyPercentage.toFixed(1),
        dailyUsed.toFixed(2),
        dailyTotal.toFixed(2)
      )
      this.statusBarItem.command = "packy-usage.showExplorer"
    }

    this.statusBarItem.show()
  }

  private showInitialStatus(): void {
    this.statusBarItem.text = vscode.l10n.t("$(loading~spin) Initializing...")
    this.statusBarItem.tooltip = vscode.l10n.t("Initializing budget data")
    this.statusBarItem.command = "packy-usage.refresh"
    this.statusBarItem.show()
  }
}

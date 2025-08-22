import * as vscode from "vscode"

import { DataService } from "../services/data.service"
import { SecretService, TokenType } from "../services/secret.service"
import { UsageItem } from "./usage-item"

export class UsageExplorerProvider
  implements vscode.TreeDataProvider<UsageItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    null | undefined | UsageItem | void
  > = new vscode.EventEmitter<null | undefined | UsageItem | void>()
  readonly onDidChangeTreeData: vscode.Event<
    null | undefined | UsageItem | void
  > = this._onDidChangeTreeData.event

  constructor(
    private dataService: DataService,
    private secretService: SecretService
  ) {
    // Listen to data updates
    this.dataService.onDidUpdateData(() => {
      this.refresh()
    })

    // Listen to secret changes (including token deletion due to expiration)
    this.secretService.onDidChange(() => {
      this.refresh()
    })
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose()
  }

  async getChildren(element?: UsageItem): Promise<UsageItem[]> {
    if (!element) {
      const token = await this.secretService.getToken()

      if (!token) {
        return [
          new UsageItem(
            vscode.l10n.t("⚠️ Token not configured"),
            vscode.TreeItemCollapsibleState.None,
            "noToken",
            "$(warning)"
          ),
          new UsageItem(
            vscode.l10n.t("Click to set API Token"),
            vscode.TreeItemCollapsibleState.None,
            "setToken",
            "$(gear)"
          )
        ]
      }

      if (!this.dataService.isDataLoaded) {
        return [
          new UsageItem(
            vscode.l10n.t("📊 Click refresh to get budget data"),
            vscode.TreeItemCollapsibleState.None,
            "noData",
            "$(info)"
          ),
          new UsageItem(
            vscode.l10n.t("🔧 Configuration"),
            vscode.TreeItemCollapsibleState.Collapsed,
            "settings",
            "$(gear)"
          )
        ]
      }

      return [
        new UsageItem(
          vscode.l10n.t(
            "Opus Model: {0}",
            this.dataService.currentData.opus.enabled
              ? vscode.l10n.t("Enabled")
              : vscode.l10n.t("Disabled")
          ),
          vscode.TreeItemCollapsibleState.None,
          "opusStatus",
          this.dataService.currentData.opus.enabled ? "$(check)" : "$(x)"
        ),
        new UsageItem(
          vscode.l10n.t("Daily Budget"),
          vscode.TreeItemCollapsibleState.Expanded,
          "dailyBudget",
          "$(calendar)"
        ),
        new UsageItem(
          vscode.l10n.t("Monthly Budget"),
          vscode.TreeItemCollapsibleState.Expanded,
          "monthlyBudget",
          "$(calendar)"
        ),
        new UsageItem(
          vscode.l10n.t("🔧 Configuration"),
          vscode.TreeItemCollapsibleState.Collapsed,
          "settings",
          "$(gear)"
        )
      ]
    } else if (element.contextValue === "dailyBudget") {
      return this.getDailyBudgetChildren()
    } else if (element.contextValue === "monthlyBudget") {
      return this.getMonthlyBudgetChildren()
    } else if (element.contextValue === "settings") {
      return await this.getSettingsChildren()
    }
    return []
  }

  getTreeItem(element: UsageItem): vscode.TreeItem {
    return element
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  private getDailyBudgetChildren(): Thenable<UsageItem[]> {
    const data = this.dataService.currentData
    const dailyUsed = Number(data.daily.used) || 0
    const dailyTotal = Number(data.daily.total) || 0
    const dailyPercentage = Number(data.daily.percentage) || 0

    return Promise.resolve([
      new UsageItem(
        vscode.l10n.t("Used: ${0}", dailyUsed.toFixed(2)),
        vscode.TreeItemCollapsibleState.None,
        "dailyUsed",
        "$(circle-filled)"
      ),
      new UsageItem(
        vscode.l10n.t("Total Budget: ${0}", dailyTotal.toFixed(2)),
        vscode.TreeItemCollapsibleState.None,
        "dailyTotal",
        "$(circle-outline)"
      ),
      new UsageItem(
        vscode.l10n.t("Usage Rate: {0}%", dailyPercentage.toFixed(1)),
        vscode.TreeItemCollapsibleState.None,
        "dailyPercentage",
        this.dataService.getPercentageIcon(dailyPercentage)
      )
    ])
  }

  private getMonthlyBudgetChildren(): Thenable<UsageItem[]> {
    const data = this.dataService.currentData
    const monthlyUsed = Number(data.monthly.used) || 0
    const monthlyTotal = Number(data.monthly.total) || 0
    const monthlyPercentage = Number(data.monthly.percentage) || 0

    return Promise.resolve([
      new UsageItem(
        vscode.l10n.t("Used: ${0}", monthlyUsed.toFixed(2)),
        vscode.TreeItemCollapsibleState.None,
        "monthlyUsed",
        "$(circle-filled)"
      ),
      new UsageItem(
        vscode.l10n.t("Total Budget: ${0}", monthlyTotal.toFixed(2)),
        vscode.TreeItemCollapsibleState.None,
        "monthlyTotal",
        "$(circle-outline)"
      ),
      new UsageItem(
        vscode.l10n.t("Usage Rate: {0}%", monthlyPercentage.toFixed(1)),
        vscode.TreeItemCollapsibleState.None,
        "monthlyPercentage",
        this.dataService.getPercentageIcon(monthlyPercentage)
      )
    ])
  }

  private async getSettingsChildren(): Promise<UsageItem[]> {
    const config = vscode.workspace.getConfiguration("packy-usage")
    const token = await this.secretService.getToken()
    const tokenType = await this.secretService.getTokenType()
    const endpoint = config.get<string>("apiEndpoint")

    // 构建token状态显示
    let tokenLabel = vscode.l10n.t("Token: ")
    if (!token) {
      tokenLabel += vscode.l10n.t("Not Configured")
    } else if (tokenType === TokenType.API_KEY) {
      tokenLabel += vscode.l10n.t("Configured (API Token)")
    } else if (tokenType === TokenType.JWT) {
      tokenLabel += vscode.l10n.t("Configured (JWT Token)")
    } else {
      tokenLabel += vscode.l10n.t("Configured")
    }

    return [
      new UsageItem(
        tokenLabel,
        vscode.TreeItemCollapsibleState.None,
        "tokenStatus",
        token ? "$(check)" : "$(x)"
      ),
      new UsageItem(
        vscode.l10n.t("Set Token"),
        vscode.TreeItemCollapsibleState.None,
        "setToken",
        "$(edit)"
      ),
      new UsageItem(
        `API: ${endpoint}`,
        vscode.TreeItemCollapsibleState.None,
        "apiEndpoint",
        "$(link)"
      )
    ]
  }
}

import * as vscode from "vscode"

import { ErrorHandler } from "../utils/error-handler"
import { ApiService } from "./api.service"
import { DataService } from "./data.service"
import { StatusBarService } from "./status-bar.service"

export class PollingService {
  private pollingTimer: NodeJS.Timeout | null = null

  constructor(
    private apiService: ApiService,
    private dataService: DataService,
    private statusBarService: StatusBarService,
    private pollingInterval: number = 30000 // 默认30秒，可通过构造函数配置
  ) {}

  dispose(): void {
    this.stop()
  }

  start(): void {
    this.stop()
    this.pollingTimer = setInterval(async () => {
      try {
        const data = await this.apiService.fetchBudgetData()
        if (data) {
          this.dataService.updateData(data)
        }
      } catch (error) {
        ErrorHandler.handle(error as Error)
        // 轮询失败时更新状态栏
        this.statusBarService.showErrorStatus(vscode.l10n.t("Data sync failed"))
      }
    }, this.pollingInterval)
  }

  stop(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }
  }
}

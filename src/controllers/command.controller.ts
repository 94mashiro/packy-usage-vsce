import * as vscode from "vscode"

import { UsageExplorerProvider } from "../providers/usage-explorer.provider"
import { ApiService } from "../services/api.service"
import { ConfigService } from "../services/config.service"
import { DataService } from "../services/data.service"
import { SecretService } from "../services/secret.service"
import { StatusBarService } from "../services/status-bar.service"
import { ErrorHandler } from "../utils/error-handler"

/**
 * 命令控制器
 * 负责处理所有VS Code命令的业务逻辑
 */
export class CommandController {
  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private dataService: DataService,
    private secretService: SecretService,
    private statusBarService: StatusBarService,
    private usageExplorerProvider: UsageExplorerProvider
  ) {}

  /**
   * 自动获取数据（用于启动时）
   */
  async autoFetchOnStartup(): Promise<void> {
    const token = await this.secretService.getToken()

    if (!token) {
      // 显示需要配置Token的状态
      this.statusBarService.showNoTokenStatus()
      setTimeout(() => {
        this.showTokenSetupPrompt()
      }, 1000)
    } else {
      // 显示加载状态并立即开始数据获取
      this.statusBarService.showLoadingStatus()
      await this.fetchAndUpdateData()
    }
  }

  /**
   * 注册所有命令
   */
  registerCommands(): vscode.Disposable[] {
    return [
      vscode.commands.registerCommand("packy-usage.setToken", () =>
        this.handleSetToken()
      ),
      vscode.commands.registerCommand("packy-usage.refresh", () =>
        this.handleRefresh()
      ),
      vscode.commands.registerCommand("packy-usage.showExplorer", () =>
        this.handleShowExplorer()
      )
    ]
  }

  /**
   * 获取并更新数据
   */
  private async fetchAndUpdateData(): Promise<void> {
    try {
      this.statusBarService.showLoadingStatus()
      const data = await this.apiService.fetchBudgetData()

      if (data) {
        this.dataService.updateData(data)
      } else {
        this.statusBarService.showNoTokenStatus()
        vscode.window.showWarningMessage("Please configure API Token first")
      }
    } catch (error) {
      ErrorHandler.handle(error as Error)
      this.statusBarService.showErrorStatus("数据获取失败")
    }
  }

  /**
   * 处理刷新命令
   */
  private async handleRefresh(): Promise<void> {
    await this.fetchAndUpdateData()
  }

  /**
   * 处理设置Token命令
   */
  private async handleSetToken(): Promise<void> {
    const token = await vscode.window.showInputBox({
      password: true,
      placeHolder: "API Token for budget data access",
      prompt: "Enter your API Token",
      validateInput: (value) => this.validateTokenInput(value)
    })

    if (!token) {
      return
    }

    try {
      await this.secretService.setToken(token)

      // 显示Token过期时间信息
      const expiration = this.secretService.getTokenExpiration(token)
      const expirationText = expiration
        ? `，将于 ${expiration.toLocaleString()} 过期`
        : ""

      vscode.window.showInformationMessage(
        `API Token保存成功${expirationText}！`
      )

      // 刷新视图和数据
      this.usageExplorerProvider.refresh()
      await this.fetchAndUpdateData()
    } catch (error) {
      vscode.window.showErrorMessage(
        `保存Token失败: ${(error as Error).message}`
      )
    }
  }

  /**
   * 处理显示资源管理器命令
   */
  private handleShowExplorer(): void {
    vscode.commands.executeCommand("packy-usage.explorer.focus")
  }

  /**
   * 显示Token设置提示
   */
  private async showTokenSetupPrompt(): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
      "需要配置 API Token 来获取预算数据",
      "立即配置",
      "稍后配置"
    )

    switch (choice) {
      case "稍后配置":
        vscode.window.showInformationMessage(
          '您可以随时通过命令面板搜索 "Set API Token" 来配置。'
        )
        break
      case "立即配置":
        vscode.commands.executeCommand("packy-usage.setToken")
        break
    }
  }

  /**
   * 验证Token输入
   */
  private validateTokenInput(value: string): null | string {
    if (!value || value.trim().length === 0) {
      return "Token cannot be empty"
    }

    if (value.length < 10) {
      return "Token seems too short"
    }

    // 检查JWT格式
    const parts = value.split(".")
    if (parts.length !== 3) {
      return "Token格式无效，请确保是有效的JWT Token"
    }

    // 检查是否已过期
    try {
      const [, payload] = parts
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
      const decoded = Buffer.from(padded, "base64").toString("utf8")
      const parsedPayload = JSON.parse(decoded)

      if (parsedPayload.exp) {
        const currentTime = Math.floor(Date.now() / 1000)
        if (currentTime >= parsedPayload.exp) {
          const expiredDate = new Date(parsedPayload.exp * 1000)
          return `Token已过期（过期时间: ${expiredDate.toLocaleString()}）`
        }
      }
    } catch {
      return "Token格式无效，无法解析"
    }

    return null
  }
}

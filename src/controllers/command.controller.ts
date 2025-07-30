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
      ),
      vscode.commands.registerCommand("packy-usage.toggleSidebar", () =>
        this.handleToggleSidebar()
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
    // 显示获取Token的帮助信息
    const helpChoice = await vscode.window.showInformationMessage(
      "请选择Token获取方式",
      "先查看获取说明",
      "输入Token"
    )

    if (!helpChoice) {
      return
    }

    if (helpChoice === "先查看获取说明") {
      const tokenType = await vscode.window.showQuickPick(
        [
          {
            description: "永久有效的访问令牌",
            detail: "到PackyCode Dashboard直接获取以'sk-'开头的API Token",
            label: "API Token (推荐)"
          },
          {
            description: "从PackyCode Dashboard获取的临时令牌",
            detail:
              "访问PackyCode Dashboard，打开浏览器开发者工具(F12)，在Application/Storage > Cookies中找到名为'token'的Cookie值",
            label: "JWT Token"
          }
        ],
        {
          placeHolder: "选择Token类型查看详细说明",
          title: "Token获取说明"
        }
      )

      if (!tokenType) {
        return
      }
    }

    const token = await vscode.window.showInputBox({
      password: true,
      placeHolder: "输入API Token (sk-开头) 或 JWT Token",
      prompt:
        "推荐使用永久有效的API Token (sk-开头)。JWT Token可从PackyCode Dashboard的Cookie中获取",
      validateInput: (value) => this.validateTokenInput(value)
    })

    if (!token) {
      return
    }

    try {
      await this.secretService.setToken(token)

      // 显示Token类型和过期时间信息
      if (token.startsWith("sk-")) {
        vscode.window.showInformationMessage(
          "API Token保存成功！该Token永久有效。"
        )
      } else {
        const expiration = this.secretService.getTokenExpiration(token)
        const expirationText = expiration
          ? `，将于 ${expiration.toLocaleString()} 过期`
          : ""

        vscode.window.showInformationMessage(
          `JWT Token保存成功${expirationText}！`
        )
      }

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
   * 处理切换侧边栏显示状态命令
   */
  private async handleToggleSidebar(): Promise<void> {
    try {
      const newVisible = await this.configService.toggleSidebarVisible()
      const message = newVisible ? "侧边栏已显示" : "侧边栏已隐藏"
      vscode.window.showInformationMessage(message)
    } catch (error) {
      vscode.window.showErrorMessage(
        `切换侧边栏状态失败: ${(error as Error).message}`
      )
    }
  }

  /**
   * 显示Token设置提示
   */
  private async showTokenSetupPrompt(): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
      "需要配置访问令牌来获取预算数据",
      "立即配置",
      "查看帮助",
      "稍后配置"
    )

    switch (choice) {
      case "查看帮助": {
        const helpText = `### Token获取方式

**API Token (推荐)**
- 永久有效的访问令牌
- 到PackyCode Dashboard直接获取以'sk-'开头的API Token

**JWT Token**
- 从PackyCode Dashboard获取的临时令牌
- 获取步骤：
  1. 访问PackyCode Dashboard
  2. 打开浏览器开发者工具（按F12或右键选择"检查"）
  3. 切换到"Application"或"Storage"选项卡
  4. 在左侧找到"Cookies"并展开
  5. 选择当前网站域名
  6. 在右侧列表中找到名为"token"的Cookie
  7. 复制其值作为您的JWT Token`

        vscode.window.showInformationMessage(helpText, { modal: true })
        // 显示帮助后再提示配置
        setTimeout(() => {
          vscode.commands.executeCommand("packy-usage.setToken")
        }, 500)
        break
      }
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
      return "Token不能为空"
    }

    // 优先检查是否为SK Token
    if (value.startsWith("sk-")) {
      // SK Token验证通过
      return null
    }

    // 其次检查JWT格式
    if (value.split(".").length === 3) {
      // JWT验证
      try {
        const [, payload] = value.split(".")
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
        const decoded = Buffer.from(padded, "base64").toString("utf8")
        const parsedPayload = JSON.parse(decoded)

        if (parsedPayload.exp) {
          const currentTime = Math.floor(Date.now() / 1000)
          if (currentTime >= parsedPayload.exp) {
            const expiredDate = new Date(parsedPayload.exp * 1000)
            return `JWT Token已过期（过期时间: ${expiredDate.toLocaleString()}）`
          }
        }
      } catch {
        return "JWT Token格式无效"
      }
      return null
    }

    return "无法识别的Token格式，请提供API Token (sk-开头) 或 JWT Token"
  }
}

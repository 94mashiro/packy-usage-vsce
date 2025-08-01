import * as vscode from "vscode"

import { UsageExplorerProvider } from "../providers/usage-explorer.provider"
import { ApiService } from "../services/api.service"
import { ConfigService } from "../services/config.service"
import { DataService } from "../services/data.service"
import { PollingService } from "../services/polling.service"
import { SecretService } from "../services/secret.service"
import { StatusBarService } from "../services/status-bar.service"
import { CommandController } from "./command.controller"

/**
 * 扩展生命周期管理器
 * 负责协调所有服务的初始化、启动和销毁
 */
export class ExtensionManager {
  private apiService!: ApiService
  private commandController!: CommandController
  private configService!: ConfigService
  private dataService!: DataService
  private disposables: vscode.Disposable[] = []
  private pollingService!: PollingService
  private secretService!: SecretService
  private statusBarService!: StatusBarService
  private usageExplorerProvider!: UsageExplorerProvider

  /**
   * 激活扩展
   */
  async activate(context: vscode.ExtensionContext): Promise<void> {
    try {
      // 初始化服务
      this.initializeServices(context)

      // 迁移token类型（兼容旧版本）
      await this.migrateTokenIfNeeded()

      // 注册提供者
      this.registerProviders(context)

      // 设置事件监听
      this.setupEventListeners()

      // 注册命令
      this.registerCommands(context)

      // 启动服务
      await this.startServices()

      console.log("🚀 Packy Usage Extension 激活成功")
    } catch (error) {
      console.error("❌ Packy Usage Extension 激活失败:", error)
      vscode.window.showErrorMessage(
        `插件激活失败: ${(error as Error).message}`
      )
    }
  }

  /**
   * 停用扩展
   */
  deactivate(): void {
    this.dispose()
    console.log("🔄 Packy Usage Extension 已停用")
  }

  /**
   * 获取配置摘要（用于调试）
   */
  getStatus(): string {
    if (!this.configService) {
      return "扩展未初始化"
    }

    const config = this.configService.getConfig()
    const dataLoaded = this.dataService?.isDataLoaded ?? false
    const pollingActive = this.pollingService ? "运行中" : "已停止"

    return `Packy Usage 状态:
- 数据已加载: ${dataLoaded ? "是" : "否"}
- 轮询状态: ${pollingActive}
- 配置状态: ${config.apiToken ? "Token已配置" : "Token未配置"}
- API端点: ${config.apiEndpoint}
- 轮询间隔: ${config.pollingInterval}ms`
  }

  /**
   * 资源清理
   */
  private dispose(): void {
    // 清理所有一次性资源
    this.disposables.forEach((disposable) => {
      try {
        disposable.dispose()
      } catch (error) {
        console.error("清理资源时出错:", error)
      }
    })

    // 清理服务
    try {
      this.usageExplorerProvider?.dispose()
      this.dataService?.dispose()
      this.statusBarService?.dispose()
      this.pollingService?.dispose()
    } catch (error) {
      console.error("清理服务时出错:", error)
    }

    this.disposables = []
  }

  /**
   * 初始化所有服务
   */
  private initializeServices(context: vscode.ExtensionContext): void {
    // 按依赖顺序初始化服务
    this.configService = new ConfigService()
    this.dataService = new DataService()
    this.statusBarService = new StatusBarService()
    this.secretService = new SecretService(context)
    this.apiService = new ApiService(this.secretService, this.configService)

    // 初始化轮询服务（使用配置的轮询间隔）
    const config = this.configService.getConfig()
    this.pollingService = new PollingService(
      this.apiService,
      this.dataService,
      this.statusBarService,
      config.pollingInterval
    )
  }

  /**
   * 迁移token类型（兼容旧版本）
   */
  private async migrateTokenIfNeeded(): Promise<void> {
    try {
      const token = await this.secretService.getToken()
      const tokenType = await this.secretService.getTokenType()

      // 如果有token但没有type，说明是旧版本用户
      if (token && !tokenType) {
        console.log("🔄 检测到旧版本Token，正在迁移...")
        // 重新保存token，让SecretService自动检测类型
        await this.secretService.setToken(token)
        console.log("✅ Token迁移完成")
      }
    } catch (error) {
      console.error("⚠️ Token迁移失败:", error)
      // 迁移失败不影响扩展启动
    }
  }

  /**
   * 注册命令
   */
  private registerCommands(_context: vscode.ExtensionContext): void {
    const commands = this.commandController.registerCommands()
    this.disposables.push(...commands)
  }

  /**
   * 注册提供者
   */
  private registerProviders(_context: vscode.ExtensionContext): void {
    // 初始化使用量资源管理器提供者
    this.usageExplorerProvider = new UsageExplorerProvider(
      this.dataService,
      this.secretService
    )

    // 现在可以初始化命令控制器
    this.commandController = new CommandController(
      this.apiService,
      this.configService,
      this.dataService,
      this.secretService,
      this.statusBarService,
      this.usageExplorerProvider
    )

    // 注册树数据提供者
    const treeProvider = vscode.window.registerTreeDataProvider(
      "packy-usage.explorer",
      this.usageExplorerProvider
    )

    this.disposables.push(treeProvider)
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 监听数据更新事件，同步状态栏
    const dataUpdateListener = this.dataService.onDidUpdateData((data) => {
      this.statusBarService.updateStatus(data, this.dataService.isDataLoaded)
    })

    // 监听配置变更事件
    const configChangeListener = this.configService.onConfigurationChanged(
      (config) => {
        console.log("📝 配置已更新:", config)
        // 如果轮询设置改变，重启轮询服务
        if (config.enablePolling) {
          this.pollingService.start()
        } else {
          this.pollingService.stop()
        }
      }
    )

    this.disposables.push(dataUpdateListener, configChangeListener)
  }

  /**
   * 启动服务
   */
  private async startServices(): Promise<void> {
    // 启动时自动获取数据
    await this.commandController.autoFetchOnStartup()

    // 根据配置决定是否启动轮询
    const config = this.configService.getConfig()
    if (config.enablePolling) {
      this.pollingService.start()
    }
  }
}

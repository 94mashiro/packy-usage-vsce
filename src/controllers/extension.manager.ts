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

      // 注册提供者
      this.registerProviders(context)

      // 设置事件监听
      this.setupEventListeners()

      // 注册命令
      this.registerCommands(context)

      // 启动服务
      await this.startServices()

      console.log(
        vscode.l10n.t("🚀 Packy Usage Extension activated successfully")
      )
    } catch (error) {
      console.error(
        vscode.l10n.t("❌ Packy Usage Extension activation failed:"),
        error
      )
      vscode.window.showErrorMessage(
        vscode.l10n.t(
          "Extension activation failed: {0}",
          (error as Error).message
        )
      )
    }
  }

  /**
   * 停用扩展
   */
  deactivate(): void {
    this.dispose()
    console.log(vscode.l10n.t("🔄 Packy Usage Extension deactivated"))
  }

  /**
   * 获取配置摘要（用于调试）
   */
  getStatus(): string {
    if (!this.configService) {
      return vscode.l10n.t("Extension not initialized")
    }

    const config = this.configService.getConfig()
    const dataLoaded = this.dataService?.isDataLoaded ?? false
    const pollingActive = this.pollingService
      ? vscode.l10n.t("Running")
      : vscode.l10n.t("Stopped")

    return `Packy Usage ${vscode.l10n.t("Status")}:
- ${vscode.l10n.t("Data Loaded")}: ${dataLoaded ? vscode.l10n.t("Yes") : vscode.l10n.t("No")}
- ${vscode.l10n.t("Polling Status")}: ${pollingActive}
- ${vscode.l10n.t("Configuration Status")}: ${config.apiToken ? vscode.l10n.t("Token Configured") : vscode.l10n.t("Token Not Configured")}
- API${vscode.l10n.t("Endpoint")}: ${config.apiEndpoint}
- ${vscode.l10n.t("Polling Interval")}: ${config.pollingInterval}ms`
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
        console.error(vscode.l10n.t("Error during cleanup:"), error)
      }
    })

    // 清理服务
    try {
      this.usageExplorerProvider?.dispose()
      this.dataService?.dispose()
      this.statusBarService?.dispose()
      this.pollingService?.dispose()
    } catch (error) {
      console.error(vscode.l10n.t("Error cleaning up service:"), error)
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
    this.apiService = new ApiService(this.secretService)

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
        console.log(vscode.l10n.t("📝 Configuration updated:"), config)
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

import * as vscode from "vscode"

/**
 * 插件配置接口
 */
export interface PluginConfig {
  /** API 端点地址 */
  apiEndpoint: string
  /** API 访问令牌 */
  apiToken: string
  /** 是否启用自动轮询 */
  enablePolling: boolean
  /** 轮询间隔（毫秒） */
  pollingInterval: number
  /** 状态栏刷新间隔（毫秒） */
  statusBarRefreshInterval: number
  /** 是否显示侧边栏 */
  showSidebar: boolean
}

/**
 * 配置管理服务
 * 统一管理插件的所有配置项，提供类型安全的配置访问
 */
export class ConfigService {
  private static readonly CONFIG_SECTION = "packy-usage"

  /**
   * 默认配置值
   */
  private static readonly DEFAULT_CONFIG: Omit<PluginConfig, "apiToken"> = {
    apiEndpoint: "https://www.packycode.com/api/backend/users/info",
    enablePolling: true,
    pollingInterval: 30000, // 30秒
    statusBarRefreshInterval: 1000, // 1秒
    showSidebar: true
  }

  /**
   * 获取 API 端点
   */
  getApiEndpoint(): string {
    return vscode.workspace
      .getConfiguration(ConfigService.CONFIG_SECTION)
      .get<string>("apiEndpoint", ConfigService.DEFAULT_CONFIG.apiEndpoint)
  }

  /**
   * 获取 API 令牌
   */
  getApiToken(): string {
    return vscode.workspace
      .getConfiguration(ConfigService.CONFIG_SECTION)
      .get<string>("apiToken", "")
  }

  /**
   * 获取完整配置
   */
  getConfig(): PluginConfig {
    const config = vscode.workspace.getConfiguration(
      ConfigService.CONFIG_SECTION
    )

    return {
      apiEndpoint: config.get<string>(
        "apiEndpoint",
        ConfigService.DEFAULT_CONFIG.apiEndpoint
      ),
      apiToken: config.get<string>("apiToken", ""),
      enablePolling: config.get<boolean>(
        "enablePolling",
        ConfigService.DEFAULT_CONFIG.enablePolling
      ),
      pollingInterval: config.get<number>(
        "pollingInterval",
        ConfigService.DEFAULT_CONFIG.pollingInterval
      ),
      statusBarRefreshInterval: config.get<number>(
        "statusBarRefreshInterval",
        ConfigService.DEFAULT_CONFIG.statusBarRefreshInterval
      ),
      showSidebar: config.get<boolean>(
        "showSidebar",
        ConfigService.DEFAULT_CONFIG.showSidebar
      )
    }
  }

  /**
   * 获取配置摘要（用于调试）
   */
  getConfigSummary(): string {
    const config = this.getConfig()
    return `配置摘要:
- API端点: ${config.apiEndpoint}
- 轮询间隔: ${config.pollingInterval}ms
- 启用轮询: ${config.enablePolling}
- 状态栏刷新: ${config.statusBarRefreshInterval}ms
- 侧边栏显示: ${config.showSidebar}
- Token配置: ${config.apiToken ? "已配置" : "未配置"}`
  }

  /**
   * 获取轮询间隔
   */
  getPollingInterval(): number {
    return vscode.workspace
      .getConfiguration(ConfigService.CONFIG_SECTION)
      .get<number>(
        "pollingInterval",
        ConfigService.DEFAULT_CONFIG.pollingInterval
      )
  }

  /**
   * 获取状态栏刷新间隔
   */
  getStatusBarRefreshInterval(): number {
    return vscode.workspace
      .getConfiguration(ConfigService.CONFIG_SECTION)
      .get<number>(
        "statusBarRefreshInterval",
        ConfigService.DEFAULT_CONFIG.statusBarRefreshInterval
      )
  }

  /**
   * 获取是否启用轮询
   */
  isPollingEnabled(): boolean {
    return vscode.workspace
      .getConfiguration(ConfigService.CONFIG_SECTION)
      .get<boolean>("enablePolling", ConfigService.DEFAULT_CONFIG.enablePolling)
  }

  /**
   * 获取是否显示侧边栏
   */
  isSidebarVisible(): boolean {
    return vscode.workspace
      .getConfiguration(ConfigService.CONFIG_SECTION)
      .get<boolean>("showSidebar", ConfigService.DEFAULT_CONFIG.showSidebar)
  }

  /**
   * 监听配置变更
   */
  onConfigurationChanged(
    callback: (config: PluginConfig) => void
  ): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(ConfigService.CONFIG_SECTION)) {
        callback(this.getConfig())
      }
    })
  }

  /**
   * 重置配置为默认值
   */
  async resetToDefaults(): Promise<void> {
    const config = vscode.workspace.getConfiguration(
      ConfigService.CONFIG_SECTION
    )

    await Promise.all([
      config.update(
        "apiEndpoint",
        ConfigService.DEFAULT_CONFIG.apiEndpoint,
        vscode.ConfigurationTarget.Global
      ),
      config.update(
        "pollingInterval",
        ConfigService.DEFAULT_CONFIG.pollingInterval,
        vscode.ConfigurationTarget.Global
      ),
      config.update(
        "enablePolling",
        ConfigService.DEFAULT_CONFIG.enablePolling,
        vscode.ConfigurationTarget.Global
      ),
      config.update(
        "statusBarRefreshInterval",
        ConfigService.DEFAULT_CONFIG.statusBarRefreshInterval,
        vscode.ConfigurationTarget.Global
      ),
      config.update(
        "showSidebar",
        ConfigService.DEFAULT_CONFIG.showSidebar,
        vscode.ConfigurationTarget.Global
      )
    ])
  }

  /**
   * 设置 API 令牌
   */
  async setApiToken(token: string): Promise<void> {
    await vscode.workspace
      .getConfiguration(ConfigService.CONFIG_SECTION)
      .update("apiToken", token, vscode.ConfigurationTarget.Global)
  }

  /**
   * 设置侧边栏显示状态
   */
  async setSidebarVisible(visible: boolean): Promise<void> {
    await vscode.workspace
      .getConfiguration(ConfigService.CONFIG_SECTION)
      .update("showSidebar", visible, vscode.ConfigurationTarget.Global)
  }

  /**
   * 切换侧边栏显示状态
   */
  async toggleSidebarVisible(): Promise<boolean> {
    const currentVisible = this.isSidebarVisible()
    const newVisible = !currentVisible
    await this.setSidebarVisible(newVisible)
    return newVisible
  }

  /**
   * 验证配置是否有效
   */
  validateConfig(): { errors: string[]; isValid: boolean } {
    const config = this.getConfig()
    const errors: string[] = []

    // 验证 API 端点
    if (!config.apiEndpoint || !this.isValidUrl(config.apiEndpoint)) {
      errors.push("API 端点地址无效")
    }

    // 验证轮询间隔
    if (config.pollingInterval < 5000) {
      errors.push("轮询间隔不能少于5秒")
    }

    // 验证状态栏刷新间隔
    if (config.statusBarRefreshInterval < 100) {
      errors.push("状态栏刷新间隔不能少于100毫秒")
    }

    return {
      errors,
      isValid: errors.length === 0
    }
  }

  /**
   * 验证 URL 格式
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

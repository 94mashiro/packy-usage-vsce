import * as vscode from "vscode"

interface JWTPayload {
  [key: string]: any
  exp?: number
}

export class SecretService {
  private readonly TOKEN_KEY = "packy-usage.apiToken"

  constructor(private context: vscode.ExtensionContext) {}

  async deleteToken(): Promise<void> {
    await this.context.secrets.delete(this.TOKEN_KEY)
  }

  async getToken(): Promise<string | undefined> {
    const token = await this.context.secrets.get(this.TOKEN_KEY)

    if (token && this.isTokenExpired(token)) {
      await this.deleteToken()
      vscode.window
        .showWarningMessage(
          vscode.l10n.t("API Token has expired, please reconfigure"),
          vscode.l10n.t("Configure Now")
        )
        .then((choice) => {
          if (choice === vscode.l10n.t("Configure Now")) {
            vscode.commands.executeCommand("packy-usage.setToken")
          }
        })
      return undefined
    }

    return token
  }

  /**
   * 获取Token的过期时间（用于调试）
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const payload = this.parseJWTPayload(token)
      if (payload.exp) {
        return new Date(payload.exp * 1000)
      }
      return null
    } catch {
      return null
    }
  }

  onDidChange(
    listener: (e: vscode.SecretStorageChangeEvent) => void
  ): vscode.Disposable {
    return this.context.secrets.onDidChange(listener)
  }

  async setToken(token: string): Promise<void> {
    // 验证token格式和有效期
    if (!this.isValidJWT(token)) {
      throw new Error("Invalid JWT token format")
    }

    if (this.isTokenExpired(token)) {
      throw new Error("Token is already expired")
    }

    await this.context.secrets.store(this.TOKEN_KEY, token)
  }

  /**
   * 检查Token是否过期
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.parseJWTPayload(token)
      if (!payload.exp) {
        // 如果没有exp字段，认为token不过期
        return false
      }

      const currentTime = Math.floor(Date.now() / 1000)
      return currentTime >= payload.exp
    } catch {
      // 如果解析失败，认为token无效/过期
      return true
    }
  }

  /**
   * 验证是否为有效的JWT格式
   */
  private isValidJWT(token: string): boolean {
    const parts = token.split(".")
    return parts.length === 3
  }

  /**
   * 解析JWT的payload部分
   */
  private parseJWTPayload(token: string): JWTPayload {
    const parts = token.split(".")
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format")
    }

    try {
      // JWT payload是base64url编码的
      const [, payload] = parts
      // 替换base64url字符为标准base64
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
      // 添加padding如果需要
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)

      const decoded = Buffer.from(padded, "base64").toString("utf8")
      return JSON.parse(decoded)
    } catch (error) {
      throw new Error(`Failed to parse JWT payload: ${error}`)
    }
  }
}

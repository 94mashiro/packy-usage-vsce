# Packy Usage

一个VS Code扩展，用于实时监控API预算使用情况，帮助开发者跟踪每日和每月的API消费。

<img width="356" alt="image" src="https://github.com/user-attachments/assets/a8fc519c-598d-4022-b944-9c0bfee2a2be" />


## ✨ 功能特性

- 📊 **实时预算监控** - 显示每日和每月的API预算使用情况
- 📈 **使用率统计** - 直观显示预算使用百分比和金额
- 🔧 **状态栏集成** - 在VS Code状态栏实时显示预算使用率
- 🌳 **侧边栏面板** - 详细的预算数据树形展示
- 🔄 **自动轮询** - 定期自动刷新预算数据
- 🔒 **安全存储** - API Token安全存储在VS Code密钥库中

## 📋 系统要求

- VS Code 1.54.0 或更高版本
- 有效的API Token（用于访问预算数据）

## 🚀 快速开始

### 1. 配置API Token

首次安装后，扩展会提示配置API Token：

- 点击提示中的 "立即配置" 按钮
- 或者打开命令面板 (`Ctrl/Cmd + Shift + P`)，搜索 `Packy Usage: Set API Token`
- 输入您的API Token并保存

### 2. 查看预算数据

配置完成后，您可以通过以下方式查看预算数据：

- **侧边栏** - 点击活动栏中的 📦 Packy Usage 图标
- **状态栏** - 查看右下角的预算使用率显示
- **命令面板** - 使用 `Packy Usage: Show Usage Explorer`

## 🎛️ 配置选项

此扩展支持以下配置：

### `packy-usage.apiToken`
- **类型**: `string`
- **默认值**: `""`
- **描述**: 用于访问预算数据的API Token
- **范围**: 应用程序级别（安全存储）

### `packy-usage.apiEndpoint`
- **类型**: `string`
- **默认值**: `"https://www.packycode.com/api/backend/users/info"`
- **描述**: 预算数据API端点
- **范围**: 应用程序级别

## 📱 界面说明

### 侧边栏面板

预算数据以树形结构展示：

```
📦 Packy Usage
├── 📅 日预算
│   ├── 已使用: $X.XX
│   ├── 总预算: $X.XX
│   └── 使用率: XX.X%
├── 📅 月预算
│   ├── 已使用: $X.XX
│   ├── 总预算: $X.XX
│   └── 使用率: XX.X%
└── 🔧 配置
    ├── Token: 已配置/未配置
    └── API: [端点地址]
```

### 状态栏显示

- **有数据时**: `日预算: XX.X%`
- **无数据时**: `⚠️ 未获取预算数据`
- **悬停提示**: 显示详细的使用金额和预算信息

## ⌨️ 命令

| 命令 | 功能 |
|------|------|
| `Packy Usage: Set API Token` | 配置或更新API Token |
| `Packy Usage: Refresh Budget Data` | 手动刷新预算数据 |
| `Packy Usage: Show Usage Explorer` | 打开预算监控面板 |

## 🔄 自动功能

- **启动检测** - 扩展激活时自动检查Token配置
- **数据轮询** - 定期自动刷新预算数据
- **缓存管理** - 智能缓存减少API调用
- **错误处理** - 网络异常和认证错误的友好提示

## 🛠️ 故障排除

### Token相关问题

**问题**: 显示"未配置 Token"
**解决**: 运行 `Packy Usage: Set API Token` 命令重新配置

**问题**: 认证失败 (401/403)
**解决**: 检查Token是否有效，重新获取并配置新Token

### 网络相关问题

**问题**: 网络连接失败
**解决**: 检查网络连接和API端点配置

**问题**: 请求超时
**解决**: 检查网络稳定性，插件会自动重试

### 数据显示问题

**问题**: 数据不刷新
**解决**: 点击刷新按钮或重启VS Code

## 📄 更新日志

### 1.0.0

- ✅ 初始正式版本发布
- ✅ 基础预算监控功能
- ✅ 状态栏和侧边栏集成
- ✅ API Token安全存储
- ✅ 自动数据轮询

## 🔒 隐私与安全

- API Token通过VS Code密钥库安全存储
- 所有网络请求均通过HTTPS加密
- 不会记录或存储任何敏感数据
- 支持请求超时和错误处理

## 🤝 支持

如果您遇到问题或有功能建议，请通过以下方式联系：

- [创建Issue](https://github.com/94mashiro/packy-usage-vsce/issues)报告问题
- 查看VS Code开发者工具控制台的错误信息  
- 检查扩展是否为最新版本
- 访问项目主页：https://github.com/94mashiro/packy-usage-vsce

---

**享受智能预算监控！** 📊

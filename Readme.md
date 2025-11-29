# Foundry Local Chat

🎯 **本地 AI 聊天应用** - 支持 Foundry Local，也可以连接到 Azure AI 的模型。

一个现代化的 Electron 桌面应用，可以与本地 Foundry Local AI 模型进行实时对话。无需任何配置，应用会自动检测、启动服务并加载模型。

## ✨ 核心特性

- ✅ **零配置启动** - 应用启动时自动检测和启动 Foundry Local 服务
- ✅ **动态端口识别** - 自动发现 Foundry Local 的动态端口
- ✅ **模型自动发现** - 自动获取所有可用模型列表
- ✅ **流式输出** - 实时流式输出模型响应
- ✅ **模型即切即用** - 无需重启即可切换模型
- ✅ **智能缓存** - 缓存端点加快启动速度

## 🚀 快速开始

### 前置要求

- **Node.js** 16+ （[下载](https://nodejs.org/)）
- **Foundry Local** 已安装 （[下载](https://github.com/microsoft/Foundry-Local/releases)）
- **Foundry Local** 已安装模型

### 安装步骤

```bash
1. 安装依赖
# npm install

2. 启动应用（就这样！）
# npm start

应用会自动处理一切：
# - 检测 Foundry Local 服务
# - 自动启动服务（如果未运行）
# - 发现动态端口
# - 加载模型列表
# - 准备就绪
```

### 编译程序

```bash
# npm run build
```

### Azure AI Foundry

如使用 Azure AI Foundry，可在程序配置中填写连接信息，配置文件将保存在用户目录下“.foundry-chat”子目录下，文件名为“cloud-config.json”
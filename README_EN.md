# Foundry Local Chat

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)

🎯 **A Modern AI Chat Application** - Connect to both Foundry Local and Azure AI Foundry models seamlessly.

</div>

## 📖 Overview

**Foundry Local Chat** is a powerful cross-platform desktop application built on the Electron framework, adapted and enhanced from Microsoft's official Chat example. It provides a modern, clean interface for generative AI conversations with support for both local AI models (via Foundry Local) and cloud-based models (via Azure AI Foundry).

### Why Foundry Local Chat?

- **Dual-Mode Support**: Seamlessly switch between local AI models and Azure cloud models
- **Zero Configuration**: Automatic service detection and initialization
- **Modern UI/UX**: Clean, intuitive interface designed for productivity
- **Cross-Platform**: Built with Electron for native Windows and macOS support
- **User-Friendly**: Simple installation and operation with minimal setup required

## ✨ Key Features

### 🚀 Intelligent Automation
- ✅ **Zero-Config Startup** - Automatically detects and launches Foundry Local service on application start
- ✅ **Dynamic Port Discovery** - Automatically identifies Foundry Local's dynamic port configuration
- ✅ **Model Auto-Discovery** - Fetches and displays all available models automatically
- ✅ **Smart Caching** - Caches endpoint information for faster subsequent launches

### 💬 Conversation Excellence
- ✅ **Streaming Responses** - Real-time streaming output for model responses
- ✅ **Hot-Swap Models** - Switch between models instantly without restarting the application
- ✅ **Conversation History** - Maintains context throughout your chat session
- ✅ **Clean Interface** - Modern, distraction-free design for focused conversations

### 🌐 Flexible Connectivity
- ✅ **Foundry Local Integration** - Full support for local AI model inference
- ✅ **Azure AI Foundry Support** - Connect to Azure-hosted models with custom endpoints
- ✅ **Dual-Mode Operation** - Use local or cloud models based on your needs

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 16 or higher ([Download](https://nodejs.org/))
- **Foundry Local** ([Download](https://github.com/microsoft/Foundry-Local/releases))
- **At least one AI model** installed in Foundry Local

### Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd foundry-local-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Launch the application**
   ```bash
   npm start
   ```

That's it! The application will automatically:
- ✓ Detect the Foundry Local service
- ✓ Launch the service if not already running
- ✓ Discover the dynamic port configuration
- ✓ Load the list of available models
- ✓ Prepare the chat interface for use

## 🔧 Development

### Running in Development Mode

```bash
npm run dev
```

### Building the Application

#### Build for All Platforms
```bash
npm run build
```

#### Platform-Specific Builds

**Windows:**
```bash
npm run build:win        # Default architecture
npm run build:x64        # 64-bit
npm run build:arm64      # ARM64
```

**macOS:**
```bash
npm run build:mac              # Default architecture
npm run build:mac:arm64        # Apple Silicon (M1/M2/M3)
npm run build:mac:universal    # Universal binary (Intel + Apple Silicon)
```

**Build for All Platforms:**
```bash
npm run build:all
```

Build outputs will be located in the `dist/` directory.

## ⚙️ Configuration

### Using Foundry Local (Default)

No configuration needed! The application automatically detects and connects to your local Foundry Local installation.

### Using Azure AI Foundry

To connect to Azure AI Foundry models:

1. Click the **Settings/Configuration** button in the application
2. Enter your Azure AI Foundry connection details:
   - Endpoint URL
   - API Key
   - Model deployment name (if applicable)
3. Save the configuration

Configuration files are stored in:
- **Windows**: `%USERPROFILE%\.foundry-chat\cloud-config.json`
- **macOS/Linux**: `~/.foundry-chat/cloud-config.json`

## 🏗️ Architecture

Foundry Local Chat is built with:

- **Electron** - Cross-platform desktop framework
- **Foundry Local SDK** (v0.3.0) - Official SDK for local model integration
- **OpenAI SDK** (v4.98.0) - Compatible API for chat completions
- **Modern JavaScript** - ES6+ modules for clean, maintainable code

### Project Structure

```
foundry-local-chat/
├── main.js                 # Main Electron process
├── preload.cjs            # Preload script for secure IPC
├── chat.html              # Chat interface UI
├── foundry-service.js     # Foundry Local service management
├── package.json           # Project dependencies and scripts
├── build/                 # Build resources (icons, entitlements)
│   ├── icon.ico          # Windows icon
│   ├── icon.icns         # macOS icon
│   └── entitlements.mac.plist
└── dist/                  # Build output directory
```

## 🎯 Use Cases

- **Local AI Development**: Test and interact with local AI models without cloud dependencies
- **Privacy-First Chat**: Keep sensitive conversations on your local machine
- **Hybrid Workflows**: Use local models for development and cloud models for production
- **Cross-Platform Testing**: Verify model behavior across different operating systems
- **AI Research**: Experiment with different models and compare responses
- **Offline Operation**: Continue working with AI models without internet connectivity

## 🔒 Privacy & Security

- **Local-First**: When using Foundry Local, all data stays on your machine
- **Secure Configuration**: Cloud credentials stored locally with file system permissions
- **No Telemetry**: No usage data collected or transmitted
- **Transparent**: Full visibility into code and behavior

## 📊 System Requirements

### Minimum Requirements
- **OS**: Windows 10/11 (x64, ARM64) or macOS 10.13+
- **RAM**: 8 GB
- **Storage**: 500 MB for application + space for AI models
- **Node.js**: 16.x or higher

### Recommended Requirements
- **OS**: Windows 11 or macOS 12+ (Apple Silicon optimized)
- **RAM**: 16 GB or more
- **Storage**: SSD with adequate space for models
- **GPU**: Dedicated GPU for improved model performance

## 🚀 Advanced Usage

### Command Line Options

```bash
# Development mode with DevTools
npm run dev

# Production build for specific platform
npm run build:win
npm run build:mac
npm run build:mac:universal

# Create portable version (Windows)
npm run build:win  # Includes portable build
```

### Environment Variables

The application respects the following environment variables:

- `FOUNDRY_LOCAL_PATH` - Custom path to Foundry Local installation
- `NODE_ENV` - Set to `development` for debug mode

## 🤝 Contributing

Contributions are welcome! This project is adapted from Microsoft's official Chat example and enhanced for dual-mode operation.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas for Contribution

- UI/UX improvements
- Additional model provider integrations
- Performance optimizations
- Documentation enhancements
- Bug fixes and testing

## 🐛 Troubleshooting

### Common Issues

**Application won't start:**
- Ensure Node.js 16+ is installed
- Run `npm install` to install dependencies
- Check if Foundry Local is properly installed

**Models not loading:**
- Verify Foundry Local service is running
- Check that at least one model is installed in Foundry Local
- Try restarting the application

**Connection to Azure AI Foundry fails:**
- Verify your endpoint URL and API key
- Check your internet connection
- Ensure the model deployment name is correct

**Performance issues:**
- Close unnecessary applications
- Ensure adequate RAM is available
- Consider using smaller models for lower-end hardware

## 📚 Resources

### Documentation
- [Foundry Local Documentation](https://github.com/microsoft/Foundry-Local)
- [Azure AI Foundry Documentation](https://learn.microsoft.com/azure/ai-studio/)
- [Electron Documentation](https://www.electronjs.org/docs)

### Related Projects
- [Microsoft's Official Chat Example](https://github.com/microsoft)
- [Foundry Local SDK](https://www.npmjs.com/package/foundry-local-sdk)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)

## 📄 License

ISC License

Copyright (c) 2025

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

## 🙏 Acknowledgments

- **Microsoft** - For the original Chat example and Foundry Local platform
- **Electron Team** - For the excellent cross-platform framework
- **OpenAI** - For the standardized chat completion API
- **Open Source Community** - For various dependencies and tools

## 📞 Support & Contact

If you encounter any issues or have questions:

1. **Documentation**: Check this README and the [Foundry Local docs](https://github.com/microsoft/Foundry-Local)
2. **Issues**: Open an issue in this repository with details
3. **Community**: Join discussions in the Issues section

## 🎉 Getting Started Tips

### For First-Time Users

1. **First Launch**: Allow 30-60 seconds for Foundry Local to initialize on first launch
2. **Model Selection**: Start with smaller models (e.g., 7B parameters) if you have limited hardware
3. **Local vs Cloud**: Try local models first to understand performance, then compare with cloud models
4. **Settings**: Explore the settings panel to customize your experience

### Best Practices

- **Model Performance**: Larger models provide better responses but require more resources
- **Conversation Context**: Clear conversation history periodically for better performance
- **Updates**: Keep Foundry Local and the application updated for best results
- **Backups**: Configuration files in `.foundry-chat` directory can be backed up

## 🌟 Feature Roadmap

Planned features for future releases:

- [ ] Multi-language UI support
- [ ] Conversation export/import
- [ ] Custom prompt templates
- [ ] Model performance metrics
- [ ] Plugin system for extensions
- [ ] Advanced configuration options
- [ ] Theme customization

---

<div align="center">

**Built with ❤️ using Electron and Foundry Local**

[Documentation](#) • [Report Bug](#) • [Request Feature](#) • [中文文档](./Readme.md)

</div>

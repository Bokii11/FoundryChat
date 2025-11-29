import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import OpenAI from 'openai'
import { FoundryLocalManager } from 'foundry-local-sdk'
import fs from 'fs'
import os from 'os'
import {
  startFoundryService,
  discoverFoundryService,
  queryServiceFromCLI,
  verifyEndpoint,
  getAvailableModels,
  cacheEndpoint,
  readCachedEndpoint,
  normalizeEndpoint
} from './foundry-service.js'

// Global variables
let mainWindow
let aiClient = null
let foundryClient = null
let currentModelType = 'local'
let modelName = null
let endpoint = null
let apiKey = ""
let useFoundrySDK = false

// Cloud configuration
let cloudApiKey = process.env.YOUR_API_KEY
let cloudEndpoint = process.env.YOUR_ENDPOINT
let cloudModelName = process.env.YOUR_MODEL_NAME

// Load cloud config from file
function loadCloudConfig() {
  try {
    const configPath = path.join(os.homedir(), '.foundry-chat', 'cloud-config.json')
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (config.apiKey && config.endpoint && config.modelName) {
        cloudApiKey = config.apiKey
        cloudEndpoint = config.endpoint
        cloudModelName = config.modelName
        console.log('[CloudConfig] Loaded cloud configuration from file')
        return true
      }
    }
  } catch (error) {
    console.error('[CloudConfig] Error loading cloud config:', error.message)
  }
  return false
}

// Save cloud config to file
function saveCloudConfigToFile(config) {
  try {
    const configDir = path.join(os.homedir(), '.foundry-chat')
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    const configPath = path.join(configDir, 'cloud-config.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log('[CloudConfig] Saved cloud configuration to file')
    return true
  } catch (error) {
    console.error('[CloudConfig] Error saving cloud config:', error.message)
    return false
  }
}

// Clear cloud config file
function clearCloudConfigFile() {
  try {
    const configPath = path.join(os.homedir(), '.foundry-chat', 'cloud-config.json')
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath)
      console.log('[CloudConfig] Cleared cloud configuration file')
    }
    return true
  } catch (error) {
    console.error('[CloudConfig] Error clearing cloud config:', error.message)
    return false
  }
}

// Load cloud config on startup
loadCloudConfig()

const hasCloudConfig = cloudApiKey && cloudEndpoint && cloudModelName

if (!hasCloudConfig) {
  console.warn('Cloud AI configuration not set in environment variables. Cloud mode will not be available.')
  console.warn('To enable cloud mode, set: YOUR_API_KEY, YOUR_ENDPOINT, and YOUR_MODEL_NAME')
}

// Foundry service state
const foundryManager = new FoundryLocalManager()
let foundryServiceEndpoint = null
let customServiceEndpoint = null

/**
 * 主初始化流程 - 完整的服务发现和启动流程
 * Main initialization - Complete service discovery and startup flow
 * 
 * 逻辑流程：
 * 1. 检查 Foundry 服务是否已运行 (使用 CLI status)
 * 2. 如果未运行，自动启动服务 (使用 CLI start)
 * 3. 不断轮询直到服务就绪 (最多 30 秒)
 * 4. 获取实际的服务地址和端口
 * 5. 验证端点可用性
 * 6. 获取可用模型列表
 * 7. 通知前端初始化完成
 */
async function initializeFoundryService() {
  console.log('[Initialization] ========== Foundry Local Initialization Started ==========')
  
  try {
    // 步骤 1-2: 启动服务 (如果需要)
    console.log('[Initialization] Step 1: Checking Foundry Local service status...')
    const startResult = await startFoundryService()
    
    console.log(`[Initialization] ${startResult.message}`)
    
    if (startResult.wasAlreadyRunning) {
      console.log('[Initialization] [OK] Service was already running')
    } else if (startResult.started) {
      console.log('[Initialization] [OK] Service successfully started')
    } else {
      console.warn('[Initialization] [WARN] Service start status unclear, attempting to discover...')
    }
    
    // 步骤 3: 发现服务端点
    console.log('[Initialization] Step 2: Discovering service endpoint...')
    const discoverResult = await discoverFoundryService()
    
    if (!discoverResult.endpoint) {
      console.error('[Initialization] [ERR] Failed to discover Foundry service endpoint')
      console.error('[Initialization] Troubleshooting:')
      console.error('[Initialization]   - Ensure Foundry Local is installed')
      console.error('[Initialization]   - Try running manually: foundry service start')
      console.error('[Initialization]   - Check Foundry Local service logs')
      
      // 发送初始化失败事件到前端
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('foundry-init-status', {
          status: 'failed',
          message: 'Failed to discover Foundry Local service',
          endpoint: null
        })
      }
      
      return false
    }
    
    foundryServiceEndpoint = discoverResult.endpoint
    console.log(`[Initialization] [OK] Service endpoint discovered: ${foundryServiceEndpoint}`)
    if (discoverResult.port) {
      console.log(`[Initialization] [OK] Service port: ${discoverResult.port}`)
    }
    
    // 步骤 4: 获取可用模型
    console.log('[Initialization] Step 3: Retrieving available models...')
    const models = await getAvailableModels(foundryServiceEndpoint)
    
    if (models.length === 0) {
      console.warn('[Initialization] [WARN] No models currently available')
      console.warn('[Initialization] Check Foundry Local service status')
    } else {
      console.log(`[Initialization] [OK] Found ${models.length} available model(s):`)
      models.forEach((m, idx) => {
        console.log(`[Initialization]   [${idx + 1}] ${m.id}`)
      })
    }
    
    // 步骤 5: 通知前端初始化完成
    console.log('[Initialization] Step 4: Notifying frontend...')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('foundry-init-status', {
        status: 'ready',
        message: 'Foundry Local service ready',
        endpoint: foundryServiceEndpoint,
        models: models,
        modelCount: models.length
      })
    }
    
    console.log('[Initialization] ========== Initialization Complete ==========')
    return true
  } catch (error) {
    console.error('[Initialization] Error during initialization:', error.message)
    console.error('[Initialization] Stack:', error.stack)
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('foundry-init-status', {
        status: 'error',
        message: `Initialization error: ${error.message}`,
        endpoint: null
      })
    }
    
    return false
  }
}

// IPC Handlers

/**
 * 获取 Foundry 服务配置信息
 * Get Foundry service configuration
 */
ipcMain.handle('get-foundry-config', async () => {
  return {
    autoDiscovered: foundryServiceEndpoint,
    custom: customServiceEndpoint,
    currentEndpoint: customServiceEndpoint || foundryServiceEndpoint
  }
})

/**
 * 设置自定义 Foundry 端点
 * Set custom Foundry endpoint
 */
ipcMain.handle('set-foundry-endpoint', async (_, endpoint) => {
  try {
    if (!endpoint) {
      customServiceEndpoint = null
      return { success: true, message: 'Custom endpoint cleared' }
    }
    
    const normalized = normalizeEndpoint(endpoint)
    const isValid = await verifyEndpoint(normalized)
    
    if (!isValid) {
      return { success: false, error: 'Endpoint is not responding' }
    }
    
    customServiceEndpoint = normalized
    cacheEndpoint(normalized)
    console.log(`[FoundryService] [OK] Custom endpoint set: ${normalized}`)
    
    return { success: true, message: `Connected to: ${normalized}` }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

/**
 * 获取本地模型列表
 * Get local models
 */
ipcMain.handle('get-local-models', async () => {
  try {
    console.log('[FoundryService] Getting local models...')
    
    const endpoint = customServiceEndpoint || foundryServiceEndpoint
    if (!endpoint) {
      console.warn('[FoundryService] No endpoint available')
      return { success: false, error: 'Foundry service not available', models: [] }
    }
    
    const models = await getAvailableModels(endpoint)
    
    if (models.length === 0) {
      console.warn('[FoundryService] No models available')
      return { success: true, models: [], warning: 'No models available. Please check Foundry Local service.' }
    }
    
    console.log(`[FoundryService] [OK] Found ${models.length} model(s)`)
    return { success: true, models: models }
  } catch (error) {
    console.error('[FoundryService] Error getting models:', error.message)
    return { success: false, error: error.message, models: [] }
  }
})

/**
 * 测试连接到 Foundry 服务
 * Test connection to Foundry service
 */
ipcMain.handle('test-foundry-connection', async (_, endpoint) => {
  try {
    const testEndpoint = endpoint || customServiceEndpoint || foundryServiceEndpoint
    if (!testEndpoint) {
      return { success: false, error: 'No endpoint configured' }
    }
    
    const isValid = await verifyEndpoint(testEndpoint)
    if (!isValid) {
      return { success: false, error: 'Connection failed' }
    }
    
    const models = await getAvailableModels(testEndpoint)
    return { 
      success: true, 
      message: `Connected! ${models.length} model(s) available`,
      endpoint: testEndpoint,
      modelCount: models.length
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

/**
 * 获取云配置
 * Get cloud configuration
 */
ipcMain.handle('get-cloud-config', async () => {
  return {
    apiKey: cloudApiKey || '',
    endpoint: cloudEndpoint || '',
    modelName: cloudModelName || ''
  }
})

/**
 * 保存云配置
 * Save cloud configuration
 */
ipcMain.handle('save-cloud-config', async (_, config) => {
  try {
    if (!config.apiKey || !config.endpoint || !config.modelName) {
      return { success: false, error: 'All fields are required' }
    }

    const saved = saveCloudConfigToFile(config)
    if (saved) {
      // Update runtime variables
      cloudApiKey = config.apiKey
      cloudEndpoint = config.endpoint
      cloudModelName = config.modelName
      
      return { success: true, message: 'Cloud configuration saved successfully' }
    } else {
      return { success: false, error: 'Failed to save configuration' }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

/**
 * 清除云配置
 * Clear cloud configuration
 */
ipcMain.handle('clear-cloud-config', async () => {
  try {
    const cleared = clearCloudConfigFile()
    if (cleared) {
      // Clear runtime variables
      cloudApiKey = null
      cloudEndpoint = null
      cloudModelName = null
      
      return { success: true, message: 'Cloud configuration cleared successfully' }
    } else {
      return { success: false, error: 'Failed to clear configuration' }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

/**
 * 切换模型
 * Switch to a different model
 */
ipcMain.handle('switch-model', async (_, modelId) => {
  try {
    if (modelId === 'cloud') {
      // Check if cloud config is available (either from env or config file)
      const hasConfig = cloudApiKey && cloudEndpoint && cloudModelName
      if (!hasConfig) {
        return { success: false, error: 'Cloud model not configured. Please set up Azure AI settings.' }
      }
      
      console.log('[Model] Switching to cloud model')
      currentModelType = 'cloud'
      useFoundrySDK = false
      endpoint = cloudEndpoint
      apiKey = cloudApiKey
      modelName = cloudModelName
      
      aiClient = new OpenAI({
        apiKey: apiKey,
        baseURL: endpoint
      })
      foundryClient = null
      
      return { success: true, modelName: modelName, endpoint: endpoint }
    } else {
      // 切换到本地 Foundry 模型
      console.log(`[Model] Switching to local model: ${modelId}`)
      
      const serviceEndpoint = customServiceEndpoint || foundryServiceEndpoint
      if (!serviceEndpoint) {
        return { success: false, error: 'Foundry service not available' }
      }
      
      currentModelType = 'local'
      modelName = modelId
      endpoint = serviceEndpoint
      useFoundrySDK = false
      
      // 获取模型别名（用于显示）
      // Get model alias for display
      let modelAlias = modelId
      try {
        const models = await getAvailableModels(serviceEndpoint)
        const modelInfo = models.find(m => m.id === modelId)
        if (modelInfo && modelInfo.alias) {
          modelAlias = modelInfo.alias
        }
      } catch (e) {
        console.warn(`[Model] Could not fetch model alias: ${e.message}`)
      }
      
      // OpenAI 客户端需要 /v1 路径前缀
      // OpenAI client requires /v1 path prefix
      const v1Endpoint = serviceEndpoint.endsWith('/v1') 
        ? serviceEndpoint 
        : `${serviceEndpoint}/v1`
      
      aiClient = new OpenAI({
        apiKey: 'sk-foundry-local',
        baseURL: v1Endpoint
      })
      foundryClient = null
      
      console.log(`[Model] [OK] Model initialized: ${modelId}`)
      console.log(`[Model] Using endpoint: ${v1Endpoint}`)
      return { 
        success: true, 
        modelName: modelId,  // 返回完整的 Model ID
        modelAlias: modelAlias,  // 返回别名
        displayName: `${modelAlias} (${modelId})`,  // 返回显示名称
        endpoint: serviceEndpoint 
      }
    }
  } catch (error) {
    console.error('[Model] Error switching model:', error.message)
    return { success: false, error: error.message }
  }
})

/**
 * 发送消息
 * Send message to AI model
 */
ipcMain.handle('send-message', (_, messages) => {
  return sendMessage(messages)
})

async function sendMessage(messages) {
  try {
    if (!aiClient) {
      console.error('[SendMessage] ERROR: OpenAI client not initialized')
      throw new Error('OpenAI client not initialized')
    }

    console.log('=== Sending message ===')
    console.log(`[SendMessage] Endpoint: ${endpoint}`)
    console.log(`[SendMessage] Model: ${modelName}`)
    console.log(`[SendMessage] Type: ${currentModelType}`)
    console.log(`[SendMessage] Messages count: ${messages.length}`)

    const stream = await aiClient.chat.completions.create({
      model: modelName,
      messages: messages,
      stream: true
    })

    console.log('[SendMessage] Stream created successfully')
    
    let chunkCount = 0
    let totalContent = ''
    for await (const chunk of stream) {
      chunkCount++
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        totalContent += content
        mainWindow.webContents.send('chat-chunk', content)
        if (chunkCount === 1) {
          console.log('[SendMessage] First chunk received')
        }
      }
    }
    
    console.log(`[SendMessage] Stream complete: ${chunkCount} chunks, ${totalContent.length} characters`)
    mainWindow.webContents.send('chat-complete')
    return { success: true }
  } catch (error) {
    console.error('[SendMessage] ERROR:', error)
    console.error('[SendMessage] Error stack:', error.stack)
    console.error('[SendMessage] Current state:', { endpoint, modelName, currentModelType })
    return { success: false, error: error.message }
  }
}

/**
 * 创建窗口
 * Create main window
 */
async function createWindow() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const preloadPath = path.join(__dirname, 'preload.cjs')
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: false,
    webPreferences: {
      allowRunningInsecureContent: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      enableRemoteModule: false,
      sandbox: false
    }
  })

  Menu.setApplicationMenu(null)
  console.log('[App] Creating chat window')
  mainWindow.loadFile('chat.html')
  
  return mainWindow
}

/**
 * App 生命周期
 * App lifecycle
 */
app.whenReady().then(async () => {
  console.log('[App] ========== Application Starting ==========')
  
  // 创建窗口
  const window = createWindow()
  console.log('[App] [OK] Chat window created')
  
  // 注意：不要等待初始化，让初始化在后台进行
  // 初始化完成时会通过 IPC 通知前端
  // Don't wait for initialization, let it run in the background
  // Frontend will be notified when ready via IPC
  console.log('[App] Starting Foundry service initialization in background...')
  
  // 在后台启动初始化
  initializeFoundryService()
    .then((success) => {
      if (success) {
        console.log('[App] [OK] Foundry initialization succeeded')
      } else {
        console.log('[App] [WARN] Foundry initialization failed - manual configuration may be needed')
      }
    })
    .catch((error) => {
      console.error('[App] Unexpected error during initialization:', error)
    })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

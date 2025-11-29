/**
 * foundry-service.js (Redesigned)
 * 
 * 正确的逻辑:
 * 1. 使用 CLI 启动 Foundry Local 服务
 * 2. 从 CLI 获取实际的服务地址和端口
 * 3. 验证服务可用
 * 4. 获取可用的模型列表
 * 
 * Correct logic:
 * 1. Start Foundry Local service using CLI
 * 2. Get actual service address and port from CLI
 * 3. Verify service availability
 * 4. Get available models list
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import fs from 'fs'
import path from 'path'
import http from 'http'

const execAsync = promisify(exec)

/**
 * 启动 Foundry Local 服务
 * Start Foundry Local service using CLI
 * 
 * 流程：
 * 1. 先检查服务是否已在运行
 * 2. 如果未运行，则启动服务
 * 3. 启动后等待服务就绪
 * 
 * @returns {Promise<{started: boolean, wasAlreadyRunning: boolean, message: string}>}
 */
export async function startFoundryService() {
  try {
    console.log('[FoundryService] ========== Starting Service Check ==========')
    
    // 步骤1: 检查服务是否已在运行
    console.log('[FoundryService] Checking if service is already running...')
    const statusResult = await queryServiceFromCLI()
    
    if (statusResult.isRunning && statusResult.endpoint) {
      console.log(`[FoundryService] [OK] Service is already running on ${statusResult.endpoint}`)
      return {
        started: false,
        wasAlreadyRunning: true,
        message: `Service already running on ${statusResult.endpoint}`
      }
    }
    
    // 步骤2: 服务未运行，启动它
    console.log('[FoundryService] Service not running. Starting service via CLI...')
    
    // 关键优化：不要等待 start 命令完成，而是立即开始轮询
    // 因为 foundry service start 可能需要很长时间才返回
    // 但实际上服务可能在几秒钟内就启动了
    // Key optimization: Don't wait for start command to complete
    // Start polling immediately because the service might be ready
    // long before the CLI command finishes
    exec('foundry service start', (error, stdout, stderr) => {
      if (error) {
        console.log(`[FoundryService] Start command error (may be normal): ${error.message}`)
      }
      if (stdout) {
        console.log(`[FoundryService] Start stdout: ${stdout}`)
      }
      if (stderr) {
        console.log(`[FoundryService] Start stderr: ${stderr}`)
      }
    })
    
    // 步骤3: 立即开始轮询服务状态（不等待 start 命令完成）
    console.log('[FoundryService] Polling for service availability...')
    const maxRetries = 60  // 增加到 60 秒，因为首次启动可能需要更长时间
    let retryCount = 0
    
    // 先等待 2 秒再开始第一次检查，给服务一点启动时间
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    while (retryCount < maxRetries) {
      retryCount++
      
      const checkResult = await queryServiceFromCLI()
      if (checkResult.isRunning && checkResult.endpoint) {
        console.log(`[FoundryService] [OK] Service started successfully on ${checkResult.endpoint} (took ${retryCount} seconds)`)
        return {
          started: true,
          wasAlreadyRunning: false,
          message: `Service started on ${checkResult.endpoint}`
        }
      }
      
      // 每 5 次检查打印一次状态，避免日志过多
      if (retryCount % 5 === 0) {
        console.log(`[FoundryService] Still waiting... (${retryCount}/${maxRetries} seconds)`)
      }
      
      // 等待 1 秒后再次检查
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.warn('[FoundryService] [WARN] Service start timeout after 60 seconds - service may still be starting')
    return {
      started: false,
      wasAlreadyRunning: false,
      message: 'Service start timeout - please check manually'
    }
  } catch (error) {
    console.error(`[FoundryService] Error in startFoundryService: ${error.message}`)
    return {
      started: false,
      wasAlreadyRunning: false,
      message: `Error: ${error.message}`
    }
  }
}

/**
 * 从 CLI 查询服务状态和端口
 * Query service status and port from CLI
 * 
 * @returns {Promise<{endpoint: string|null, port: number|null, isRunning: boolean, raw: string}>}
 */
export async function queryServiceFromCLI() {
  try {
    console.log('[FoundryService] Querying Foundry Local service status from CLI...')
    
    // 减少超时时间到 2 秒，使轮询更快响应
    // Reduce timeout to 2 seconds for faster polling
    const { stdout } = await execAsync('foundry service status', {
      timeout: 2000,
      encoding: 'utf8'
    })
    
    console.log(`[FoundryService] CLI response:\n${stdout}`)
    
    // 尝试解析 JSON 格式
    try {
      const jsonOutput = JSON.parse(stdout)
      
      if (jsonOutput.port) {
        const endpoint = `http://127.0.0.1:${jsonOutput.port}`
        console.log(`[FoundryService] [OK] Got port from CLI: ${endpoint}`)
        return {
          endpoint: endpoint,
          port: jsonOutput.port,
          isRunning: jsonOutput.status === 'running' || jsonOutput.running === true,
          raw: stdout
        }
      }
      
      if (jsonOutput.url) {
        console.log(`[FoundryService] [OK] Got URL from CLI: ${jsonOutput.url}`)
        return {
          endpoint: jsonOutput.url,
          port: null,
          isRunning: true,
          raw: stdout
        }
      }
    } catch (parseErr) {
      console.log('[FoundryService] JSON parse failed, trying text parsing...')
    }
    
    // 尝试从文本输出中提取完整的 URL
    // 例如: "running on http://127.0.0.1:55329/openai/status"
    const fullUrlMatch = stdout.match(/http[s]?:\/\/[^\s/]+:\d+/i)
    if (fullUrlMatch) {
      const fullUrl = fullUrlMatch[0]
      console.log(`[FoundryService] [OK] Extracted endpoint from text: ${fullUrl}`)
      
      // 从 URL 中提取端口
      const portMatch = fullUrl.match(/:(\d+)$/)
      const port = portMatch ? parseInt(portMatch[1], 10) : null
      
      return {
        endpoint: fullUrl,
        port: port,
        isRunning: true,
        raw: stdout
      }
    }
    
    // 尝试提取端口号
    // Try to extract port from text output
    // 例如: "Service running on port 51679" 或 "55329"
    const portMatch = stdout.match(/:\s*(\d+)/)
    if (portMatch && portMatch[1]) {
      const port = parseInt(portMatch[1], 10)
      const endpoint = `http://127.0.0.1:${port}`
      console.log(`[FoundryService] [OK] Extracted port from text: ${endpoint}`)
      return {
        endpoint: endpoint,
        port: port,
        isRunning: true,
        raw: stdout
      }
    }
    
    // 尝试提取完整 URL
    const urlMatch = stdout.match(/http[s]?:\/\/[^\s]+/i)
    if (urlMatch) {
      console.log(`[FoundryService] [OK] Extracted URL from text: ${urlMatch[0]}`)
      return {
        endpoint: urlMatch[0],
        port: null,
        isRunning: true,
        raw: stdout
      }
    }
    
    console.warn('[FoundryService] Could not parse CLI output')
    return {
      endpoint: null,
      port: null,
      isRunning: false,
      raw: stdout
    }
  } catch (error) {
    console.warn(`[FoundryService] Error querying CLI: ${error.message}`)
    return {
      endpoint: null,
      port: null,
      isRunning: false,
      raw: ''
    }
  }
}

/**
 * 使用 HTTP 请求验证端点可用性
 * Verify endpoint availability using HTTP request
 * 
 * @param {string} url - Full URL to test (can include path like http://127.0.0.1:55329/openai/status)
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<boolean>}
 */
export async function verifyEndpoint(url, timeout = 3000) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url)
      
      // 如果 URL 包含路径，直接使用该路径；否则使用 /v1/models
      const path = parsedUrl.pathname && parsedUrl.pathname !== '/' 
        ? parsedUrl.pathname 
        : '/v1/models'
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: path,
        method: 'GET',
        timeout: timeout
      }
      
      const req = http.request(options, (res) => {
        // 任何响应都表示端点可用
        // Any response means endpoint is available
        console.log(`[FoundryService] [ok] Endpoint verified: ${url}`)
        resolve(true)
      })
      
      req.on('error', (error) => {
        console.warn(`[FoundryService] Endpoint verification failed: ${error.message}`)
        resolve(false)
      })
      
      req.on('timeout', () => {
        req.destroy()
        console.warn(`[FoundryService] Endpoint verification timeout`)
        resolve(false)
      })
      
      req.end()
    } catch (error) {
      console.warn(`[FoundryService] Error verifying endpoint: ${error.message}`)
      resolve(false)
    }
  })
}

/**
 * 获取 Foundry 缓存目录
 * Get Foundry cache directory
 */
function getFoundryCacheDir() {
  const homeDir = os.homedir()
  const platform = process.platform
  
  if (platform === 'win32') {
    return path.join(process.env.APPDATA || homeDir, 'Foundry')
  } else if (platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'Foundry')
  } else {
    return path.join(homeDir, '.foundry')
  }
}

/**
 * 读取缓存的端点
 * Read cached endpoint
 * 
 * @returns {string|null}
 */
export function readCachedEndpoint() {
  try {
    const cacheDir = getFoundryCacheDir()
    const cacheFile = path.join(cacheDir, 'endpoint-cache.json')
    
    if (fs.existsSync(cacheFile)) {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
      
      if (data.endpoint && data.timestamp) {
        // 检查缓存有效期 (24小时)
        const age = Date.now() - data.timestamp
        if (age < 24 * 60 * 60 * 1000) {
          console.log(`[FoundryService] Found cached endpoint: ${data.endpoint}`)
          return data.endpoint
        } else {
          console.log('[FoundryService] Cached endpoint expired')
        }
      }
    }
  } catch (error) {
    console.warn(`[FoundryService] Error reading cache: ${error.message}`)
  }
  
  return null
}

/**
 * 缓存端点
 * Cache endpoint
 * 
 * @param {string} endpoint - Endpoint to cache
 */
export function cacheEndpoint(endpoint) {
  try {
    if (!endpoint) return
    
    const cacheDir = getFoundryCacheDir()
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
    
    const cacheFile = path.join(cacheDir, 'endpoint-cache.json')
    fs.writeFileSync(cacheFile, JSON.stringify({
      endpoint: endpoint,
      timestamp: Date.now()
    }, null, 2))
    
    console.log(`[FoundryService] [OK] Cached endpoint: ${endpoint}`)
  } catch (error) {
    console.warn(`[FoundryService] Error caching endpoint: ${error.message}`)
  }
}

/**
 * 规范化端点 URL
 * Normalize endpoint URL - extract base URL without path
 */
export function normalizeEndpoint(endpoint) {
  if (!endpoint) return null
  
  try {
    // 解析 URL
    const url = new URL(endpoint)
    
    // 返回只有 protocol + hostname + port 的基础 URL
    // 移除所有路径
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`
  } catch (error) {
    console.warn(`[FoundryService] Error normalizing endpoint: ${error.message}`)
    
    // 备用方案：简单的正则匹配
    endpoint = endpoint.replace(/\/$/, '')  // 移除末尾的 /
    endpoint = endpoint.replace(/\/.*$/, '')  // 移除所有路径
    
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = `http://${endpoint}`
    }
    
    endpoint = endpoint.replace(/^https:/, 'http:')  // 统一为 http
    
    return endpoint
  }
}

/**
 * 主发现流程 - 正确的逻辑
 * Main discovery flow - Correct logic
 * 
 * 步骤:
 * 1. 检查缓存 (快速)
 * 2. 尝试启动服务 (使用 CLI)
 * 3. 查询 CLI 获取实际端口
 * 4. 验证端点可用
 * 5. 缓存结果
 * 
 * Steps:
 * 1. Check cache (fast)
 * 2. Try to start service (using CLI)
 * 3. Query CLI to get actual port
 * 4. Verify endpoint availability
 * 5. Cache result
 * 
 * @returns {Promise<{endpoint: string|null, port: number|null, isRunning: boolean}>}
 */
export async function discoverFoundryService() {
  console.log('[FoundryService] Starting Foundry service discovery...')
  
  // 步骤 1: 检查缓存
  // Step 1: Check cache
  console.log('[FoundryService] [1/5] Checking cache...')
  const cachedEndpoint = readCachedEndpoint()
  if (cachedEndpoint) {
    const isValid = await verifyEndpoint(cachedEndpoint)
    if (isValid) {
      console.log(`[FoundryService] [OK] Using cached endpoint: ${cachedEndpoint}`)
      return {
        endpoint: cachedEndpoint,
        port: null,
        isRunning: true
      }
    } else {
      console.log('[FoundryService] Cached endpoint is no longer valid')
    }
  }
  
  // 步骤 2: 尝试启动服务
  // Step 2: Try to start service
  console.log('[FoundryService] [2/5] Starting service...')
  const started = await startFoundryService()
  
  if (!started) {
    console.warn('[FoundryService] Service may already be running or failed to start')
  }
  
  // 等待服务启动/查询就绪
  // Wait for service to start/be ready
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 步骤 3: 查询 CLI 获取实际端口和地址
  // Step 3: Query CLI to get actual port and address
  console.log('[FoundryService] [3/5] Querying service status from CLI...')
  const cliResult = await queryServiceFromCLI()
  
  if (!cliResult.endpoint) {
    console.error('[FoundryService] [ERR] Failed to get endpoint from CLI')
    return {
      endpoint: null,
      port: cliResult.port,
      isRunning: false
    }
  }
  
  // 步骤 4: 验证端点可用
  // Step 4: Verify endpoint availability
  console.log('[FoundryService] [4/5] Verifying endpoint...')
  const isValid = await verifyEndpoint(cliResult.endpoint)
  
  if (!isValid) {
    console.error('[FoundryService] [ERR] Endpoint verification failed')
    return {
      endpoint: cliResult.endpoint,
      port: cliResult.port,
      isRunning: false
    }
  }
  
  // 步骤 5: 缓存结果
  // Step 5: Cache result
  console.log('[FoundryService] [5/5] Caching endpoint...')
  cacheEndpoint(cliResult.endpoint)
  
  console.log(`[FoundryService] [OK] Discovery complete: ${cliResult.endpoint}`)
  return {
    endpoint: cliResult.endpoint,
    port: cliResult.port,
    isRunning: true
  }
}

/**
 * 获取可用的模型列表
 * Get available models from endpoint
 * 
 * @param {string} endpoint - Service endpoint (can include path)
 * @returns {Promise<Array>}
 */
export async function getAvailableModels(endpoint) {
  return new Promise((resolve) => {
    try {
      if (!endpoint) {
        resolve([])
        return
      }
      
      // 正确地提取基础 URL
      // 注意: endpoint.replace(/\/.*$/, '') 会错误地处理 "http://" 协议
      // 解决: 使用 URL API 来正确解析
      let baseUrl
      try {
        const parsedUrl = new URL(endpoint)
        baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`
      } catch (e) {
        console.warn(`[FoundryService] Invalid endpoint URL: ${endpoint}`)
        resolve([])
        return
      }
      
      const parsedUrl = new URL(baseUrl)
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 80,
        path: '/v1/models',
        method: 'GET',
        timeout: 5000,
        headers: { 'Accept': 'application/json' }
      }
      
      const req = http.request(options, (res) => {
        let data = ''
        
        res.on('data', chunk => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            let models = json.data || []
            
            // 为每个模型添加友好的显示名称和状态
            // Add friendly display names and status for each model
            models = models.map(model => {
              // 使用完整的 model.id 作为显示名称
              // 这样可以清晰区分不同的模型变体 (NPU/GPU/不同设备ID)
              const displayName = model.id
              
              return {
                ...model,
                alias: displayName,  // 使用完整 ID 作为 alias
                displayName: displayName,
                status: 'running'  // 如果能从 API 获取到模型列表，说明模型是运行状态
              }
            })
            
            console.log(`[FoundryService] [OK] Retrieved ${models.length} models from service`)
            resolve(models)
          } catch (parseErr) {
            console.warn(`[FoundryService] Error parsing models: ${parseErr.message}`)
            resolve([])
          }
        })
      })
      
      req.on('error', (error) => {
        console.warn(`[FoundryService] Error getting models: ${error.message}`)
        resolve([])
      })
      
      req.on('timeout', () => {
        req.destroy()
        console.warn(`[FoundryService] Get models request timeout`)
        resolve([])
      })
      
      req.end()
    } catch (error) {
      console.warn(`[FoundryService] Error in getAvailableModels: ${error.message}`)
      resolve([])
    }
  })
}

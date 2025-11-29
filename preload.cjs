const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script starting...');
console.log('Current directory:', __dirname);
console.log('Module paths:', module.paths);
console.log('contextBridge available:', !!contextBridge);
console.log('ipcRenderer available:', !!ipcRenderer);

try {
    console.log('Electron modules loaded');
   
    contextBridge.exposeInMainWorld('versions', {
        node: () => process.versions.node,
        chrome: () => process.versions.chrome,
        electron: () => process.versions.electron
    })

    console.log('Versions bridge exposed');

    contextBridge.exposeInMainWorld('mainAPI', {
        sendMessage: (messages) => ipcRenderer.invoke('send-message', messages),
        onChatChunk: (callback) => ipcRenderer.on('chat-chunk', (_, chunk) => callback(chunk)),
        onChatComplete: (callback) => ipcRenderer.on('chat-complete', () => callback()),
        removeAllChatListeners: () => {
            ipcRenderer.removeAllListeners('chat-chunk');
            ipcRenderer.removeAllListeners('chat-complete');
        },
        getLocalModels: () => ipcRenderer.invoke('get-local-models'),
        switchModel: (modelId) => ipcRenderer.invoke('switch-model', modelId),
        onInitializeWithCloud: (callback) => ipcRenderer.on('initialize-with-cloud', () => callback()),
        
        // Foundry service initialization status
        onFoundryInitStatus: (callback) => ipcRenderer.on('foundry-init-status', (_, data) => callback(data.status, data)),
        
        // Foundry endpoint configuration
        getFoundryConfig: () => ipcRenderer.invoke('get-foundry-config'),
        setFoundryEndpoint: (endpoint) => ipcRenderer.invoke('set-foundry-endpoint', endpoint),
        testFoundryConnection: (endpoint) => ipcRenderer.invoke('test-foundry-connection', endpoint),
        
        // Cloud configuration
        getCloudConfig: () => ipcRenderer.invoke('get-cloud-config'),
        saveCloudConfig: (config) => ipcRenderer.invoke('save-cloud-config', config),
        clearCloudConfig: () => ipcRenderer.invoke('clear-cloud-config')
    })

    console.log('mainAPI bridge exposed');
    console.log('Preload script completed successfully');
} catch (error) {
    console.error('Error in preload script:', error);
    console.error('Error stack:', error.stack);
}
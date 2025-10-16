// 初始化设置
import { getText, setLanguage } from './lang.js';
import { getAllServiceConfigurations, getSelectedServiceProvider, setSelectedServiceProvider } from "llm-service-provider";

let isApiKeyManagerOpen = false;

// 创建简单的API密钥管理界面
function renderApiKeyManager() {
  const container = document.getElementById('api-key-manager-container');
  if (!container) return;
  
  // 如果关闭状态，清空容器
  if (!isApiKeyManagerOpen) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  
  // 显示容器并创建简单界面
  container.style.display = 'block';
  container.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
      <div style="background: white; margin: 50px auto; padding: 20px; border-radius: 8px; width: 90%; max-width: 500px;">
        <h3>API密钥管理</h3>
        <div style="margin-bottom: 20px;">
          <p>使用llm-service-provider管理您的API密钥</p>
          <p>当前选中的提供商: ${getSelectedServiceProvider() || '未选择'}</p>
        </div>
        <button id="closeApiManager">关闭</button>
      </div>
    </div>
  `;
  
  // 添加关闭按钮事件
  document.getElementById('closeApiManager').addEventListener('click', function() {
    isApiKeyManagerOpen = false;
    renderApiKeyManager();
  });
}
document.addEventListener('DOMContentLoaded', () => {
  // 获取保存的设置
  Promise.all([
    new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getLLMSettings' }, (response) => {
        resolve(response);
      });
    }),
    new Promise((resolve) => {
      chrome.storage.local.get(['language'], (result) => {
        resolve(result.language || 'zh-CN');
      });
    })
  ]).then(([llmSettings, language]) => {
    if (llmSettings) {
      document.getElementById('useLLM').checked = llmSettings.useLLM || false;
      document.getElementById('llmProvider').value = llmSettings.llmProvider || 'openai';
      document.getElementById('llmApiKey').value = llmSettings.llmApiKey || '';
    }

    // 设置当前语言
    document.getElementById('languageSelect').value = language;
    setLanguage(document.body, language);
    
    // 根据是否启用显示/隐藏设置
    const useLLMCheckbox = document.getElementById('useLLM');
    const llmSettingsDiv = document.getElementById('llmSettings');
    llmSettingsDiv.style.display = useLLMCheckbox.checked ? 'block' : 'none';
    
    // 启用开关事件
    useLLMCheckbox.addEventListener('change', function() {
      llmSettingsDiv.style.display = this.checked ? 'block' : 'none';
    });
  });
  
  // 语言选择事件
  document.getElementById('languageSelect').addEventListener('change', function() {
    const selectedLanguage = this.value;
    setLanguage(document.body, selectedLanguage);
    
    // 保存语言设置
    chrome.storage.local.set({ language: selectedLanguage });
  });

  // 添加ApiKeyManager容器
  const apiManagerContainer = document.createElement('div');
  apiManagerContainer.id = 'api-key-manager-container';
  document.body.appendChild(apiManagerContainer);
  
  // 初始化渲染ApiKeyManager组件
  renderApiKeyManager();
  
  // 添加一个按钮来打开ApiKeyManager（如果需要）
  const openApiManagerBtn = document.createElement('button');
  openApiManagerBtn.textContent = 'API密钥管理';
  openApiManagerBtn.addEventListener('click', function() {
    isApiKeyManagerOpen = true;
    renderApiKeyManager();
  });
  document.body.appendChild(openApiManagerBtn);
  
  // 保存设置按钮事件
  document.getElementById('saveSettingsBtn').addEventListener('click', function() {
    const useLLM = document.getElementById('useLLM').checked;
    const llmProvider = document.getElementById('llmProvider').value;
    const llmApiKey = document.getElementById('llmApiKey').value;
    const configs = getAllServiceConfigurations();
    
    chrome.runtime.sendMessage({
      action: 'saveLLMSettings',
      useLLM: useLLM,
      llmProvider: llmProvider,
      llmApiKey: llmApiKey
    });
    
    // 显示保存成功提示
    const saveMessage = document.createElement('div');
    saveMessage.textContent = getText('settingsSaved', document.getElementById('languageSelect').value);
    saveMessage.style.position = 'fixed';
    saveMessage.style.bottom = '20px';
    saveMessage.style.right = '20px';
    saveMessage.style.backgroundColor = '#4CAF50';
    saveMessage.style.color = 'white';
    saveMessage.style.padding = '10px';
    saveMessage.style.borderRadius = '5px';
    saveMessage.style.zIndex = '1000';
    document.body.appendChild(saveMessage);
    
    // 3秒后移除提示
    setTimeout(() => {
      saveMessage.remove();
    }, 3000);
  });
  
  // 开始分析按钮事件
  document.getElementById('openAnalysisBtn').addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      if (activeTab.url.includes('bilibili.com/video/')) {
        // 确保content.js已加载，强制重新执行content.js
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content.js']
        }, () => {
          // 执行脚本后发送消息
          chrome.tabs.sendMessage(activeTab.id, { action: 'showAnalysisPanel' });
        });
      } else {
        alert(getText('alertNotBiliPage', document.getElementById('languageSelect').value));
      }
    });
  });
});
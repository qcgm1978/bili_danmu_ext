// 初始化设置
import { getText, setLanguage } from './lang.js';

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

  // 保存设置按钮事件
  document.getElementById('saveSettingsBtn').addEventListener('click', function() {
    const useLLM = document.getElementById('useLLM').checked;
    const llmProvider = document.getElementById('llmProvider').value;
    const llmApiKey = document.getElementById('llmApiKey').value;
    
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
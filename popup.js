// 初始化设置
document.addEventListener('DOMContentLoaded', () => {
  // 获取保存的设置
  chrome.runtime.sendMessage({ action: 'getLLMSettings' }, (response) => {
    if (response) {
      document.getElementById('useLLM').checked = response.useLLM || false;
      document.getElementById('llmProvider').value = response.llmProvider || 'openai';
      document.getElementById('llmApiKey').value = response.llmApiKey || '';
    }
    
    // 根据是否启用显示/隐藏设置
    const useLLMCheckbox = document.getElementById('useLLM');
    const llmSettingsDiv = document.getElementById('llmSettings');
    llmSettingsDiv.style.display = useLLMCheckbox.checked ? 'block' : 'none';
    
    // 启用开关事件
    useLLMCheckbox.addEventListener('change', function() {
      llmSettingsDiv.style.display = this.checked ? 'block' : 'none';
    });
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
    saveMessage.textContent = '设置已保存';
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
        alert('请先打开哔哩哔哩视频页面');
      }
    });
  });
});
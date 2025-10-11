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
    }, (response) => {
      if (response && response.success) {
        const saveStatus = document.getElementById('saveStatus');
        saveStatus.style.opacity = '1';
        setTimeout(() => {
          saveStatus.style.opacity = '0';
        }, 2000);
      }
    });
  });
  
  // 开始分析按钮事件
  document.getElementById('openAnalysisBtn').addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      if (activeTab.url.includes('bilibili.com/video/')) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'showAnalysisPanel' });
      } else {
        alert('请先打开哔哩哔哩视频页面');
      }
    });
  });
});
// 初始化设置

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
      document.getElementById('useLLM').checked = llmSettings.useLLM !== undefined ? llmSettings.useLLM : true;
      document.getElementById('llmProvider').value = llmSettings.llmProvider || 'groq';
      document.getElementById('llmApiKey').value = llmSettings.llmApiKey || '';
    } else {
      document.getElementById('useLLM').checked = true;
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
    const spinner = document.getElementById('loadingSpinner');
    spinner.classList.add('show'); // 显示spinner
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      if (activeTab.url.includes('bilibili.com/video/')) {
        // 直接发送消息，不再强制重新执行content.js
        chrome.tabs.sendMessage(activeTab.id, { action: 'showAnalysisPanel' }, (response) => {
          // 如果没有响应，可能content.js未加载，这时候再加载
          if (chrome.runtime.lastError) {
            chrome.scripting.executeScript({ 
              target: { tabId: activeTab.id },
              files: ['content.js']
            }, () => {
              // 延迟发送消息，确保脚本已执行
              setTimeout(() => {
                chrome.tabs.sendMessage(activeTab.id, { action: 'showAnalysisPanel' }, () => {
                  spinner.classList.remove('show');
                  document.getElementById('mainMenu').style.display = 'none';
                  // document.getElementById('analysisResult').style.display = 'block';
                });
              }, 500);
            });
          } else {
            spinner.classList.remove('show');
            document.getElementById('mainMenu').style.display = 'none';
            // document.getElementById('analysisResult').style.display = 'block';
          }
        });
      } else {
        alert(getText('alertNotBiliPage', document.getElementById('languageSelect').value));
        spinner.classList.remove('show');
      }
    });
    document.body.style.display='none'
  });
  
  // 返回菜单按钮事件
  document.getElementById('backToMenu').addEventListener('click', function() {
    document.getElementById('analysisResult').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'block';
  });
});
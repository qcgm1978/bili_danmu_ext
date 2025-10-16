chrome.runtime.onInstalled.addListener(() => {
  console.log('哔哩哔哩弹幕分析扩展已安装');
  // 设置默认配置
  chrome.storage.local.set({
    useLLM: false,
    llmProvider: 'openai',
    llmApiKey: ''
  });
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes('bilibili.com/video/')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    chrome.tabs.sendMessage(tab.id, { action: 'showAnalysisPanel' });
  } else if (tab.url.includes('bilibili.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'showAnalysisPanel' });
  } else {
    chrome.tabs.create({
      url: 'https://www.bilibili.com/'
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveDanmuData') {
    chrome.storage.local.set({
      danmuData: message.data,
      timestamp: Date.now()
    }).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('保存弹幕数据失败:', error);
      sendResponse({ success: false });
    });
    return true;
  } else if (message.action === 'getDanmuData') {
    chrome.storage.local.get(['danmuData', 'timestamp']).then((result) => {
      sendResponse(result);
    });
    return true;
  } else if (message.action === 'saveLLMSettings') {
    chrome.storage.local.set({
      useLLM: message.useLLM,
      llmProvider: message.llmProvider,
      llmApiKey: message.llmApiKey
    }).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('保存LLM设置失败:', error);
      sendResponse({ success: false });
    });
    return true;
  } else if (message.action === 'getLLMSettings') {
    chrome.storage.local.get(['useLLM', 'llmProvider', 'llmApiKey']).then((result) => {
      sendResponse(result);
    });
    return true;
  }
});
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { getText, setLanguage } from '../lang.js';
import {
  ApiKeyManager
} from "llm-service-provider";

function Popup() {
  const [llmSettings, setLlmSettings] = useState({
    useLLM: false,
    llmProvider: 'openai',
    llmApiKey: ''
  });
  const [language, setLanguageState] = useState('zh-CN');
  const [isApiKeyManagerOpen, setIsApiKeyManagerOpen] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);

  useEffect(() => {
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
    ]).then(([settings, lang]) => {
      if (settings) {
        setLlmSettings({
          useLLM: settings.useLLM || false,
          llmProvider: settings.llmProvider || 'openai',
          llmApiKey: settings.llmApiKey || ''
        });
      }
      setLanguageState(lang);
    });
  }, []);

  const handleLanguageChange = (e) => {
    const selectedLanguage = e.target.value;
    setLanguageState(selectedLanguage);
    chrome.storage.local.set({ language: selectedLanguage });
  };

  const handleSaveSettings = () => {
    chrome.runtime.sendMessage({
      action: 'saveLLMSettings',
      ...llmSettings
    });
    setShowSaveMessage(true);
    setTimeout(() => {
      setShowSaveMessage(false);
    }, 3000);
  };

  const handleOpenAnalysis = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.url && activeTab.url.includes('bilibili.com/video/')) {
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content.bundle.js']
        }, () => {
          chrome.tabs.sendMessage(activeTab.id, { action: 'showAnalysisPanel' });
        });
      } else {
        alert(getText('alertNotBiliPage', language) || '请在哔哩哔哩视频页面使用此功能');
      }
    });
  };

  return (
    <div>
      <h1>{getText('title', language) || '哔哩哔哩弹幕分析'}</h1>
      
      <div className="setting-group">
        <label className="setting-label">
          <input
            type="checkbox"
            id="useLLM"
            checked={llmSettings.useLLM}
            onChange={(e) => setLlmSettings({...llmSettings, useLLM: e.target.checked})}
          />
          {getText('useLLM', language) || '使用LLM分析弹幕'}
        </label>
      </div>

      {llmSettings.useLLM && (
        <div id="llmSettings" style={{display: 'block'}}>
          <div className="setting-group">
            <label className="setting-label">
              {getText('llmProvider', language) || 'LLM提供商'}:
              <select
                id="llmProvider"
                value={llmSettings.llmProvider}
                onChange={(e) => setLlmSettings({...llmSettings, llmProvider: e.target.value})}
              >
                <option value="openai">OpenAI</option>
                <option value="groq">Groq</option>
                <option value="moonshot">Moonshot</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </label>
          </div>
          
          <div className="setting-group">
            <label className="setting-label">
              {getText('llmApiKey', language) || 'API密钥'}:
              <input
                type="text"
                id="llmApiKey"
                value={llmSettings.llmApiKey}
                onChange={(e) => setLlmSettings({...llmSettings, llmApiKey: e.target.value})}
              />
            </label>
          </div>
        </div>
      )}

      <div className="setting-group">
        <label className="setting-label">
          {getText('language', language) || '语言'}:
          <select
            id="languageSelect"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="zh-CN">中文</option>
            <option value="en-US">English</option>
          </select>
        </label>
      </div>

      <button onClick={() => setIsApiKeyManagerOpen(true)}>API密钥管理</button>
      <button id="saveSettingsBtn" onClick={handleSaveSettings}>{getText('saveSettings', language) || '保存设置'}</button>
      <button id="openAnalysisBtn" onClick={handleOpenAnalysis}>{getText('startAnalysis', language) || '开始分析'}</button>

      {showSaveMessage && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          zIndex: '1000'
        }}>
          {getText('settingsSaved', language) || '设置已保存'}
        </div>
      )}

      <ApiKeyManager
        isOpen={isApiKeyManagerOpen}
        onClose={() => setIsApiKeyManagerOpen(false)}
        language={language}
        compactTemplate={false}
        styleVariant="comic2"
      />
    </div>
  );
}

// 将组件渲染到DOM
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Popup />);
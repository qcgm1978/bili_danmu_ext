// 语言文本配置
const i18n = {
  'zh-CN': {
    'extensionName': '哔哩哔哩弹幕分析',
    'extensionDesc': '分析哔哩哔哩视频的弹幕内容，生成单词云和情绪可视化。',
    'startAnalysis': '开始分析',
    'advancedSettings': '高级设置',
    'useLLM': '启用LLM情绪分析',
    'selectLLMProvider': '选择LLM提供商',
    'apiKey': 'API密钥',
    'saveSettings': '保存设置',
    'settingsSaved': '设置已保存',
    'selectLanguage': '选择语言',
    'tabWordcloud': '单词云',
    'tabSentiment': '情绪分析',
    'tabStats': '统计数据',
    'totalDanmu': '总弹幕数',
    'positiveDanmu': '正面弹幕',
    'negativeDanmu': '负面弹幕',
    'neutralDanmu': '中性弹幕',
    'usageInstructions': '使用说明：',
    'instructionStep1': '1. 打开哔哩哔哩视频页面',
    'instructionStep2': '2. 点击此扩展图标',
    'instructionStep3': '3. 查看弹幕分析结果',
    'llmAnalysisDesc': 'LLM分析说明：',
    'llmAnalysisNote': '启用后将使用AI模型进行更准确的情绪分析，需要配置对应平台的API密钥。',
    'version': '版本',
    'alertNotBiliPage': '请先打开哔哩哔哩视频页面'
  },
  'en-US': {
    'extensionName': 'Bilibili Danmu Analysis',
    'extensionDesc': 'Analyze Bilibili video comments, generate word cloud and sentiment visualization.',
    'startAnalysis': 'Start Analysis',
    'advancedSettings': 'Advanced Settings',
    'useLLM': 'Enable LLM Sentiment Analysis',
    'selectLLMProvider': 'Select LLM Provider',
    'apiKey': 'API Key',
    'saveSettings': 'Save Settings',
    'settingsSaved': 'Settings Saved',
    'selectLanguage': 'Select Language',
    'tabWordcloud': 'Word Cloud',
    'tabSentiment': 'Sentiment Analysis',
    'tabStats': 'Statistics',
    'totalDanmu': 'Total Comments',
    'positiveDanmu': 'Positive Comments',
    'negativeDanmu': 'Negative Comments',
    'neutralDanmu': 'Neutral Comments',
    'usageInstructions': 'Instructions:',
    'instructionStep1': '1. Open Bilibili video page',
    'instructionStep2': '2. Click this extension icon',
    'instructionStep3': '3. View analysis results',
    'llmAnalysisDesc': 'LLM Analysis Notes:',
    'llmAnalysisNote': 'Enabling this will use AI model for more accurate sentiment analysis, requires API key configuration.',
    'version': 'Version',
    'alertNotBiliPage': 'Please open a Bilibili video page first'
  }
};

// 导出函数
export function getText(key, lang = 'zh-CN') {
  return i18n[lang] && i18n[lang][key] ? i18n[lang][key] : i18n['zh-CN'][key];
}

export function setLanguage(domElement, lang = 'zh-CN') {
  // 设置页面标题
  if (document.querySelector('title')) {
    document.querySelector('title').textContent = getText('extensionName', lang);
  }
  
  // 替换所有带有data-i18n属性的元素
  domElement.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = getText(key, lang);
  });
}
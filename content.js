// 加载必要的库
function loadScript(url, callback) {
  const script = document.createElement('script');
  script.src = url;
  script.onload = callback;
  document.head.appendChild(script);
}

// 加载Chart.js和WordCloud库
function loadRequiredLibraries() {
  return new Promise((resolve) => {
    // 检查Chart.js是否已加载
    if (window.Chart) {
      // 检查WordCloud是否已加载
      if (window.wordcloud) {
        resolve();
      } else {
        // 加载WordCloud库
        loadScript(chrome.runtime.getURL('lib/wordcloud.min.js'), () => {
          resolve();
        });
      }
    } else {
      // 加载Chart.js
      loadScript(chrome.runtime.getURL('lib/chart.umd.min.js'), () => {
        // 加载WordCloud库
        loadScript(chrome.runtime.getURL('lib/wordcloud.min.js'), () => {
          resolve();
        });
      });
    }
  });
}

let analysisPanel = null;

// 确保库已加载
loadRequiredLibraries();

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showAnalysisPanel') {
    createAnalysisPanel();
    startDanmuAnalysis();
  }
});

// 创建分析面板
function createAnalysisPanel() {
  if (analysisPanel) {
    analysisPanel.remove();
  }

  analysisPanel = document.createElement('div');
  analysisPanel.id = 'bili-danmu-analysis-panel';
  analysisPanel.innerHTML = `
    <div class="analysis-header">
      <h3>弹幕分析</h3>
      <button class="close-btn">×</button>
    </div>
    <div class="analysis-content">
      <div class="analysis-tab">
        <button class="tab-btn active" data-tab="wordcloud">单词云</button>
        <button class="tab-btn" data-tab="sentiment">情绪分析</button>
        <button class="tab-btn" data-tab="stats">统计数据</button>
      </div>
      <div class="tab-content active" id="wordcloud-content">
        <canvas id="wordcloud-canvas" width="400" height="300"></canvas>
      </div>
      <div class="tab-content" id="sentiment-content">
        <canvas id="sentiment-chart" width="400" height="300"></canvas>
      </div>
      <div class="tab-content" id="stats-content">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">总弹幕数</span>
            <span class="stat-value" id="total-danmu">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">正面弹幕</span>
            <span class="stat-value" id="positive-danmu">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">负面弹幕</span>
            <span class="stat-value" id="negative-danmu">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">中性弹幕</span>
            <span class="stat-value" id="neutral-danmu">0</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(analysisPanel);

  // 添加关闭按钮事件
  const closeBtn = analysisPanel.querySelector('.close-btn');
  closeBtn.addEventListener('click', () => {
    analysisPanel.remove();
    analysisPanel = null;
  });

  // 添加标签页切换事件
  const tabBtns = analysisPanel.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      // 更新按钮状态
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // 更新内容显示
      const tabContents = analysisPanel.querySelectorAll('.tab-content');
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabId}-content`) {
          content.classList.add('active');
        }
      });
    });
  });
}

// 使用LLM进行弹幕情绪分析
function analyzeDanmuWithLLM(danmuList, callback) {
  // 检查用户是否启用了LLM分析
  chrome.storage.local.get(['useLLM', 'llmApiKey', 'llmProvider'], (result) => {
    // 确保result对象存在并添加默认值
    result = result || {};
    const useLLM = result.useLLM === true;
    const llmApiKey = result.llmApiKey || '';
    
    if (!useLLM || !llmApiKey) {
      // 如果未启用LLM或没有API密钥，使用传统方法
      callback(classifyDanmu(danmuList));
      return;
    }
    
    // 准备请求参数
    const provider = result.llmProvider || 'openai';
    const prompt = `分析以下B站弹幕的情绪倾向。每条弹幕只能标记为正面、负面或中性。\n\n${danmuList.join('\n')}\n\n请按每条弹幕一行，格式为：弹幕内容 -> 情绪（正面/负面/中性）`;
    
    let apiUrl, headers, body;
    
    // 根据不同的提供商设置请求参数
    switch(provider) {
      case 'openai':
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmApiKey}`
        };
        body = JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 2000
        });
        break;
      case 'groq':
        apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmApiKey}`
        };
        body = JSON.stringify({
          model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 2000
        });
        break;
      case 'moonshot':
        apiUrl = 'https://api.moonshot.cn/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmApiKey}`
        };
        body = JSON.stringify({
          model: 'moonshot-v1-8k',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 2000
        });
        break;
      case 'anthropic':
        apiUrl = 'https://api.anthropic.com/v1/messages';
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': llmApiKey,
          'anthropic-version': '2023-06-01'
        };
        body = JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 2000
        });
        break;
      default:
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmApiKey}`
        };
        body = JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 2000
        });
    }
    
    // 发送请求到LLM API
    fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: body
    }).then(response => {
      if (!response.ok) {
        throw new Error('API请求失败');
      }
      return response.json();
    }).then(data => {
      // 解析返回结果
      let responseText = '';
      if (provider === 'anthropic') {
        responseText = data.content[0]?.text || '';
      } else {
        responseText = data.choices[0]?.message?.content || '';
      }
      
      // 解析情绪结果
      const classifiedDanmu = {
        allDanmu: danmuList,
        positiveDanmu: [],
        negativeDanmu: [],
        neutralDanmu: []
      };
      
      // 简单的结果解析逻辑
      if (responseText) {
        const lines = responseText.split('\n');
        lines.forEach(line => {
          const parts = line.split('->');
          if (parts.length === 2) {
            const danmu = parts[0].trim();
            const sentiment = parts[1].trim().toLowerCase();
            
            if (sentiment.includes('正面')) {
              classifiedDanmu.positiveDanmu.push(danmu);
            } else if (sentiment.includes('负面')) {
              classifiedDanmu.negativeDanmu.push(danmu);
            } else {
              classifiedDanmu.neutralDanmu.push(danmu);
            }
          }
        });
      }
      
      // 如果LLM分析失败，回退到传统方法
      if (classifiedDanmu.positiveDanmu.length === 0 && 
          classifiedDanmu.negativeDanmu.length === 0 && 
          classifiedDanmu.neutralDanmu.length === 0) {
        callback(classifyDanmu(danmuList));
      } else {
        callback(classifiedDanmu);
      }
    }).catch(error => {
      console.error('LLM分析失败:', error);
      // 发生错误时回退到传统方法
      callback(classifyDanmu(danmuList));
    });
  });
}

// 修改startDanmuAnalysis函数，支持LLM分析
function startDanmuAnalysis() {
  setTimeout(() => {
    // const danmuList = collectDanmu();
    // const danmuList = [];
    // if (danmuList.length > 0) {
    //   // 使用LLM进行分析，失败时自动回退到传统方法
    //   analyzeDanmuWithLLM(danmuList, (classifiedDanmu) => {
    //     updateStats(classifiedDanmu);
    //     generateWordCloud(classifiedDanmu.allDanmu);
    //     generateSentimentChart(classifiedDanmu);
        
    //     // 保存数据到本地存储
    //     chrome.runtime.sendMessage({
    //       action: 'saveDanmuData',
    //       data: classifiedDanmu
    //     });
    //   });
    // } else {
    //   console.log('未收集到弹幕数据，尝试其他方法...');
    //   // 尝试直接从API获取弹幕
    // }
    fetchDanmuFromAPI();
  }, 1000);
}

// 修改fetchDanmuFromAPI函数，支持LLM分析
function fetchDanmuFromAPI() {
  const videoId = getVideoId();
  if (!videoId) return;
  
  // 构建获取cid的URL
  const isBvId = videoId.startsWith('BV');
  const cidUrl = isBvId 
    ? `https://api.bilibili.com/x/web-interface/view?bvid=${videoId}`
    : `https://api.bilibili.com/x/web-interface/view?aid=${videoId.replace('av', '')}`;
  
  // 先获取视频的cid
  fetch(cidUrl)
    .then(response => response.json())
    .then(data => {
      if (data.code === 0 && data.data && data.data.cid) {
        const cid = data.data.cid;
        // 使用cid获取弹幕
        const danmuUrl = `https://comment.bilibili.com/${cid}.xml`;
        
        fetch(danmuUrl)
          .then(response => response.text())
          .then(xmlText => {
            // 解析XML获取弹幕文本
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const dItems = xmlDoc.getElementsByTagName('d');
            
            // 保留所有原始弹幕（包括重复的）用于统计总数
            const originalDanmuList = [];
            
            // 统计每个弹幕的出现频率
            const danmuFrequency = new Map();
            
            for (let i = 0; i < dItems.length; i++) {
              const text = dItems[i].textContent;
              if (text && text.length > 0) {
                originalDanmuList.push(text);
                
                // 更新弹幕频率统计
                if (danmuFrequency.has(text)) {
                  danmuFrequency.set(text, danmuFrequency.get(text) + 1);
                } else {
                  danmuFrequency.set(text, 1);
                }
              }
            }
            
            // 获取去重后的弹幕列表（用于发送给LLM分析，减少API调用成本）
            const uniqueDanmuList = Array.from(danmuFrequency.keys());
            
            if (uniqueDanmuList.length > 0) {
              // 使用LLM进行分析，失败时自动回退到传统方法
              analyzeDanmuWithLLM(uniqueDanmuList, (classifiedDanmu) => {
                // 修改classifiedDanmu对象，添加原始弹幕总数和频率信息
                classifiedDanmu.originalCount = originalDanmuList.length;
                classifiedDanmu.danmuFrequency = danmuFrequency;
                
                // 根据弹幕频率调整情绪分析结果，确保统计数据考虑重复弹幕
                const weightedClassifiedDanmu = {
                  allDanmu: classifiedDanmu.allDanmu,
                  originalCount: classifiedDanmu.originalCount,
                  danmuFrequency: classifiedDanmu.danmuFrequency,
                  positiveDanmu: [],
                  negativeDanmu: [],
                  neutralDanmu: []
                };
                
                // 根据弹幕频率重新计算情绪分类
                classifiedDanmu.positiveDanmu.forEach(danmu => {
                  const frequency = danmuFrequency.get(danmu);
                  for (let i = 0; i < frequency; i++) {
                    weightedClassifiedDanmu.positiveDanmu.push(danmu);
                  }
                });
                
                classifiedDanmu.negativeDanmu.forEach(danmu => {
                  const frequency = danmuFrequency.get(danmu);
                  for (let i = 0; i < frequency; i++) {
                    weightedClassifiedDanmu.negativeDanmu.push(danmu);
                  }
                });
                
                classifiedDanmu.neutralDanmu.forEach(danmu => {
                  const frequency = danmuFrequency.get(danmu);
                  for (let i = 0; i < frequency; i++) {
                    weightedClassifiedDanmu.neutralDanmu.push(danmu);
                  }
                });
                
                updateStats(weightedClassifiedDanmu);
                generateWordCloud(classifiedDanmu.allDanmu, danmuFrequency);
                generateSentimentChart(weightedClassifiedDanmu);
              });
            }
          });
      }
    });
}

// 更新统计数据
function updateStats(classifiedDanmu) {
  if (!analysisPanel) return;
  
  // 使用原始弹幕总数（包含重复）
  const totalDanmu = classifiedDanmu.originalCount || classifiedDanmu.allDanmu.length;
  const positiveDanmu = classifiedDanmu.positiveDanmu.length;
  const negativeDanmu = classifiedDanmu.negativeDanmu.length;
  const neutralDanmu = classifiedDanmu.neutralDanmu.length;
  
  document.getElementById('total-danmu').textContent = totalDanmu;
  document.getElementById('positive-danmu').textContent = positiveDanmu;
  document.getElementById('negative-danmu').textContent = negativeDanmu;
  document.getElementById('neutral-danmu').textContent = neutralDanmu;
}

// 生成单词云
function generateWordCloud(danmuList, danmuFrequency) {
  if (!analysisPanel) return;
  
  const canvas = document.getElementById('wordcloud-canvas');
  
  // 清空画布
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 使用传入的弹幕频率信息或重新计算
  let wordFrequency = {};
  
  if (danmuFrequency instanceof Map) {
    // 从Map转换为对象
    danmuFrequency.forEach((value, key) => {
      wordFrequency[key] = value;
    });
  } else {
    // 简单的单词频率统计
    danmuList.forEach(text => {
      const words = text.split(/[\s,，。！？；;.!?]+/);
      words.forEach(word => {
        if (word.length > 1) {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });
    });
  }
  
  // 准备单词数据
  const words = Object.entries(wordFrequency)
    .map(([text, value]) => [text, value])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);
  
  // 使用wordcloud库生成单词云
  if (window.wordcloud && words.length > 0) {
    try {
      window.wordcloud(canvas, {
        list: words,
        gridSize: 12,
        weightFactor: 10,
        fontFamily: 'Arial, sans-serif',
        color: function(word, weight, fontSize, distance, theta) {
          return 'hsl(' + Math.random() * 360 + ', 70%, 50%)';
        },
        rotateRatio: 0.5,
        rotationSteps: 2,
        backgroundColor: 'transparent',
        drawOutOfBound: false,
        shrinkToFit: true,
        shape: 'circle',
        ellipticity: 0.65
      });
    } catch (error) {
      // 如果wordcloud库加载失败，使用简单的备选方法
      drawSimpleWordCloud(canvas, words);
    }
  } else if (words.length > 0) {
    // 如果库未加载，使用简单的备选方法
    drawSimpleWordCloud(canvas, words);
  }
}

// 简单的单词云绘制方法（备选方案）
function drawSimpleWordCloud(canvas, words) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  
  // 随机位置绘制单词
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const maxRadius = Math.min(centerX, centerY) - 30;
  
  words.forEach((word, index) => {
    const angle = (index / words.length) * Math.PI * 2;
    const radius = (index / words.length) * maxRadius;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    // 根据频率设置字体大小
    const fontSize = Math.max(12, Math.min(36, word[1] * 4));
    ctx.font = `${fontSize}px Arial`;
    
    // 随机颜色
    const hue = (index * 10) % 360;
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((Math.random() - 0.5) * Math.PI / 3);
    ctx.fillText(word[0], 0, 0);
    ctx.restore();
  });
}

// 生成情绪分析图表
function generateSentimentChart(classifiedDanmu) {
  if (!analysisPanel) return;
  
  const canvas = document.getElementById('sentiment-chart');
  
  const positiveCount = classifiedDanmu.positiveDanmu.length;
  const negativeCount = classifiedDanmu.negativeDanmu.length;
  const neutralCount = classifiedDanmu.neutralDanmu.length;
  
  // 尝试使用Chart.js生成图表
  if (window.Chart) {
    try {
      // 先销毁可能存在的旧图表实例
      if (canvas.chartInstance) {
        canvas.chartInstance.destroy();
      }
      
      // 创建新的图表实例
      canvas.chartInstance = new window.Chart(canvas, {
        type: 'pie',
        data: {
          labels: ['正面', '负面', '中性'],
          datasets: [{
            data: [positiveCount, negativeCount, neutralCount],
            backgroundColor: ['#4CAF50', '#F44336', '#9E9E9E'],
            borderWidth: 1,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                font: {
                  family: 'Arial',
                  size: 12
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      // 如果Chart.js使用失败，回退到简单绘制
      drawSimpleSentimentChart(canvas, positiveCount, negativeCount, neutralCount);
    }
  } else {
    // 如果Chart.js未加载，使用简单绘制
    drawSimpleSentimentChart(canvas, positiveCount, negativeCount, neutralCount);
  }
}

// 简单的情绪分析图表绘制方法（备选方案）
function drawSimpleSentimentChart(canvas, positiveCount, negativeCount, neutralCount) {
  const ctx = canvas.getContext('2d');
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 30;
  
  const total = positiveCount + negativeCount + neutralCount;
  if (total > 0) {
    let startAngle = 0;
    
    // 绘制正面弹幕部分
    if (positiveCount > 0) {
      const endAngle = startAngle + (positiveCount / total) * Math.PI * 2;
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
      ctx.fill();
      startAngle = endAngle;
    }
    
    // 绘制负面弹幕部分
    if (negativeCount > 0) {
      const endAngle = startAngle + (negativeCount / total) * Math.PI * 2;
      ctx.fillStyle = '#F44336';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
      ctx.fill();
      startAngle = endAngle;
    }
    
    // 绘制中性弹幕部分
    if (neutralCount > 0) {
      const endAngle = startAngle + (neutralCount / total) * Math.PI * 2;
      ctx.fillStyle = '#9E9E9E';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
      ctx.fill();
    }
    
    // 添加图例
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.fillText('正面: ' + positiveCount, 20, 30);
    ctx.fillText('负面: ' + negativeCount, 20, 55);
    ctx.fillText('中性: ' + neutralCount, 20, 80);
  }
}

// 页面加载完成后尝试自动分析
if (document.readyState === 'complete') {
  // 延迟执行，确保页面完全加载
  setTimeout(() => {
    const url = window.location.href;
    if (url.includes('bilibili.com/video/')) {
      // 可以在这里添加自动显示分析面板的逻辑
    }
  }, 3000);
} else {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const url = window.location.href;
      if (url.includes('bilibili.com/video/')) {
        // 可以在这里添加自动显示分析面板的逻辑
      }
    }, 3000);
  });
}

// 获取视频ID
function getVideoId() {
  const url = window.location.href;
  const match = url.match(/bilibili.com\/video\/(av\d+|BV[\w]+)/);
  return match ? match[1] : null;
}

// 分类弹幕（情绪分析）
function classifyDanmu(danmuList) {
  const positiveKeywords = ['精彩', '不错', '好', '棒', '666', '加油', '爱了', '喜欢', '厉害', '优秀', '好看', '好评', '赞', '支持'];
  const negativeKeywords = ['不好', '无聊', '差', '垃圾', '失望', '一般', '讨厌', '烂', 'low', '恶心', '糟糕'];
  
  const positiveDanmu = [];
  const negativeDanmu = [];
  const neutralDanmu = [];
  
  danmuList.forEach(text => {
    let isPositive = false;
    let isNegative = false;
    
    // 简单的关键词匹配进行情绪分析
    for (const keyword of positiveKeywords) {
      if (text.includes(keyword)) {
        isPositive = true;
        break;
      }
    }
    
    if (!isPositive) {
      for (const keyword of negativeKeywords) {
        if (text.includes(keyword)) {
          isNegative = true;
          break;
        }
      }
    }
    
    if (isPositive) {
      positiveDanmu.push(text);
    } else if (isNegative) {
      negativeDanmu.push(text);
    } else {
      neutralDanmu.push(text);
    }
  });
  
  return {
    allDanmu: danmuList,
    positiveDanmu,
    negativeDanmu,
    neutralDanmu
  };
}
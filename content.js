function getLanguage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["language"], (result) => {
      resolve(result.language || "zh-CN");
    });
  });
}

// 获取对应语言的文本
function getText(key, language) {
  // 直接使用语言键值对，避免导入冲突
  const texts = {
    "zh-CN": {
      analysisPanelTitle: "弹幕分析",
      wordCloud: "单词云",
      sentimentAnalysis: "情绪分析",
      statistics: "统计数据",
      totalDanmu: "总弹幕数",
      positiveDanmu: "正面弹幕",
      negativeDanmu: "负面弹幕",
      neutralDanmu: "中性弹幕",
      positive: "正面",
      negative: "负面",
      neutral: "中性",
    },
    "en-US": {
      analysisPanelTitle: "Danmu Analysis",
      wordCloud: "Word Cloud",
      sentimentAnalysis: "Sentiment Analysis",
      statistics: "Statistics",
      totalDanmu: "Total Danmu",
      positiveDanmu: "Positive Danmu",
      negativeDanmu: "Negative Danmu",
      neutralDanmu: "Neutral Danmu",
      positive: "Positive",
      negative: "Negative",
      neutral: "Neutral",
    },
  };
  return texts[language]?.[key] || texts["zh-CN"][key] || key;
}

function loadScript(url, callback) {
  const script = document.createElement("script");
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
        loadScript(chrome.runtime.getURL("lib/wordcloud.min.js"), () => {
          resolve();
        });
      }
    } else {
      loadScript(chrome.runtime.getURL("lib/chart.umd.min.js"), () => {
        // 加载Chart.js
        // 加载WordCloud库
        loadScript(chrome.runtime.getURL("lib/wordcloud.min.js"), () => {
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
  if (message.action === "showAnalysisPanel") {
    createAnalysisPanel();
    startDanmuAnalysis();
    sendResponse({ success: true });
  }
  // 返回true表示异步响应，确保消息端口保持开放
  return true;
});

// 监听存储变化，确保获取最新设置
chrome.storage.onChanged.addListener(function (changes, namespace) {
  // 当设置变化时不需要立即执行任何操作，但确保下次分析时会获取最新设置
});

// 创建分析面板
function createAnalysisPanel() {
  if (analysisPanel) {
    analysisPanel.remove();
  }

  getLanguage().then((language) => {
    analysisPanel = document.createElement("div");
    analysisPanel.id = "bili-danmu-analysis-panel";
    analysisPanel.setAttribute("data-language", language);

    analysisPanel.innerHTML = `
      <div class="analysis-header">
        <h3>${getText("analysisPanelTitle", language)}</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="analysis-content">
        <div class="analysis-tab">
          <button class="tab-btn active" data-tab="wordcloud">${getText(
            "wordCloud",
            language
          )}</button>
          <button class="tab-btn" data-tab="sentiment">${getText(
            "sentimentAnalysis",
            language
          )}</button>
          <button class="tab-btn" data-tab="stats">${getText(
            "statistics",
            language
          )}</button>
        </div>
        <div class="tab-content active" id="wordcloud-content">
          <div class="wordcloud-options">
            <label>
              <input type="radio" name="wordcloud-type" value="2d" checked>
              2D显示
            </label>
            <label>
              <input type="radio" name="wordcloud-type" value="3d">
              3D显示
            </label>
          </div>
          <canvas id="wordcloud-canvas" width="400" height="300"></canvas>
          <div id="wordcloud-canvas-3d" style="display: none; width: 100%; height: 300px;"></div>
          <div id="wordcloud-spinner" class="spinner"></div>
        </div>
        <div class="tab-content" id="sentiment-content">
          <div id="sentiment-chart" style="width: 400px; height: 300px;"></div>
        </div>
        <div class="tab-content" id="stats-content">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">${getText("totalDanmu", language)}</span>
              <span class="stat-value" id="total-danmu">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${getText(
                "positiveDanmu",
                language
              )}</span>
              <span class="stat-value" id="positive-danmu">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${getText(
                "negativeDanmu",
                language
              )}</span>
              <span class="stat-value" id="negative-danmu">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${getText(
                "neutralDanmu",
                language
              )}</span>
              <span class="stat-value" id="neutral-danmu">0</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(analysisPanel);

    // 添加关闭按钮事件
    const closeBtn = analysisPanel.querySelector(".close-btn");
    closeBtn.addEventListener("click", () => {
      analysisPanel.remove();
      analysisPanel = null;
    });

    // 添加标签页切换事件
    const tabBtns = analysisPanel.querySelectorAll(".tab-btn");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");

        // 更新按钮状态
        tabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // 更新内容显示
        const tabContents = analysisPanel.querySelectorAll(".tab-content");
        tabContents.forEach((content) => {
          content.classList.remove("active");
          if (content.id === `${tabId}-content`) {
            content.classList.add("active");
          }
        });
      });
    });
  });
}

// 使用LLM进行分词
function tokenizeWithLLM(danmuList, callback) {
  // 检查用户是否启用了LLM分析
  chrome.storage.local.get(["useLLM", "llmApiKey", "llmProvider"], (result) => {
    // 确保result对象存在并添加默认值
    result = result || {};
    const useLLM = result.useLLM === true;
    const llmApiKey = result.llmApiKey || "";

    if (!useLLM || !llmApiKey) {
      // 如果未启用LLM或没有API密钥，使用传统方法
      callback(null);
      return;
    }

    // 准备请求参数
    const provider = result.llmProvider || "groq";
    const prompt = `请对以下B站弹幕进行分词，只返回分词结果，不要包含任何其他解释或说明。每行一条弹幕，分词结果用空格分隔。\n\n${danmuList
      .slice(0, 100)
      .join(
        "\n"
      )}\n\n请按每条弹幕一行，格式为：弹幕内容 -> 分词结果（空格分隔）`;

    let apiUrl, headers, body;

    // 根据不同的提供商设置请求参数
    switch (provider) {
      case "openai":
        apiUrl = "https://api.openai.com/v1/chat/completions";
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llmApiKey}`,
        };
        body = JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
        });
        break;
      case "groq":
        apiUrl = "https://api.groq.com/openai/v1/chat/completions";
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llmApiKey}`,
        };
        body = JSON.stringify({
          model: "meta-llama/llama-4-maverick-17b-128e-instruct",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
        });
        break;
      case "moonshot":
        apiUrl = "https://api.moonshot.cn/v1/chat/completions";
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llmApiKey}`,
        };
        body = JSON.stringify({
          model: "moonshot-v1-8k",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
        });
        break;
      case "anthropic":
        apiUrl = "https://api.anthropic.com/v1/messages";
        headers = {
          "Content-Type": "application/json",
          "x-api-key": llmApiKey,
          "anthropic-version": "2023-06-01",
        };
        body = JSON.stringify({
          model: "claude-3-haiku-20240307",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
        });
        break;
      default:
        apiUrl = "https://api.openai.com/v1/chat/completions";
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llmApiKey}`,
        };
        body = JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
        });
    }

    // 发送请求到LLM API
    fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: body,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("API请求失败");
        }
        return response.json();
      })
      .then((data) => {
        // 解析返回结果
        let responseText = "";
        if (provider === "anthropic") {
          responseText = data.content[0]?.text || "";
        } else {
          responseText = data.choices[0]?.message?.content || "";
        }

        // 解析分词结果
        const tokenizedResult = new Map();
        if (responseText) {
          const lines = responseText.split("\n");
          lines.forEach((line) => {
            const parts = line.split("->");
            if (parts.length === 2) {
              const danmu = parts[0].trim();
              const tokens = parts[1].trim().split(/\s+/);
              tokenizedResult.set(danmu, tokens);
            }
          });
        }

        callback(tokenizedResult);
      })
      .catch((error) => {
        console.error("LLM分词失败:", error);
        // 发生错误时返回null，使用传统分词方法
        callback(null);
      });
  });
}

// 使用LLM进行弹幕情绪分析
function analyzeDanmuWithLLM(danmuList, callback) {
  // 检查用户是否启用了LLM分析
  chrome.storage.local.get(["useLLM", "llmApiKey", "llmProvider"], (result) => {
    // 确保result对象存在并添加默认值
    result = result || {};
    const useLLM = result.useLLM === true;
    const llmApiKey = result.llmApiKey || "";

    if (!useLLM || !llmApiKey) {
      // 如果未启用LLM或没有API密钥，使用传统方法
      callback(classifyDanmu(danmuList));
      return;
    }

    // 准备请求参数
    const provider = result.llmProvider || "groq";
    const prompt = `分析以下B站弹幕的情绪倾向。每条弹幕只能标记为正面、负面或中性。\n\n${danmuList.join(
      "\n"
    )}\n\n请按每条弹幕一行，格式为：弹幕内容 -> 情绪（正面/负面/中性）`;

    let apiUrl, headers, body;

    // 根据不同的提供商设置请求参数
    switch (provider) {
      case "openai":
        apiUrl = "https://api.openai.com/v1/chat/completions";
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llmApiKey}`,
        };
        body = JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
        });
        break;
      case "groq":
        apiUrl = "https://api.groq.com/openai/v1/chat/completions";
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llmApiKey}`,
        };
        body = JSON.stringify({
          model: "meta-llama/llama-4-maverick-17b-128e-instruct",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
        });
        break;
      case "moonshot":
        apiUrl = "https://api.moonshot.cn/v1/chat/completions";
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llmApiKey}`,
        };
        body = JSON.stringify({
          model: "moonshot-v1-8k",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
        });
        break;
      case "anthropic":
        apiUrl = "https://api.anthropic.com/v1/messages";
        headers = {
          "Content-Type": "application/json",
          "x-api-key": llmApiKey,
          "anthropic-version": "2023-06-01",
        };
        body = JSON.stringify({
          model: "claude-3-haiku-20240307",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
        });
        break;
      default:
        apiUrl = "https://api.openai.com/v1/chat/completions";
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llmApiKey}`,
        };
        body = JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
        });
    }

    // 发送请求到LLM API
    fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: body,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("API请求失败");
        }
        return response.json();
      })
      .then((data) => {
        // 解析返回结果
        let responseText = "";
        if (provider === "anthropic") {
          responseText = data.content[0]?.text || "";
        } else {
          responseText = data.choices[0]?.message?.content || "";
        }

        // 获取当前语言设置
        return Promise.all([responseText, getLanguage()]);
      })
      .then(([responseText, language]) => {
        // 解析情绪结果
        const classifiedDanmu = {
          allDanmu: danmuList,
          positiveDanmu: [],
          negativeDanmu: [],
          neutralDanmu: [],
        };

        // 根据当前语言获取情绪关键词
        const positiveKeyword = getText("positive", language);
        const negativeKeyword = getText("negative", language);

        // 简单的结果解析逻辑
        if (responseText) {
          const lines = responseText.split("\n");
          lines.forEach((line) => {
            const parts = line.split("->");
            if (parts.length === 2) {
              const danmu = parts[0].trim();
              const sentiment = parts[1].trim().toLowerCase();

              if (sentiment.includes(positiveKeyword.toLowerCase())) {
                classifiedDanmu.positiveDanmu.push(danmu);
              } else if (sentiment.includes(negativeKeyword.toLowerCase())) {
                classifiedDanmu.negativeDanmu.push(danmu);
              } else {
                classifiedDanmu.neutralDanmu.push(danmu);
              }
            }
          });
        }

        // 如果LLM分析失败，回退到传统方法
        if (
          classifiedDanmu.positiveDanmu.length === 0 &&
          classifiedDanmu.negativeDanmu.length === 0 &&
          classifiedDanmu.neutralDanmu.length === 0
        ) {
          callback(classifyDanmu(danmuList));
        } else {
          callback(classifiedDanmu);
        }
      })
      .catch((error) => {
        console.error("LLM分析失败:", error);
        // 发生错误时回退到传统方法
        callback(classifyDanmu(danmuList));
      });
  });
}

// 修改startDanmuAnalysis函数，支持LLM分析
function startDanmuAnalysis() {
  // 立即显示spinner
  setTimeout(() => {
    const spinner = document.getElementById("wordcloud-spinner");
    if (spinner) {
      spinner.style.display = "block";
    }
  }, 100);

  setTimeout(() => {
    // const danmuList = collectDanmu();
    // const danmuList = [];
    // if (danmuList.length > 0) {
    //   // 使用LLM进行分析，失败时自动回退到传统方法
    //   analyzeDanmuWithLLM(danmuList, (classifiedDanmu) => {
    //     updateStats(classifiedDanmu);
    //     generateWordCloud(classifiedDanmu.allDanmu);
    //     generateSentimentChart(classifiedDanmu);
    //
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

// 修改fetchDanmuFromAPI函数，先去重后加权处理
function fetchDanmuFromAPI() {
  const videoId = getVideoId();
  if (!videoId) return;

  // 构建获取cid的URL
  const isBvId = videoId.startsWith("BV");
  const cidUrl = isBvId
    ? `https://api.bilibili.com/x/web-interface/view?bvid=${videoId}`
    : `https://api.bilibili.com/x/web-interface/view?aid=${videoId.replace(
        "av",
        ""
      )}`;

  // 先获取视频的cid
  fetch(cidUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.code === 0 && data.data && data.data.cid) {
        const cid = data.data.cid;
        // 使用cid获取弹幕
        const danmuUrl = `https://comment.bilibili.com/${cid}.xml`;

        fetch(danmuUrl)
          .then((response) => response.text())
          .then((xmlText) => {
            // 解析XML获取弹幕文本
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const dItems = xmlDoc.getElementsByTagName("d");

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
                  neutralDanmu: [],
                };

                // 根据弹幕频率重新计算情绪分类
                classifiedDanmu.positiveDanmu.forEach((danmu) => {
                  const frequency = danmuFrequency.get(danmu);
                  for (let i = 0; i < frequency; i++) {
                    weightedClassifiedDanmu.positiveDanmu.push(danmu);
                  }
                });

                classifiedDanmu.negativeDanmu.forEach((danmu) => {
                  const frequency = danmuFrequency.get(danmu);
                  for (let i = 0; i < frequency; i++) {
                    weightedClassifiedDanmu.negativeDanmu.push(danmu);
                  }
                });

                classifiedDanmu.neutralDanmu.forEach((danmu) => {
                  const frequency = danmuFrequency.get(danmu);
                  for (let i = 0; i < frequency; i++) {
                    weightedClassifiedDanmu.neutralDanmu.push(danmu);
                  }
                });

                // 先使用LLM进行分词，再生成单词云
                tokenizeWithLLM(uniqueDanmuList, (tokenizedResult) => {
                  updateStats(weightedClassifiedDanmu);
                  generateWordCloud(
                    classifiedDanmu.allDanmu,
                    danmuFrequency,
                    tokenizedResult
                  );
                  generateSentimentChart(weightedClassifiedDanmu);
                });
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
  const totalDanmu =
    classifiedDanmu.originalCount || classifiedDanmu.allDanmu.length;
  const positiveDanmu = classifiedDanmu.positiveDanmu.length;
  const negativeDanmu = classifiedDanmu.negativeDanmu.length;
  const neutralDanmu = classifiedDanmu.neutralDanmu.length;

  document.getElementById("total-danmu").textContent = totalDanmu;
  document.getElementById("positive-danmu").textContent = positiveDanmu;
  document.getElementById("negative-danmu").textContent = negativeDanmu;
  document.getElementById("neutral-danmu").textContent = neutralDanmu;
}

// 生成单词云
function generateWordCloud(danmuList, danmuFrequency, tokenizedResult) {
  if (!analysisPanel) return;

  let canvas = document.getElementById("wordcloud-canvas");
  let canvas3d = document.getElementById("wordcloud-canvas-3d");

  // 清空画布
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 清除3D容器内容
  if (canvas3d && canvas3d._3dCleanup) {
    canvas3d._3dCleanup();
  }
  while (canvas3d && canvas3d.firstChild) {
    canvas3d.removeChild(canvas3d.firstChild);
  }

  // 保存单词数据和频率，用于放大显示
  let savedWords = [];
  let savedWordFrequency = {};

  // 移除之前的点击事件监听器，避免重复添加
  const newCanvas = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(newCanvas, canvas);
  canvas = newCanvas;

  // 使用传入的弹幕频率信息或重新计算
  let wordFrequency = {};

  // 如果有LLM分词结果，使用LLM分词结果
  if (tokenizedResult instanceof Map && tokenizedResult.size > 0) {
    tokenizedResult.forEach((tokens, danmu) => {
      const frequency = danmuFrequency.get(danmu) || 1;
      tokens.forEach((token) => {
        if (token.length > 1) {
          wordFrequency[token] = (wordFrequency[token] || 0) + frequency;
        }
      });
    });
  } else if (danmuFrequency instanceof Map) {
    // 将每个弹幕句子拆分为单词并统计频率
    danmuFrequency.forEach((frequency, danmu) => {
      const words = danmu.split(/[\s,，。！？；;.!?]+/);
      words.forEach((word) => {
        if (word.length > 1) {
          // 单词频率乘以弹幕出现次数
          wordFrequency[word] = (wordFrequency[word] || 0) + frequency;
        }
      });
    });
  } else {
    // 简单的单词频率统计
    danmuList.forEach((text) => {
      const words = text.split(/[\s,，。！？；;.!?]+/);
      words.forEach((word) => {
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

  // 保存单词数据，用于放大显示
  savedWords = words;
  savedWordFrequency = wordFrequency;

  // 获取当前选择的显示模式
  const wordcloudType =
    document.querySelector('input[name="wordcloud-type"]:checked')?.value ||
    "2d";

  // 根据选择的模式显示相应的容器
  if (wordcloudType === "2d") {
    canvas.style.display = "block";
    if (canvas3d) canvas3d.style.display = "none";

    // 使用wordcloud库生成单词云
    if (window.wordcloud && words.length > 0) {
      try {
        // 计算频率的最大值和最小值，用于归一化颜色
        let maxFreq = 0;
        let minFreq = Infinity;
        words.forEach((word) => {
          maxFreq = Math.max(maxFreq, word[1]);
          minFreq = Math.min(minFreq, word[1]);
        });
        const freqRange = maxFreq - minFreq || 1;

        window.wordcloud(canvas, {
          list: words,
          gridSize: 12,
          weightFactor: 15, // 增加权重因子使字体大小差异更明显
          fontFamily: "Arial, sans-serif",
          color: function (word, weight, fontSize, distance, theta) {
            // 根据单词频率计算归一化值
            const normalizedFreq = (weight - minFreq) / freqRange;
            // 高频词使用更鲜艳的颜色（更高饱和度和适中亮度）
            const saturation = 60 + normalizedFreq * 30; // 60%到90%
            const lightness = 40 + normalizedFreq * 20; // 40%到60%
            // 使用黄金角度算法生成颜色，使颜色分布更均匀
            const hue = (weight * 137.5) % 360;
            return "hsl(" + hue + ", " + saturation + "%, " + lightness + "%)";
          },
          rotateRatio: 0.4, // 减少旋转比例，使文本更易读
          rotationSteps: 2,
          backgroundColor: "transparent",
          drawOutOfBound: false,
          shrinkToFit: true,
          shape: "circle",
          ellipticity: 0.7, // 稍微增加椭圆率
        });
      } catch (error) {
        // 如果wordcloud库加载失败，使用简单的备选方法
        drawSimpleWordCloud(canvas, words);
      }
    } else if (words.length > 0) {
      // 如果库未加载，使用简单的备选方法
      drawSimpleWordCloud(canvas, words);
    }
  } else if (canvas3d) {
    canvas.style.display = "none";
    canvas3d.style.display = "block";

    generate3DWordCloud(canvas3d, words);
  }

  // 隐藏spinner
  setTimeout(() => {
    const spinner = document.getElementById("wordcloud-spinner");
    if (spinner) {
      spinner.style.display = "none";
    }
  }, 300);

  // 添加点击单词云放大功能
  if (wordcloudType === "2d") {
    canvas.addEventListener("click", function () {
      // 创建放大后的弹窗
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
      overlay.style.zIndex = "9999";
      overlay.style.display = "flex";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.style.cursor = "pointer";

      // 创建放大后的画布容器
      const container = document.createElement("div");
      container.style.backgroundColor = "white";
      container.style.padding = "20px";
      container.style.borderRadius = "8px";
      container.style.maxWidth = "80%";
      container.style.maxHeight = "80%";

      // 创建放大后的画布
      const largeCanvas = document.createElement("canvas");
      largeCanvas.width = 800;
      largeCanvas.height = 600;
      largeCanvas.style.maxWidth = "100%";
      largeCanvas.style.maxHeight = "100%";
      container.appendChild(largeCanvas);
      overlay.appendChild(container);

      document.body.appendChild(overlay);

      // 绘制放大的单词云
      if (window.wordcloud && savedWords.length > 0) {
        try {
          // 计算频率的最大值和最小值，用于归一化颜色
          let maxFreq = 0;
          let minFreq = Infinity;
          savedWords.forEach((word) => {
            maxFreq = Math.max(maxFreq, word[1]);
            minFreq = Math.min(minFreq, word[1]);
          });
          const freqRange = maxFreq - minFreq || 1;

          window.wordcloud(largeCanvas, {
            list: savedWords,
            gridSize: 20,
            weightFactor: 25, // 增加权重因子使字体大小差异更明显
            fontFamily: "Arial, sans-serif",
            color: function (word, weight, fontSize, distance, theta) {
              // 根据单词频率计算归一化值
              const normalizedFreq = (weight - minFreq) / freqRange;
              // 高频词使用更鲜艳的颜色（更高饱和度和适中亮度）
              const saturation = 60 + normalizedFreq * 30; // 60%到90%
              const lightness = 40 + normalizedFreq * 20; // 40%到60%
              // 使用黄金角度算法生成颜色，使颜色分布更均匀
              const hue = (weight * 137.5) % 360;
              return (
                "hsl(" + hue + ", " + saturation + "%, " + lightness + "%)"
              );
            },
            rotateRatio: 0.4, // 减少旋转比例，使文本更易读
            rotationSteps: 2,
            backgroundColor: "transparent",
            drawOutOfBound: false,
            shrinkToFit: true,
            shape: "circle",
            ellipticity: 0.7, // 稍微增加椭圆率
          });
        } catch (error) {
          // 如果wordcloud库加载失败，使用简单的备选方法
          const ctx = largeCanvas.getContext("2d");
          drawSimpleWordCloud(largeCanvas, savedWords);
        }
      } else if (savedWords.length > 0) {
        // 如果库未加载，使用简单的备选方法
        const ctx = largeCanvas.getContext("2d");
        drawSimpleWordCloud(largeCanvas, savedWords);
      }

      // 点击空白处关闭放大视图
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });
    });
  }

  // 添加3D/2D切换事件
  const radioButtons = document.querySelectorAll(
    'input[name="wordcloud-type"]'
  );
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", () => {
      generateWordCloud(danmuList, danmuFrequency, tokenizedResult);
    });
  });
}

// 生成3D单词云
function generate3DWordCloud(container, words) {
  if (!window.THREE) return;

  const width = container.clientWidth;
  const height = container.clientHeight;
  const max = Math.max(width, height);

  // 创建场景
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);

  // 创建相机
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1500);
  camera.updateProjectionMatrix();
  camera.position.set(0, max * 0.4, 0);

  // 创建渲染器
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);
  
  // 保存单词数据用于全屏显示
  const savedWords = words;
  
  // 添加点击全屏功能
  renderer.domElement.style.cursor = 'pointer';
  renderer.domElement.addEventListener('click', function() {
    // 创建全屏覆盖层
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.cursor = 'pointer';
    
    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.padding = '10px 20px';
    closeBtn.style.backgroundColor = '#fff';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '5px';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.zIndex = '10000';
    overlay.appendChild(closeBtn);
    
    // 创建全屏容器
    const fullscreenContainer = document.createElement('div');
    fullscreenContainer.style.width = '90%';
    fullscreenContainer.style.height = '90%';
    overlay.appendChild(fullscreenContainer);
    
    document.body.appendChild(overlay);
    
    // 在全屏容器中重新生成3D词云
    generate3DWordCloudFullscreen(fullscreenContainer, savedWords);
    
    // 点击关闭按钮或覆盖层关闭全屏
    function closeFullscreen() {
      if (fullscreenContainer._3dCleanup) {
        fullscreenContainer._3dCleanup();
      }
      document.body.removeChild(overlay);
    }
    
    closeBtn.addEventListener('click', closeFullscreen);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeFullscreen();
      }
    });
  });

  // 添加灯光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight1.position.set(1, 1, 1);
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight2.position.set(-1, -1, -1);
  scene.add(directionalLight2);

  // 计算单词频率的范围
  let maxFreq = 0;
  let minFreq = Infinity;
  words.forEach((word) => {
    maxFreq = Math.max(maxFreq, word[1]);
    minFreq = Math.min(minFreq, word[1]);
  });
  const freqRange = maxFreq - minFreq || 1;

  // 生成单词大小和高度的缩放函数
  const sizeScale = d3.scaleLinear
    ? d3.scaleLinear().domain([minFreq, maxFreq]).range([10, 40])
    : (value) => 10 + ((value - minFreq) / freqRange) * 30;

  const heightScale = d3.scaleLinear
    ? d3.scaleLinear().domain([minFreq, maxFreq]).range([2, 20])
    : (value) => 2 + ((value - minFreq) / freqRange) * 18;

  // 确保fontLoader只被声明一次
  let fontLoader;
  if (!fontLoader) {
    fontLoader = new THREE.FontLoader();
  }

  // 使用内置字体并优化中文字符支持
  const fontUrl = chrome.runtime.getURL('lib/helvetiker_regular.typeface.json');

  fontLoader.load(fontUrl, function (font) {
    // 计算频率归一化值并创建3D文字
    words.forEach((word, index) => {
      const text = word[0];
      const frequency = word[1];
      const normalizedFreq = (frequency - minFreq) / freqRange;

      // 计算字体大小和厚度
      const fontSize = sizeScale(frequency);
      const textHeight = heightScale(frequency);

      // 根据频率计算颜色
      const hue = (frequency * 137.5) % 360;
      const saturation = 60 + normalizedFreq * 30;
      const lightness = 40 + normalizedFreq * 20;
      const color = new THREE.Color(
        `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`
      );

      let textMesh;
      // 检查是否包含中文字符
      if (/[\u4e00-\u9fa5]/.test(text)) {
        // 使用Canvas渲染中文字符
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const textSize = fontSize * 10;
        canvas.width = textSize * text.length;
        canvas.height = textSize * 2;
        
        context.font = `${textSize}px Arial`;
        context.fillStyle = color.getStyle();
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const geometry = new THREE.PlaneGeometry(canvas.width / 10, canvas.height / 10);
        textMesh = new THREE.Mesh(geometry, material);
      } else {
        // 创建文字几何体
        const geometry = new THREE.TextBufferGeometry(text, {
          font: font,
          size: fontSize,
          height: textHeight,
          curveSegments: 3,
          bevelThickness: 1,
          bevelSize: 0.5,
          bevelEnabled: true,
        });

        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        // 计算文字的中心位置，使其居中
        const centerOffset =
          -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

        // 创建材质
        const material = new THREE.MeshPhongMaterial({
          color: color,
          flatShading: false,
        });

        // 创建网格
        textMesh = new THREE.Mesh(geometry, material);
      }

      // 计算文字的位置（球面上的随机分布）
      const radius =
        Math.min(width, height) * 0.4 * (0.3 + normalizedFreq * 0.7);
      const phi = Math.acos(-1 + (2 * index) / words.length);
      const theta = Math.sqrt(words.length * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      textMesh.position.set(x, y, z);
      textMesh.rotation.x = Math.random() * Math.PI * 2;
      textMesh.rotation.y = Math.random() * Math.PI * 2;
      textMesh.rotation.z = Math.random() * Math.PI * 2;

      // 添加到场景
      scene.add(textMesh);
    });

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;
    controls.enableZoom = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;

    // 动画循环
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    // 响应窗口大小变化
    function onWindowResize() {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
    }

    window.addEventListener("resize", onWindowResize);

    // 清理函数
    container._3dCleanup = () => {
      window.removeEventListener("resize", onWindowResize);
      renderer.dispose();
      scene.clear();
    };
  });
}

// 全屏3D单词云生成函数
function generate3DWordCloudFullscreen(container, words) {
  if (!window.THREE) return;

  const width = container.clientWidth;
  const height = container.clientHeight;
  const max = Math.max(width, height);

  // 创建场景
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // 创建相机
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1500);
  camera.updateProjectionMatrix();
  camera.position.set(0, max * 0.4, 0);

  // 创建渲染器
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // 添加灯光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight1.position.set(1, 1, 1);
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight2.position.set(-1, -1, -1);
  scene.add(directionalLight2);

  // 计算单词频率的范围
  let maxFreq = 0;
  let minFreq = Infinity;
  words.forEach((word) => {
    maxFreq = Math.max(maxFreq, word[1]);
    minFreq = Math.min(minFreq, word[1]);
  });
  const freqRange = maxFreq - minFreq || 1;

  // 生成单词大小和高度的缩放函数（全屏模式下更大）
  const sizeScale = d3.scaleLinear
    ? d3.scaleLinear().domain([minFreq, maxFreq]).range([20, 80])
    : (value) => 20 + ((value - minFreq) / freqRange) * 60;

  const heightScale = d3.scaleLinear
    ? d3.scaleLinear().domain([minFreq, maxFreq]).range([4, 40])
    : (value) => 4 + ((value - minFreq) / freqRange) * 36;

  // 确保fontLoader只被声明一次
  let fontLoader;
  if (!fontLoader) {
    fontLoader = new THREE.FontLoader();
  }

  // 使用内置字体并优化中文字符支持
  const fontUrl = chrome.runtime.getURL('lib/helvetiker_regular.typeface.json');

  fontLoader.load(fontUrl, function (font) {
    // 计算频率归一化值并创建3D文字
    words.forEach((word, index) => {
      const text = word[0];
      const frequency = word[1];
      const normalizedFreq = (frequency - minFreq) / freqRange;

      // 计算字体大小和厚度
      const fontSize = sizeScale(frequency);
      const textHeight = heightScale(frequency);

      // 根据频率计算颜色
      const hue = (frequency * 137.5) % 360;
      const saturation = 60 + normalizedFreq * 30;
      const lightness = 40 + normalizedFreq * 20;
      const color = new THREE.Color(
        `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`
      );

      let textMesh;
      // 检查是否包含中文字符
      if (/[\u4e00-\u9fa5]/.test(text)) {
        // 使用Canvas渲染中文字符
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const textSize = fontSize * 10;
        canvas.width = textSize * text.length;
        canvas.height = textSize * 2;
        
        context.font = `${textSize}px Arial`;
        context.fillStyle = color.getStyle();
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const geometry = new THREE.PlaneGeometry(canvas.width / 10, canvas.height / 10);
        textMesh = new THREE.Mesh(geometry, material);
      } else {
        // 创建文字几何体
        const geometry = new THREE.TextBufferGeometry(text, {
          font: font,
          size: fontSize,
          height: textHeight,
          curveSegments: 3,
          bevelThickness: 1,
          bevelSize: 0.5,
          bevelEnabled: true,
        });

        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        // 创建材质
        const material = new THREE.MeshPhongMaterial({
          color: color,
          flatShading: false,
        });

        // 创建网格
        textMesh = new THREE.Mesh(geometry, material);
      }

      // 计算文字的位置（球面上的随机分布）
      const radius = max * 0.4 * (0.3 + normalizedFreq * 0.7);
      const phi = Math.acos(-1 + (2 * index) / words.length);
      const theta = Math.sqrt(words.length * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      textMesh.position.set(x, y, z);
      textMesh.rotation.x = Math.random() * Math.PI * 2;
      textMesh.rotation.y = Math.random() * Math.PI * 2;
      textMesh.rotation.z = Math.random() * Math.PI * 2;

      // 添加到场景
      scene.add(textMesh);
    });

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;
    controls.enableZoom = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;

    // 动画循环
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    // 响应窗口大小变化
    function onWindowResize() {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
    }

    window.addEventListener("resize", onWindowResize);

    // 清理函数
    container._3dCleanup = () => {
      window.removeEventListener("resize", onWindowResize);
      renderer.dispose();
      scene.clear();
    };
  });
}

// 简单的单词云绘制方法（备选方案）
function drawSimpleWordCloud(canvas, words) {
  const ctx = canvas.getContext("2d");
  ctx.textAlign = "center";

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // 计算频率的最大值和最小值，用于归一化
  let maxFreq = 0;
  let minFreq = Infinity;
  words.forEach((word) => {
    maxFreq = Math.max(maxFreq, word[1]);
    minFreq = Math.min(minFreq, word[1]);
  });

  // 确保分母不为0
  const freqRange = maxFreq - minFreq || 1;

  // 创建一个用于存储已放置单词的区域，避免重叠
  const placedWords = [];

  words.forEach((word, index) => {
    // 根据频率计算字体大小，高频词更大
    const normalizedFreq = (word[1] - minFreq) / freqRange;
    const fontSize = 12 + normalizedFreq * 40; // 12px到52px的范围
    ctx.font = `${fontSize}px Arial, sans-serif`;

    // 计算单词宽度
    const wordWidth = ctx.measureText(word[0]).width;

    // 高频词放在中心附近，低频词放在外围
    const ringFactor = 1 - normalizedFreq * 0.7; // 0.3到1的范围
    const attempts = 50; // 最大尝试次数
    let placed = false;

    for (let attempt = 0; attempt < attempts && !placed; attempt++) {
      // 基于频率和尝试次数计算位置
      let angle;
      let radius;

      if (attempt === 0) {
        // 第一次尝试：理想位置
        angle = (index / words.length) * Math.PI * 2;
        radius = ringFactor * Math.min(centerX, centerY) * 0.8;
      } else {
        // 后续尝试：在理想位置周围随机偏移
        angle =
          (index / words.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        radius =
          ringFactor *
          Math.min(centerX, centerY) *
          0.8 *
          (0.9 + Math.random() * 0.2);
      }

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // 检查是否与已放置的单词重叠
      let overlap = false;
      for (const placedWord of placedWords) {
        const dx = x - placedWord.x;
        const dy = y - placedWord.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (wordWidth + placedWord.width) / 2 + 10;

        if (distance < minDistance) {
          overlap = true;
          break;
        }
      }

      if (
        !overlap &&
        x > wordWidth / 2 &&
        x < canvas.width - wordWidth / 2 &&
        y > fontSize / 2 &&
        y < canvas.height - fontSize / 2
      ) {
        // 根据频率设置颜色，高频词更鲜艳
        const saturation = 60 + normalizedFreq * 30; // 60%到90%的饱和度
        const lightness = 40 + normalizedFreq * 20; // 40%到60%的亮度
        const hue = (word[1] * 137.5) % 360; // 使用黄金角度分散颜色
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

        // 随机轻微旋转
        const rotation = (Math.random() - 0.5) * 0.5; // -0.25到0.25弧度

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillText(word[0], 0, 0);
        ctx.restore();

        // 记录已放置的单词
        placedWords.push({ x, y, width: wordWidth });
        placed = true;
      }
    }

    // 如果尝试多次仍无法放置，则使用简单方式放置到边缘
    if (!placed) {
      const angle = (index / words.length) * Math.PI * 2;
      const radius = Math.min(centerX, centerY) * 0.9;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      ctx.fillStyle = `hsl(${(word[1] * 137.5) % 360}, 70%, 50%)`;
      ctx.fillText(word[0], x, y);
    }
  });
}

// 生成情绪分析图表
function generateSentimentChart(classifiedDanmu) {
  if (!analysisPanel) return;

  const div = document.getElementById("sentiment-chart");

  const positiveCount = classifiedDanmu.positiveDanmu.length;
  const negativeCount = classifiedDanmu.negativeDanmu.length;
  const neutralCount = classifiedDanmu.neutralDanmu.length;

  // 将数据存储到sessionStorage中
  sessionStorage.setItem(
    "chart_data",
    JSON.stringify({
      positiveCount: positiveCount,
      negativeCount: negativeCount,
      neutralCount: neutralCount,
    })
  );

  div.style.width = "100%";
  div.style.height = "300px";

  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }

  // 创建图表容器
  const chartContainer = document.createElement("div");
  chartContainer.id = "anychart-container";
  chartContainer.style.width = "100%";
  chartContainer.style.height = "300px";
  div.appendChild(chartContainer);

  if (window.anychart) {
    try {
      // 创建饼图数据
      const data = [
        ["正面", positiveCount],
        ["负面", negativeCount],
        ["中性", neutralCount],
      ];

      // 创建图表
      var chart = anychart.pie3d(data);

      // 设置图表属性
      // chart.title("弹幕情绪分析");
      const total = positiveCount + negativeCount + neutralCount;
      chart.title().enabled(false);
      chart.radius("70%");
      chart.palette(["#4CAF50", "#F44336", "#9E9E9E"]);
      chart.legend().position("bottom");
      chart.legend().itemsFormat(function () {
        const total = positiveCount + negativeCount + neutralCount;
        const percentage =
          total > 0 ? Math.round((this.value / total) * 100) : 0;
        return this.name + ": " + percentage + "%";
      });
      chart.credits().enabled(false);

      // 设置tooltip
      chart.tooltip().format(function () {
        const percentage =
          total > 0 ? Math.round((this.value / total) * 100) : 0;
        return this.name + ": " + this.value + " (" + percentage + "%)";
      });

      // 渲染图表
      chart.container("anychart-container");
      chart.draw();
    } catch (error) {
      // 如果anychart加载或渲染失败，使用备选方案
      console.error("anychart加载或渲染失败:", error);
    }
  } else {
    console.error("anychart加载或渲染失败");
  }
}

// 页面加载完成后尝试自动分析
if (document.readyState === "complete") {
  // 延迟执行，确保页面完全加载
  setTimeout(() => {
    const url = window.location.href;
    if (url.includes("bilibili.com/video/")) {
      // 可以在这里添加自动显示分析面板的逻辑
    }
  }, 3000);
} else {
  window.addEventListener("load", () => {
    setTimeout(() => {
      const url = window.location.href;
      if (url.includes("bilibili.com/video/")) {
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
  const positiveKeywords = [
    "精彩",
    "不错",
    "好",
    "棒",
    "666",
    "加油",
    "爱了",
    "喜欢",
    "厉害",
    "优秀",
    "好看",
    "好评",
    "赞",
    "支持",
  ];
  const negativeKeywords = [
    "不好",
    "无聊",
    "差",
    "垃圾",
    "失望",
    "一般",
    "讨厌",
    "烂",
    "low",
    "恶心",
    "糟糕",
  ];

  const positiveDanmu = [];
  const negativeDanmu = [];
  const neutralDanmu = [];

  danmuList.forEach((text) => {
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
    neutralDanmu,
  };
}

# Chrome Web Store 发布指南

## 概述
本指南将帮助您完成哔哩哔哩弹幕分析扩展的发布流程，解决所有发布前的要求。

## 1. 提供并验证联系邮箱

1. 登录 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 点击左侧导航栏中的 **"Account"** 标签
3. 在 **"Contact email"** 字段中输入您的联系邮箱
4. 点击 **"Save"** 按钮保存更改
5. 系统会发送验证邮件到您提供的邮箱
6. 打开邮件并点击验证链接完成邮箱验证

## 2. 填写隐私实践信息

导航到扩展编辑页面的 **"Privacy practices"** 标签，完成以下内容：

### 单一目的描述
输入以下内容：
> 分析哔哩哔哩视频的弹幕内容，生成单词云与情绪可视化图表，帮助用户了解视频观众的反馈和情绪倾向。

### 权限使用理由

#### activeTab 权限
> 用于获取当前活动的哔哩哔哩视频页面标签，以便扩展能够在用户点击扩展图标时与该页面进行交互，创建分析面板并开始弹幕分析。仅在用户主动点击扩展图标且当前页面为哔哩哔哩网站时激活。

#### scripting 权限
> 用于在哔哩哔哩视频页面上执行JavaScript代码，以创建分析面板、收集弹幕数据并进行可视化展示。仅在哔哩哔哩视频页面上执行必要的脚本，且仅在用户主动点击扩展图标后触发。

#### storage 权限
> 用于在用户本地存储弹幕分析数据、用户首选项和LLM设置，以便用户可以在关闭并重新打开浏览器后继续查看之前的分析结果或使用之前的设置。所有存储的数据仅保存在用户本地设备上，不会上传到开发者服务器。

### 主机权限使用理由

#### https://*.bilibili.com/*
> 用于访问哔哩哔哩网站的内容和API，以便扩展能够获取视频弹幕数据并在页面上创建分析面板。仅在用户访问哔哩哔哩网站时生效，用于读取页面内容和创建UI元素。

#### https://api.openai.com/*
> 用于在用户选择使用OpenAI服务进行更深入的弹幕情绪分析时，允许扩展调用OpenAI的API。仅在用户明确启用LLM功能并选择OpenAI作为提供商时使用，且需要用户提供自己的API密钥。

#### https://api.groq.com/*
> 用于在用户选择使用Groq服务进行更深入的弹幕情绪分析时，允许扩展调用Groq的API。仅在用户明确启用LLM功能并选择Groq作为提供商时使用，且需要用户提供自己的API密钥。

#### https://api.moonshot.cn/*
> 用于在用户选择使用Moonshot服务进行更深入的弹幕情绪分析时，允许扩展调用Moonshot的API。仅在用户明确启用LLM功能并选择Moonshot作为提供商时使用，且需要用户提供自己的API密钥。

#### https://api.anthropic.com/*
> 用于在用户选择使用Anthropic服务进行更深入的弹幕情绪分析时，允许扩展调用Anthropic的API。仅在用户明确启用LLM功能并选择Anthropic作为提供商时使用，且需要用户提供自己的API密钥。

### 远程代码使用理由
> 扩展使用Chart.js和WordCloud.js两个远程库来实现数据可视化功能，这些库用于创建弹幕的情绪分布图和单词云。这些库已包含在扩展的安装包中，不会在运行时从外部服务器加载。所有包含的库都是经过验证的第三方库，不包含恶意代码。

### 认证数据使用合规性
- 勾选 **"I certify that my data usage complies with Developer Program Policies"** 复选框
- 确保您理解并同意Chrome Web Store的开发者政策

## 3. 提供截图或视频

1. 在扩展编辑页面的 **"Media"** 部分
2. 点击 **"Upload screenshots or video"** 按钮
3. 上传至少一张展示扩展功能的截图
   - 建议上传多张不同场景的截图
   - 尺寸建议：1280x800或1920x1080像素
   - 格式：PNG或JPEG
4. 确保截图清晰展示扩展的用户界面和核心功能

## 4. 重新生成扩展包

在完成所有准备工作后，确保使用最新的配置重新生成扩展包：

```bash
zip -r bili_danmu_ext.zip manifest.json background.js content.js popup.html popup.js styles.css icons/ lib/ README.md privacy_policy.md
```

## 5. 提交审核

1. 在开发者控制台中，点击 **"Upload new item"** 按钮
2. 选择重新生成的扩展包文件 (bili_danmu_ext.zip)
3. 填写所有必要的信息，包括扩展名称、描述、分类等
4. 完成所有前面提到的步骤（邮箱验证、隐私实践填写、截图上传等）
5. 点击 **"Submit for review"** 按钮提交扩展进行审核

## 6. 后续步骤

- 提交后，您可以在开发者控制台中查看审核状态
- 审核过程可能需要几天时间
- 审核通过后，您的扩展将在Chrome Web Store中发布
- 记得定期更新扩展以修复bug和添加新功能

## 注意事项

- 请确保所有提供的信息真实准确
- 遵守Chrome Web Store的所有政策和指导原则
- 保留所有源代码和资源文件，以备日后更新使用
- 定期检查开发者控制台中的消息和通知
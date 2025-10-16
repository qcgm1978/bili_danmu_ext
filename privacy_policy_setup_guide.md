# 隐私政策设置指南

## 为什么需要隐私政策？

根据Chrome Web Store的要求，**任何收集用户数据的扩展都必须有隐私政策**。您的哔哩哔哩弹幕分析扩展由于使用了storage权限存储用户数据，并且可能访问用户浏览的页面内容，因此必须提供隐私政策才能通过审核并发布。

## 如何配置隐私政策

### 步骤1：准备隐私政策文档

您已经创建了完整的`privacy_policy.md`文档，其中包含了必要的信息：
- 单一目的描述
- 各权限使用说明
- 主机权限说明
- 远程代码使用说明
- 数据使用合规声明

### 步骤2：发布隐私政策到公开可访问的网址

为了符合Chrome Web Store的要求，您需要将隐私政策发布到一个公开可访问的网址。推荐的方法是：

1. **创建GitHub仓库**（如果尚未创建）
2. 将`privacy_policy.md`文件添加到您的仓库中
3. 提交并推送到GitHub
4. 在GitHub上打开该文件，点击"Raw"按钮获取原始URL

### 步骤3：更新manifest.json中的隐私政策URL

我已经在manifest.json中添加了privacy_policy字段，但使用的是示例URL。请按照以下步骤更新为您自己的实际URL：

1. 打开`manifest.json`文件
2. 找到以下行：
   ```json
   "privacy_policy": "https://github.com/yourusername/bili_danmu_ext/blob/main/privacy_policy.md",
   ```
3. 将URL替换为您在GitHub上实际的隐私政策URL

### 步骤4：在Chrome Web Store开发者控制台中设置

1. 登录 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 选择您的扩展程序
3. 导航到"Privacy practices"标签页
4. 在"Privacy policy"部分：
   - 选择"Yes, my item has a privacy policy"
   - 在"Privacy policy URL"字段中输入您的隐私政策URL
5. 完成其他隐私实践信息的填写（参考publish_guide.md中的详细说明）
6. 保存更改

## 隐私政策URL格式要求

确保您的隐私政策URL符合以下要求：

1. 必须是完整的URL（包含https://）
2. 必须指向一个公开可访问的页面
3. 内容必须与扩展包中包含的privacy_policy.md文件一致
4. 必须使用用户可理解的语言（中文或英文）

## 额外提示

1. **定期更新隐私政策**：如果您的扩展功能或数据处理方式发生变化，请及时更新隐私政策

2. **保持透明**：清楚地说明您的扩展收集了什么数据，如何使用这些数据，以及与谁共享这些数据

3. **遵循最小权限原则**：只请求扩展功能所必需的权限，不要收集不必要的数据

4. **保留记录**：保留隐私政策的变更记录，以便在需要时参考

5. **检查合规性**：确保您的隐私政策符合所有适用的法律法规（如GDPR、CCPA等）

## 常见问题解答

### 问：我没有GitHub账号，怎么办？

**答**：您可以使用其他公开可访问的平台发布隐私政策，如GitLab、Bitbucket、您自己的网站等，只要URL是公开可访问的即可。

### 问：我的扩展不收集个人信息，还需要隐私政策吗？

**答**：是的。即使您的扩展不收集个人信息，如果它请求了某些权限（如storage），Chrome Web Store仍然要求您提供隐私政策来解释这些权限的使用方式。

### 问：隐私政策有字数限制吗？

**答**：没有严格的字数限制，但应该简明扼要，重点突出，确保用户能够容易地理解您的扩展如何处理他们的数据。

通过正确配置隐私政策，您的扩展将更容易通过Chrome Web Store的审核，同时也能提高用户对您扩展的信任度。
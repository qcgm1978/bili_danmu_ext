# Chrome Web Store Public Key 填写指南

## 什么是 Public Key？

在Chrome Web Store发布扩展时，Public Key（公钥）是一个用于验证扩展身份和管理更新的重要安全凭证。这个公钥与您的扩展程序唯一关联，主要用于以下目的：

1. 验证扩展的真实性和完整性
2. 确保扩展更新来自同一开发者
3. 防止未授权的扩展修改

## 何时需要填写 Public Key？

通常情况下，以下情况需要处理或填写Public Key：

1. 当您需要在扩展的manifest.json文件中指定`key`字段时
2. 当您在开发者控制台中看到相关提示时
3. 当您需要确保扩展更新机制正常工作时

## 如何获取 Public Key？

### 方法一：从已打包的扩展中获取

1. 首先，通过Chrome浏览器加载您的扩展程序（以开发者模式）
2. 打开Chrome浏览器，进入 `chrome://extensions/` 页面
3. 确保右上角的"开发者模式"已开启
4. 找到您的扩展，点击"详细信息"
5. 在页面底部找到"ID"字段，复制这个ID
6. 打开文件资源管理器，导航到以下路径：
   - Windows: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions\[扩展ID]\[版本号]\`
   - Mac: `~/Library/Application Support/Google/Chrome/Default/Extensions/[扩展ID]/[版本号]/`
7. 在该目录下找到`manifest.json`文件
8. 打开这个文件，您会在其中找到`key`字段，这就是您需要的Public Key

### 方法二：从Chrome Web Store开发者控制台获取

1. 登录 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 找到您已上传但尚未发布的扩展
3. 点击扩展名称进入详情页面
4. 在左侧导航栏中找到并点击"More info"或类似选项
5. 在页面中查找"Public key"或"Extension ID"相关信息
6. 复制完整的Public Key内容

## 如何在 Manifest.json 中填写 Public Key？

如果需要在manifest.json文件中添加Public Key，请按照以下格式添加：

```json
{
  "manifest_version": 3,
  "name": "哔哩哔哩弹幕分析",
  "version": "1.0",
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
  // 其他manifest配置...
}
```

**注意：**
- `key`字段应直接添加在manifest.json的顶层，与`manifest_version`、`name`等字段同级
- 完整的Public Key是一长串字符，请勿修改或截断
- 只有在特殊情况下才需要手动添加此字段，大多数情况下Chrome会自动处理

## 常见问题与解决方案

### 1. 我在开发者控制台中没有看到Public Key选项

- 确保您已上传扩展包
- 尝试刷新页面或等待几分钟，有时需要一些时间处理
- 如果您是首次发布扩展，可能需要先完成基本信息填写

### 2. 填写Public Key后出现验证错误

- 确保您复制的是完整的Public Key，没有遗漏任何字符
- 检查是否有多余的空格或换行符
- 确认您使用的是与当前扩展关联的正确Public Key

### 3. 是否必须在manifest.json中添加Public Key？

- 对于大多数普通扩展，不需要手动添加Public Key
- 只有在以下情况可能需要：
  - 您需要确保扩展ID保持不变
  - 您正在开发需要共享ID的多个相关扩展
  - Chrome开发者控制台特别要求您添加

## 重要提示

1. Public Key是您扩展程序的重要安全凭证，请妥善保管
2. 不要与他人共享您的完整Public Key
3. 如果您的Public Key不慎泄露，应及时在开发者控制台中重新生成
4. 在重新生成扩展包时，如果您在manifest.json中指定了key字段，请确保使用相同的Public Key

通过正确处理Public Key，您可以确保您的扩展程序在Chrome Web Store中的身份验证和更新机制正常工作。
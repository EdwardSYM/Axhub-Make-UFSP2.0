# 更新指南（更新现有 Axhub Make 项目）

本文档的阅读对象是 **AI Agent**。

目标：当用户说“更新 Axhub Make 项目”时，你应当在项目根目录执行更新并启动验证，最终回传本地 URL；若更新后启动失败，优先走最小恢复路径（例如 `package.json.backup.*`）。

---

## 角色与硬性约束

你是 **Axhub Make 项目更新助手**，通过驱动 `axhub-make` CLI 工具完成工作。

硬性约束（必须遵守）：
- 更新脚手架动作只能使用 `npx -y axhub-make ...`，不要手写脚手架逻辑
- 禁止：让用户手动敲命令（你直接执行，并回报结果）
- 更新前必须检查：Node.js、Git
- 更新命令必须包含：`npx -y axhub-make --no-start`
- 更新后必须启动：`npm run dev` 并回传 URL

输出要求：
- 每一步都要给出“执行了什么命令 + 关键结果”
- 最终必须回传 `npm run dev` 输出的本地访问地址（URL）

---

## 执行流程（必须按顺序）

### 0) 防跑错目录（必须）

从此以后，Axhub Make 项目的“更新识别”以根目录的 marker 文件为准：
- `.axhub/make/make.json`（内容要求：`{ "schemaVersion": 1, "projectType": "axhub-make" }`）

因此在更新前必须检查：
- 是否存在 `package.json`
- 是否存在 `.axhub/make/make.json` 且内容合法

若缺失或不合法：必须停止，让用户切到正确项目目录（不做旧项目兼容/迁移）。

### 1) Node.js 检查（必须）

```bash
node -v
```

- 未安装或版本过低（建议 < v18）：提示安装/升级并终止

### 2) Git 检查（必须）

```bash
git --version
```

- 未安装：提示安装并终止（脚手架需要 git 拉取模板）

### 3) 执行更新（必须命令）

```bash
npx -y axhub-make --no-start
```

说明：
- 必须包含 `-y`
- 必须包含 `--no-start`

### 4) 启动验证

```bash
npm run dev
```

把终端里输出的本地访问地址（URL）回传给用户，提醒用户打开验证。

---

## 更新会做什么（用于解释与排障）

更新遵循项目内的 `scaffold.update.json` 策略，一般原则：
- 用户业务内容默认保留（例如 `src/**`、`assets/**` 常被配置为不覆盖）
- 基础公共定义可能会强制更新（例如 `src/common/**`）
- `package.json` 如果有差异，通常会备份旧版本为 `package.json.backup.<timestamp>`，并将旧版本里“新版本缺失的依赖”合并到新版本中（避免丢依赖）

---

## 更新后出问题的最小恢复路径

### 1) 查找备份

```bash
ls -la package.json.backup.*
```

### 2) 恢复备份（只在确认是 package.json 引起的问题时）

```bash
cp package.json.backup.<timestamp> package.json
npm install
npm run dev
```

如果仍失败：继续收集 `npm install` / `npm run dev` 的报错，按“每次只修一个问题”的方式推进。

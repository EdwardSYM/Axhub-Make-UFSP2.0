# 旧架构更新规则（旧版 Axhub Make 项目升级到新架构）

本文档的阅读对象是 **AI Agent**。

目标：当用户明确表示要更新一个**旧架构 Axhub Make 项目**时，你应当先完成旧目录结构迁移，再执行标准更新，最后启动验证并回传本地 URL。

这里的“旧架构”特指：项目里还没有新版本 marker，且目录结构仍停留在旧命名方式，例如：
- `src/elements/`
- `src/pages/`
- `assets/docs/`

升级后的目标新结构为：
- `src/components/`
- `src/prototypes/`
- `src/docs/`

---

## 角色与硬性约束

你是 **Axhub Make 旧架构升级助手**，通过驱动 `axhub-make` CLI 工具完成工作。

硬性约束（必须遵守）：
- 更新脚手架动作只能使用 `npx -y axhub-make ...`，不要手写脚手架逻辑替代更新命令
- 禁止：让用户手动敲命令（你直接执行，并回报结果）
- 更新前必须检查：Node.js、Git
- 在执行 `npx -y axhub-make --no-start` 之前，必须先完成旧目录迁移
- 更新后必须启动：`npm run dev` 并回传 URL
- 每一步都要汇报“执行了什么命令 + 关键结果”

---

## 执行流程（必须按顺序）

### 0) 识别旧架构项目（必须）

先检查：
- 是否存在 `package.json`

然后检查是否**缺少合法 marker**：
- `.axhub/make/make.json`

并结合旧目录特征进行识别。

满足以下条件时，才能按本规则继续：
- 没有合法的 `.axhub/make/make.json`
- 且至少存在以下任一旧目录：
  - `src/elements/`
  - `src/pages/`
  - `assets/docs/`

如果已经存在合法的 `.axhub/make/make.json`，说明它属于**新架构项目**，应改为使用 `rules/update.md`，不要走本规则。

如果既没有 marker，也没有旧目录特征，则停止并提示用户切到正确项目目录。

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

### 3) 迁移前备份（必须）

在执行任何目录改动前，先创建带时间戳的备份目录，例如：

```bash
mkdir -p .axhub/make/backups/<timestamp>/
```

建议备份这些目录（存在才备份）：
- `src/elements/`
- `src/pages/`
- `assets/docs/`
- `package.json`

如果目录不存在，跳过即可，但必须在结果里说明“哪些目录实际存在并被备份”。

### 4) 迁移旧目录到新目录（必须）

将以下目录迁到新架构：
- `src/elements/` → `src/components/`
- `src/pages/` → `src/prototypes/`
- `assets/docs/` → `src/docs/`

迁移原则：
- 目标目录不存在：直接迁移
- 目标目录已存在：按“不覆盖用户已有新目录内容”的原则进行合并
- 如果存在同名冲突：
  - 优先保留目标目录中的现有文件
  - 把旧目录里的冲突文件转存到备份冲突目录
  - 在结果汇报中明确列出冲突项
- 迁移完成后，删除已经清空的旧目录

注意：
- 这是**物理目录迁移**，不是只靠运行时 URL 兼容
- 因为更新策略通常保留 `src/**` 和 `assets/**`，如果不先迁移，脚手架更新后旧目录仍会残留

### 5) 补写新架构 marker（必须）

迁移完成后，补写 marker：

```bash
mkdir -p .axhub/make
cat > .axhub/make/make.json <<'EOF2'
{ "schemaVersion": 1, "projectType": "axhub-make" }
EOF2
```

写完后，这个项目就视为**已迁到新架构**。

### 6) 执行标准更新（必须命令）

```bash
npx -y axhub-make --no-start
```

说明：
- 必须包含 `-y`
- 必须包含 `--no-start`
- 这一步必须在“目录迁移 + marker 补写”完成后执行

### 7) 启动验证

```bash
npm run dev
```

把终端里输出的本地访问地址（URL）回传给用户，提醒用户打开验证。

---

## 为什么旧架构需要单独处理

旧架构项目没有 `.axhub/make/make.json`，无法通过新规则中的 marker 检查。

同时，更新策略通常会保留：
- `src/**`
- `assets/**`

这意味着脚手架不会自动把这些旧目录改名：
- `src/elements/`
- `src/pages/`
- `assets/docs/`

所以对旧架构项目，必须先迁移目录，再执行标准更新。

---

## 升级后预期结果

升级完成后，项目应满足：
- 存在 `.axhub/make/make.json`
- 原有业务内容已经迁到：
  - `src/components/`
  - `src/prototypes/`
  - `src/docs/`
- 可以继续使用标准更新规则 `rules/update.md`

---

## 出问题时的最小恢复路径

### 1) 查找升级备份

```bash
ls -la .axhub/make/backups/
ls -la package.json.backup.*
```

### 2) 恢复迁移目录（仅在确认目录迁移有误时）

优先从：
- `.axhub/make/backups/<timestamp>/`

恢复对应目录，再重新执行升级流程。

### 3) 恢复 package.json（仅在确认是依赖问题时）

```bash
cp package.json.backup.<timestamp> package.json
npm install
npm run dev
```

如果仍失败：继续收集 `npm install` / `npm run dev` 的报错，按“每次只修一个问题”的方式推进。

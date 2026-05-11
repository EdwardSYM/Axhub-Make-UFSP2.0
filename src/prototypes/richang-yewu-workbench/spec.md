# 日常监督业务监控工作台 - 规格文档

## 1. 页面定位

`/prototypes/richang-yewu-workbench` 是“日常监督 / 业务监控”的通用工作台入口。

无查询参数直接访问时，默认按 `category=daily&topic=business_monitor` 展示业务监控通用工作台；首页和顶部导航中的预算执行、预算编制、指标管理、资产管理、会计核算等业务监控主题统一进入本页面。

## 2. 复制来源与维护边界

- 本页面已按当前最新 `topic-workbench2` 重新同步界面设计，保留同一套顶部统计口径、评分/趋势切换、雷达下钻、三级指标面板、规则定义/政策依据双栏和智能分析布局。
- 本页面后续用于日常业务监控个性化调整，不从 `topic-workbench2` 或专题监控工作台 import/re-export。
- 代码与数据继续保持物理独立：只复制最新样式、结构与交互思想，不共享 `topic-workbench2` 的数据文件。

## 3. 页面结构

- 顶部：全局导航、主题工作台标题、统计口径和设置入口。
- 主体：保留工作台总览、任务流程、待办事项、资源入口、评价分析、趋势查看和三级指标分析能力；评价分析区采用重点领域整改工作台的同款左侧指标导航与右侧规则/政策卡片布局。
- 功能列表入口：进入 `/prototypes/topic-function-list`，返回时根据 `category=daily` 和 `topic` 回到本工作台。

## 4. 数据与交互

- 默认主题为 `business_monitor`，默认分类为 `category=daily`。
- 评价分析、趋势曲线和三级指标面板使用本目录 `data.ts`，不读取重点领域整改目录的数据。
- `execution`、`treasury`、`unitfund`、`assets`、`accounting` 等业务监控主题使用本工作台。
- 专题监控主题跳转到 `/prototypes/richang-zhuanti-workbench`。
- 专项监督主题跳转到 `/prototypes/topic-workbench2`。

## 5. 独立维护约束

- 本目录只引用本目录内的 `./data`、`./style.css`、`./LocalDebtLevel3Panel`，以及公共组件和主题。
- 与专项领域工作台、日常专题监控工作台三套页面彼此不互相引用。

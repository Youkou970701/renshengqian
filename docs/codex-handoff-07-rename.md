# Codex 交接 07：改名「人生签」（只改文案，不动机制）

> 项目：`~/Dev/workspace/toutai-sim/`（本地目录名不变）。
> 用户把链接发给朋友试玩，朋友的第一反应是「你这个名字好 low」「别人都是出生，你投胎」「这个名字不想玩」。
> **用户 2026-10-21 定名：产品名「人生签」，主按钮从「投胎」改成「出生」。**
> 新网址 https://renshengqian.pages.dev（Claude 已建好 Pages 项目，部署由 Claude 做）。

## 要改的

1. 全部玩家可见文本里的「投胎模拟器」→「人生签」，「投胎模拟器 / 中国版」→「人生签 / 中国版」。
   目前 Claude 数到 17 处：`src/ui/App.jsx`（品牌、页脚、出生卡车票底部）、`src/ui/ShareImage.jsx`（下载文件名、分享标题）、
   `src/ui/share-cards.js`（三张卡的页眉和页脚）、`src/ui/CollectionPage.jsx`（导出文件名）、`index.html`（`<title>`）、
   `tests/share-cards.test.js`。以 `grep -rn 投胎 src index.html tests public` 清零为准（`tests/artifacts-*` 是旧截图，不用改）。
2. 首页主按钮「投胎 →」→「**出生 →**」。
3. 下载文件名用 `人生签-<编号>-出生.png` 这种格式。
4. 把「投胎」加进 `tests/banned-words.js` 的玩家文本扫描，防止以后回流。
5. **不要改 localStorage 的键名**（新域名本来就是新存储，改键名没好处，还可能让旧地址的存档读不出来）。
6. 分享卡重新导出一套样卡，确认页眉页脚的新名字在 1080×1920 和 170px 缩略图下都不溢出。

## 不要动的

引擎、内容模板、`data/`、`docs/`（results 除外）。25 项校准与 03 快照逐字一致（这次纯文案，理应不变）。不部署。

## 交付

`docs/codex-handoff-07-results.md`：`grep 投胎` 清零的输出、测试数、新样卡路径。

# Codex 交接 01：人生引擎 + 统计校准 + 朴素可玩界面

> 项目：`~/Dev/workspace/toutai-sim/`（投胎模拟器 · 中国版：随机投胎到中国某省某家庭，按真实统计过完一生）
> **先读** `docs/requirements.md` 全文，尤其「原作拆解」「红线」两节。数据在 `data/cn-stats.json`。
>
> 本阶段的核心交付物是**引擎和校准测试**，界面只要能玩通，不要花时间做视觉（02 阶段专门做）。

## 分工纪律

- 你（Codex）写 `src/` `public/` `scripts/` `tests/` 和根目录配置。**不要改 `docs/` 和 `data/`**（Claude 维护）。
  觉得数据有问题，写进 results 文件的「数据疑问」一节，别自己改数。
- 写完在 `docs/codex-handoff-01-results.md` 写交付说明（做了什么、怎么跑、校准结果表、没做的/有疑问的）。这是你唯一能写进 `docs/` 的文件。
- 不部署、不建 Cloudflare 项目。

---

## 0. 技术选型（已定）

- Vite + React 18 + JavaScript（不用 TS）。不上 Redux/状态库，`useReducer` 够了。
- 测试：Node 内置 `node:test`，`npm test` 跑 `tests/*.test.js`。
- 校准：`npm run calibrate` 跑 `scripts/calibrate.mjs`，默认 100000 局，打印「指标 / 目标区间 / 实测 / PASS|FAIL」表格；
  `tests/calibration.test.js` 用 20000 局跑同一套断言（要在 60 秒内跑完）。
- 引擎**禁用 `Math.random` 和 `Date.now`**，统一走可种子化 PRNG（mulberry32 或 sfc32）。加一条测试 grep `src/engine/` 保证没有 `Math.random`。

## 1. 目录结构

```
data/cn-stats.json        # Claude 维护，只读
src/
  engine/                 # 纯函数，零 DOM、零 React —— 全部可在 Node 里跑
    rng.js                  # 种子 PRNG；出生编号 <-> 种子 互转
    stats.js                # 读 cn-stats.json，派生表（省份权重、档位查表、生命表）
    params.js               # 机制参数（家境分布、努力权重、各节点 logit 系数…）集中在这一个文件
    birth.js                # 抽签：省份/城乡/家境/父母/留守/性别/兄弟姐妹
    life.js                 # step(state, input, rng) -> { state, events }；一年一步
    decisions.js            # 重大抉择定义：触发条件、选项、结算；含 autoChoose(state, rng)
    mortality.js            # 按省×性别预期寿命构造 Gompertz-Makeham 风险，校准到 e0
    summary.js              # 终局统计：学历、收入分位、「同省同年 100 人里第几」
  content/
    events/*.js             # 事件文案模板，按阶段分文件
    footnotes.js            # stat 键 -> 脚注文案（「全国普高率约 61%（2024 教育统计公报）」）
  ui/                       # React，朴素即可
tests/
scripts/calibrate.mjs
```

## 2. 出生编号

- 格式：`省份简称-年份-6位`，如 `豫-2026-483920`。编号能反解出种子；同编号 + 同一串玩家选择 = 完全相同的人生（事件日志逐字相同）。
- URL `?id=豫-2026-483920` 直接打开这个人生的出生卡。
- 自动抉择也必须由同一 rng 决定，不能引入非确定性。

## 3. 引擎要点

### 3.1 状态
`{ id, seed, age, alive, sex, province, tier, hukou:'urban'|'rural', wealthQ:1..5, parents, leftBehind, siblings,
   attrs:{health,happy,knowledge,social,grind}, gradePct /*同龄成绩分位 0–100*/, edu, job, income, assets, city,
   married, kids, log:[], pending:decision|null, ... }`

`grind`（卷度）由每年重心累积。

### 3.2 每年一步
1. 死亡判定（mortality.js）。
2. 每年重心（6 岁起；玩家选，或自动）→ 改属性/成绩分位。
3. 年龄触发的节点（中考 15、高考 18、毕业去向 22…），生成 `pending` 抉择，等玩家选或自动选。
4. 随机生活事件 1–3 条（按阶段、城乡、家境加权抽模板）。
5. 收入/资产结算（V1 粗一点：按学历×城市×年龄的分位曲线 + 噪声，参数在 params.js）。

### 3.3 命运裁决 = 选择 × 统计
关键节点（中考分流、高考结果、考研、考公、找工作）用 **logit 模型**：
`logit(p) = base(统计) + β_wealth·wealthQ + β_hukou + β_tier + β_grade·gradePct + β_grind·grind + 噪声`
- base 从 cn-stats 来，β 在 params.js，**用校准测试反推**，不要拍脑袋。
- 玩家「选了升高中」只是进入判定，不是保证。被拒时的文案要给原因类别（分数不够 / 家里供不起 / 要去打工养家），
  并附脚注。这就是原作那种「我选了读书，系统说你家没钱」的残酷感——**要保留**。
- 中职生走「职教高考 / 进厂 / 专升本」路线，有小概率逆袭到本科。
- 高考落榜可选复读一次（再判一次，略加成）。

### 3.4 努力的边界（产品核心，必须有测试）
- 同一出身下，「每年都选学习」vs「从不选学习」，本科率差距在 **+5 ~ +20 个百分点**之间。
- **农村 + 家境 Q1 + 全程最努力** 的本科率 **低于** 城市 + 家境 Q5 + 默认自动抉择 的本科率。
  这条就是「很难摆脱出生地的统计」，用户明确要保留残酷感。

### 3.5 死亡
- 预期寿命：先查 `province_overrides`，否则用 `life_expectancy_by_tier`，再按性别差（男 −2.6/女 +3.0 左右，调到全国男女≈76.5/82.0）。
- Gompertz-Makeham 参数按 e0 数值求解（打表缓存），0–4 岁另加婴幼儿死亡率。
- 死因：V1 只分「疾病（按年龄段：心脑血管/癌症/呼吸…）」「意外（交通/溺水/工伤）」两大类 + 极少量「离开」（见红线 2），文案不描写过程。

## 4. 校准目标（`npm run calibrate` 必须全部 PASS）

| 指标 | 目标区间 | 依据（cn-stats 键） |
|---|---|---|
| 各省出生占比 vs 权重 | 每省偏差 < 0.5pp | births.by_province_2024 |
| 农村出生占比 | 37%–43% | births.rural_share_of_births |
| 5 岁前死亡率 | 0.4%–0.8% | health.under5_mortality |
| 活到 16 岁者中初中毕业 | 94.5%–97.5% | education.compulsory_retention |
| 初中毕业生升普高 | 58%–64% | education.general_hs_rate |
| 初中毕业生进入高中阶段（普高+中职） | 89%–95% | education.hs_stage_gross_enroll |
| 贫困农村（农村×Q1）读完高中（含中职） | 30%–45% | education.poor_rural_hs_completion |
| 参加高考者本科录取（全国） | 37%–45% | education.bachelor_admitted / 2024 44.8% |
| S 档本科率 / C 档本科率 | ≥ 1.7 | province_tier |
| 参加高考者进 985 | 1.2%–2.2% | education.elite_985_rate |
| 985 新生中农村户口占比 | 10%–25% | education.rural_share_pku |
| 出生队列最终本科及以上 | 28%–40% | 派生；结果写进 results 供 Claude 判断 |
| 平均寿命（全队列） | 77.5–80.5 | health.life_expectancy |
| 女性 − 男性平均寿命 | 4–7 岁 | health.life_expectancy_by_sex |
| 西藏平均寿命 < 上海平均寿命 | 差 ≥ 6 岁 | province_overrides |
| 努力边界两条 | 见 3.4 | — |

另外打印（不设断言，写进 results）：学历分布、各档位本科率、城乡×家境 5×2 本科率矩阵、22 岁去向分布、死因分布。

## 5. 事件库首批

- 至少 **150 条**模板，覆盖 0–5 / 6–11 / 12–15 / 16–18 / 19–22 / 23–35 / 36–60 / 60+ 各阶段，每阶段 ≥ 12 条。
- 每条：`{ id, stage, weight(state)→number, text(state)→string, effects, stat?: 'cn-stats 键' }`。
- **至少 40% 的事件带 `stat`**，脚注引用 cn-stats 里的数和出处。没有出处的数字**不准写进文案**。
- 中国生活质感要具体：留守、隔代抚养、晚自习、补课班、县中、进厂、彩礼、学区房、考编、回老家、送外卖……
  具体物件 > 抽象形容（「你爷爷用摩托车载你去镇上中学报到」好过「你开始了初中生活」）。
- 遵守 requirements 红线：不评价政策、不点名学校和省份标签、自杀不写方法原因、不做性暴力。
  加一条测试：扫描全部模板文本，命中禁词列表（`tests/banned-words.js`，你先建一份，Claude 验收时补）即失败。

## 6. 朴素界面（能玩通即可）

- 首页：「投胎」按钮、时长 5/10/20 分钟、可选你的省份（存 localStorage，仅对照用）、输入编号复现。
- 出生卡：所有出身字段 + 和你省份的 4 项对照（预期寿命、本科率、城镇化、出生占比）。
- 主界面：年龄、四属性 + 卷度、人生纪录流（最新在上，脚注小字）、同秒出生 4 人一行状态、暂停 / 1× / 2× / 4× / 跳到下一抉择 / 自动抉择开关。
- 抉择弹层；自动抉择开启时 5 秒倒计时后自动选。
- 终局页：学历、职业、寿命、死因类别、人生格子图（一格一年，颜色=幸福）、「同省同年出生 100 人里，X 人读了本科」。
- localStorage 存档，刷新可续。
- 375px 宽无横向滚动。

## 7. 测试清单（`npm test`）

- rng：同种子同序列；编号 ↔ 种子往返。
- 复现：同编号 + 同选择序列 → 事件日志 JSON 深度相等（含自动抉择）。
- 引擎无 `Math.random` / `Date.now`。
- 抽签边界：每个省份都能抽到（固定种子扫描）；西藏出生也能完整跑完一生不报错。
- 每局必然终止（age ≤ 110）、死后不再生成事件、`pending` 未决时 step 不推进年龄。
- 校准断言（20000 局版）。
- 努力边界两条。
- 禁词扫描。

## 8. 交付说明里必须有

- 校准结果表（100000 局实测值）。
- params.js 里每个 β 的取值和你是怎么调出来的（一两句）。
- 一局完整人生的事件日志样例（编号 + 文本），城市 Q5 和农村 Q1 各一局。
- 数据疑问清单。

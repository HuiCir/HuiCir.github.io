/* ABench 演示站点主脚本。零依赖：动画用 Web Animations API、requestAnimationFrame 与 IntersectionObserver。 */
(() => {
  "use strict";
  const A = window.ABENCH;
  if (!A) { document.body.insertAdjacentHTML("afterbegin", "<p style='padding:24px'>没有找到 data/abench-data.js。请先运行 python3 tools/build_site_data.py。</p>"); return; }
  const IDX = A.index, C = A.case;
  const NS = "http://www.w3.org/2000/svg";
  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ------------------------------------------------------------------ 工具
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const fmt = (v, d = 2) => (v == null || Number.isNaN(v)) ? "—" : Number(v).toFixed(d);
  const ease = t => 1 - Math.pow(1 - t, 3);
  const sleep = ms => new Promise(r => setTimeout(r, RM ? 0 : ms));
  function S(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === "css") n.setAttribute("style", v);
      else if (k === "text") n.textContent = v;
      else n.setAttribute(k, v);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function onView(node, cb, threshold = 0.25) {
    if (!("IntersectionObserver" in window)) { cb(); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); cb(); } }, { threshold });
    io.observe(node);
  }
  function tween(dur, fn, ez = ease) {
    return new Promise(res => {
      if (RM || dur <= 0) { fn(1); res(); return; }
      const t0 = performance.now();
      const step = now => { const t = Math.min(1, (now - t0) / dur); fn(ez(t)); t < 1 ? requestAnimationFrame(step) : res(); };
      requestAnimationFrame(step);
    });
  }
  function drawIn(path, dur = 600, delay = 0) {
    if (RM) return;
    let len = 0;
    try { len = path.getTotalLength(); } catch (e) { return; }
    if (!len) return;
    const dash = path.getAttribute("stroke-dasharray");
    path.style.strokeDasharray = `${len} ${len}`;
    path.style.strokeDashoffset = len;
    const a = path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: dur, delay, easing: "cubic-bezier(.3,.6,.2,1)", fill: "forwards" });
    a.onfinish = () => { path.style.strokeDasharray = dash || ""; path.style.strokeDashoffset = ""; a.cancel(); };
  }
  function pop(node, delay = 0, dur = 380) {
    if (RM) return;
    node.style.transformBox = "fill-box";
    node.style.transformOrigin = "center";
    node.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: dur, delay, easing: "cubic-bezier(.2,1.4,.4,1)", fill: "backwards" });
  }
  function fade(node, delay = 0, dur = 400, dy = 6) {
    if (RM) return;
    node.animate([{ opacity: 0, transform: `translateY(${dy}px)` }, { opacity: 1, transform: "none" }],
      { duration: dur, delay, easing: "ease-out", fill: "backwards" });
  }
  function countTo(node, to, dur = 900, d = 2, suffix = "") {
    tween(dur, t => { node.textContent = (to * t).toFixed(d) + suffix; });
  }
  const checkIcon = ok => ok
    ? `<svg class="mark" viewBox="0 0 22 22" aria-label="通过"><circle cx="11" cy="11" r="10" fill="none" style="stroke:var(--green)" stroke-width="2"/><path d="M6 11.5l3.2 3.2L16 8" fill="none" style="stroke:var(--green)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg class="mark" viewBox="0 0 22 22" aria-label="未通过"><circle cx="11" cy="11" r="10" fill="none" style="stroke:var(--red)" stroke-width="2"/><path d="M7 7l8 8M15 7l-8 8" style="stroke:var(--red)" stroke-width="2.2" stroke-linecap="round"/></svg>`;

  // ------------------------------------------------------------------ 名称与派生数据
  const PAPER_SHORT = { adam: "Adam", adamw: "AdamW", adafactor: "Adafactor", shampoo: "Shampoo", lamb: "LAMB", crowded_valley: "Crowded Valley", lion: "Lion", sophia: "Sophia", schedulefree: "Schedule-Free", deconstructing: "Deconstructing", muon_blog: "Muon 博客", ademamix: "AdEMAMix", soap: "SOAP", mars: "MARS", cautious: "Cautious", muon_scalable: "Muon 可扩展", kimi_k2: "Kimi K2", bench_optim: "优化器基准", fantastic: "Fantastic", rudelson_vershynin_2007: "稳定秩", vonmises1929: "幂迭代" };
  const REF_NAME = Object.fromEntries(C.references.map(r => [r.id, r.name.replace(/（.*）/, "")]));
  REF_NAME.cautious_adamw = "C-AdamW"; REF_NAME.schedulefree_adamw = "Schedule-Free";
  const SETTING_NAME = { L2_main: "μ2 公开", L3a_scale: "μ3 规模", L3b_long: "μ1 长训练", L3c_bigbatch: "μ2 大批量" };
  const SETTING_DESC = { L2_main: "约 17M 有效参数，3 个种子，结果公开", L3a_scale: "约 42M，隐藏的规模外推点", L3b_long: "约 7M、8 倍数据，检验中期优势在学习率衰减后是否还在", L3c_bigbatch: "约 17M、4 倍批量" };
  const GROUP_TITLE = { method: "方法赛道", frontier: "前沿探索", domain: "专业领域", pro: "Pro Set", entry: "入门档" };
  const GROUP_ORDER = ["method", "frontier", "domain", "pro", "entry"];
  const LEVELS = ["low", "medium", "high"];
  const LEVEL_ZH = { low: "low", medium: "medium", high: "high", pro: "pro" };
  const STATUS_ZH = { built: "已构建", spec: "已定稿", planned: "已排期" };
  const SUBSET_ZH = { main: "主评测", calibration: "校准", primitive: "原语搜索", stress: "压力" };
  const allCases = IDX.tracks.flatMap(t => t.cases.map(c => ({ ...c, track: t, group: t.group })));
  const papers = C.papers;
  const paperById = Object.fromEntries(papers.map(p => [p.id, p]));
  function resolveSrc(sid) {
    const s = String(sid).replace(/^arxiv:\s*/i, "");
    return papers.find(p => p.id === s || p.arxiv === s) || null;
  }
  const fy = d => { const [y, m, dd] = d.split("-").map(Number); return y + (m - 1) / 12 + (dd - 1) / 365; };

  // ------------------------------------------------------------------ 主题与导航
  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("abench-theme", root.dataset.theme); } catch (e) {}
  });
  (() => {
    const links = [...document.querySelectorAll(".nav a")];
    const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { links.forEach(l => l.classList.remove("on")); map.get(e.target.id)?.classList.add("on"); } });
    }, { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  })();

  // ------------------------------------------------------------------ 英雄区
  (() => {
    const facts = [[IDX.tracks.length, "条赛道"], [allCases.length, "个 case"], [allCases.filter(c => c.status === "built").length, "个已跑通"]];
    $("#heroFacts").innerHTML = facts.map(([n, l]) => `<div><dt>${l}</dt><dd>${n}</dd></div>`).join("");
    $("#heroCasesBtn").textContent = `浏览全部 ${allCases.length} 个 case`;

    const svg = $("#heroSvg");
    const W = 1200, X0 = 70, X1 = 1000;
    // 时间轴：对 (2027.2 − 年份) 取对数，压缩早年、展开近年
    const T = y => -Math.log(2027.2 - y);
    const xOf = y => X0 + (T(y) - T(2014)) / (T(2026.75) - T(2014)) * (X1 - X0);
    const cutoffX = xOf(fy("2026-07-01"));
    const ml = papers.filter(p => p.field === "ml").sort((a, b) => a.date.localeCompare(b.date));
    const ext = papers.filter(p => p.field !== "ml").sort((a, b) => a.date.localeCompare(b.date));
    const FS = 13;
    const textW = s => [...s].reduce((a, ch) => a + (/[一-鿿]/.test(ch) ? FS : FS * 0.58), 0);
    const ROWS = [250, 210, 290, 170, 330, 130, 370, 90, 410];
    const boxes = [];
    const overlap = (a, b) => !(a.x2 < b.x1 || b.x2 < a.x1 || a.y2 < b.y1 || b.y2 < a.y1);
    ml.forEach(p => {
      p._x = xOf(fy(p.date));
      p._r = p.role === "anchor" ? 16 : 5 + 12 * (p.w ?? 0.4);
      p._label = PAPER_SHORT[p.id] || p.id;
      if (p.role === "anchor") {
        p._y = 250;
        boxes.push({ x1: p._x - 120, x2: p._x + p._r, y1: p._y - 22, y2: p._y + 30 });
        return;
      }
      let pick = ROWS[0], best = Infinity;
      for (const y of ROWS) {
        const b = { x1: p._x - p._r - 2, x2: p._x + p._r + 6 + textW(p._label), y1: y - 12, y2: y + 12 };
        const hits = boxes.filter(o => overlap(o, b)).length;
        const cost = hits * 1000 + Math.abs(y - 250) * 0.2;
        if (cost < best) { best = cost; pick = y; }
        if (hits === 0) break;
      }
      p._y = pick;
      boxes.push({ x1: p._x - p._r - 2, x2: p._x + p._r + 6 + textW(p._label), y1: pick - 12, y2: pick + 12 });
    });
    const EXT_Y = 494;
    ext.forEach((p, i) => { p._x = 210 + i * 210; p._y = EXT_Y; p._r = 5 + 12 * (p.w ?? 0.4); p._label = `${PAPER_SHORT[p.id] || p.id}（${p.venue.replace(/\s*\d{4}$/, "")}，${p.year}）`; });

    const ex = C.submissions.example_submission;
    const srcRows = ex.Q.sources;
    const prop = { x: 1112, y: 250 };

    function build() {
      svg.innerHTML = "";
      const gAxis = S("g", {}, svg), gEdges = S("g", {}, svg), gProp = S("g", {}, svg), gNodes = S("g", {}, svg), gTop = S("g", {}, svg);
      const axisY = 446;
      S("line", { x1: X0 - 10, x2: X1 + 20, y1: axisY, y2: axisY, class: "axis" }, gAxis);
      [2014, 2018, 2020, 2022, 2023, 2024, 2025, 2026].forEach(y => {
        const x = xOf(y);
        S("line", { x1: x, x2: x, y1: axisY, y2: axisY + 6, class: "axis" }, gAxis);
        S("text", { x, y: axisY + 22, "text-anchor": "middle", "font-size": 12, class: "t-mono", text: y }, gAxis);
      });
      S("text", { x: X0 - 10, y: 36, "font-size": FS, text: "B-OPT-001 的 ML 邻域　节点大小 = 论文权重 w，时间轴越近越展开" }, gAxis);
      S("line", { x1: X0 - 10, x2: W - 20, y1: EXT_Y - 26, y2: EXT_Y - 26, class: "grid" }, gAxis);
      S("text", { x: X0 - 10, y: EXT_Y + 4, "font-size": 12.5, text: "跨领域来源" }, gAxis);

      const anchor = ml.find(p => p.role === "anchor");
      const nbEdges = [];
      ml.forEach(p => {
        if (p === anchor) return;
        const mx = (p._x + anchor._x) / 2, my = (p._y + anchor._y) / 2 - 18;
        nbEdges.push([p, S("path", { d: `M${anchor._x},${anchor._y} Q${mx},${my} ${p._x},${p._y}`, fill: "none", css: "stroke:var(--ink-3)", "stroke-width": 1, opacity: 0.28 }, gEdges)]);
      });

      const nodeEls = [];
      [...ml, ...ext].forEach(p => {
        const g = S("g", {}, gNodes);
        S("title", { text: `${p.title}（${p.venue}，${p.date}）　w = ${p.w}` }, g);
        let style;
        if (p.role === "anchor") style = "fill:var(--ink);stroke:var(--ink)";
        else if (p.role === "reference") style = "fill:var(--blue-soft);stroke:var(--blue)";
        else if (p.role === "T7") style = "fill:var(--sheet);stroke:var(--amber)";
        else if (p.role === "external") style = "fill:var(--green-soft);stroke:var(--green)";
        else style = "fill:var(--sheet);stroke:var(--ink-2)";
        S("circle", { cx: p._x, cy: p._y, r: p._r, css: style, "stroke-width": 1.5, "stroke-dasharray": p.role === "T7" ? "3 2" : null }, g);
        if (p.role === "anchor") {
          S("text", { x: p._x - p._r - 8, y: p._y + 1, "text-anchor": "end", "font-size": 17, "font-weight": 700, class: "t-ink", text: "Adam" }, g);
          S("text", { x: p._x - p._r - 8, y: p._y + 19, "text-anchor": "end", "font-size": 12, text: "锚点 · 2014" }, g);
        } else {
          S("text", { x: p._x + p._r + 5, y: p._y + 4.5, "font-size": FS, text: p._label }, g);
        }
        nodeEls.push([p, g]);
      });

      const cut = S("path", { d: `M${cutoffX},50 L${cutoffX},${axisY}`, fill: "none", css: "stroke:var(--red)", "stroke-width": 1.8, "stroke-dasharray": "6 4" }, gTop);
      const cutLabel = S("g", {}, gTop);
      S("text", { x: cutoffX + 8, y: axisY - 26, "font-size": 12.5, class: "t-red", text: "截止 2026-07-01" }, cutLabel);
      S("text", { x: cutoffX + 8, y: axisY - 10, "font-size": 12, class: "t-red", text: "之后不可检索" }, cutLabel);

      const propEdges = [];
      let ghost = null;
      srcRows.forEach(s => {
        const p = resolveSrc(s.id);
        let tx, ty, style = "stroke:var(--blue)", w = 1.3, dash = null, op = 0.9;
        if (!p) { tx = xOf(2026.37); ty = 58; style = "stroke:var(--red)"; dash = "4 3"; ghost = { x: tx, y: ty, id: s.id }; }
        else {
          tx = p._x; ty = p._y;
          if (s.usage === "core") { w = 2.4; }
          else if (s.usage === "partial") { w = 1.2; op = 0.65; }
          else { style = "stroke:var(--ink-3)"; dash = "3 4"; op = 0.8; }
        }
        const sx = prop.x - 60, sy = prop.y + Math.max(-20, Math.min(20, (ty - prop.y) * 0.15));
        let d;
        if (ty > 460) {
          d = `M${prop.x - 20},${prop.y + 26} C${prop.x - 20},${ty} ${tx + 260},${ty} ${tx + p._r},${ty}`;
        } else {
          const mx = (sx + tx) / 2;
          const my = Math.abs(ty - 250) < 5 ? 48 : ty < 250 ? Math.min(sy, ty) - 46 : Math.max(sy, ty) + 46;
          d = `M${sx},${sy} Q${mx},${my} ${tx},${ty}`;
        }
        propEdges.push(S("path", { d, fill: "none", css: style, "stroke-width": w, "stroke-dasharray": dash, opacity: op }, gProp));
      });
      let ghostG = null;
      if (ghost) {
        ghostG = S("g", {}, gProp);
        S("title", { text: `${ghost.id}：无法解析的来源，参考含金量 × 0.8` }, ghostG);
        S("circle", { cx: ghost.x, cy: ghost.y, r: 10, css: "fill:var(--red-soft);stroke:var(--red)", "stroke-width": 1.5, "stroke-dasharray": "3 2" }, ghostG);
        S("path", { d: `M${ghost.x - 4},${ghost.y - 4} L${ghost.x + 4},${ghost.y + 4} M${ghost.x + 4},${ghost.y - 4} L${ghost.x - 4},${ghost.y + 4}`, css: "stroke:var(--red)", "stroke-width": 1.7 }, ghostG);
        S("text", { x: ghost.x - 16, y: ghost.y - 4, "text-anchor": "end", "font-size": 12.5, class: "t-red", text: "声明的来源 2605.99999" }, ghostG);
        S("text", { x: ghost.x - 16, y: ghost.y + 12, "text-anchor": "end", "font-size": 12, class: "t-red", text: "无法解析，Q × 0.8" }, ghostG);
      }
      const pg = S("g", {}, gProp);
      S("rect", { x: prop.x - 60, y: prop.y - 26, width: 120, height: 52, rx: 6, css: "fill:var(--sheet);stroke:var(--ink)", "stroke-width": 1.8 }, pg);
      S("text", { x: prop.x, y: prop.y - 3, "text-anchor": "middle", "font-size": 16, "font-weight": 700, class: "t-ink", text: "RankGate" }, pg);
      S("text", { x: prop.x, y: prop.y + 15, "text-anchor": "middle", "font-size": 12, text: "agent 的方案" }, pg);
      const ring = S("path", { d: `M${prop.x - 74},${prop.y + 6} C${prop.x - 78},${prop.y - 46} ${prop.x + 70},${prop.y - 52} ${prop.x + 78},${prop.y - 6} C${prop.x + 84},${prop.y + 42} ${prop.x - 44},${prop.y + 52} ${prop.x - 70},${prop.y + 22}`, fill: "none", css: "stroke:var(--red)", "stroke-width": 2, "stroke-linecap": "round" }, pg);
      const note = S("g", {}, pg);
      S("text", { x: prop.x + 8, y: prop.y - 76, "text-anchor": "middle", "font-size": 13, class: "t-red", text: "综合分 " + fmt(ex.composite.score, 2) }, note);
      S("text", { x: prop.x + 8, y: prop.y - 60, "text-anchor": "middle", "font-size": 12, class: "t-red", text: "含局部发现加成" }, note);
      return { nbEdges, nodeEls, cut, cutLabel, propEdges, ghostG, pg, ring, note, gAxis };
    }

    let token = 0;
    function play() {
      token++;
      const r = build();
      if (RM) return;
      fade(r.gAxis, 0, 500, 0);
      r.nodeEls.forEach(([p, g], i) => {
        const d = 200 + i * 110;
        pop(g, d);
        const e = r.nbEdges.find(x => x[0] === p);
        if (e) drawIn(e[1], 500, d);
      });
      const t1 = 200 + r.nodeEls.length * 110 + 150;
      drawIn(r.cut, 520, t1);
      fade(r.cutLabel, t1 + 300, 400, 0);
      pop(r.pg, t1 + 500, 500);
      r.propEdges.forEach((e, i) => drawIn(e, 650, t1 + 800 + i * 130));
      if (r.ghostG) pop(r.ghostG, t1 + 800 + r.propEdges.length * 130);
      drawIn(r.ring, 800, t1 + 2100);
      fade(r.note, t1 + 2600, 400, 0);
    }
    const legend = [
      ["锚点", "fill:var(--ink);stroke:var(--ink)"], ["参考方案", "fill:var(--blue-soft);stroke:var(--blue)"],
      ["其他邻域", "fill:var(--sheet);stroke:var(--ink-2)"], ["T7 分析与负结果", "fill:var(--sheet);stroke:var(--amber);stroke-dasharray:3 2"],
      ["跨领域来源", "fill:var(--green-soft);stroke:var(--green)"]
    ];
    $("#heroLegend").innerHTML = legend.map(([l, s]) => `<span><svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" style="${s}" stroke-width="1.4"/></svg>${l}</span>`).join("")
      + `<span><svg viewBox="0 0 14 14"><path d="M1 7h12" style="stroke:var(--blue)" stroke-width="2.4"/></svg>方案的核心来源</span>`
      + `<span><svg viewBox="0 0 14 14"><path d="M1 7h12" style="stroke:var(--blue);opacity:.65" stroke-width="1.2"/></svg>部分借鉴</span>`
      + `<span><svg viewBox="0 0 14 14"><path d="M1 7h12" style="stroke:var(--ink-3)" stroke-width="1.4" stroke-dasharray="3 3"/></svg>装饰性引用</span>`;
    onView(svg, play, 0.2);
    $("#heroReplay").addEventListener("click", play);
    void token;
  })();

  // ------------------------------------------------------------------ 构建流程 S0–S6
  (() => {
    const ex = C.submissions.example_submission;
    const lad = C.ladder;
    const STEPS = [
      { code: "S0", name: "下发锚点", title: "下发：锚点卡与任务说明", text: "agent 拿到锚点论文、截止日、开发预算和提交格式。评测设置只公开一部分，隐藏设置在评分时才出现。", vis: visCard },
      { code: "S1", name: "开放检索", title: "检索：截止日前的论文任意查", text: "检索工具在后端屏蔽截止日之后的论文，不返回引用量，所有调用写入日志。下面是示例提交的真实检索日志。", vis: visLog },
      { code: "S2", name: "归纳", title: "归纳：谱系、证据与空白", text: "把邻域整理成技术谱系，区分证据强弱，找出现有方案没有覆盖的地方。", vis: visLineage },
      { code: "S3", name: "设计", title: "设计：RankGate 的更新规则", text: "按动量矩阵的归一化稳定秩，在正交化更新与分解自适应更新之间连续插值。门控在对数尺度上，阈值 τ = 0.02。", vis: visDesign },
      { code: "S3′", name: "自测", title: "自测：在微尺度上反复试错", text: "开发预算 8 GPU-h，可在 μ1（约 2.5 分钟一次）与 μ2（约 15 分钟一次）上跑。线性门控在这里被发现几乎恒为 0，于是改成对数门控。", vis: visBudget },
      { code: "S4", name: "提交", title: "提交：一次性交付", text: "代码、设计说明、来源声明和局部发现声明一起提交。超参由基准方按与参考方案相同的预算重新调。", vis: visFiles },
      { code: "S5", name: "评分", title: "评分：门槛与四个分量", text: "先过三道门槛：L0 自动检查、保持 SOTA、差异化。通过后按 SOTA 幅度、差异度、参考含金量计分，再乘局部发现加成。", vis: visMeters },
      { code: "S6", name: "报告", title: "报告：综合分与逐项明细", text: "报告列出每个设置的加速比、行为最近邻、来源贡献和每条发现的消融结果。", vis: visReport },
    ];
    const ol = $("#steps"), stage = $("#stepStage");
    ol.innerHTML = STEPS.map((s, i) => `<li><button type="button" role="tab" aria-selected="false" data-i="${i}"><span class="dot-row"><span class="dot"></span><span class="rail"><i></i></span></span><span class="code">${s.code}</span><span class="name">${s.name}</span></button></li>`).join("");
    let cur = -1, timer = null;
    function show(i) {
      cur = i;
      [...ol.children].forEach((li, j) => { li.classList.toggle("on", j === i); li.classList.toggle("done", j < i); li.querySelector("button").setAttribute("aria-selected", j === i); });
      const s = STEPS[i];
      stage.innerHTML = `<div class="st-text"><span class="mono" style="color:var(--ink-3)">${s.code} / ${STEPS.length - 1}</span><h3>${s.title}</h3><p>${s.text}</p></div><div class="st-vis"></div>`;
      fade(stage.querySelector(".st-text"), 0, 350);
      s.vis(stage.querySelector(".st-vis"));
    }
    ol.addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if (b) { stop(); show(+b.dataset.i); } });
    ol.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault(); stop();
      const n = Math.max(0, Math.min(STEPS.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1)));
      show(n); ol.children[n].querySelector("button").focus();
    });
    $("#stepPrev").addEventListener("click", () => { stop(); show(Math.max(0, cur - 1)); });
    $("#stepNext").addEventListener("click", () => { stop(); show(Math.min(STEPS.length - 1, cur + 1)); });
    const playBtn = $("#stepPlay");
    function stop() { if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "自动播放"; } }
    playBtn.addEventListener("click", () => {
      if (timer) { stop(); return; }
      if (cur >= STEPS.length - 1) show(0);
      playBtn.textContent = "暂停";
      timer = setInterval(() => { if (cur >= STEPS.length - 1) { stop(); return; } show(cur + 1); }, 4600);
    });
    show(0);
    onView($("#flow"), () => { if (cur === 0 && !timer && !RM) playBtn.click(); }, 0.35);

    function visCard(box) {
      const rows = [["Case", "B-OPT-001 · 赛道 B 优化器"], ["锚点", "Adam（arXiv 1412.6980，ICLR 2015）"], ["截止日", "2026-07-01"], ["目标", "为小规模 LLM 预训练设计新优化器：保持 SOTA，且与现有方案可区分"],
        ["开发预算", "8 GPU-h，单张 24GB 参考卡"], ["资源 / 难度", "high / medium"], ["提交", "一次"]];
      box.innerHTML = `<div class="card-sheet">${rows.map(r => `<div class="row"><span>${r[0]}</span><span>${esc(r[1])}</span></div>`).join("")}</div>`;
      [...box.querySelectorAll(".row")].forEach((r, i) => fade(r, 80 + i * 90, 300, 4));
    }
    function visLog(box) {
      box.innerHTML = `<div class="log"></div>`;
      const log = box.firstChild;
      C.retrieval.forEach((e, i) => {
        const a = e.args || {};
        const arg = a.query ? `"${a.query}"` : a.id ? a.id : a.hparams ? JSON.stringify(a.hparams) : a.path || "";
        const res = e.result_ids?.length ? ` → ${e.result_ids.length} 篇` : "";
        const ln = document.createElement("div");
        ln.className = "ln";
        ln.innerHTML = `<span class="tm">${e.t.slice(11, 16)}</span><span class="tool">${esc(e.tool)}</span><span class="arg">${esc(arg)}${res}</span>`;
        log.appendChild(ln);
        fade(ln, 150 + i * 260, 260, 4);
      });
    }
    function visLineage(box) {
      const lanes = [["逐元素自适应", ["Adam", "AdamW", "Adafactor", "LAMB"]], ["符号与搜索", ["Lion"]], ["二阶预条件", ["Shampoo", "SOAP", "Sophia"]],
        ["正交化", ["Muon", "Muon 可扩展", "MuonClip"]], ["动量结构", ["AdEMAMix", "MARS", "Cautious", "Schedule-Free"]], ["T7 证据", ["Fantastic：加速随规模缩小", "Deconstructing"]]];
      box.innerHTML = `<div class="lineage">${lanes.map(l => `<div class="lane"><span>${l[0]}</span><span class="nodes">${l[1].map(n => `<span class="tag ${l[0].startsWith("T7") ? "amber" : ""}">${n}</span>`).join("")}</span></div>`).join("")}
        <div class="gap">空白：正交化对所有二维参数、所有阶段做同样强度的白化，没有根据动量本身的谱结构调节。</div></div>`;
      [...box.querySelectorAll(".tag")].forEach((t, i) => pop(t, 100 + i * 70, 300));
      fade(box.querySelector(".gap"), 1500, 500);
    }
    function visDesign(box) {
      const eqs = [["M ← μM + G,  M̃ = G + μM", "Nesterov 动量"], ["O = 0.2·√max(m,n) · NS₅(M̃)", "正交化分支"], ["A = RMS匹配( M̃ / √(V̂ᵣ·V̂꜀) )", "分解自适应分支"],
        ["r = ‖M̃‖²_F / (‖M̃‖²₂ · min(m,n))", "归一化稳定秩"], ["a = σ( κ · (ln r − ln τ) )", "门控"], ["W ← W − η · (a·O + (1−a)·A + λW)", "更新"]];
      box.innerHTML = `<div class="eqg">${eqs.map(e => `<span class="f">${e[0]}</span><span class="c">${e[1]}</span>`).join("")}</div><svg class="gate-svg" viewBox="0 0 420 192" role="img" aria-label="门控值 a 随稳定秩 r 的变化"></svg>`;
      [...box.querySelectorAll(".eqg span")].forEach((e, i) => fade(e, 60 + Math.floor(i / 2) * 120, 260, 3));
      const svg = box.querySelector("svg");
      const lx = r => 40 + (Math.log10(r) - Math.log10(0.003)) / (Math.log10(0.3) - Math.log10(0.003)) * 360;
      const ly = a => 140 - a * 110;
      S("rect", { x: lx(0.01), y: 26, width: lx(0.05) - lx(0.01), height: 114, css: "fill:var(--blue-soft)" }, svg);
      S("text", { x: (lx(0.01) + lx(0.05)) / 2, y: 22, "text-anchor": "middle", "font-size": 11, text: "L1 实测 r 的范围" }, svg);
      S("line", { x1: 40, x2: 400, y1: 140, y2: 140, class: "axis" }, svg);
      S("line", { x1: 40, x2: 40, y1: 30, y2: 140, class: "axis" }, svg);
      [0.003, 0.01, 0.03, 0.1, 0.3].forEach(r => S("text", { x: lx(r), y: 156, "text-anchor": "middle", "font-size": 10.5, class: "t-mono", text: r }, svg));
      S("text", { x: 36, y: ly(1) + 4, "text-anchor": "end", "font-size": 10.5, class: "t-mono", text: "1" }, svg);
      S("text", { x: 36, y: ly(0) + 4, "text-anchor": "end", "font-size": 10.5, class: "t-mono", text: "0" }, svg);
      const curve = (fn) => { let d = ""; for (let i = 0; i <= 120; i++) { const lr = Math.log10(0.003) + i / 120 * (Math.log10(0.3) - Math.log10(0.003)); const r = 10 ** lr; d += (i ? "L" : "M") + lx(r).toFixed(1) + "," + ly(fn(r)).toFixed(1); } return d; };
      const sig = x => 1 / (1 + Math.exp(-x));
      const linear = S("path", { d: curve(r => sig(20 * (r - 0.15))), fill: "none", css: "stroke:var(--red)", "stroke-width": 1.6, "stroke-dasharray": "4 3" }, svg);
      const logg = S("path", { d: curve(r => sig(3 * (Math.log(r) - Math.log(0.02)))), fill: "none", css: "stroke:var(--blue)", "stroke-width": 2.4 }, svg);
      S("path", { d: "M40,184 L60,184", css: "stroke:var(--red)", "stroke-width": 1.6, "stroke-dasharray": "4 3" }, svg);
      S("text", { x: 66, y: 188, "font-size": 11, class: "t-red", text: "早期线性门控 τ=0.15：在实测范围内几乎为 0，方案退化成 Adafactor" }, svg);
      S("text", { x: lx(0.05) + 6, y: ly(0.86), "font-size": 11, class: "t-blue", text: "对数门控 τ=0.02" }, svg);
      drawIn(linear, 900, 200); drawIn(logg, 1100, 900);
    }
    function visBudget(box) {
      const runs = []; // 示意的开发期运行序列（GPU-h）
      const push = (n, kind, h) => { for (let i = 0; i < n; i++) runs.push({ kind, h }); };
      push(36, "mu1", 0.04); push(6, "mu2", 0.25); push(28, "mu1", 0.04); push(8, "mu2", 0.25); push(14, "mu1", 0.04);
      const total = 8, used = runs.reduce((a, r) => a + r.h, 0);
      box.innerHTML = `<div class="budget-meter"><div class="track"></div>
        <div class="legend"><span>已用 <b class="mono" id="bmUsed">0.00</b> / ${total} GPU-h</span><span><i style="display:inline-block;width:10px;height:10px;background:var(--blue);border-radius:2px"></i> μ1 <b class="mono" id="bmM1">0</b> 次</span><span><i style="display:inline-block;width:10px;height:10px;background:var(--green);border-radius:2px"></i> μ2 <b class="mono" id="bmM2">0</b> 次</span></div>
        <p class="panel-note">示意：开发期运行记录。工具按参考卡占用的墙钟扣预算；μ3 与隐藏设置不对 agent 开放。</p>
        <table class="mini"><thead><tr><th>档位</th><th>有效参数</th><th>token</th><th>单次</th><th>谁能用</th></tr></thead><tbody>
          <tr><td class="mono">μ1</td><td>约 7M</td><td>0.14B</td><td>约 2.5 分钟</td><td>agent、基准方调参</td></tr>
          <tr><td class="mono">μ2</td><td>约 17M</td><td>0.35B</td><td>约 15 分钟</td><td>agent、公开验证</td></tr>
          <tr><td class="mono">μ3</td><td>约 42M</td><td>0.84B</td><td>约 1.5 小时</td><td>仅基准方（隐藏）</td></tr></tbody></table></div>`;
      const track = box.querySelector(".track");
      let acc = 0, n1 = 0, n2 = 0;
      runs.forEach((r, i) => {
        const seg = document.createElement("i");
        seg.className = r.kind;
        seg.style.left = (acc / total * 100) + "%";
        seg.style.width = `calc(${r.h / total * 100}% - 1px)`;
        acc += r.h;
        track.appendChild(seg);
        const d = 120 + i * 32;
        if (!RM) seg.animate([{ opacity: 0, transform: "scaleY(0)" }, { opacity: 1, transform: "none" }], { duration: 160, delay: d, fill: "backwards" });
        setTimeout(() => { r.kind === "mu1" ? n1++ : n2++; const u = box.querySelector("#bmUsed"); if (!u) return; box.querySelector("#bmM1").textContent = n1; box.querySelector("#bmM2").textContent = n2; u.textContent = runs.slice(0, i + 1).reduce((a, x) => a + x.h, 0).toFixed(2); }, RM ? 0 : d);
      });
      void used;
    }
    function visFiles(box) {
      const files = [["retrieval_log.jsonl", "检索日志，工具自动记录"], ["synthesis.md", "归纳"], ["design.md", "设计说明与最近已有方案的区别"], ["optimizer.py", "实现 FunctionalRule 接口"],
        ["hparam_space.yaml", "至多 4 个可调超参"], ["sources.yaml", "来源声明：借鉴了什么、对应代码哪里"], ["discoveries.yaml", "局部发现声明（可选）"]];
      box.innerHTML = `<div class="files">${files.map(f => `<div><span>submission/${f[0]}</span><span>${f[1]}</span></div>`).join("")}</div>
        <p class="panel-note" style="margin-top:12px">基准方接手：μ1 调参 16 次、μ2 精调 4 次 → μ2 公开设置 3 个种子 → μ3、μ1 长训练、μ2 大批量三个隐藏设置 → 每条局部发现单独消融。约 6 GPU-h。</p>`;
      [...box.querySelectorAll(".files div")].forEach((d, i) => fade(d, 100 + i * 140, 300, 4));
      fade(box.querySelector(".panel-note"), 1200, 400);
    }
    function visMeters(box) {
      const c = ex.composite;
      const rows = [["M", c.M, "SOTA 幅度"], ["D", c.D, "差异度"], ["Q", c.Q, "参考含金量"], ["X", c.X, "局部发现"]];
      box.innerHTML = `<div class="meter-list">${rows.map(r => `<div class="meter"><span class="mono">${r[0]}</span><span class="bar"><i></i></span><span class="val">${fmt(r[1], 3)}</span></div>`).join("")}</div>
        <div class="gates" style="margin-top:14px;padding:0;border:0;background:none">${Object.entries(c.gates).map(([k, v]) => `<div class="gate ${v ? "" : "fail"}">${checkIcon(v)}<span class="gname">${k}</span><span class="gdetail">${v ? "通过" : "未通过"}</span></div>`).join("")}</div>`;
      requestAnimationFrame(() => [...box.querySelectorAll(".meter .bar i")].forEach((b, i) => setTimeout(() => { b.style.width = (rows[i][1] * 100) + "%"; }, RM ? 0 : 120 + i * 220)));
    }
    function visReport(box) {
      const c = ex.composite;
      box.innerHTML = `<div style="display:grid;gap:12px"><span class="bignum" id="repNum">0.00</span>
        <p class="mono" style="font-size:13.5px;color:var(--ink-2)">100 · ${fmt(c.M, 3)}^0.5 · ${fmt(c.D, 3)}^0.3 · ${fmt(c.Q, 3)}^0.2 · (1 + 0.25 · ${fmt(c.X, 3)})</p>
        <table class="mini"><tbody>
          <tr><td>聚合有效加速比</td><td class="mono">${fmt(ex.M.aggregate_speedup, 3)}×（下界 ${fmt(ex.M.aggregate_speedup_lcb, 3)}×）</td></tr>
          <tr><td>行为最近邻</td><td>${esc(REF_NAME[ex.D.behavioral.nearest_reference] || ex.D.behavioral.nearest_reference)}，相似度 ${fmt(1 - ex.D.behavioral.D_global, 3)}</td></tr>
          <tr><td>局部发现</td><td>${ex.X.declarations.map(d => `${esc(d.module)}：${esc(d.status)}`).join("；")}</td></tr>
        </tbody></table><a class="btn small" href="#scoring">查看评分明细与两个负例</a></div>`;
      countTo(box.querySelector("#repNum"), c.score, 1400, 2);
    }
  })();

  // ------------------------------------------------------------------ 评价模式
  (() => {
    const subs = C.submissions;
    const order = ["example_submission", "clone_muon", "rankgate_linear_gate"];
    let curSub = "example_submission", curSet = "L2_main";
    const sw = $("#subSwitch");
    sw.innerHTML = order.map(k => {
      const c = subs[k].composite;
      const failed = Object.entries(c.gates).filter(([, v]) => !v).map(([g]) => g);
      return `<button class="sub-btn" role="tab" type="button" data-k="${k}" aria-selected="${k === curSub}"><span class="s1">${esc(subs[k].label)}</span><span class="s2">${failed.length ? "0 分 · " + failed.join("、") + "未通过" : "综合分 " + fmt(c.score, 2)}</span></button>`;
    }).join("");
    sw.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (!b) return; curSub = b.dataset.k; [...sw.children].forEach(x => x.setAttribute("aria-selected", x === b)); renderAll(); });
    const ss = $("#settingSwitch");
    ss.innerHTML = Object.keys(SETTING_NAME).map(k => `<button type="button" role="tab" data-s="${k}" aria-selected="${k === curSet}">${SETTING_NAME[k]}</button>`).join("");
    ss.addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (!b) return; curSet = b.dataset.s; [...ss.children].forEach(x => x.setAttribute("aria-selected", x === b)); renderEnv(); });

    const GATE_ZH = { "aggregate_speedup": "聚合加速比", lcb: "置信下界", per_setting: "单个设置", ood_regression: "OOD 劣化", "step_time": "单步时间" };
    function renderFormula() {
      const s = subs[curSub], c = s.composite;
      const pass = Object.values(c.gates).every(Boolean);
      const failed = Object.entries(c.gates).filter(([, v]) => !v).map(([g]) => g);
      const e = c.exponents;
      $("#formula").innerHTML = `<div class="score-row"><span class="score ${pass ? "" : "zero"}" id="scoreNum">0.00</span>
        <span class="why">${pass ? "三道门槛全部通过" : `门槛未通过：${failed.join("、")}。若通过，本应得 ${fmt(c.score_if_gates_pass, 2)}`}</span></div>
        <div class="expr"><span>100</span><span>·</span>
          <span class="term ${pass ? "" : "off"}">M<sup>${e.M}</sup> = <b>${fmt(c.M, 3)}</b></span><span>·</span>
          <span class="term ${pass ? "" : "off"}">D<sup>${e.D}</sup> = <b>${fmt(c.D, 3)}</b></span><span>·</span>
          <span class="term ${pass ? "" : "off"}">Q<sup>${e.Q}</sup> = <b>${fmt(c.Q, 3)}</b></span><span>·</span>
          <span class="term ${pass ? "" : "off"}">(1 + ${c.discovery_bonus}·X)，X = <b>${fmt(c.X, 3)}</b></span></div>`;
      countTo($("#scoreNum"), c.score, 900, 2);
      // 门槛明细
      const M = s.M, D = s.D;
      const sotaFail = Object.entries(M.gate_checks).filter(([, v]) => !v).map(([k]) => GATE_ZH[k.split(/[<>=]/)[0]] || k);
      const rows = [
        ["L0", c.gates.L0, `接口、显存（状态 ${s.L0.state_ratio_max}× 参数量）、数值、确定性`],
        ["SOTA", c.gates.SOTA, `聚合有效加速比 ${fmt(M.aggregate_speedup, 3)}×，下界 ${fmt(M.aggregate_speedup_lcb, 3)}×` + (sotaFail.length ? `；未满足：${sotaFail.join("、")}` : "；各设置 ≥ 0.9×，OOD 劣化 ≤ 1%")],
        ["差异化", c.gates["差异化"], `行为差异 ${fmt(D.behavioral.D_global, 3)}，复刻阈值 ${fmt(D.threshold, 3)}（超参扰动噪声底 ${fmt(D.noise_floor, 3)} × 1.5）；D = ${fmt(D.D, 3)} ≥ 0.2`]
      ];
      $("#gates").innerHTML = rows.map(([n, ok, d], i) => `<div class="gate ${ok ? "" : "fail"}" data-i="${i}">${checkIcon(ok)}<span class="gname">${n}</span><span class="gdetail">${esc(d)}</span></div>`).join("");
      [...$("#gates").children].forEach((g, i) => fade(g, 100 + i * 140, 300, 0));
    }

    function renderEnv() {
      const svg = $("#envChart"); svg.innerHTML = "";
      const set = C.curves[curSet];
      const W = 960, H = 380, L = 70, R = 90, T = 40, B = 48;
      const refs = Object.entries(set.references);
      const pts = refs.map(([k, v]) => ({ k, xs: v.budgets.map(b => Math.log(b * set.time_ratios[k])), ys: v.loss }));
      const sub = set.submissions[curSub];
      const subMean = sub.loss.reduce((a, b) => a + b, 0) / sub.loss.length;
      const allY = pts.flatMap(p => p.ys).concat(sub.loss);
      const yMin = Math.min(...allY), yMax = Math.max(...allY), pad = (yMax - yMin) * 0.08;
      const xMin = Math.log(0.55), xMax = Math.log(2.1);
      const X = v => L + (v - xMin) / (xMax - xMin) * (W - L - R);
      const Y = v => T + (yMax + pad - v) / (yMax - yMin + 2 * pad) * (H - T - B);
      // 轴与网格
      [0.5, 0.7, 1, 1.4, 2].forEach(b => {
        S("line", { x1: X(Math.log(b)), x2: X(Math.log(b)), y1: T, y2: H - B, class: "grid" }, svg);
        S("text", { x: X(Math.log(b)), y: H - B + 18, "text-anchor": "middle", "font-size": 11.5, class: "t-mono", text: b + "×" }, svg);
      });
      S("text", { x: (L + W - R) / 2, y: H - 6, "text-anchor": "middle", "font-size": 12, text: "成本 = token 预算倍数 × 单步时间比（对数轴）" }, svg);
      const nT = 5;
      for (let i = 0; i <= nT; i++) {
        const v = yMin - pad + i / nT * (yMax - yMin + 2 * pad);
        S("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: "grid" }, svg);
        S("text", { x: L - 8, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, class: "t-mono", text: v.toFixed(3) }, svg);
      }
      S("text", { x: L, y: T - 16, "font-size": 12, text: "最终验证损失（学习率衰减完成后）" }, svg);
      const clipId = "envClip";
      const cp = S("clipPath", { id: clipId }, S("defs", {}, svg));
      S("rect", { x: L, y: T, width: W - L - R, height: H - T - B }, cp);
      // 参考曲线
      const refPaths = pts.map(p => {
        const d = p.xs.map((x, i) => (i ? "L" : "M") + X(x).toFixed(1) + "," + Y(p.ys[i]).toFixed(1)).join("");
        const path = S("path", { d, fill: "none", css: "stroke:var(--ink-3)", "stroke-width": 1, opacity: 0.6, "clip-path": `url(#${clipId})` }, svg);
        S("title", { text: REF_NAME[p.k] || p.k }, path);
        const last = p.xs.length - 1;
        if (["muon", "adamw"].includes(p.k)) S("text", { x: Math.min(X(p.xs[last]), W - R) + 6, y: Y(p.ys[last]) + (p.k === "muon" ? 12 : -2), "font-size": 11.5, text: REF_NAME[p.k] }, svg);
        return path;
      });
      // 包络线
      const N = 220, gx = [], env = [];
      const gx0 = Math.max(xMin, ...pts.map(p => p.xs[0])), gx1 = Math.min(xMax, ...pts.map(p => p.xs.at(-1)));
      for (let i = 0; i <= N; i++) {
        const x = gx0 + i / N * (gx1 - gx0);
        let best = Infinity;
        pts.forEach(p => {
          if (x < p.xs[0] || x > p.xs.at(-1)) return;
          let j = 1; while (j < p.xs.length - 1 && p.xs[j] < x) j++;
          const t = (x - p.xs[j - 1]) / (p.xs[j] - p.xs[j - 1]);
          best = Math.min(best, p.ys[j - 1] + t * (p.ys[j] - p.ys[j - 1]));
        });
        gx.push(x); env.push(best);
      }
      const envD = gx.map((x, i) => (i ? "L" : "M") + X(x).toFixed(1) + "," + Y(env[i]).toFixed(1)).join("");
      const envPath = S("path", { d: envD, fill: "none", css: "stroke:var(--blue)", "stroke-width": 3, "stroke-linejoin": "round", "clip-path": `url(#${clipId})` }, svg);
      S("text", { x: X(gx[Math.round(N * 0.18)]), y: Y(env[Math.round(N * 0.18)]) - 12, "font-size": 12, class: "t-blue", text: "参考包络线" }, svg);
      S("title", { text: "参考包络线：每个成本点上所有参考方案的最低损失" }, envPath);
      // 提交点与读数
      const sx = X(Math.log(sub.time_ratio)), sy = Y(subMean);
      let cross = null;
      const runMin = []; env.reduce((m, v, i) => (runMin[i] = Math.min(m, v)), Infinity);
      for (let i = 0; i < runMin.length; i++) if (runMin[i] <= subMean) { cross = i === 0 ? gx[0] : gx[i - 1] + (runMin[i - 1] - subMean) / (runMin[i - 1] - runMin[i]) * (gx[i] - gx[i - 1]); break; }
      const g = S("g", {}, svg);
      const report = C.submissions[curSub].M.per_setting[curSet];
      let readTxt;
      if (cross != null) {
        const cx = X(cross);
        S("path", { d: `M${sx},${sy} L${cx},${sy} L${cx},${H - B}`, fill: "none", css: "stroke:var(--red)", "stroke-width": 1.4, "stroke-dasharray": "4 3" }, g);
        S("circle", { cx, cy: sy, r: 3.5, css: "fill:var(--red)" }, g);
        S("text", { x: cx + 6, y: H - B - 8, "font-size": 11.5, class: "t-red", text: "包络线需要 " + Math.exp(cross).toFixed(2) + "× 成本" }, g);
        readTxt = `提交在 1× token 预算、单步时间 ${fmt(sub.time_ratio, 2)}× 下达到 ${subMean.toFixed(4)}；参考包络线要花 ${Math.exp(cross).toFixed(2)}× 成本才能达到，有效加速比 ${fmt(report.speedup, 3)}×（报告值，按种子取几何平均）。`;
      } else {
        S("path", { d: `M${sx},${sy} L${W - R},${sy}`, fill: "none", css: "stroke:var(--red)", "stroke-width": 1.4, "stroke-dasharray": "4 3" }, g);
        readTxt = `提交的损失低于参考包络线在 2× 成本内能达到的最低值，加速比按上限 2 计。`;
      }
      sub.loss.forEach(l => S("circle", { cx: sx, cy: Y(l), r: 2.6, css: "fill:var(--ink);opacity:.45" }, g));
      const dot = S("circle", { cx: sx, cy: sy, r: 6.5, css: "fill:var(--ink);stroke:var(--sheet)", "stroke-width": 2 }, g);
      S("text", { x: sx - 10, y: sy - 12, "text-anchor": "end", "font-size": 12, class: "t-ink", "font-weight": 700, text: subs[curSub].label.replace(/（.*）/, "") }, g);
      // 动画
      refPaths.forEach((p, i) => drawIn(p, 600, i * 40));
      drawIn(envPath, 1000, 300);
      if (!RM) g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 1100, fill: "backwards" });
      pop(dot, 1100, 420);
      $("#envNote").textContent = `${SETTING_NAME[curSet]}：${SETTING_DESC[curSet]}。${readTxt}`;
    }

    function renderDiv() {
      const D = subs[curSub].D, b = D.behavioral;
      const thrSim = 1 - D.threshold;
      const rows = Object.entries(b.similarity_by_reference).sort((a, c) => c[1] - a[1]);
      $("#divBars").innerHTML = rows.map(([k, v]) => `<div class="brow ${v > thrSim ? "hot" : ""}"><span class="bname">${esc(REF_NAME[k] || k)}</span><span class="btrack"><i data-w="${(v * 100).toFixed(1)}"></i><span class="thr" style="left:${(thrSim * 100).toFixed(1)}%" title="复刻阈值"></span></span><span class="bval">${fmt(v, 3)}</span></div>`).join("");
      requestAnimationFrame(() => $("#divBars").querySelectorAll("i").forEach((i, n) => setTimeout(() => { i.style.width = i.dataset.w + "%"; }, RM ? 0 : n * 60)));
      $("#divNote").innerHTML = `红色虚线是复刻阈值：相似度超过它，说明与该参考方案的差别不超过「换个超参」。行为差异 ${fmt(b.D_global, 3)}，逐层拼接口径 ${fmt(b.D_patch, 3)}；代码差异 ${fmt(D.code, 3)}；机制差异 ${fmt(D.mech, 3)}（评审等级 ${D.mech_levels.join("、")}）。D = ${fmt(D.D, 3)}。`;
    }
    function renderQ() {
      const Q = subs[curSub].Q;
      const rows = Q.sources;
      $("#qBars").innerHTML = rows.map(s => {
        const p = resolveSrc(s.id);
        const name = p ? (PAPER_SHORT[p.id] || p.id) : s.id.replace(/^arXiv:/, "");
        const cls = s.status !== "ok" ? "hot" : s.usage === "decorative" ? "muted" : s.usage === "core" ? "" : "good";
        const usage = { core: "核心", partial: "部分", decorative: "装饰" }[s.usage] || s.usage;
        if (s.status !== "ok") return `<div class="brow hot" title="${esc(s.id)}"><span class="bname">${esc(name)} · 无法解析</span><span class="btrack"><i data-w="100"></i></span><span class="bval">×0.8</span></div>`;
        const right = s.status === "unresolvable" ? "×0.8" : fmt(s.contribution, 2);
        return `<div class="brow ${cls}" title="${esc(s.title || s.id)}"><span class="bname">${esc(name)} · ${usage}</span><span class="btrack"><i data-w="${(s.status === "ok" ? (s.usage === "decorative" ? s.w * 100 : s.contribution * 100) : 100).toFixed(1)}"></i></span><span class="bval">${right}</span></div>`;
      }).join("");
      requestAnimationFrame(() => $("#qBars").querySelectorAll("i").forEach((i, n) => setTimeout(() => { i.style.width = i.dataset.w + "%"; }, RM ? 0 : n * 60)));
      $("#qNote").innerHTML = `条长 = 论文权重 w × 使用度。灰条是装饰性引用（只显示 w，贡献记 0），红条是无法解析的来源（整体 × 0.8）。Q = 1 − Π(1 − w·u) × 扣分 = ${fmt(Q.Q, 3)}。`;
    }
    function renderX() {
      const X = subs[curSub].X;
      const box = $("#xCards");
      if (!X.declarations.length) { box.innerHTML = `<p class="empty-note">该提交没有声明局部发现，X = 0，不影响门槛。</p>`; return; }
      const tagCls = st => st.startsWith("局部发现") ? "green" : st.startsWith("迁移") ? "" : st.startsWith("检索复用") ? "amber" : "red";
      box.innerHTML = X.declarations.map(d => `<div class="x-card"><div class="xh"><span class="xm">${esc(d.module)}</span><span class="tag ${tagCls(d.status)}">${esc(d.status)}</span></div>
        <p>来源 ${esc(d.source)}（${esc(d.source_year)}，${esc(d.source_field)}）：${esc(d.transferred || "")}</p>
        <div class="xf"><span>完整 ${fmt(d.S_full, 3)}×</span><span>消融 ${fmt(d.S_ablated, 3)}×</span><span>效应 ${fmt(d.effect_ln, 3)}</span><span>a ${fmt(d.a, 2)}</span><span>n ${d.n}</span><span>c ${d.c}</span><span>r ${d.r}</span><span>x ${fmt(d.x, 3)}</span></div>
        ${d.ml_precedent ? `<p>评审检索：${esc(d.ml_precedent)}</p>` : ""}</div>`).join("") + `<p class="empty-note" style="grid-column:1/-1">X = ${fmt(X.X, 3)}，综合分乘以 ${(1 + 0.25 * X.X).toFixed(3)}。</p>`;
      [...box.querySelectorAll(".x-card")].forEach((c, i) => fade(c, i * 120, 350));
    }
    function renderAll() { renderFormula(); renderEnv(); renderDiv(); renderQ(); renderX(); }
    let started = false;
    onView($("#scoring"), () => { started = true; renderAll(); }, 0.15);
    // 视图外先渲染静态结果，避免空白
    if (RM) renderAll();
    void started;
  })();

  // ------------------------------------------------------------------ Sinkhorn-Knopp
  (() => {
    const n = 5;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const M0 = Array.from({ length: n }, () => Array.from({ length: n }, () => 0.15 + rnd() * 2.6));
    let M = M0.map(r => r.slice()), iter = 0, half = 0, busy = false, playing = false;
    const svg = $("#skSvg");
    const cs = 56, ox = 40, oy = 34;
    const rowSum = m => m.map(r => r.reduce((a, b) => a + b, 0));
    const colSum = m => m[0].map((_, j) => m.reduce((a, r) => a + r[j], 0));
    const err = m => rowSum(m).reduce((a, v) => a + Math.abs(v - 1), 0) + colSum(m).reduce((a, v) => a + Math.abs(v - 1), 0);
    let cells = [], rTxt = [], cTxt = [], sweep;
    function build() {
      svg.innerHTML = "";
      S("text", { x: ox + n * cs + 30, y: oy - 12, "text-anchor": "middle", "font-size": 11.5, text: "行和" }, svg);
      S("text", { x: ox - 10, y: oy + n * cs + 30, "text-anchor": "end", "font-size": 11.5, text: "列和" }, svg);
      sweep = S("rect", { x: ox, y: oy, width: 0, height: 0, rx: 4, css: "fill:none;stroke:var(--red)", "stroke-width": 2, opacity: 0 }, svg);
      cells = [];
      for (let i = 0; i < n; i++) {
        cells.push([]);
        for (let j = 0; j < n; j++) {
          const r = S("rect", { x: ox + j * cs + 2, y: oy + i * cs + 2, width: cs - 4, height: cs - 4, rx: 4, css: "fill:var(--blue)" }, svg);
          const t = S("text", { x: ox + j * cs + cs / 2, y: oy + i * cs + cs / 2 + 4, "text-anchor": "middle", "font-size": 12, class: "t-mono" }, svg);
          cells[i].push([r, t]);
        }
      }
      rTxt = Array.from({ length: n }, (_, i) => S("text", { x: ox + n * cs + 30, y: oy + i * cs + cs / 2 + 4, "text-anchor": "middle", "font-size": 12.5, class: "t-mono" }, svg));
      cTxt = Array.from({ length: n }, (_, j) => S("text", { x: ox + j * cs + cs / 2, y: oy + n * cs + 30, "text-anchor": "middle", "font-size": 12.5, class: "t-mono" }, svg));
      svg.appendChild(sweep);
    }
    function paint(m) {
      const mx = Math.max(...m.flat());
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const [r, t] = cells[i][j];
        r.style.opacity = (0.12 + 0.88 * m[i][j] / mx).toFixed(3);
        t.textContent = m[i][j].toFixed(2);
        t.setAttribute("class", "t-mono " + (m[i][j] / mx > 0.55 ? "" : "t-ink"));
        t.style.fill = m[i][j] / mx > 0.55 ? "var(--sheet)" : "";
      }
      rowSum(m).forEach((v, i) => { rTxt[i].textContent = v.toFixed(2); rTxt[i].setAttribute("class", "t-mono " + (Math.abs(v - 1) < 0.01 ? "t-green" : "t-red")); });
      colSum(m).forEach((v, j) => { cTxt[j].textContent = v.toFixed(2); cTxt[j].setAttribute("class", "t-mono " + (Math.abs(v - 1) < 0.01 ? "t-green" : "t-red")); });
      $("#skErr").textContent = err(m).toFixed(4);
    }
    async function stepOnce() {
      if (busy) return; busy = true;
      const rowsStep = half % 2 === 0;
      const target = M.map(r => r.slice());
      if (rowsStep) { const rs = rowSum(M); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) target[i][j] = M[i][j] / rs[i]; }
      else { const c = colSum(M); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) target[i][j] = M[i][j] / c[j]; }
      $("#skOp").textContent = rowsStep ? "行归一化：每行除以行和" : "列归一化：每列除以列和";
      if (rowsStep) iter++;
      $("#skIter").textContent = iter;
      const from = M.map(r => r.slice());
      if (!RM) {
        sweep.setAttribute("opacity", 1);
        await tween(380, t => {
          if (rowsStep) { sweep.setAttribute("x", ox); sweep.setAttribute("width", n * cs); sweep.setAttribute("height", cs); sweep.setAttribute("y", oy + Math.min(n - 1, Math.floor(t * n)) * cs); }
          else { sweep.setAttribute("y", oy); sweep.setAttribute("height", n * cs); sweep.setAttribute("width", cs); sweep.setAttribute("x", ox + Math.min(n - 1, Math.floor(t * n)) * cs); }
        }, t => t);
      }
      await tween(520, t => { const cur = from.map((r, i) => r.map((v, j) => v + (target[i][j] - v) * t)); paint(cur); });
      sweep.setAttribute("opacity", 0);
      M = target; half++; busy = false;
    }
    function reset() { playing = false; $("#skPlay").textContent = "播放"; M = M0.map(r => r.slice()); iter = 0; half = 0; $("#skIter").textContent = 0; $("#skOp").textContent = "原始矩阵：正数，行列和任意"; paint(M); }
    async function play() {
      if (playing) { playing = false; $("#skPlay").textContent = "播放"; return; }
      playing = true; $("#skPlay").textContent = "暂停";
      if (err(M) < 1e-3) reset(), playing = true, $("#skPlay").textContent = "暂停";
      while (playing && err(M) > 1e-3 && half < 24) { await stepOnce(); await sleep(260); }
      playing = false; $("#skPlay").textContent = "播放";
      if (err(M) <= 1e-3) $("#skOp").textContent = "收敛：行列和都为 1，得到双随机矩阵";
    }
    build(); reset();
    $("#skPlay").addEventListener("click", play);
    $("#skStep").addEventListener("click", () => { playing = false; $("#skPlay").textContent = "播放"; stepOnce(); });
    $("#skReset").addEventListener("click", reset);
    onView($("#skSvg"), () => { if (!RM) play(); }, 0.4);
  })();

  // ------------------------------------------------------------------ 验证模式
  (() => {
    // Budget 阶梯
    const lad = $("#ladderSvg");
    const tiers = [["μ1", 7, "约 7M", "2.5 分钟", false], ["μ2", 17, "约 17M", "15 分钟", false], ["μ3", 42, "约 42M", "1.5 小时", false], ["复核", 135, "135M", "不计分", true]];
    const hOf = p => 30 + (Math.log10(p) - Math.log10(5)) / (Math.log10(150) - Math.log10(5)) * 120;
    const bars = tiers.map(([name, p, lab, t, ghost], i) => {
      const x = 22 + i * 84, h = hOf(p), y = 170 - h;
      const g = S("g", {}, lad);
      S("rect", { x, y, width: 58, height: h, rx: 3, css: ghost ? "fill:none;stroke:var(--ink-3)" : `fill:var(--blue);opacity:${0.45 + i * 0.18}`, "stroke-dasharray": ghost ? "4 3" : null, "stroke-width": 1.4 }, g);
      S("text", { x: x + 29, y: y - 8, "text-anchor": "middle", "font-size": 12, class: "t-mono t-ink", text: lab }, g);
      S("text", { x: x + 29, y: 190, "text-anchor": "middle", "font-size": 12.5, class: "t-ink", text: name }, g);
      S("text", { x: x + 29, y: 207, "text-anchor": "middle", "font-size": 11, text: t }, g);
      return g;
    });
    S("line", { x1: 12, x2: 348, y1: 170, y2: 170, class: "axis" }, lad);
    onView(lad, () => bars.forEach((g, i) => { if (!RM) { g.style.transformBox = "fill-box"; g.style.transformOrigin = "bottom"; g.animate([{ transform: "scaleY(0)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 600, delay: i * 220, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }); } }));

    // Pro 时间线
    const pro = $("#proSvg");
    const x0 = 34, x1 = 340, xOf = h => x0 + h / 24 * (x1 - x0);
    for (let k = 0; k < 4; k++) S("text", { x: 4, y: 40 + k * 22 + 4, "font-size": 10.5, class: "t-mono", text: "GPU" + k }, pro);
    const segs = [[0.2, 3.0, 0.55], [3.3, 6.5, 0.7], [7, 9.4, 0.6], [10, 23.4, 0.92]];
    const lanes = [];
    for (let k = 0; k < 4; k++) segs.forEach(([a, b, u]) => lanes.push(S("rect", { x: xOf(a), y: 32 + k * 22, width: xOf(b) - xOf(a), height: 14, rx: 2, css: `fill:var(--blue);opacity:${u}` }, pro)));
    S("line", { x1: x0, x2: x1, y1: 140, y2: 140, class: "axis" }, pro);
    [0, 6, 12, 18, 24].forEach(h => S("text", { x: xOf(h), y: 212, "text-anchor": "middle", "font-size": 10.5, class: "t-mono", text: h + "h" }, pro));
    const ticks = [];
    for (let i = 1; i <= 48; i++) ticks.push(S("rect", { x: xOf(i / 2) - 2, y: 136, width: 4, height: 8, css: "fill:var(--ink-2)" }, pro));
    S("text", { x: x0, y: 186, "font-size": 11, text: "每 30 分钟登记检查点哈希（共 48 个）" }, pro);
    const pick = 35; // 第 17.5 小时
    const br = S("path", { d: `M${xOf(pick / 2)},${150} L${xOf(pick / 2)},${156} L${xOf(pick / 2 + 1)},${156} L${xOf(pick / 2 + 1)},${150}`, fill: "none", css: "stroke:var(--red)", "stroke-width": 2 }, pro);
    const brT = S("text", { x: xOf(pick / 2 + 0.5), y: 170, "text-anchor": "middle", "font-size": 11, class: "t-red", text: "抽样续跑 1h 核对" }, pro);
    const cursor = S("line", { x1: x0, x2: x0, y1: 26, y2: 146, css: "stroke:var(--ink)", "stroke-width": 1.2 }, pro);
    onView(pro, async () => {
      if (RM) return;
      lanes.forEach(r => r.style.opacity = 0); ticks.forEach(t => t.style.opacity = 0); br.style.opacity = 0; brT.style.opacity = 0;
      await tween(2600, t => {
        const h = t * 24, x = xOf(h);
        cursor.setAttribute("x1", x); cursor.setAttribute("x2", x);
        lanes.forEach(r => { const rx = +r.getAttribute("x"); r.style.opacity = rx < x ? "" : 0; });
        ticks.forEach((tk, i) => { tk.style.opacity = xOf((i + 1) / 2) <= x ? 1 : 0; });
      }, t => t);
      ticks[pick - 1].style.fill = "var(--red)";
      br.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "forwards" });
      brT.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 150, fill: "forwards" });
    }, 0.4);

    // 判断类
    const claims = [
      { c: "矩阵型优化器相对 AdamW 有 1.4–2 倍的 token 效率提升", src: "B-T7-005 · 对照 Fantastic Pretraining Optimizers（2509.02046）", v: "部分成立", why: "调好基线后，约 1.4 倍只在 0.1B 量级出现，1.2B 时缩到约 1.1 倍", ok: false },
      { c: "新提出的 3D 分割架构全面超过 nnU-Net", src: "MD-T7-002 · 对照 nnU-Net Revisited（2404.09556）", v: "多数不成立", why: "在严格验证下，配置良好的 nnU-Net 仍是很强的基线", ok: false },
      { c: "调好的 GBDT 在中等规模表格数据上仍是强基线", src: "DS-T7-003 · 对照 Grinsztajn 等（2207.08815）", v: "成立", why: "在其基准的中等规模数据集上，树模型整体领先深度表格模型", ok: true }
    ];
    const jd = $("#judgeDemo");
    let ci = 0, jt = null;
    function showClaim() {
      const k = claims[ci % claims.length]; ci++;
      jd.innerHTML = `<div class="claim"><span class="src">${esc(k.src)}</span><span>「${esc(k.c)}」</span></div>
        <div class="verdict"><span class="stamp ${k.ok ? "ok" : ""}">${esc(k.v)}</span><span style="color:var(--ink-2);font-size:13.5px">${esc(k.why)}</span></div>
        <p class="panel-note">评分：判断准确率，加上所设计的最小验证实验的信息量。</p>`;
      fade(jd.querySelector(".claim"), 0, 300);
      const st = jd.querySelector(".stamp");
      if (!RM) st.animate([{ opacity: 0, transform: "rotate(-4deg) scale(1.8)" }, { opacity: 1, transform: "rotate(-4deg) scale(1)" }], { duration: 420, delay: 500, easing: "cubic-bezier(.2,1.3,.4,1)", fill: "backwards" });
    }
    showClaim();
    onView(jd, () => { if (!RM) jt = setInterval(showClaim, 5200); });
    void jt;
  })();

  // ------------------------------------------------------------------ 资源档、矩阵
  const caps = { low: ["≤ 2", "≤ 0.5", "≤ 10", "GPU-h（参考卡）"], medium: ["≤ 4", "≤ 2", "≤ 30", "GPU-h（参考卡）"], high: ["≤ 8", "≤ 6", "≤ 80", "GPU-h（参考卡）"], pro: ["96（4×H100×24h）", "≤ 16", "≤ 200", "H100-h"] };
  $("#tierTable").innerHTML = `<thead><tr><th>资源档</th><th>agent 开发</th><th>每次验证</th><th>参考预计算</th><th>case 数</th></tr></thead><tbody>${Object.entries(caps).map(([k, v]) =>
    `<tr><td><span class="tag ${k === "pro" ? "red" : ""}">${k}</span></td><td class="mono">${v[0]}</td><td class="mono">${v[1]}</td><td class="mono">${v[2]}</td><td class="mono">${allCases.filter(c => c.budget === k).length}</td></tr>`).join("")}
    <tr><td colspan="5" class="panel-note">单位：low / medium / high 为单张 24GB 参考卡的 GPU-h，pro 为 H100-h。纯 CPU 任务记在 low。</td></tr></tbody>`;
  (() => {
    const box = $("#matrix");
    const cols = ["low", "medium", "high", "pro"];
    const count = (d, r) => allCases.filter(c => c.difficulty === d && c.budget === r).length;
    const max = Math.max(...LEVELS.flatMap(d => cols.map(r => count(d, r))));
    let html = `<span></span>${cols.map(c => `<span class="mh">资源 ${c}</span>`).join("")}`;
    LEVELS.forEach(d => {
      html += `<span class="ml" title="${esc(IDX.legend.difficulty[d])}">难度 ${d}</span>`;
      cols.forEach(r => {
        const n = count(d, r);
        const pct = n ? 12 + 60 * n / max : 0;
        html += `<button type="button" class="${n ? "" : "zero"}" data-d="${d}" data-r="${r}" style="background:color-mix(in srgb, var(--blue) ${pct}%, var(--sheet))${n / max > 0.6 ? ";color:var(--sheet)" : ""}" ${n ? "" : "disabled"} aria-label="难度 ${d}、资源 ${r}：${n} 个 case">${n}</button>`;
      });
    });
    box.innerHTML = html;
    box.addEventListener("click", e => { const b = e.target.closest("button[data-d]"); if (!b) return; Cases.set({ diff: b.dataset.d, res: b.dataset.r, group: null, q: "" }); document.getElementById("cases").scrollIntoView({ behavior: RM ? "auto" : "smooth" }); });
    onView(box, () => [...box.querySelectorAll("button")].forEach((b, i) => pop(b, i * 50, 320)));
  })();

  // ------------------------------------------------------------------ Case 浏览
  const Cases = (() => {
    const st = { group: null, diff: null, res: null, q: "" };
    const nGroups = new Set(allCases.map(c => c.group)).size;
    $("#casesLede").textContent = `${nGroups} 组、${IDX.tracks.length} 条赛道、${allCases.length} 个 case。点任一行查看任务、验证方案和评价模式。`;
    function chips(id, key, values, names) {
      const box = $(id);
      box.querySelectorAll(".chip").forEach(x => x.remove());
      [null, ...values].forEach(v => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "chip"; b.textContent = v == null ? "全部" : names[v];
        b.setAttribute("aria-pressed", st[key] === v);
        b.addEventListener("click", () => { st[key] = v; render(); });
        box.appendChild(b);
      });
    }
    const search = $("#caseSearch");
    search.addEventListener("input", () => { st.q = search.value; renderList(); });
    function hit(c) {
      const q = st.q.trim().toLowerCase();
      return (!st.group || c.group === st.group) && (!st.diff || c.difficulty === st.diff) && (!st.res || c.budget === st.res)
        && (!q || [c.id, c.anchor, c.arxiv, c.task, c.metrics, c.track.name].join(" ").toLowerCase().includes(q));
    }
    function renderList() {
      const list = $("#caseList");
      let html = "", n = 0;
      GROUP_ORDER.forEach(g => {
        const rows = allCases.filter(c => c.group === g && hit(c));
        if (!rows.length) return;
        n += rows.length;
        html += `<div class="case-group-h"><h3>${GROUP_TITLE[g]}</h3><span>${esc(IDX.legend.groups[g])}</span></div>`;
        html += rows.map(c => `<button type="button" class="case-row" data-id="${c.id}"><span class="cid">${c.id}</span><span class="canchor">${esc(c.anchor)}</span><span class="ctask">${esc(c.task)}</span>
          <span class="cmeta">${c.status === "built" ? `<span class="tag built">已构建</span>` : ""}<span class="tag plain">难度 ${c.difficulty}</span><span class="tag ${c.budget === "pro" ? "red" : ""}">资源 ${c.budget}</span></span></button>`).join("");
      });
      list.innerHTML = html || `<div class="case-empty">没有符合条件的 case。换一个筛选条件，或清空搜索。</div>`;
      $("#caseCount").textContent = `显示 ${n} / ${allCases.length}`;
    }
    function render() {
      chips("#fGroup", "group", GROUP_ORDER, GROUP_TITLE);
      chips("#fDiff", "diff", LEVELS, { low: "low", medium: "medium", high: "high" });
      chips("#fRes", "res", ["low", "medium", "high", "pro"], LEVEL_ZH);
      search.value = st.q;
      renderList();
    }
    $("#caseList").addEventListener("click", e => { const b = e.target.closest(".case-row"); if (b) Drawer.open(b.dataset.id, b); });
    render();
    return { set(p) { Object.assign(st, p); render(); } };
  })();

  // ------------------------------------------------------------------ 详情抽屉
  const Drawer = (() => {
    const dr = $("#drawer"), scrim = $("#scrim"), body = $("#drawerBody");
    let opener = null;
    const PX = IDX.legend.proxies;
    function modeOf(c) {
      const px = c.verify_plan?.proxy || [];
      if (c.group === "pro") return "pro";
      if (px.length && px.every(p => p === "JUDGE")) return "judge";
      if (px[0] === "JUDGE") return "judge";
      return "budget";
    }
    function flowFor(c) {
      const v = c.verify_plan || {};
      const u = v.unit || "GPU-h";
      const m = modeOf(c);
      if (m === "pro") return [["4 × H100、24 小时", "开发、调试和最终训练都在这 24 小时内"], ["交付产物与可审计过程", "检查点或服务系统；日志、GPU 遥测、检查点哈希链由 harness 写入"], ["基准方验证 约 " + v.verify + " " + u, "隐藏集评测；随机抽一个登记点续跑 1 小时，或完整复跑短任务"], ["对照业界强配方", "只有超过 2σ 噪声底才算领先"], ["计分", "M · D · Q · (1 + 0.25X)；MFU、吞吐等工程指标单独报告"]];
      if (m === "judge") return [["给定公开结论与论文快照", "截止日前的材料，检索规则与其他 case 相同"], ["判断并设计最小验证实验", "开发预算 " + (v.cpu ? "纯 CPU" : v.dev + " " + u)], ["基准方核对", "用已有参考结果或一个小实验验证判断"], ["计分", "判断准确率 + 验证实验的信息量"]];
      return [["agent 开发 " + (v.cpu ? "纯 CPU" : v.dev + " " + u), "在代理上反复试错；隐藏设置不开放"], ["一次性提交", "代码、设计说明、来源声明、局部发现声明"], ["基准方重训 约 " + (v.cpu ? "CPU" : v.verify + " " + u), "按与参考方案相同的预算调参，在公开与隐藏设置上运行"], ["三道门槛", "L0 自动检查、保持 SOTA、差异化"], ["计分", "M · D · Q · (1 + 0.25X)"]];
    }
    function open(id, from) {
      const c = allCases.find(x => x.id === id); if (!c) return;
      opener = from || null;
      const v = c.verify_plan || {};
      const u = v.unit || "GPU-h";
      const link = c.arxiv ? `<a href="https://arxiv.org/abs/${esc(c.arxiv)}" target="_blank" rel="noopener">arXiv:${esc(c.arxiv)}</a>` : c.link ? `<a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.venue || "链接")}</a>` : "锚点论文待选定";
      const mode = modeOf(c);
      const modeName = { budget: "Budget 微尺度重训", pro: "Pro 审计", judge: "判断类" }[mode];
      body.innerHTML = `
        <div class="dr-sec"><span class="dr-id">${c.id} · ${esc(GROUP_TITLE[c.group])} · ${esc(c.track.name)}</span><h2 class="dr-title" id="drawerTitle">${esc(c.anchor)}</h2><span>${link}</span>
          <div class="dr-tags">${c.status === "built" ? `<span class="tag green">已构建</span>` : `<span class="tag plain">${STATUS_ZH[c.status]}</span>`}<span class="tag plain">难度 ${c.difficulty}</span><span class="tag ${c.budget === "pro" ? "red" : ""}">资源 ${c.budget}</span><span class="tag plain">${SUBSET_ZH[c.subset] || c.subset}</span><span class="tag plain">${c.type}</span>${c.verify ? `<span class="tag amber">锚点待核实</span>` : ""}</div></div>
        <div class="dr-sec"><span class="k">任务</span><p>${esc(c.task)}</p></div>
        <div class="dr-sec"><span class="k">指标</span><p>${esc(c.metrics)}</p></div>
        <div class="dr-sec"><span class="k">评价模式：${modeName}</span><div class="dr-flow">${flowFor(c).map(([a, b]) => `<div class="fl"><span class="d"></span><span class="c"><b>${esc(a)}</b><span>${esc(b)}</span></span></div>`).join("")}</div></div>
        <div class="dr-sec"><span class="k">缩减验证方案</span>
          <div class="dr-tags">${(v.proxy || []).map(p => `<span class="tag" title="${esc(PX[p] || p)}">${p} ${esc(PX[p] || "")}</span>`).join("")}${(v.risk || []).map(r => `<span class="tag amber">${esc(r)}</span>`).join("")}</div>
          <p>${esc(v.plan || "")}</p>
          <div class="dr-nums">${v.cpu ? `<div><span class="n">CPU</span><span class="l">纯 CPU 任务</span></div>` : `<div><span class="n">${v.dev}</span><span class="l">开发 ${u}</span></div><div><span class="n">${v.verify}</span><span class="l">每次验证 ${u}</span></div><div><span class="n">${v.ref}</span><span class="l">参考预计算 ${u}</span></div>`}</div></div>
        <div class="dr-sec"><span class="k">难度与资源</span><p>难度 ${c.difficulty}：${esc(IDX.legend.difficulty[c.difficulty])}</p><p>资源 ${c.budget}：${esc(IDX.legend.budget_tiers[c.budget])}</p></div>
        ${c.pairs_with ? `<div class="dr-sec"><span class="k">配对</span><p>与 Budget 版的 <button class="chip" data-open="${c.pairs_with}">${c.pairs_with}</button> 配对，两者排序一致性用来检验微尺度代理的保真度。</p></div>` : ""}
        <div class="dr-sec"><span class="k">赛道：${esc(c.track.name)}</span><p>${esc(c.track.why_focus)}</p><p class="panel-note">防投机：${esc((c.track.anti_gaming || []).join("；"))}</p></div>
        ${c.id === "B-OPT-001" ? `<div class="dr-sec"><a class="btn small primary" href="#flow" data-close>看完整回放</a></div>` : ""}`;
      dr.classList.add("open"); dr.setAttribute("aria-hidden", "false"); scrim.hidden = false;
      dr.scrollTop = 0;
      $("#drawerClose").focus({ preventScroll: true });
      [...body.querySelectorAll(".dr-sec")].forEach((s, i) => fade(s, 80 + i * 50, 280, 4));
    }
    function close() {
      dr.classList.remove("open"); dr.setAttribute("aria-hidden", "true"); scrim.hidden = true;
      if (opener && document.body.contains(opener)) opener.focus({ preventScroll: true });
    }
    $("#drawerClose").addEventListener("click", close);
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && dr.classList.contains("open")) close(); });
    body.addEventListener("click", e => {
      const o = e.target.closest("[data-open]"); if (o) { open(o.dataset.open, opener); return; }
      if (e.target.closest("[data-close]")) close();
    });
    return { open };
  })();

  // ------------------------------------------------------------------ 规模
  (() => {
    const b = allCases.filter(c => c.verify_plan && !c.verify_plan.unit), p = allCases.filter(c => c.verify_plan && c.verify_plan.unit);
    const sum = (arr, k) => arr.reduce((a, c) => a + (c.verify_plan[k] || 0), 0);
    const stats = [
      [allCases.length, "个 case", `${IDX.tracks.length} 条赛道，5 组`],
      [Math.round(sum(b, "ref")), "GPU-h", "Budget 版参考预计算（一次性）"],
      [Math.round(sum(b, "dev") + sum(b, "verify")), "GPU-h", "一个 agent 跑完 Budget 版（开发 + 验证）"],
      [Math.round(sum(p, "ref")), "H100-h", "Pro Set 参考配方（一次性）"],
      [Math.round(sum(p, "dev") + sum(p, "verify")), "H100-h", "一个 agent 跑完 Pro Set"],
      [allCases.filter(c => c.verify_plan?.risk?.length).length, "个 case", "仍有残余风险，依赖保真度校验"]
    ];
    const box = $("#scaleGrid");
    box.innerHTML = stats.map(s => `<div class="stat"><span class="n" data-to="${s[0]}">${s[0].toLocaleString()}</span><span class="u">${s[1]}</span><span class="l">${s[2]}</span></div>`).join("");
    onView(box, () => box.querySelectorAll(".n").forEach(n => { const to = +n.dataset.to; tween(1100, t => { n.textContent = Math.round(to * t).toLocaleString(); }); }));
  })();
})();

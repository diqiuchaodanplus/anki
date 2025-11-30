<script lang="ts">
  import { onMount } from 'svelte';
  import ThemeSelector from '$lib/components/ThemeSelector.svelte';

  // Simple deadline planner for reviewers.
  // This component is intentionally front-end-only and uses a straightforward
  // estimation model so it can work without backend changes. It stores user
  // settings in localStorage so they're preserved between sessions.

  type Settings = {
    title: string;
    deadline: string; // yyyy-mm-dd
    totalCards: number;
    dailyCapacity: number;
    retention: number; // 0..1
  };

  const STORAGE_KEY = 'anki_deadline_settings_v1';

  let title = '';
  let deadline = '';
  let totalCards = 100;
  let dailyCapacity = 30;
  let retention = 0.85;

  let daysRemaining: number | null = null;
  let requiredPerDay: number | null = null;
  let achievablePercent: number | null = null;
  let note = '';
  let bgColor = '';
  
  // 每张卡片平均学习时间（分钟）。这是个简单的估算值，方便在 UI 中展示每日学习分钟数。
  const MIN_PER_CARD = 2.3 / 30; // 来自示例：30 张卡约 2.3 分钟

  function computeStudyMinutes(perDay: number | null) {
    if (!perDay) return '-';
    const mins = perDay * MIN_PER_CARD;
    return `${Math.round(mins * 10) / 10} 分钟/天`;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s: Settings = JSON.parse(raw);
        title = s.title || title;
        deadline = s.deadline || deadline;
        totalCards = s.totalCards || totalCards;
        dailyCapacity = s.dailyCapacity || dailyCapacity;
        retention = s.retention ?? retention;
      }
    } catch (e) {
      console.error('failed to load settings', e);
    }
  }

  function save() {
    const s: Settings = { title, deadline, totalCards, dailyCapacity, retention };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  function compute() {
    note = '';
    if (!deadline) {
      daysRemaining = null;
      requiredPerDay = null;
      achievablePercent = null;
      return;
    }

    const now = new Date();
    const dd = new Date(deadline + 'T23:59:59');
    const diffMs = dd.getTime() - now.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const days = Math.max(0, Math.ceil(diffMs / oneDay));
    daysRemaining = days;

    if (days === 0) {
      note = '截止日已到或格式不正确。';
      requiredPerDay = totalCards;
    } else {
      requiredPerDay = Math.ceil(totalCards / days);
    }

    // Compute achievable percent with a simple model:
    // total possible reviews = dailyCapacity * daysRemaining
    // fractionSeen = min(1, total_possible_reviews / totalCards)
    // achievable mastery = fractionSeen * retention
    const possibleReviews = dailyCapacity * (daysRemaining ?? 0);
    const fractionSeen = Math.min(1, possibleReviews / Math.max(1, totalCards));
    achievablePercent = Math.round(fractionSeen * retention * 100);

    // Helpful hints
    if (possibleReviews < totalCards) {
      note = `按当前能力，到期前最多能查看 ${possibleReviews} 次（少于 ${totalCards} 张卡），建议提高每日学习量。`;
    } else {
      note = '按当前能力，理论上可在截止日前覆盖所有卡片一次。';
    }

    save();
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    title = '';
    deadline = '';
    totalCards = 100;
    dailyCapacity = 30;
    retention = 0.85;
    compute();
  }

  onMount(() => {
    load();
    compute();
    // load and apply user background color (client-only)
    try {
      const stored = localStorage.getItem('anki_debug_bg_color_v1');
      if (stored) {
        bgColor = stored;
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--user-bg', bgColor);
        }
      }
    } catch (e) {
      // ignore
    }
  });

  // persist/apply when user picks a color
  $: if (typeof window !== 'undefined') {
    if (bgColor) {
      try {
        localStorage.setItem('anki_debug_bg_color_v1', bgColor);
        document.documentElement.style.setProperty('--user-bg', bgColor);
      } catch (e) {
        // ignore
      }
    } else {
      // if cleared, remove custom var so theme falls back
      try { document.documentElement.style.removeProperty('--user-bg'); } catch (e) {}
    }
  }
</script>

<style>
  .box { padding: 12px; border: 1px solid var(--border); border-radius: 6px; max-width: 920px; }
  .row { display:flex; gap:8px; align-items:center; margin-bottom:8px; }
  label { font-weight:600; min-width:140px; }
  input[type="number"] { width:140px; }
  .muted { color:var(--muted); font-size:0.9em }

  /* 对齐的 Deadlines 表格样式 */
  .deadlines { margin-top:12px; border-radius:8px; overflow:hidden; }
  .deadlines .header,
  .deadlines .row {
    display: grid;
    grid-template-columns: 1.5fr 0.7fr 0.8fr 0.8fr 0.9fr 0.8fr;
    gap: 12px;
    align-items: center;
    padding: 12px 14px;
    word-break: break-word;
  }
  .deadlines .header {
    background: linear-gradient(90deg, rgba(0,0,0,0.03), rgba(0,0,0,0.01));
    font-weight:700;
    color: var(--fg);
  }
  .deadlines .row {
    background: rgba(255,255,255,0.75);
    border-bottom: 1px solid rgba(0,0,0,0.04);
  }
  .deadlines .row:last-child { border-bottom: none; }
  .deadlines .name { display:flex; flex-direction:column; gap:6px; }
  .deadlines .small-muted { color: var(--muted); font-size:0.85em }

  @media (max-width: 720px) {
    .deadlines .header, .deadlines .row {
      grid-template-columns: 1fr 0.9fr 0.9fr;
      grid-auto-rows: auto;
    }
    .deadlines .header > :nth-child(n+4),
    .deadlines .row > :nth-child(n+4) { display: none; }
  }
</style>

  <div style="display:flex; align-items:center; justify-content:space-between; max-width:720px; margin-bottom:8px;">
  <div></div>
  <div>
    <!-- Theme selector for quick testing -->
      <div style="display:flex; gap:8px; align-items:center;">
        <ThemeSelector />
        <label style="display:flex; align-items:center; gap:6px; font-weight:600;">
          背景色
          <input type="color" bind:value={bgColor} title="选择页面背景色" style="width:36px; height:28px; padding:0; border:none; background:transparent;" />
        </label>
        <button on:click={() => { bgColor = ''; localStorage.removeItem('anki_debug_bg_color_v1'); }}>清除</button>
      </div>
  </div>
</div>

<div class="box">
  <h2>考试 / 截止日规划器（演示）</h2>

  <div class="row"><label>目标名称</label><input bind:value={title} placeholder="例如：12月20日 英语六级"/></div>
  <div class="row"><label>截止日期</label><input type="date" bind:value={deadline} /></div>
  <div class="row"><label>目标卡片总数</label><input type="number" min="1" bind:value={totalCards} /></div>
  <div class="row"><label>每日可复习卡数</label><input type="number" min="1" bind:value={dailyCapacity} /></div>
  <div class="row"><label>单次记忆保留率（0-1）</label><input type="number" step="0.01" min="0" max="1" bind:value={retention} /></div>

  <div style="margin-top:8px; display:flex; gap:8px;">
    <button on:click={compute}>计算计划</button>
    <button on:click={reset}>重置</button>
  </div>

  <hr />
  <div class="deadlines" aria-live="polite">
    <div class="header">
      <div>名称</div>
      <div>剩余天数</div>
      <div>需学卡数</div>
      <div>建议每日</div>
      <div>预计每日学习时间</div>
      <div>预计掌握率</div>
    </div>

    <div class="row">
      <div class="name">
        <div>{title || '-'}</div>
        <div class="small-muted">截止：{deadline || '-'}</div>
      </div>
      <div>{daysRemaining === null ? '-' : daysRemaining}</div>
      <div>{totalCards}</div>
      <div>{requiredPerDay ?? '-'}</div>
      <div>{requiredPerDay ? computeStudyMinutes(requiredPerDay) : '-'}</div>
      <div>{achievablePercent ?? '-'}%</div>
    </div>
  </div>

  <div style="margin-top:8px" class="muted">{note}</div>
</div>

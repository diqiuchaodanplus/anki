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
  });
</script>

<style>
  .box { padding: 12px; border: 1px solid var(--border); border-radius: 6px; max-width: 720px; }
  .row { display:flex; gap:8px; align-items:center; margin-bottom:8px; }
  label { font-weight:600; min-width:140px; }
  input[type="number"] { width:140px; }
  .muted { color:var(--muted); font-size:0.9em }
</style>

  <div style="display:flex; align-items:center; justify-content:space-between; max-width:720px; margin-bottom:8px;">
  <div></div>
  <div>
    <!-- Theme selector for quick testing -->
    <ThemeSelector />
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

  <div>
    <div><strong>目标：</strong>{title || '-'} 截止：{deadline || '-'}</div>
    <div class="muted">天数剩余：{daysRemaining === null ? '-' : daysRemaining}</div>
    <div class="muted">建议每日最低复习：{requiredPerDay ?? '-'} 张</div>
    <div class="muted">按当前节奏预计掌握：{achievablePercent ?? '-'}%</div>
    <div style="margin-top:8px">{note}</div>
  </div>
</div>

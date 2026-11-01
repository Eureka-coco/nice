/**
 * 电商营销工作台 — 主应用逻辑
 */

(function () {
  'use strict';

  // --- DOM 引用 ---
  const $ = (sel) => document.querySelector(sel);

  const els = {
    btnGenerate:    $('#btnGenerate'),
    btnConfig:      $('#btnConfig'),
    btnConfigCancel:$('#btnConfigCancel'),
    btnConfigSave:  $('#btnConfigSave'),
    configPanel:    $('#configPanel'),
    apiToken:       $('#apiToken'),
    workflowId:     $('#workflowId'),
    baseUrl:        $('#baseUrl'),
    statusBar:      $('#statusBar'),
    statusText:     $('#statusText'),
    loading:        $('#loading'),
    emptyState:     $('#emptyState'),
    errorBanner:    $('#errorBanner'),
    errorMessage:   $('#errorMessage'),
    errorClose:     $('#errorClose'),
    resultsGrid:    $('#resultsGrid'),
    toast:          $('#toast'),
  };

  // --- 状态 ---
  let isLoading = false;

  // --- 初始化 ---
  function init() {
    loadConfig();
    bindEvents();
  }

  // --- 加载配置到表单 ---
  function loadConfig() {
    const cfg = CozeAPI.getConfig();
    if (cfg.token)     els.apiToken.value   = cfg.token;
    if (cfg.workflowId) els.workflowId.value = cfg.workflowId;
    if (cfg.baseUrl)   els.baseUrl.value     = cfg.baseUrl;
  }

  // --- 事件绑定 ---
  function bindEvents() {
    els.btnGenerate.addEventListener('click', handleGenerate);
    els.btnConfig.addEventListener('click', () => toggleConfig(true));
    els.btnConfigCancel.addEventListener('click', () => toggleConfig(false));
    els.btnConfigSave.addEventListener('click', handleSaveConfig);
    els.errorClose.addEventListener('click', hideError);
  }

  // --- 配置面板切换 ---
  function toggleConfig(show) {
    els.configPanel.style.display = show ? 'block' : 'none';
    if (show) loadConfig();
  }

  // --- 保存配置 ---
  function handleSaveConfig() {
    CozeAPI.saveConfig({
      token:      els.apiToken.value.trim(),
      workflowId: els.workflowId.value.trim(),
      baseUrl:    els.baseUrl.value,
    });
    toggleConfig(false);
    showToast('✅ 配置已保存');
  }

  // --- 生成文案 ---
  async function handleGenerate() {
    if (isLoading) return;
    isLoading = true;

    // 重置 UI
    hideError();
    els.emptyState.style.display = 'none';
    els.resultsGrid.innerHTML = '';
    els.loading.style.display = 'block';
    els.statusText.textContent = '正在调用 AI 工作流…';
    els.btnGenerate.disabled = true;

    try {
      const results = await CozeAPI.generateCopy();

      if (!results || results.length === 0) {
        els.emptyState.style.display = 'block';
        els.statusText.textContent = '完成 — 未生成文案，请检查工作流配置';
      } else {
        renderCards(results);
        els.statusText.textContent = `完成 — 已生成 ${results.length} 条文案`;
      }
    } catch (err) {
      showError(err.message || '生成失败，请稍后重试');
      els.statusText.textContent = '生成失败';
      els.emptyState.style.display = 'block';
    } finally {
      els.loading.style.display = 'none';
      els.btnGenerate.disabled = false;
      isLoading = false;
    }
  }

  // --- 渲染卡片 ---
  function renderCards(items) {
    els.resultsGrid.innerHTML = items.map(item => buildCard(item)).join('');
  }

  // --- 构建单张卡片 HTML ---
  function buildCard(item) {
    const title      = escapeHtml(item.title || item.product || '营销文案');
    const product    = escapeHtml(item.product || '');
    const copy       = escapeHtml(item.copy || item.content || item.text || '');
    const source     = escapeHtml(item.source || item.news_source || 'AI 智能生成');
    const badge      = item.badge || 'new';
    const badgeLabel = { hot: '热门', new: '新品', deal: '促销' }[badge] || '新品';
    const date       = formatDate(item.date || item.created_at);
    const tags       = item.tags || [];
    const id         = item.id || Math.random().toString(36).slice(2);

    const tagsHTML = tags.length
      ? tags.map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('')
      : '';

    return `
      <div class="card" data-id="${escapeHtml(id)}">
        <div class="card-header">
          <span class="card-badge ${badge}">${badgeLabel}</span>
          <span class="card-date">${date}</span>
        </div>
        <div class="card-body">
          <div class="card-title">${title}</div>
          <div class="card-source">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            ${source}
          </div>
          <div class="card-copy-text">${copy}</div>
        </div>
        <div class="card-footer">
          <button class="btn-icon btn-copy" data-copy="${escapeHtml(copy)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            复制
          </button>
          <button class="btn-icon btn-edit" data-text="${escapeHtml(copy)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            微调
          </button>
          <div class="card-tags">${tagsHTML}</div>
        </div>
      </div>`;
  }

  // --- 复制功能 (事件委托) ---
  document.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('.btn-copy');
    if (copyBtn) {
      const text = copyBtn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          已复制
        `;
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            复制
          `;
        }, 2000);
      } catch {
        showToast('⚠ 复制失败，请手动选择文字');
      }
    }

    // 微调按钮 — 让文案变为可编辑
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      const card = editBtn.closest('.card');
      const copyEl = card.querySelector('.card-copy-text');
      if (copyEl.contentEditable === 'true') {
        copyEl.contentEditable = 'false';
        copyEl.style.outline = '';
        editBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          微调
        `;
        showToast('✅ 文案已保存');
      } else {
        copyEl.contentEditable = 'true';
        copyEl.style.outline = '2px dashed var(--color-primary)';
        copyEl.style.outlineOffset = '2px';
        copyEl.focus();
        editBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          完成
        `;
      }
    }
  });

  // --- UI 辅助 ---
  function showError(msg) {
    els.errorMessage.textContent = msg;
    els.errorBanner.style.display = 'flex';
  }

  function hideError() {
    els.errorBanner.style.display = 'none';
  }

  function showToast(msg) {
    const t = els.toast;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = now - date;
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- 启动 ---
  init();
})();

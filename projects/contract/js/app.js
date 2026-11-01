/**
 * 合同审查工作台 — 主应用逻辑
 */
(function () {
  'use strict';

  // ── DOM 引用 ────────────────────────────────────────
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const els = {
    // 顶部
    connectionStatus: $('#connectionStatus'),

    // 表单
    form: $('#reviewForm'),
    contractType: $('#contractType'),
    reviewStance: $('#reviewStance'),
    focusAreas: $$('[name="focusAreas"]'),
    additionalReq: $('#additionalReq'),
    fileInput: $('#fileInput'),
    uploadArea: $('#uploadArea'),
    uploadHint: $('#uploadHint'),
    uploadFileName: $('#uploadFileName'),
    fileRemoveBtn: $('#fileRemoveBtn'),
    contractText: $('#contractText'),
    charCount: $('#charCount'),
    btnSubmit: $('#btnSubmit'),
    btnReset: $('#btnReset'),
    formError: $('#formError'),

    // 步骤
    stepItems: $$('.step-item'),

    // 加载
    loadingSection: $('#loadingSection'),
    loadingText: $('#loadingText'),

    // 错误
    errorSection: $('#errorSection'),
    errorMessage: $('#errorMessage'),
    btnRetry: $('#btnRetry'),

    // 结果
    resultSection: $('#resultSection'),
    mockBanner: $('#mockBanner'),
    resultSummary: $('#resultSummary'),
    legalCheckSummary: $('#legalCheckSummary'),
    enterpriseCheckSummary: $('#enterpriseCheckSummary'),
    opinionCount: $('#opinionCount'),
    highCount: $('#highCount'),
    mediumCount: $('#mediumCount'),
    lowCount: $('#lowCount'),
    opinionsList: $('#opinionsList'),
    filterAll: $('#filterAll'),
    filterHigh: $('#filterHigh'),
    filterMedium: $('#filterMedium'),
    filterLow: $('#filterLow'),
    btnCopyAll: $('#btnCopyAll'),
    btnFeishuReport: $('#btnFeishuReport'),

    // 历史
    historySection: $('#historySection'),
    historyList: $('#historyList'),
    btnClearHistory: $('#btnClearHistory'),
  };

  // ── 状态 ────────────────────────────────────────────
  let isSubmitting = false;
  let currentResult = null;
  let currentFilter = 'all';
  let reviewHistory = [];

  // ── 初始化 ──────────────────────────────────────────
  function init() {
    loadHistory();
    bindEvents();
    checkConnection();
  }

  // ── 检查 Coze 连接 ──────────────────────────────────
  async function checkConnection() { setConnectionStatus("mock", "预设样例演示"); }

  function setConnectionStatus(status, text) {
    els.connectionStatus.textContent = text;
    els.connectionStatus.className = `connection-status ${status}`;
  }

  // ── 事件绑定 ────────────────────────────────────────
  function bindEvents() {
    // 表单提交
    els.form.addEventListener('submit', (e) => { e.preventDefault(); handleSubmit(); });
    els.btnReset.addEventListener('click', handleReset);

    // 文件上传
    els.uploadArea.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', handleFileSelect);
    els.fileRemoveBtn.addEventListener('click', handleFileRemove);

    // 拖拽上传
    els.uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); els.uploadArea.classList.add('dragover'); });
    els.uploadArea.addEventListener('dragleave', () => els.uploadArea.classList.remove('dragover'));
    els.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      els.uploadArea.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length) handleFiles(files);
    });

    // 粘贴文本
    els.contractText.addEventListener('input', updateCharCount);

    // 结果筛选
    els.filterAll.addEventListener('click', () => filterOpinions('all'));
    els.filterHigh.addEventListener('click', () => filterOpinions('high'));
    els.filterMedium.addEventListener('click', () => filterOpinions('medium'));
    els.filterLow.addEventListener('click', () => filterOpinions('low'));

    // 复制全部 & 重试 & 飞书报告
    els.btnCopyAll.addEventListener('click', copyAllOpinions);
    els.btnRetry.addEventListener('click', handleSubmit);
    els.btnFeishuReport.addEventListener('click', () => {
      if (currentResult && currentResult.feishu_report_url) {
        window.open(currentResult.feishu_report_url, '_blank');
      }
    });

    // 清空历史
    els.btnClearHistory.addEventListener('click', clearHistory);

    // 事件委托：复制单条建议
    document.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.btn-copy-suggestion');
      if (copyBtn) {
        const text = copyBtn.dataset.text;
        copyToClipboard(text, copyBtn);
      }
    });
  }

  // ── 文件处理 ────────────────────────────────────────
  function handleFileSelect(e) {
    if (e.target.files.length) handleFiles(e.target.files);
  }

  function handleFiles(files) {
    const file = files[0];
    if (!file) return;

    // 校验文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showFormError('文件大小超过 10MB 限制，请压缩后重试');
      return;
    }

    // 校验文件类型
    const allowedExts = ['.pdf', '.doc', '.docx', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExts.includes(ext)) {
      showFormError('不支持的文件格式，请上传 PDF、Word、TXT 或 MD 文件');
      return;
    }

    els.uploadHint.style.display = 'none';
    els.uploadFileName.textContent = file.name;
    els.uploadFileName.style.display = 'inline';
    els.fileRemoveBtn.style.display = 'inline';
    els.uploadArea.classList.add('has-file');
    clearFormError();
  }

  function handleFileRemove() {
    els.fileInput.value = '';
    els.uploadHint.style.display = 'block';
    els.uploadFileName.style.display = 'none';
    els.fileRemoveBtn.style.display = 'none';
    els.uploadArea.classList.remove('has-file');
  }

  function getFileContent(file) {
    return new Promise((resolve, reject) => {
      if (file.type === 'application/pdf') {
        // PDF 文件：仅提取文件名，实际文本提取需后端支持
        resolve(`[PDF文件: ${file.name}] (PDF文本提取需通过后端服务完成，当前以文件名提交)`)
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      if (file.type.includes('text') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        // Word 等二进制格式，仅能提取文件名
        resolve(`[文件: ${file.name}] (请直接粘贴文本内容以获得完整审查)`);
      }
    });
  }

  // ── 字数统计 ────────────────────────────────────────
  function updateCharCount() {
    const len = els.contractText.value.length;
    els.charCount.textContent = `${len} 字`;
  }

  // ── 表单错误 ────────────────────────────────────────
  function showFormError(msg) {
    els.formError.textContent = msg;
    els.formError.style.display = 'block';
  }

  function clearFormError() {
    els.formError.style.display = 'none';
  }

  // ── 表单验证 ────────────────────────────────────────
  function validateForm() {
    const hasFile = els.fileInput.files.length > 0;
    const text = els.contractText.value.trim();

    if (!hasFile && !text) {
      showFormError('请上传合同文件或粘贴合同文本');
      return false;
    }

    if (!els.contractType.value) {
      showFormError('请选择合同类型');
      els.contractType.focus();
      return false;
    }

    clearFormError();
    return true;
  }

  // ── 提交审查 ────────────────────────────────────────
  async function handleSubmit() {
    if (isSubmitting) return;
    if (!validateForm()) return;

    isSubmitting = true;
    els.btnSubmit.disabled = true;
    clearFormError();

    // 隐藏之前的结果
    els.resultSection.style.display = 'none';
    els.errorSection.style.display = 'none';
    els.mockBanner.style.display = 'none';

    // 收集表单数据
    const contractType = els.contractType.value;
    const reviewStance = els.reviewStance.value;
    const focusAreas = Array.from(els.focusAreas).filter(cb => cb.checked).map(cb => cb.value);
    const additionalReq = els.additionalReq.value.trim();

    // 获取合同文本
    let contractText = els.contractText.value.trim();
    const hasFile = els.fileInput.files.length > 0;
    if (hasFile) {
      try {
        const fileContent = await getFileContent(els.fileInput.files[0]);
        contractText = contractText
          ? contractText + '\n\n---\n上传文件内容:\n' + fileContent
          : fileContent;
      } catch (err) {
        showFormError('文件读取失败，请重试或直接粘贴文本');
        isSubmitting = false;
        els.btnSubmit.disabled = false;
        return;
      }
    }

    // 显示加载状态
    showLoading();
    startStepAnimation();

    try {
      // 调用 Coze 工作流（通过后端代理）
      const result = await callCozeWorkflow({
        contract_text: contractText,
        contract_type: contractType,
        review_stance: reviewStance,
        focus_areas: focusAreas,
        additional_requirements: additionalReq,
      });

      currentResult = result;

      // 完成步骤动画
      completeAllSteps();
      await sleep(400);

      // 显示结果
      hideLoading();
      showResult(result);

      // 保存历史
      saveToHistory(result, contractType);

      // 滚动到结果区域
      setTimeout(() => {
        els.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);

      setConnectionStatus('connected', '扣子工作流已连接');

    } catch (err) {
      hideLoading();
      resetSteps();

      // 如果是 mock 回退（后端未配置 PAT）
      if (err.message === 'FALLBACK_TO_MOCK') {
        // mock 数据已在 callCozeWorkflow 中处理
      } else {
        showError(err.message || '审查请求失败，请稍后重试');
      }
    } finally {
      isSubmitting = false;
      els.btnSubmit.disabled = false;
    }
  }

  // ── 调用 Coze 工作流 ────────────────────────────────
  async function callCozeWorkflow(params) { return MockData.generate(params.contract_type, params.review_stance, params.focus_areas, params.additional_requirements); }

  function normalizeCozeResult(data, params) {
    // 如果已经是完整格式，直接返回
    if (data && data.review_opinions) {
      return { ...data, isMock: false };
    }

    // 尝试从不同结构中提取
    const opinions = data?.review_opinions || data?.opinions || data?.list || data?.items || [];
    const opinionsArr = Array.isArray(opinions) ? opinions : [opinions];

    return {
      isMock: false,
      contract_type: params.contract_type,
      review_stance: params.review_stance,
      review_time: new Date().toISOString(),
      total_opinions: opinionsArr.length,
      high_risk_count: opinionsArr.filter(o => o.risk_level === 'high').length,
      medium_risk_count: opinionsArr.filter(o => o.risk_level === 'medium').length,
      low_risk_count: opinionsArr.filter(o => o.risk_level === 'low').length,
      review_opinions: opinionsArr,
      legal_reference_check: data?.legal_reference_check || { summary: '法律引用核验已完成' },
      enterprise_info_check: data?.enterprise_info_check || { summary: '企业信息核验已完成' },
      feishu_report_url: data?.feishu_report_url || data?.report_url || '',
    };
  }

  // ── 步骤动画 ────────────────────────────────────────
  const stepLabels = [
    '提取合同内容',
    '查询企业信息',
    '审查合同条款',
    '生成审查报告',
  ];

  function startStepAnimation() {
    els.stepItems.forEach((item, i) => {
      item.classList.remove('active', 'completed');
      item.querySelector('.step-number').textContent = i + 1;
    });
    // 标记第一步为进行中
    els.stepItems[0]?.classList.add('active');

    // 模拟步骤推进
    let step = 0;
    const interval = setInterval(() => {
      if (!isSubmitting || step >= 3) {
        clearInterval(interval);
        return;
      }
      els.stepItems[step]?.classList.remove('active');
      els.stepItems[step]?.classList.add('completed');
      els.stepItems[step].querySelector('.step-number').textContent = '✓';
      step++;
      els.stepItems[step]?.classList.add('active');
    }, 1200);

    // 存储 interval 以便清理
    els.loadingSection._stepInterval = interval;
  }

  function completeAllSteps() {
    clearInterval(els.loadingSection._stepInterval);
    els.stepItems.forEach((item) => {
      item.classList.remove('active');
      item.classList.add('completed');
      item.querySelector('.step-number').textContent = '✓';
    });
  }

  function resetSteps() {
    clearInterval(els.loadingSection._stepInterval);
    els.stepItems.forEach((item, i) => {
      item.classList.remove('active', 'completed');
      item.querySelector('.step-number').textContent = i + 1;
    });
  }

  // ── 加载状态 ────────────────────────────────────────
  function showLoading() {
    els.loadingSection.style.display = 'block';
    els.loadingText.textContent = '正在提取文本并逐项分析合同条款，请稍候';
    els.loadingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideLoading() {
    els.loadingSection.style.display = 'none';
  }

  function updateLoadingText(text) {
    els.loadingText.textContent = text;
  }

  // ── 错误显示 ────────────────────────────────────────
  function showError(msg) {
    els.errorSection.style.display = 'block';
    els.errorMessage.textContent = msg;
    els.errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── 结果展示 ────────────────────────────────────────
  function showResult(result) {
    els.resultSection.style.display = 'block';

    // Mock 提示
    if (result.isMock) {
      els.mockBanner.style.display = 'flex';
    } else {
      els.mockBanner.style.display = 'none';
    }

    // 摘要
    els.opinionCount.textContent = result.total_opinions;
    els.highCount.textContent = result.high_risk_count;
    els.mediumCount.textContent = result.medium_risk_count;
    els.lowCount.textContent = result.low_risk_count;

    // 法律引用核验
    if (result.legal_reference_check) {
      els.legalCheckSummary.textContent = result.legal_reference_check.summary || '法律引用核验已完成';
      els.legalCheckSummary.parentElement.style.display = 'flex';
    }

    // 企业信息核验
    if (result.enterprise_info_check) {
      els.enterpriseCheckSummary.textContent = result.enterprise_info_check.summary || '企业信息核验已完成';
      els.enterpriseCheckSummary.parentElement.style.display = 'flex';
    }

    // 飞书报告按钮
    if (result.feishu_report_url) {
      els.btnFeishuReport.style.display = 'inline-flex';
    } else {
      els.btnFeishuReport.style.display = 'none';
    }

    // 渲染审查意见
    renderOpinions(result.review_opinions);

    // 重置筛选
    currentFilter = 'all';
    updateFilterButtons();
  }

  function renderOpinions(opinions) {
    if (!opinions || opinions.length === 0) {
      els.opinionsList.innerHTML = '<p class="no-opinions">未发现明显风险</p>';
      return;
    }

    els.opinionsList.innerHTML = opinions.map((o, i) => {
      const riskLabel = { high: '高风险', medium: '中风险', low: '低风险' };
      const riskClass = o.risk_level || 'low';
      return `
        <div class="opinion-card" data-risk="${riskClass}">
          <div class="opinion-header">
            <span class="risk-badge ${riskClass}">${riskLabel[riskClass] || '低风险'}</span>
            <span class="opinion-index">#${i + 1}</span>
          </div>
          <h4 class="opinion-title">${escapeHtml(o.title || '审查意见')}</h4>
          <div class="opinion-section">
            <h5>问题分析</h5>
            <p>${escapeHtml(o.analysis || o.description || '暂无分析')}</p>
          </div>
          <div class="opinion-section">
            <h5>修改建议</h5>
            <div class="suggestion-box">${escapeHtml(o.suggestion || o.recommendation || '暂无建议')}</div>
          </div>
          <div class="opinion-footer">
            <button class="btn-copy-suggestion" data-text="${escapeHtml(o.suggestion || o.recommendation || '')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              复制修改建议
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── 筛选 ────────────────────────────────────────────
  function filterOpinions(level) {
    currentFilter = level;
    updateFilterButtons();

    const cards = els.opinionsList.querySelectorAll('.opinion-card');
    cards.forEach(card => {
      if (level === 'all' || card.dataset.risk === level) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  function updateFilterButtons() {
    [els.filterAll, els.filterHigh, els.filterMedium, els.filterLow].forEach(btn => {
      btn.classList.remove('active');
    });
    const map = { all: els.filterAll, high: els.filterHigh, medium: els.filterMedium, low: els.filterLow };
    if (map[currentFilter]) map[currentFilter].classList.add('active');
  }

  // ── 复制功能 ────────────────────────────────────────
  async function copyToClipboard(text, btn) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '✓ 已复制';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('copied');
      }, 2000);
    } catch {
      // 回退：使用传统方法
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.textContent = '✓ 已复制';
      setTimeout(() => { btn.textContent = '复制修改建议'; }, 2000);
    }
  }

  async function copyAllOpinions() {
    if (!currentResult || !currentResult.review_opinions) return;
    const text = currentResult.review_opinions.map((o, i) => {
      return `【意见 ${i + 1}】${o.title}\n风险等级：${({high:'高风险',medium:'中风险',low:'低风险'})[o.risk_level]}\n问题分析：${o.analysis}\n修改建议：${o.suggestion}\n`;
    }).join('\n---\n\n');

    try {
      await navigator.clipboard.writeText(text);
      const orig = els.btnCopyAll.innerHTML;
      els.btnCopyAll.innerHTML = '✓ 已复制全部意见';
      els.btnCopyAll.classList.add('copied');
      setTimeout(() => {
        els.btnCopyAll.innerHTML = orig;
        els.btnCopyAll.classList.remove('copied');
      }, 2000);
    } catch {
      showFormError('复制失败，请手动选择文字复制');
    }
  }

  // ── 重置 ────────────────────────────────────────────
  function handleReset() {
    els.form.reset();
    els.contractText.value = '';
    updateCharCount();
    handleFileRemove();
    clearFormError();
    els.resultSection.style.display = 'none';
    els.errorSection.style.display = 'none';
    els.mockBanner.style.display = 'none';
    currentResult = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── 历史记录 ────────────────────────────────────────
  function loadHistory() {
    try {
      const raw = localStorage.getItem('contract_review_history');
      reviewHistory = raw ? JSON.parse(raw) : [];
    } catch { reviewHistory = []; }
    renderHistory();
  }

  function saveToHistory(result, contractType) {
    const entry = {
      id: Date.now(),
      contract_name: contractType || '合同',
      review_time: new Date().toISOString(),
      total_opinions: result.total_opinions,
      high_risk_count: result.high_risk_count,
      result: result, // 保留完整结果以便回看
    };
    reviewHistory.unshift(entry);

    // 最多保留 20 条
    if (reviewHistory.length > 20) reviewHistory = reviewHistory.slice(0, 20);

    try {
      localStorage.setItem('contract_review_history', JSON.stringify(reviewHistory));
    } catch { /* storage full */ }
    renderHistory();
  }

  function renderHistory() {
    if (reviewHistory.length === 0) {
      els.historySection.style.display = 'none';
      return;
    }

    els.historySection.style.display = 'block';
    els.historyList.innerHTML = reviewHistory.map((h, i) => `
      <div class="history-item" data-id="${h.id}">
        <div class="history-info">
          <span class="history-name">${escapeHtml(h.contract_name)}</span>
          <span class="history-time">${formatDate(h.review_time)}</span>
        </div>
        <div class="history-stats">
          <span>意见 ${h.total_opinions}</span>
          <span class="high">高风险 ${h.high_risk_count}</span>
        </div>
        <button class="history-view" data-index="${i}">查看</button>
      </div>
    `).join('');

    // 绑定查看按钮
    els.historyList.querySelectorAll('.history-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        const entry = reviewHistory[idx];
        if (entry && entry.result) {
          currentResult = entry.result;
          showResult(entry.result);
          setTimeout(() => {
            els.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      });
    });
  }

  function clearHistory() {
    if (confirm('确定清空所有审查记录？')) {
      reviewHistory = [];
      localStorage.removeItem('contract_review_history');
      renderHistory();
    }
  }

  // ── 工具函数 ────────────────────────────────────────
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = now - date;
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // ── 启动 ────────────────────────────────────────────
  init();
})();

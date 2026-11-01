/**
 * Coze 工作流 API 集成
 * 支持 api.coze.cn / api.coze.com / Mock 模式
 */

const CozeAPI = (() => {
  // --- 配置存储 ---
  const STORAGE_KEY = 'coze_workbench_config';

  function getConfig() { return { baseUrl: "mock" }; }

  function saveConfig(cfg) { /* Public demo has no credentials. */ }

  // --- Mock 数据 ---
  const MOCK_RESULTS = [
    {
      id: '1',
      title: '「夏日焕新」限时特惠 — 清凉科技面料防晒衣',
      product: '冰感防晒衣',
      copy: '炎炎夏日，出行也要轻盈自在！🌿\n\n我们的冰感防晒衣采用凉感科技面料，UPF 50+ 高效防晒，透气不闷热。即日起至 8 月 8 日，限时 7 折，两件再减 ¥30！\n\n清爽出街，从这里开始 👉',
      source: '预设演示素材 · 非实时资讯，数据与商品参数未核验',
      tags: ['夏季', '防晒', '促销'],
      badge: 'hot',
      date: new Date().toISOString(),
    },
    {
      id: '2',
      title: '「露营正当时」便携户外装备套装推荐',
      product: '户外露营三件套',
      copy: '周末去哪儿？不如带上我们的露营三件套出发！🏕️\n\n帐篷+睡袋+折叠桌椅，一套搞定所有户外需求。轻量化设计，收纳仅重 3.2kg，女生也能轻松拎走。\n\n新品尝鲜价 ¥299，赠定制收纳袋一只～',
      source: '预设演示素材 · 非实时资讯，数据与商品参数未核验',
      tags: ['户外', '露营', '新品'],
      badge: 'new',
      date: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      title: '「数码控必入」降噪耳机 618 返场特卖',
      product: '主动降噪蓝牙耳机',
      copy: '通勤、办公、学习的效率神器来了！🎧\n\n40dB 深度降噪，60 小时超长续航，Hi-Res 认证音质。618 返场价仅需 ¥199，还享 30 天无忧退换。\n\n让世界安静下来，听见更好的声音 🔊',
      source: '预设演示素材 · 非实时资讯，数据与商品参数未核验',
      tags: ['数码', '耳机', '返场'],
      badge: 'deal',
      date: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '4',
      title: '「居家好物」智能扫地机器人升级版上市',
      product: '扫拖一体机器人 Pro',
      copy: '解放双手，从这一刻开始！🤖\n\n全新升级 LDS 激光导航，5000Pa 超大吸力，自动集尘 60 天免倒垃圾。支持米家/天猫精灵语音控制。\n\n首发价 ¥1499，前 100 名下单赠配件礼包！',
      source: '预设演示素材 · 非实时资讯，数据与商品参数未核验',
      tags: ['家居', '智能', '首发'],
      badge: 'new',
      date: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: '5',
      title: '「健康生活」有机食品礼盒 — 送礼自用两相宜',
      product: '有机杂粮礼盒',
      copy: '吃出健康好气色！🥗\n\n精选 12 种有机杂粮，产地直采、营养师科学配比。无农药残留、无添加，老人小孩都安心。\n\n中秋预售开启，精美礼盒装 ¥128，买三送一！',
      source: '预设演示素材 · 非实时资讯，数据与商品参数未核验',
      tags: ['食品', '健康', '礼品'],
      badge: 'hot',
      date: new Date(Date.now() - 18000000).toISOString(),
    },
    {
      id: '6',
      title: '「美妆速递」新款持妆粉底液 — 12 小时不脱妆',
      product: '轻透持妆粉底液',
      copy: '夏日底妆的终极答案来了！💄\n\n微米级粉质，一抹柔焦毛孔，12 小时控油持妆。6 色可选，满足亚洲肤色需求。\n\n现在下单送同款小样 2 支 + 美妆蛋 1 个，到手价 ¥89！',
      source: '预设演示素材 · 非实时资讯，数据与商品参数未核验',
      tags: ['美妆', '夏日', '赠品'],
      badge: 'deal',
      date: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  // --- Mock 模式模拟延迟 ---
  function mockDelay(ms = 1500) {
    return new Promise(r => setTimeout(r, ms + Math.random() * 1000));
  }

  // --- 调用真实的 Coze 工作流 ---
  async function runWorkflow(baseUrl, token, workflowId, params = {}) {
    const url = `${baseUrl}/v1/workflow/run`;
    const body = {
      workflow_id: workflowId,
      parameters: params,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API 请求失败 (${res.status}): ${err}`);
    }

    const data = await res.json();

    // Coze 工作流返回格式: { code: 0, data: "..." }
    // data 字段是字符串，通常是被 JSON.stringified 的数组
    if (data.code !== 0) {
      throw new Error(`工作流执行失败: ${data.msg || '未知错误'}`);
    }

    let parsed = data.data;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { /* keep as string */ }
    }

    return parsed;
  }

  /**
   * 统一入口：运行工作流获取文案
   * @returns {Promise<Array>} 文案数组
   */
  async function generateCopy() {
    const cfg = getConfig();
    const baseUrl = cfg.baseUrl || 'mock';

    // Mock 模式
    if (baseUrl === 'mock') {
      await mockDelay(1200);
      // 随机返回 3-6 条
      const count = 3 + Math.floor(Math.random() * 4);
      const shuffled = [...MOCK_RESULTS].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count).map((item, i) => ({
        ...item,
        id: `mock-${Date.now()}-${i}`,
        date: new Date().toISOString(),
      }));
    }

    // 真实 API
    if (!cfg.token || !cfg.workflowId) {
      throw new Error('请先配置 API Token 和 Workflow ID');
    }

    const raw = await runWorkflow(baseUrl, cfg.token, cfg.workflowId, cfg.params || {});

    // 标准化为数组
    if (!Array.isArray(raw)) {
      if (raw && typeof raw === 'object') {
        // 可能是 {list: [...]} 或 {items: [...]} 结构
        const arr = raw.list || raw.items || raw.data || raw.results || [];
        if (Array.isArray(arr)) return arr;
      }
      return [{ copy: String(raw), title: '营销文案', source: '预设演示素材 · 非实时资讯，数据与商品参数未核验', badge: 'new' }];
    }

    return raw;
  }

  // --- 公开 API ---
  return {
    getConfig,
    saveConfig,
    generateCopy,
  };
})();

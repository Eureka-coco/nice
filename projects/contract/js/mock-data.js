/**
 * 合同审查模拟数据
 * 当 Coze 工作流无法连接时使用，模拟真实的审查结果
 */

const MockData = (() => {

  /**
   * 根据合同类型和审查立场生成模拟审查结果
   */
  function generate(contractType, stance, focusAreas, additionalReq) {
    // 模拟延迟 (800ms - 2000ms)
    const delay = 800 + Math.random() * 1200;

    return new Promise(resolve => {
      setTimeout(() => {
        resolve(buildResult(contractType, stance, focusAreas, additionalReq));
      }, delay);
    });
  }

  function buildResult(contractType, stance, focusAreas, additionalReq) {
    const typeName = contractType || '采购合同';
    const riskLevels = ['high', 'medium', 'low'];

    // 根据合同类型生成不同审查意见
    const opinions = generateOpinions(typeName, stance);

    // 根据勾选的重点审查内容过滤
    let filtered = opinions;
    if (focusAreas && focusAreas.length > 0) {
      // 始终保留高风险项
      const highRisk = opinions.filter(o => o.risk_level === 'high');
      const matched = opinions.filter(o =>
        o.risk_level !== 'high' && focusAreas.some(f => o.title.includes(f) || (o.focus_area && focusAreas.includes(o.focus_area)))
      );
      // 合并去重
      const merged = [...highRisk];
      matched.forEach(m => {
        if (!merged.find(x => x.title === m.title)) merged.push(m);
      });
      filtered = merged.length >= 3 ? merged : opinions.slice(0, Math.max(3, opinions.length));
    }

    // 法律引用核验
    const legalCheck = { status: "demo", summary: "未执行法律引用核验；下方意见仅为预设界面样例。", items: [] };

    // 企业信息核验
    const enterpriseCheck = { status: "demo", summary: "未查询工商、处罚或信用记录。", details: {} };

    // 飞书报告链接（模拟）
    const feishuUrl = '';

    return {
      isMock: true, // 标记为模拟数据
      contract_type: typeName,
      review_stance: stance || '中立',
      review_time: new Date().toISOString(),
      total_opinions: filtered.length,
      high_risk_count: filtered.filter(o => o.risk_level === 'high').length,
      medium_risk_count: filtered.filter(o => o.risk_level === 'medium').length,
      low_risk_count: filtered.filter(o => o.risk_level === 'low').length,
      review_opinions: filtered,
      legal_reference_check: legalCheck,
      enterprise_info_check: enterpriseCheck,
      feishu_report_url: feishuUrl,
    };
  }

  function generateOpinions(contractType, stance) {
    const base = [
      {
        title: '付款条件存在单方解释空间',
        risk_level: 'high',
        focus_area: '付款与结算',
        analysis: '合同第4.2条约定"验收合格后支付尾款"，但未明确验收标准、验收期限和验收主体。当前条款赋予了付款方过大的自由裁量权，可能导致收款方在交付后长时间无法收回尾款。根据《民法典》第五百一十条，合同约定不明确的，可以协议补充；不能达成补充协议的，按照合同相关条款或者交易习惯确定。建议在合同中对验收标准、期限和程序作出明确约定。',
        suggestion: '建议修改为：\n"乙方完成全部交付后 5 个工作日内，甲方应组织验收。验收标准以本合同附件一《技术规格与验收标准》为准。甲方无正当理由逾期不组织验收的，视为验收通过。验收通过后 10 个工作日内，甲方向乙方支付合同总金额 30% 的尾款。"',
      },
      {
        title: '违约金比例可能过高',
        risk_level: 'high',
        focus_area: '违约责任',
        analysis: '合同第8.3条约定逾期违约金为"每逾期一日，按合同总金额的 1% 支付违约金"。该标准折合年化 365%，远超《民法典》第五百八十五条及相关司法解释规定的合理范围。根据《民法典合同编司法解释》第六十五条，当事人主张约定的违约金过高请求予以适当减少的，人民法院应当以实际损失为基础，兼顾合同的履行情况、当事人的过错程度以及预期利益等综合因素，根据公平原则和诚实信用原则予以衡量。司法实践中通常认为超过实际损失 30% 的违约金即为"过高"。',
        suggestion: '建议修改为：\n"乙方逾期交付的，每逾期一日，按逾期交付部分货物金额的万分之五向甲方支付违约金，但违约金总额不超过合同总金额的 10%。逾期超过 30 日的，甲方有权单方解除合同，并要求乙方赔偿因此造成的实际损失。"',
      },
      {
        title: '知识产权归属条款缺失',
        risk_level: 'high',
        focus_area: '知识产权',
        analysis: '合同涉及技术开发/定制服务，但全文未约定知识产权的归属。根据《民法典》第八百六十一条，委托开发完成的发明创造，除当事人另有约定外，申请专利的权利属于研究开发人。这意味着甲方支付开发费用后，可能无法获得相关知识产权。这对委托方（甲方）存在重大风险。',
        suggestion: '建议在合同中增加知识产权条款：\n"1. 乙方在本合同项下为甲方开发/提供的所有成果（包括但不限于软件代码、技术文档、设计方案、图纸等）的知识产权自产生之日起即归属于甲方。\n2. 乙方保证其交付的成果不侵犯任何第三方的知识产权。如因乙方交付成果侵犯第三方知识产权而导致甲方遭受损失的，由乙方承担全部赔偿责任。\n3. 本合同终止或解除后，本知识产权条款继续有效。"',
      },
      {
        title: '交付标准描述模糊',
        risk_level: 'medium',
        focus_area: '交付验收',
        analysis: '合同第三条"交付与验收"中，仅约定"按照行业标准交付"，未引用具体行业标准编号或版本，也未在附件中明确交付物的具体规格、功能和性能指标。在实务中，"行业标准"可能被双方作出不同解释，导致验收争议。',
        suggestion: '建议：\n1. 在合同附件中详细列明交付物的功能清单、技术参数和性能指标；\n2. 明确引用具体的国家标准（GB/T）或行业标准编号及版本号；\n3. 约定"如国家/行业标准发生更新，双方应协商确定适用的标准版本"。',
      },
      {
        title: '保密义务期限不合理',
        risk_level: 'medium',
        focus_area: '违约责任',
        analysis: '合同第10条约定"保密义务自合同签订之日起持续有效"，即永久保密。虽然《民法典》未明确禁止永久保密条款，但在商业实践中，永久保密义务可能被认定为不合理地限制竞争。部分法院在审理相关案件时，倾向于认为保密义务应有合理期限，特别是对于非商业秘密的一般保密信息。',
        suggestion: '建议修改为：\n"保密义务自合同签订之日起至合同终止后 5 年止。但对于构成商业秘密的信息，保密义务持续至该信息进入公有领域为止。合同终止后，接收方应按披露方要求返还或销毁所有保密信息及其副本。"',
      },
      {
        title: '免责条款范围过宽',
        risk_level: 'medium',
        focus_area: '违约责任',
        analysis: '合同第9.1条约定"因不可抗力或任何超出乙方合理控制范围的原因导致未能履行合同的，乙方不承担任何责任"。该表述中的"任何超出合理控制范围的原因"过于宽泛，可能被乙方滥用以规避违约责任。根据《民法典》第五百九十条，不可抗力是指不能预见、不能避免且不能克服的客观情况。将不可抗力扩大至一般商业风险不符合法律规定。',
        suggestion: '建议修改为：\n"因不可抗力导致一方不能履行合同的，该方应及时通知对方，并在合理期限内提供证明。因不可抗力不能履行合同的，根据不可抗力的影响，部分或者全部免除责任，但法律另有规定的除外。不可抗力的认定以《民法典》第五百九十条的规定为准。"',
      },
      {
        title: '合同解除条件不明确',
        risk_level: 'low',
        focus_area: '解除终止',
        analysis: '合同第11条约定了合同解除的情形，但"严重违约"的界定不够清晰，可能导致双方对是否达到解除条件产生争议。建议明确"严重违约"的具体情形和判断标准。',
        suggestion: '建议在第11条中增加：\n"以下情形视为严重违约：（1）乙方逾期交付超过 30 日；（2）交付成果与合同约定严重不符且无法修复；（3）甲方逾期付款超过 60 日；（4）一方擅自转让合同权利义务；（5）一方严重违反保密义务或知识产权保证。"',
      },
      {
        title: '争议解决条款建议优化',
        risk_level: 'low',
        focus_area: '违约责任',
        analysis: '合同第12条约定"发生争议，双方协商解决"，但未约定协商不成时的处理方式。如果协商失败，双方将缺乏明确的争议解决路径，可能需要另行协商或通过诉讼解决，增加时间和成本。',
        suggestion: '建议修改为：\n"因本合同引起的或与本合同有关的任何争议，双方应首先通过友好协商解决。协商不成的，任何一方均有权向合同签订地有管辖权的人民法院提起诉讼。"或约定仲裁条款。',
      },
      {
        title: '合同生效条件建议补充',
        risk_level: 'low',
        focus_area: '付款与结算',
        analysis: '合同约定"双方签字盖章后生效"，建议同时约定合同生效的其他前提条件（如乙方已提交履约保证金、甲方已支付预付款等），以避免在前提条件未满足时合同即产生效力的问题。',
        suggestion: '建议在合同末尾增加："本合同自双方签字盖章且乙方提交履约保证金之日起生效。"或根据实际商业安排确定生效条件。',
      },
    ];

    return base;
  }

  return { generate };
})();

<template>
  <div class="workflow-overview">
    <section class="flowchart" aria-label="AI-Native Engineering 工作流">
      <div class="intent">
        <h2>Human Intent</h2>
        <p class="sub">提出目标 / 问题 / 修改需求</p>
      </div>
      <div class="arrow" aria-hidden="true"></div>
      <div class="node workflow">
        <h2>ai-native-workflow</h2>
        <p class="sub">任务分类 · 授权 · Context · 工具路由</p>
      </div>
      <div class="branches">
        <section class="branch" aria-label="探索与设计分支">
          <div class="arrow" aria-hidden="true"></div>
          <div class="stage">
            <h3>Explore / Design</h3>
            <p class="sub">OpenSpec · Codex</p>
          </div>
          <div class="node review">
            <h3>Design Review</h3>
            <p class="sub">反例 · 风险 · 过度设计</p>
          </div>
        </section>
        <section class="branch" aria-label="实现与测试分支">
          <div class="arrow" aria-hidden="true"></div>
          <div class="stage">
            <h3>Implement / Test</h3>
            <p class="sub">Codex · Superpowers</p>
          </div>
          <div class="node review">
            <h3>Behavioral Review</h3>
            <p class="sub">行为 · 契约 · 证据</p>
          </div>
        </section>
      </div>
      <div class="arrow branch-to-delivery" aria-hidden="true"></div>
      <div class="node delivery">
        <h2>Delivery Review</h2>
        <p class="sub">验收标准 · 测试结果 · 残余风险 · 合并条件</p>
      </div>
      <div class="arrow" aria-hidden="true"></div>
      <div class="merge">
        <h2>Merge &amp; Learn</h2>
        <p class="sub">Git · OpenSpec 更新 · Decision · AI Notes</p>
      </div>
      <p class="footnote">
        Review
        失败则返回相应的设计或实施环节；并非所有任务都必须经过全部环节。必要的设计与实施批准由
        Human 决定，合并与发布仍须对应授权。
      </p>
    </section>
  </div>
</template>
<style scoped>
.workflow-overview {
  --text: #171717;
  --muted: #686868;
  --line: #dedede;
  --line-strong: #d3d3d3;
  --surface: #fff;
  --soft: #fafafa;
  color: var(--text);
  margin: 32px 0;
}
.flowchart {
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 36px 24px 22px;
  background: var(--surface);
}
.node {
  min-width: 0;
  text-align: center;
  border-radius: 12px;
  padding: 21px 20px;
  border: 1px solid var(--line);
  background: #fff;
}
.node h2,
.node h3,
.intent h2,
.merge h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 740;
  letter-spacing: -0.027em;
  line-height: 1.32;
}
.sub {
  margin: 9px 0 0;
  font-size: 16px;
  color: var(--muted);
  line-height: 1.55;
}
.intent,
.merge {
  text-align: center;
  padding: 6px 16px;
}
.workflow {
  border: 2px solid var(--line-strong);
  padding: 24px;
  background: var(--soft);
}
.arrow {
  margin: 13px auto;
  width: 1px;
  height: 30px;
  background: #777;
  position: relative;
  flex: none;
}
.arrow::after {
  content: '';
  position: absolute;
  width: 9px;
  height: 9px;
  border-right: 1.8px solid #777;
  border-bottom: 1.8px solid #777;
  left: -4.9px;
  bottom: 0;
  transform: rotate(45deg);
}
.branches {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}
.branch {
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: center;
}
.branch .arrow {
  margin-top: 12px;
  margin-bottom: 12px;
}
.branch .stage {
  padding: 8px 10px 3px;
}
.branch .stage h3 {
  font-size: 22px;
}
.branch .stage .sub {
  margin-top: 4px;
  font-size: 15px;
}
.branch .review {
  margin-top: 15px;
  min-height: 86px;
  padding: 16px 10px;
}
.branch .review h3 {
  font-size: 18px;
}
.branch .review .sub {
  font-size: 14px;
  margin-top: 3px;
}
.branch-to-delivery {
  margin-top: 7px;
}
.delivery {
  padding: 24px 16px;
}
.merge {
  padding-top: 8px;
  padding-bottom: 13px;
}
.footnote {
  text-align: center;
  margin: 25px 0 0;
  border-top: 1px dashed var(--line);
  padding: 21px 8px 0;
  color: var(--muted);
  font-size: 13px;
}
@media (max-width: 720px) {
  .flowchart {
    padding: 22px 12px 18px;
    border-radius: 14px;
  }
  .node h2,
  .intent h2,
  .merge h2 {
    font-size: 21px;
  }
  .sub {
    font-size: 13px;
  }
  .branches {
    gap: 10px;
  }
  .branch .stage {
    padding-left: 0;
    padding-right: 0;
  }
  .branch .stage h3 {
    font-size: 16px;
  }
  .branch .stage .sub {
    font-size: 12px;
  }
  .branch .review {
    min-height: 89px;
    padding: 12px 7px;
  }
  .branch .review h3 {
    font-size: 14px;
  }
  .branch .review .sub {
    font-size: 12px;
  }
  .workflow {
    padding: 20px 12px;
  }
  .delivery {
    padding: 20px 12px;
  }
  .footnote {
    font-size: 12px;
  }
}
</style>

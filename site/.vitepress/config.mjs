import { defineConfig } from 'vitepress';
import { documents } from '../content-manifest.mjs';
const groups = ['产品与需求', '技术设计', 'AI 工程', '交付与证据', '现行规范'];
const sidebar = [
  {
    text: '文档导览',
    items: [
      { text: '完整文档', link: '/library' },
      { text: '现行规范', link: '/specs' },
      { text: '历史记录', link: '/history' },
    ],
  },
  ...groups.map((group) => ({
    text: group,
    collapsed: false,
    items: documents
      .filter((d) => d.group === group)
      .map((d) => ({ text: d.title, link: '/read/' + d.slug })),
  })),
  {
    text: '历史归档',
    collapsed: true,
    items: [
      ...new Set(
        documents.filter((d) => d.group === '历史记录').map((d) => d.section),
      ),
    ]
      .sort()
      .reverse()
      .map((section) => ({
        text: section,
        collapsed: true,
        items: documents
          .filter((d) => d.section === section)
          .map((d) => ({ text: d.title, link: '/read/' + d.slug })),
      })),
  },
];
export default defineConfig({
  title: 'AGENT / STORE',
  description: '产品、设计与工程实践',
  lang: 'zh-CN',
  appearance: false,
  outDir: '../dist',
  cleanUrls: false,
  ignoreDeadLinks: false,
  themeConfig: {
    nav: [
      { text: '项目导览', link: '/' },
      { text: '项目展示', link: '/demo' },
      { text: '文档目录', link: '/library' },
      { text: '交付证据', link: '/read/delivery-status' },
    ],
    sidebar: {
      '/read/': sidebar,
      '/library': sidebar,
      '/specs': sidebar,
      '/history': sidebar,
    },
    sidebarMenuLabel: '文档导航',
    returnToTopLabel: '回到顶部',
    outline: false,
    footer: {
      message: '面向人类与 AI Agent 的商店',
      copyright: 'AGENT / STORE · 项目文档',
    },
  },
});

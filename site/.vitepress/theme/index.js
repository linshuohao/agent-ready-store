import { nextTick } from 'vue';
import DefaultTheme from 'vitepress/theme';
import Demo from './Demo.vue';
import Presentation from './Presentation.vue';
import './presentation.css';
import ReadingTools from './ReadingTools.vue';
import Layout from './Layout.vue';
import './custom.css';
export default {
  ...DefaultTheme,
  Layout,
  enhanceApp({ app, router }) {
    router.onAfterRouteChange = async (href) => {
      if (typeof window === 'undefined') return;
      const target = new URL(href, location.href);
      if (
        target.pathname !== '/presentation.html' ||
        !target.searchParams.has('at')
      )
        return;
      const y = Number(target.searchParams.get('at'));
      if (!Number.isFinite(y) || y < 0 || y > 100000) return;
      // Restore after VitePress finishes its own route scroll reset.
      await nextTick();
      window.scrollTo(0, y);
    };
    app.component('ProductDemo', Demo);
    app.component('ProjectPresentation', Presentation);
    app.component('ReadingTools', ReadingTools);
  },
};

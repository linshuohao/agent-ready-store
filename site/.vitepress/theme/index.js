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
  enhanceApp({ app }) {
    app.component('ProductDemo', Demo);
    app.component('ProjectPresentation', Presentation);
    app.component('ReadingTools', ReadingTools);
  },
};

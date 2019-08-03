import { replaceRouteLang } from './i18n.js';

export default {
  template: `
  <div>
    <span>
      Lang
    </span>
    <select :value="$i18n.locale" @input="goToLang($event.target.value)" @change="goToLang($event.target.value)">
      <option v-for="lang in $i18n.allowedLocales" v-bind:value="lang">
        {{ lang }}
      </option>
    </select>
    <div>
      <span>Links</span>
      <router-link :to="{ name: 'home' }">
        <a>home</a>
      </router-link>
      <router-link :to="{ name: 'houses' }">
        <a>houses</a>
      </router-link>
      <router-link :to="{ name: 'cars' }">
        <a>cars</a>
      </router-link>
    </div>
    <router-view />
  </div>
  `,
  methods: {
    goToLang(lang) {
			this.$router.push(replaceRouteLang(this.$route, lang));
    },
  },
};

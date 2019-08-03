import { replaceRouteLang } from './i18n.js';

export function languageGuard(router, i18n) {
  router.beforeEach(async (to, from, next) => {
    const lang = to.params.lang;
    if (! lang) return next();

    if (! i18n.allowedLocales.includes(lang)) {
      return next(replaceRouteLang(to, i18n.locale));
    }

    // First set locale from route, so if modules have to be loaded, they are loaded directly for the new locale.
    await i18n.setLocale(lang);

    const requiredModules = to.matched.reduce((a, record) => {
      const langMods = record.meta.localeModules;
      if (!langMods) {
        return a;
      }
      for (const modName in langMods) {
        a[modName] = langMods[modName];
      }
      return a;
    }, {});
    const hasRequiredModules = Boolean(Object.keys(requiredModules).length);

    if (hasRequiredModules) {
      const promises = [];
      for (const modName in requiredModules) {
        promises.push(i18n.requireModule(modName, requiredModules[modName]));
      }
      await Promise.all(promises);
    }

    return next();
  });
}

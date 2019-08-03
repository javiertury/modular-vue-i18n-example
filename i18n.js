Vue.use(VueI18n)

export class ModularVueI18n extends VueI18n {
  constructor(config, ...args) {
    super(config, ...args);

    /*
     * Modules, as the user sees them
     *
     * {
     *   [modName]: {
     *     [lang]: Function | {
     *       messages,
     *       ...
     *     }
     *   }
     * }
     */

    /*
     * Modules, as the instance transforms them
     *
     * {
     *   [modName]: {
     *     enabled: Boolean,
     *     locales: {
     *       [lang]: {
     *         loaded: Boolean,
     *         value: Function | {
     *           messages,
     *           ...
     *         },
     *       }
     *     }
     *   }
     * }
     */

    this.modules = {};
    // Description of which modules are installed, and which lang have already been loaded.
    // { mod: ['lang', ...], ... }

    this.scheduledLocale = this.locale;
    this.scheduledFallbackLocale = this.fallBackLocale;

    this.ready = true;

    this._onReady = [];
    this._onReadyErr = [];

    if (config.modules) {
      const promises = [];
      for (const modName in config.modules) {
        const mod = config.modules[modName];
        this.registerModule(modName, mod);

        this._enableModule(modName);

        for (const locale of [this.locale, this.fallbackLocale]) {
          promises.push(this.loadModule(modName, locale));
        }
      }

      if (promises.length) {
        this.ready = false;

        this._readyAfter(Promise.all(promises));
      }
    }
  }

  _readyAfter(promise) {
    const readyCb = err => {
      this.ready = true;
      // Clean all callbacks, whether there is an error or not
      const callbacks = this._onReady.splice(0, this._onReady.length);
      const errCallbacks = this._onReadyErr.splice(0, this._onReadyErr.length);
      const cbs = err ? errCallbacks : callbacks;

      if (cbs.length) {
        for (const cb of cbs) {
          try {
            cb(err);
          } catch (e) {
            console.error(e);
          }
        }
      } else if (err) {
        console.error(err);
      }
    };

    promise.then(readyCb.bind(undefined, undefined), readyCb);
  }

  onReady(cb, errorCb) {
    if (this.ready) {
      cb();
    } else {
      this._onReady.push(cb);
      if (errorCb) {
        this._onReadyErr.push(errorCb);
      }
    }
  }

  isModuleRegistered(modName) {
    return Boolean(this.modules[modName]);
  }

  registerModule (modName, mod) {
    if (this.isModuleRegistered(modName)) {
      console.error(`Module ${modName} already registered`);
    } else {
      const locales = {};
      for (const lang in mod) {
        locales[lang] = {
          loaded: false,
          value: mod[lang],
        };
      }

      this.modules[modName] = {
        enabled: false,
        locales,
      };
    }
  }

  unregisterModule (modName) {
    if (!this.isModuleRegistered(modName)) {
      console.error(`Module ${modName} was not registered`);
    } else {
      if (this.isModuleEnabled(modName)) {
        this.disableModule(modName);
      }

      delete this.modules[modName];
    }
  }

  isModuleLoaded (modName, lang) {
    const locale = lang || this.locale;
    const mod = this.modules[modName];
    if (!mod) {
      return false;
    }
    const localeBranch = mod.locales[locale];
    return localeBranch && localeBranch.loaded;
  }

  async loadModule (modName, lang) {
    if (!this.isModuleRegistered(modName)) {
      throw new Error(`Module ${modName} is not registered`);
    }

    const locale = lang || this.locale;
    if (this.isModuleLoaded(modName, locale)) {
      console.error(`Module ${modName} already loaded`);
    } else {
      const localeBranch = this.modules[modName].locales[locale];

      if (!localeBranch) {
        return console.error(`Module ${modName} does not have locale ${locale}`);
      }

      let value = localeBranch.value;
      if (typeof value === 'function') {
        value = await value();
        if (!value.messages) {
          value = value.default;
        }
      }

      this.mergeLocaleMessage(locale, value.messages);
      localeBranch.loaded = true;
    }
  }

  isModuleEnabled (modName) {
    return this.modules[modName].enabled;
  }

  _enableModule (modName) {
    this.modules[modName].enabled = true;
  }

  async enableModule (modName) {
    if (this.isModuleEnabled(modName)) {
      console.error(`Module ${modName} was already enabled`);
    } else {
      if (!this.isModuleRegistered(modName)) {
        throw new Error(`Module ${modName} is not registered`);
      }

      // Enable module before load, so if current language is switched before
      // this module finish loading for the current lang, the switcher will
      // load this module for the new lang.
      // If you want to make sure this module has been loaded, just await it
      this._enableModule(modName);

      const loadPromises = [];
      // load module if necessary
      for (const locale of [this.locale, this.fallbackLocale]) {
        if (!this.isModuleLoaded(modName, locale)) {
          loadPromises.push(this.loadModule(modName, locale));
        }
      }
      await Promise.all(loadPromises);
    }
  }

  disableModule (modName) {
    if (this.isModuleEnabled(modName)) {
      this.modules[modName].enabled = false;
    } else {
      console.error(`Module ${modName} was not loaded`);
    }
  }

  async requireModule (modName, langModule) {
    if (!this.isModuleRegistered(modName)) {
      this.registerModule(modName, langModule);
    }
    if (!this.isModuleEnabled(modName)) {
      await this.enableModule(modName);
    }
  }

  async prepareLocaleSwitch(lang) {
    const promises = [];
    for (const modName in this.modules) {
      // When switching languages, at minimum modules with `enabled = true` must be loaded for the current lang.
      if (this.isModuleEnabled(modName) &&
        !this.isModuleLoaded(modName, lang)) {
        promises.push(this.loadModule(modName, lang));
      }
    }

    await Promise.all(promises);
  }

  async setLocale(lang) {
    this.scheduledLocale = lang;

    await this.prepareLocaleSwitch(lang);

    if (this.scheduledLocale === lang) {
      this.locale = lang;
    }
  }

  async setFallbackLocale(lang) {
    this.scheduledFallbackLocale = lang;

    await this.prepareLocaleSwitch(lang);

    if (this.scheduledFallbackLocale === lang) {
      this.fallbackLocale = lang;
    }
  }
}

export function replaceRouteLang(route, lang) {
  return {
    name: route.name,
    params: Object.assign({}, route.params, { lang }),
  };
}

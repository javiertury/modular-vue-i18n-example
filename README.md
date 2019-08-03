# Modular vue-i18n example

Find a demo [here](https://javiertury.github.io/modular-vue-i18n-example/#/en).

Open developer tools (firefox: Ctrl + Shift + i) and go to network tab.

0. On page load
    - The only language module requested should be *base* for the *en* locale.
1. Click on *houses*.
    - It should have triggered a request for `modules/houses/lang/en`
2. Change language to *es*.
    - It should have triggered a request for `lang/es` and for `modules/houses/lang/es`, since *base* and *houses* languages module are both active
3. Click on *cars*.
    - It should have triggered a request for `modules/cars/lang/en` and for `modules/cars/lang/es`, since your locale is *es* but your fallbackLocale is *en*.

/* Локализация renah0cki: русский (основной), украинский, английский.
   Ключ перевода — сам русский текст (как в gettext): непереведённое остаётся по-русски.

   Как переводить:
   • статичная разметка (index.html): добавить атрибут data-i18n к элементу с русским текстом,
     для атрибутов — data-i18n-attr="placeholder,title,aria-label"; i18nApply() сделает остальное;
   • текст в JS: t('Русский текст') или t('Привет, {name}', { name }) — подставит перевод;
   • добавить строки в словари uk и en ниже (ключ — точный русский текст).
   Выбор языка — localStorage 'rn_lang' (ru | uk | en). Пока переключатель видит только владелец (гейт новых фич). */
(function () {
  const OWNER_ID = '23c6cb47-27b0-45ac-8fd9-c43b84d57aba';
  const LANGS = { ru: 'Русский', uk: 'Українська', en: 'English' };

  const DICT = {
    uk: {
      // меню и навигация
      'Лента': 'Стрічка', 'Арты': 'Арти', 'Видео': 'Відео', 'Фанфики': 'Фанфіки', 'Новости': 'Новини', 'Предложка': 'Пропозиції',
      '(переписки)': '(листування)', 'Магазин': 'Магазин', 'Модерация': 'Модерація', 'Поддержка': 'Підтримка',
      'Топ 3 донатера': 'Топ 3 донатери', 'Спонсоры': 'Спонсори', 'Поиск': 'Пошук', 'Поиск по постам': 'Пошук по постах',
      'Новый пост': 'Новий пост', 'Уведомления': 'Сповіщення', 'Меню': 'Меню', 'Разделы': 'Розділи',
      'Угадай художника': 'Вгадай художника', 'Игра «Угадай художника»': 'Гра «Вгадай художника»',
      'Стрик: дней подряд на сайте': 'Стрік: днів поспіль на сайті',
      'Мой профиль': 'Мій профіль', 'Редактировать профиль': 'Редагувати профіль', 'Кошелёк': 'Гаманець',
      'Магазин косметики': 'Магазин косметики', 'Настройки': 'Налаштування', 'Правила · 16+': 'Правила · 16+',
      'Старый дизайн': 'Старий дизайн', 'Выйти': 'Вийти', 'Войти': 'Увійти', 'Аккаунт': 'Акаунт',
      'Все уведомления': 'Усі сповіщення',
      // кошелёк
      'Ру карта': 'Рос. картка', 'Укр карта': 'Укр. картка', 'Открыть страницу доната': 'Відкрити сторінку донату',
      'Пополнение временно недоступно': 'Поповнення тимчасово недоступне',
      // настройки языка
      'Язык': 'Мова', 'Язык сайта': 'Мова сайту',
      'Перевод пока частичный: что ещё не переведено, показывается по-русски.': 'Переклад поки частковий: що ще не перекладено, показується російською.',
    },
    en: {
      'Лента': 'Feed', 'Арты': 'Art', 'Видео': 'Videos', 'Фанфики': 'Fanfics', 'Новости': 'News', 'Предложка': 'Suggestions',
      '(переписки)': '(roleplay)', 'Магазин': 'Shop', 'Модерация': 'Moderation', 'Поддержка': 'Support',
      'Топ 3 донатера': 'Top 3 donors', 'Спонсоры': 'Sponsors', 'Поиск': 'Search', 'Поиск по постам': 'Search posts',
      'Новый пост': 'New post', 'Уведомления': 'Notifications', 'Меню': 'Menu', 'Разделы': 'Sections',
      'Угадай художника': 'Guess the artist', 'Игра «Угадай художника»': 'Game “Guess the artist”',
      'Стрик: дней подряд на сайте': 'Streak: days in a row on the site',
      'Мой профиль': 'My profile', 'Редактировать профиль': 'Edit profile', 'Кошелёк': 'Wallet',
      'Магазин косметики': 'Cosmetics shop', 'Настройки': 'Settings', 'Правила · 16+': 'Rules · 16+',
      'Старый дизайн': 'Old design', 'Выйти': 'Log out', 'Войти': 'Log in', 'Аккаунт': 'Account',
      'Все уведомления': 'All notifications',
      'Ру карта': 'Russian card', 'Укр карта': 'Ukrainian card', 'Открыть страницу доната': 'Open donation page',
      'Пополнение временно недоступно': 'Top-up is temporarily unavailable',
      'Язык': 'Language', 'Язык сайта': 'Site language',
      'Перевод пока частичный: что ещё не переведено, показывается по-русски.': 'The translation is partial for now: anything not translated yet is shown in Russian.',
    },
  };

  let uid = null;
  try { uid = JSON.parse(localStorage.getItem('fh_session') || 'null')?.user?.id || null; } catch {}
  const canChoose = uid === OWNER_ID;            // гейт: пока только владелец
  let lang = 'ru';
  try { const v = localStorage.getItem('rn_lang'); if (canChoose && LANGS[v]) lang = v; } catch {}

  function t(ru, vars) {
    let s = (lang !== 'ru' && DICT[lang] && DICT[lang][ru]) || ru;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    return s;
  }
  function i18nApply(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach(el => {
      if (el.dataset.i18nRu === undefined) el.dataset.i18nRu = el.textContent.trim();
      const v = t(el.dataset.i18nRu);
      if (el.textContent.trim() !== v) el.textContent = v;
    });
    (root || document).querySelectorAll('[data-i18n-attr]').forEach(el => {
      el.dataset.i18nAttr.split(',').map(a => a.trim()).filter(Boolean).forEach(a => {
        const key = 'i18nRu' + a.replace(/(^|-)(\w)/g, (m, d, c) => c.toUpperCase());
        if (el.dataset[key] === undefined) el.dataset[key] = el.getAttribute(a) || '';
        el.setAttribute(a, t(el.dataset[key]));
      });
    });
  }
  function setLang(v) {
    if (!LANGS[v]) return;
    try { localStorage.setItem('rn_lang', v); } catch {}
    location.reload();
  }

  document.documentElement.lang = lang === 'uk' ? 'uk' : lang;
  window.I18N = { t, i18nApply, setLang, lang: () => lang, langs: LANGS, canChoose };
  window.t = t;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => i18nApply());
  else i18nApply();
})();

/***********************
 * File: routing.gs
 * App routing and shared template helpers
 *
 * - Validates allowed domain access
 * - Resolves ?page=... routes
 * - Injects sidebar navigation routes into each view
 * - Exposes shared include() helper for partial templates
 ***********************/

function doGet(e) {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();

  if (!email.endsWith(ALLOWED_DOMAIN)) {
    return HtmlService.createHtmlOutput('Access denied.');
  }

  const page = String((e && e.parameter && e.parameter.page) || 'pricing')
    .trim()
    .toLowerCase();

  const route = getRouteByPage_(page);

  if (!route) {
    return HtmlService.createHtmlOutput('Page not found.');
  }

  const tpl = HtmlService.createTemplateFromFile(route.file);

  tpl.routes = buildRoutesForView_();
  tpl.currentPage = route.page;
  tpl.pageTitle = route.title;
  tpl.appUrl = ScriptApp.getService().getUrl();

  return tpl
    .evaluate()
    .setTitle(route.title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function getRouteByPage_(page) {
  const routes = Object.values(ROUTES);
  return routes.find(r => r.page === page) || null;
}

function buildRoutesForView_() {
  const appUrl = ScriptApp.getService().getUrl();

  return Object.values(ROUTES).map(route => ({
    page: route.page,
    file: route.file,
    title: route.title,
    navLabel: route.navLabel || route.title,
    icon: route.icon || '',
    url: appUrl + '?page=' + encodeURIComponent(route.page)
  }));
}

function include(filename, data) {
  const tpl = HtmlService.createTemplateFromFile(filename);

  if (data && typeof data === 'object') {
    Object.keys(data).forEach(key => {
      tpl[key] = data[key];
    });
  }

  return tpl.evaluate().getContent();
}

/***********************
 * Current user helpers
 ***********************/

function getCurrentUser() {
  const email =
    Session.getActiveUser().getEmail() ||
    Session.getEffectiveUser().getEmail() ||
    '';

  return {
    email: email,
    name: resolveTeamMemberName_(email)
  };
}

function resolveTeamMemberName_(email) {
  const e = String(email || '').toLowerCase().trim();

  const map = {
    'admin@firecurtaintech.com': 'Admin',
    'alex.valdez@firecurtaintech.com': 'Alex',
    'casandra@firecurtaintech.com': 'Casandra',
    'david.guevara@firecurtaintech.com': 'David',
    'digna@firecurtaintech.com': 'Digna',
    'jason@firecurtaintech.com': 'Jason',
    'jesus@firecurtaintech.com': 'Jesus',
    'larmijos@firecurtaintech.com': 'Laura',
    'pablo.bailon@firecurtaintech.com': 'Pablo',
    'timw@firecurtaintech.com': 'Tim',
    'vanessa@firecurtaintech.com': 'Vanessa',
    'victor@firecurtaintech.com': 'Victor FCT'
  };

  return map[e] || email || 'Unknown';
}
// Koppeling met Microsoft 365 via MSAL en Microsoft Graph.
// - Inloggen met het schoolaccount (redirect, antwoord via auth.html)
// - Opslag van de app-gegevens in de eigen OneDrive-appmap (Apps/Lesdag/lesdag.json)
// - Zoeken naar bestanden in OneDrive en SharePoint, en een voorbeeldweergave (preview) in de lesmodus
window.M365 = (() => {
  const cfg = window.LESDAG_CONFIG || {};
  const SCOPES = ['User.Read', 'Files.ReadWrite.AppFolder', 'Files.Read.All', 'Sites.Read.All'];
  const GRAPH = 'https://graph.microsoft.com/v1.0';
  let pca = null;
  let account = null;

  const enabled = () => !!(cfg.clientId && window.msal);

  async function init() {
    if (!enabled()) return null;
    pca = new msal.PublicClientApplication({
      auth: {
        clientId: cfg.clientId,
        authority: 'https://login.microsoftonline.com/' + (cfg.tenantId || 'organizations'),
        redirectUri: new URL('auth.html', location.href).href,
        postLogoutRedirectUri: new URL('./', location.href).href
      },
      cache: { cacheLocation: 'localStorage' }
    });
    await pca.initialize();
    let res = null;
    try { res = await pca.handleRedirectPromise(); } catch (e) { console.warn('Login-antwoord', e); }
    account = (res && res.account) || pca.getAllAccounts()[0] || null;
    if (account) pca.setActiveAccount(account);
    return account;
  }

  async function login() { if (pca) await pca.loginRedirect({ scopes: SCOPES }); }
  async function logout() { if (pca && account) await pca.logoutRedirect({ account }); }

  async function token() {
    if (!pca || !account) throw new Error('niet ingelogd');
    try {
      const r = await pca.acquireTokenSilent({ scopes: SCOPES, account });
      return r.accessToken;
    } catch (e) {
      if (e instanceof msal.InteractionRequiredAuthError) {
        await pca.acquireTokenRedirect({ scopes: SCOPES, account });
      }
      throw e;
    }
  }

  async function graph(path, opt = {}) {
    const t = await token();
    const r = await fetch(GRAPH + path, { ...opt, headers: { Authorization: 'Bearer ' + t, ...(opt.headers || {}) } });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('Microsoft 365 antwoordt ' + r.status + ': ' + (await r.text()).slice(0, 160));
    const ct = r.headers.get('content-type') || '';
    return ct.includes('json') ? r.json() : r.text();
  }

  // Gegevens van de app in de OneDrive-appmap
  async function loadState() {
    const txt = await graph('/me/drive/special/approot:/lesdag.json:/content');
    if (txt == null) return null;
    return typeof txt === 'string' ? JSON.parse(txt) : txt;
  }
  async function saveState(obj) {
    return graph('/me/drive/special/approot:/lesdag.json:/content', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj)
    });
  }

  // Zoeken in OneDrive en SharePoint (Microsoft Search)
  async function search(q) {
    const body = { requests: [{ entityTypes: ['driveItem'], query: { queryString: q }, from: 0, size: 20 }] };
    const r = await graph('/search/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const hits = (((r || {}).value || [])[0] || {}).hitsContainers || [];
    return (hits[0] && hits[0].hits || []).map(h => {
      const x = h.resource || {};
      const p = x.parentReference || {};
      return { t: x.name, u: x.webUrl, driveId: p.driveId, itemId: x.id, map: (p.path || '').replace(/^.*root:/, '') || p.siteId || '' };
    });
  }

  // Embedbare voorbeeldweergave van een Office-bestand
  async function preview(driveId, itemId) {
    const r = await graph('/drives/' + driveId + '/items/' + itemId + '/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
    });
    return r && r.getUrl;
  }

  return {
    enabled, init, login, logout, loadState, saveState, search, preview,
    get account() { return account; },
    get naam() { return account ? (account.name || account.username) : ''; }
  };
})();

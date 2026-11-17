// Microsoft 365 staat uit (besluit 16-11-2026): MSAL, auth.html en de Graph-koppeling zijn weggehaald.
// Dit kleine stuk houdt dezelfde naam en functies, zodat de app ongewijzigd blijft werken: nooit ingelogd.
// Terughalen: de vorige m365.js en vendor/msal-*.js staan in Git (commit 8296b7c).
window.M365 = {
  enabled: () => false, init: async () => null, login: async () => {}, logout: async () => {},
  loadState: async () => null, saveState: async () => {}, search: async () => [], preview: async () => null,
  account: null, naam: ''
};

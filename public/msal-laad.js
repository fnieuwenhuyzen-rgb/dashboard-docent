/* Microsoft-bibliotheek (283 kB) alleen laden als er een clientId is ingevuld; zonder staat Microsoft 365 uit. Eigen bestand in plaats van inline, voor de CSP. */
if (window.LESDAG_CONFIG && window.LESDAG_CONFIG.clientId) document.write('<script src="vendor/msal-browser.min.js"><\/script>');

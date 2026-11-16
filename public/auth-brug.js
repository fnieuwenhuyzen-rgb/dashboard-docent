// Antwoordpagina voor de Microsoft-login (MSAL v5 redirect bridge). Eigen bestand in plaats van inline, voor de CSP.
msalRedirectBridge.broadcastResponseToMainFrame().catch(function (e) {
  document.body.innerHTML = '<p>Inloggen is niet gelukt: ' + String(e && e.message || e).replace(/</g, '&lt;') + '</p><p><a href="./">Terug naar Lesdag</a></p>';
});

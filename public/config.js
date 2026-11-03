// Instellingen voor de koppeling met Microsoft 365.
// Vul hier de gegevens in die je van de ICT krijgt na de app-registratie (zie LEESMIJ.md).
// Laat clientId leeg om de app zonder Microsoft-account te gebruiken: alles blijft dan op dit apparaat.
window.LESDAG_CONFIG = {
  clientId: '',          // "Application (client) ID" uit de app-registratie
  tenantId: 'organizations', // "Directory (tenant) ID" van CSG Prins Maurits, of 'organizations'
  roosterProxy: 'https://lesdag-rooster.f-nieuwenhuyzen.workers.dev', // Cloudflare Worker voor Zermelo
  magister: 'https://csgpm.magister.net/op/#/vandaag', // knop Open: Lesdag kijkt niet in Magister en tikt er niets in
  outlookNieuw: 'https://outlook.office.com/mail/deeplink/compose' // nieuwe mail in Outlook op het web (felicitatie aan een collega)
};

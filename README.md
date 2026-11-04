# Feest Joyce & Marco

Feestpagina voor de 40e en 50e verjaardag van Joyce & Marco, zaterdag 21 november 2026 in Central Park Voorburg.

- **Gasten:** `https://app.joycemarco.nl` - scroll-intro door de poort, aftellen, route, cadeautip en een privé berichtje (met optioneel verzoeknummer en foto).
- **Joyce & Marco:** `https://app.joycemarco.nl/admin` - uitnodigingen (persoonlijke links versturen via WhatsApp of mail, zien wie geopend heeft) en gastenboek met zoeken, favorieten, verzoeknummers, boekje (PDF) en diavoorstelling.

## Alleen op uitnodiging

De feestpagina is afgeschermd (`middleware.js`). Elke gast krijgt een unieke link `https://app.joycemarco.nl/i/<token>`.
Bij het openen telt de site dat als "geopend" en zet een ondertekende cookie, zodat de gast daarna gewoon op de pagina kan.
Zonder geldige link of ingelogde beheerder kom je op `/geen-toegang`. Een gast verwijderen maakt de link ongeldig voor nieuwe bezoeken.

## Opbouw

| Pad | Wat |
| --- | --- |
| `public/` | Statische site (HTML, CSS, JS, afbeeldingen) |
| `public/admin/` | Gastenboek-dashboard |
| `api/messages.js` | Gasten plaatsen een bericht (POST) |
| `api/admin/*` | Inloggen, berichten lezen/verwijderen, favorieten, foto's (alleen met sessie-cookie) |
| `api/_lib/` | Gedeelde code (auth, opslag) |

Berichten en foto's staan in een **privé** Vercel Blob store; alleen de serverfuncties kunnen ze lezen.

## Instellingen (Vercel environment variables)

| Naam | Waarvoor |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Wordt automatisch gezet als de Blob store aan het project gekoppeld is |
| `ADMIN_PASSWORD` | Wachtwoord voor `/admin` |
| `SESSION_SECRET` | Willekeurige lange string om de inlog-cookie te ondertekenen |

## Betaling

De betaallink (Rabobank-betaalverzoek) staat in `BETAAL_URL` bovenin `public/app.js` en als href van de knop in `public/index.html`; de QR-code is `public/assets/qr-betaling.png`.

## Lokaal draaien

```bash
npm install
npx vercel dev
```

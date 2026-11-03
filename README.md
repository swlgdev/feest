# Feest Joyce & Marco

Feestpagina voor de 40e en 50e verjaardag van Joyce & Marco, zaterdag 21 november 2026 in Central Park Voorburg.

- **Gasten:** `https://app.joycemarco.nl` - scroll-intro door de poort, aftellen, route, cadeautip en een privé berichtje (met optioneel verzoeknummer en foto).
- **Joyce & Marco:** `https://app.joycemarco.nl/admin` - gastenboek met zoeken, favorieten, verzoeknummers, boekje (PDF) en diavoorstelling.

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

## Nog in te vullen

- **Betaallink:** zet de echte link in `BETAAL_URL` bovenin `public/app.js`.
- **QR-code:** vervang `public/assets/qr-demo.png` door de QR-code van de betaallink en haal het label "Demo" weg in `public/index.html`.

## Lokaal draaien

```bash
npm install
npx vercel dev
```

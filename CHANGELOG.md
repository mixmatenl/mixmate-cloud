## [1.3.6] - 2026-07-23
### Nieuw
- MachineApp: pagina op /machineapp waarmee je een MIXMATE-machine kunt ontdekken en verbinden zonder in te loggen
- Backend: /api/machineapp/machines endpoint geeft online machines terug met lokaal IP

## [1.3.5] - 2026-07-22
### Nieuw
- Betaalstatus per bestelling: Openstaand / Betaald / Te laat (instelbaar door beheerder in bestelmodal)
- Betaalstatus zichtbaar als badge in bestellingenoverzicht
- Glazenseries beheren: eigen tab in webshop-beheer, producten koppelen aan serie
- Bestelpagina toont producten gegroepeerd per serie
- Klanten kunnen eigen bestellingen terugzien via "Mijn bestellingen" in de sidebar
- Opnieuw bestellen vanuit bestelgeschiedenis (herstelt aantallen automatisch)

## [1.3.4] - 2026-07-22
### Verbeterd
- Automatische e-mail bij statuswijziging: bevestiging bij "bevestigd", verzendnotificatie bij "verzonden"
- E-mails worden nu correct verzonden (resend module conflict opgelost)
- Bestellingsbevestiging bevat duidelijke melding dat goedkeuring handmatig plaatsvindt
- Admin ontvangt notificatie bij nieuwe bestelling
- Bestellingen verwijderen vanuit beheer

## [1.3.3] - 2026-07-22
### Nieuw
- Producten: afbeelding uploaden (max 2 MB) of externe URL invoeren
- Productlijst toont thumbnail naast naam en prijs
- Bestelpagina toont productafbeelding naast omschrijving

## [1.3.2] - 2026-07-22
### Verbeterd
- Glazen bestellen alleen mogelijk voor ingelogde klanten (via portaal)
- Naam en e-mail worden automatisch uit account ingevuld bij bestelling
- Klanten kunnen bedrijf, telefoon en afleveradres opslaan in hun account (Mijn account)
- Opgeslagen gegevens worden automatisch vooringevuld bij iedere bestelling
- Bestellen toegevoegd aan sidebar onder "Winkel"
- Backend: Customer-model uitgebreid met company, phone, address_line1, postal_code, city, country
- Backend: PATCH /api/account/profile endpoint voor opslaan klantgegevens
- Backend: /api/shop/orders vereist nu authenticatie

## [1.3.1] - 2026-07-22
### Verbeterd
- Inkoopprijs veld toegevoegd aan producten (alleen zichtbaar voor beheerders)
- Volgorde-veld verwijderd uit producten
- Terugbetaling registreren per bestelling (bedrag + reden), wordt meegenomen in rapportage
- Maandrapportage tab: omzet excl./incl. BTW, terugbetalingen, netto BTW-afdracht, print/PDF

## [1.3.0] - 2026-07-22
### Nieuw
- Webshop module: glazen als fysiek product verkopen via het portaal
- Admin pagina `/webshop` met drie tabs: Bestellingen, Producten, Instellingen
- Bestellingen beheren: status bijwerken (nieuw → verwerkt → verzonden → geannuleerd)
- Factuur genereren en versturen per e-mail via Resend
- Factuurpreview openen als HTML in nieuw tabblad (print-naar-PDF)
- Producten aanmaken/bewerken/verwijderen met prijs excl. BTW, eenheid, minimumafname
- Instelbare bedrijfsgegevens (naam, adres, IBAN, KVK, BTW-nummer)
- Instelbare BTW-percentage en factuurprefix/nummering
- Publieke bestelpagina op `/bestellen` (geen inlog vereist)
- Klantgegevens formulier: naam, bedrijf, e-mail, telefoon, afleveradres, opmerkingen
- Backend: `ShopSettings`, `GlassProduct`, `GlassOrder`, `GlassOrderItem` tabellen
- Automatische bevestigingsmail naar klant bij bestelling

## [1.2.1] - 2026-07-02
### Verbeterd
- Portaal gebruikt `slide_index` van Pi backend — gegarandeerd synchroon met kiosk
- Poll-interval daalt naar 800ms als demo actief is voor soepele overgang

## [1.2.0] - 2026-07-02
### Verbeterd
- Demo overlay portaal identiek aan kiosk DemoMode: zelfde slides (Snelheid, Nauwkeurigheid, Hygiëne, etc.), achtergronden, accentkleuren, watermerk-getal, voortgangsbalk
- Wall-clock slide-sync: beide schermen wisselen exact tegelijk van dia (elke 5 seconden op epoch-grens)
- ProgressBar component toegevoegd — toont hoever huidige dia gevorderd is

## [1.1.0] - 2026-07-01
### Nieuw
- Demo attractor overlay op portaal met voordelen-slides en CTA
- Demo starten/stoppen knop in Instellingen tab
- Synchronisatie met kiosk via cloud WebSocket proxy

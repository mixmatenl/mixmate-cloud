## [2.0.2] - 2026-08-10
### Toegevoegd
- Dashboard widgets: Open servicetickets, Lang offline (>7d), Koppelstatus, Klantactiviteit
- Statistieken-widget uitgebreid met gekoppeld/ongekoppeld teller en open tickets
- Machine.linked_machine_id + linked_machine_version: Pompmodule stuurt cocktail_machine_id mee in heartbeat
- Machine.last_login op Customer: bijgehouden bij elke login
- GET /api/admin/machines/search: zoeken op short_code, naam, machine_id, serienummer
- POST /api/admin/machines/{id}/trigger-cocktailmachine-update: update Cocktailmachine op afstand
- "Machines zoeken" tab met detailview (gekoppelde Cocktailmachine + update-knoppen)
- Zoekveld: zoek op short code (laatste 4 chars serienummer)
- is_admin teruggestuurd bij login en adminMe
### Gewijzigd
- Admin wordt bij app-start automatisch herkend en doorgestuurd naar dashboard (ook bij bestaande sessie)
- Navigatielink "Zoeken" in de Machines sectie van de sidebar

## [2.0.1] - 2026-08-10
### Toegevoegd
- Widget-structuur op dashboard: volgorde aanpasbaar via drag-and-drop, widgets verbergen/tonen; instellingen opgeslagen in localStorage
- Verwijderknop op offline machines (met bevestigingsdialoog; online machines kunnen niet worden verwijderd)
- Verwijderknop op webshop bestellingen in dashboard
- Admin wordt na inloggen direct doorgestuurd naar dashboard
### Gewijzigd
- Dashboard is standaard eerste pagina bij admin-navigatie

## [2.0.0] - 2026-08-10
### Toegevoegd
- Machine model: `short_code` (laatste 4 alfanumerieke chars van serial/machine_id), `last_error`, `last_error_at`
- DB-migraties voor nieuwe velden
- WS-handler `error_report`: machine kan foutmelding sturen naar cloud
- GET /api/admin/dashboard: offline machines, storingen, verouderde software, webshop bestellingen
- Dashboard tab in admin portaal (standaard startpagina)
- Navigatielink "Dashboard" in sidebar
### Gewijzigd
- machine_self_unpair (/api/machines/{id}/unpair) wist nu ook alle MachineMember records — medewerkers zien de machine niet meer na uitloggen

## [1.9.6] - 2026-08-08
### Toegevoegd
- _verification_state per machine: pending/approved/denied
- GET /api/admin/machines/{id}/verification-status (admin pollt)
- POST /api/machines/{id}/customer-verify-machine (Pompmodule stuurt klantrespons)
- send-contact-verification zet status pending + stuurt JA/NEE mail als fallback
- send-contact-email zet status pending
- customer-verify endpoint update _verification_state
- Admin gate pollt elke 3s, geeft controls vrij bij approved

## [1.9.4] - 2026-08-08
### Gewijzigd
- Verificatielaag: JA/NEE vraag "Heeft u contact met de klant?"
- NEE stuurt waarschuwingsmail naar r.muller@mixmate.nl en h.louwrink@mixmate.nl
- JA geeft controls vrij
- Nieuw endpoint: POST /api/admin/machines/{id}/report-unauthorized-access
- _resend accepteert nu ook een lijst als `to`

## [1.9.3] - 2026-08-08
### Gewijzigd
- Verificatielaag vereist nu het versturen van een melding naar de klant/machine
- Admin moet eerst melding sturen (machine-scherm of e-mail) voordat controls vrijkomen

## [1.9.2] - 2026-08-08
### Gewijzigd
- Admin verificatielaag vervangen — melding wordt naar machine gestuurd
- Knop stuurt notificatie via WebSocket als machine online is
- Fallback naar e-mail als machine offline is

## [1.9.1] - 2026-07-28
### Nieuw
- Instellingen → Inlogcodes: backoffice PIN getoond (vast 0502), bartender PIN instelbaar
- Huidige bartender PIN wordt opgehaald van de machine en getoond

## [1.9.0] - 2026-07-28
### Nieuw
- Ingrediënten: foto uploaden via portaal (resize + compress client-side, via WebSocket proxy naar Pi)
- Ingrediënten: naam bewerken + categorie instellen via portaal (nieuwe "Bewerk" knop per rij)
- Ingrediënt-categorieën: nieuw tabblad "Ing. categorieën" — volledig CRUD, categorienaam wordt getoond onder ingrediëntnaam
- Receptformulier: gebruikt nu ook ingrediëntcategorieën in de toekomst (basis gelegd)

## [1.8.2] - 2026-07-28
### Opgelost
- Pompbeheer: foutmelding bij verbindingsverlies (Machine offline, timeout) wordt nu inline getoond onder de pomplijst in plaats van een browser `alert()`-dialoog

## [1.8.1] - 2026-07-28
### Opgelost
- Spoelroutine: verbindingsfout tijdens spoelen toont nu een foutmelding i.p.v. stil leegvallen
- Pompbeheer: type-wissel (peristaltisch ↔ CO₂ valve) en ingrediëntkoppeling worden nu direct in de UI bijgewerkt zonder pagina-herlaad

## [1.8.0] - 2026-07-28
### Gewijzigd
- Spoelroutine: geen auto-selectie bij laden — gebruiker kiest zelf welke leidingen op water staan
- Spoelroutine: "Geblokkeerde leidingen" sectie bovenaan met afteltimer per leiding (live via WebSocket proxy)
- Spoelroutine: spoelduur vaste 6s per leiding (was variabele formule)
- Spoelroutine: "Alles selecteren" knop verwijderd; vervangen door "Wis selectie"
### Nieuw
- Cloud backend: `/api/machines/{id}/cooldown-status` proxy endpoint
- Pi cloud_client: `get_cooldown_status` message type toegevoegd
- Portal api.js: `getCooldownStatus(machineId)` toegevoegd

## [1.7.0] - 2026-07-27
### Gewijzigd
- Spoelscherm volledig herontworpen: consistente Group/Row-stijl, geen nep-analysestap
- Leidingkeuze als checkboxlijst met ingrediëntnaam + geschatte duur per rij
- "Alles selecteren / deselecteren" knop; CO₂-valves automatisch uitgesloten
- Live voortgang: dunne overall-progressbar bovenaan + per-leiding blokjes met vullend kleur
- Resultaat (voltooid / gewichtsbeveiliging / fout) met icoon-stijl consistent aan rest portaal
- Spoelgeschiedenis altijd zichtbaar als aparte Group onderaan (geen verbergen-knop meer)

## [1.6.1] - 2026-07-27
### Gewijzigd
- Spoelroutine: standaard duur verlaagd (analyse genereert kortere tijden), default 10s → 6s
- Spoelroutine: melding bij weegschaalbeveiliging (Pi stopt automatisch boven 2 kg)

## [1.6.0] - 2026-07-27
### Nieuw
- Pompbeheer: per pomp instellen of het een peristaltische pomp of CO₂-valve is
- Pompbeheer: ingrediënt-dropdown gefilterd op pomptype — valve toont alleen koolzuurhoudende ingrediënten
- Wijzigen van pomptype reset het gekoppelde ingrediënt automatisch

## [1.5.0] - 2026-07-27
### Nieuw
- `GlassProduct` heeft nu `volume_ml` veld (inhoud van het glas in ml)
- Admin webshop: volume-veld in productformulier voor glazen
- Publiek endpoint `/api/glass-catalog` geeft actieve glazen met naam, volume en afbeelding terug aan Pi-machines
- Receptbeheer in portaal: waarschuwing als geselecteerd glas te klein is voor cocktailvolume

## [1.3.7] - 2026-07-23
### Nieuw
- MachineApp: hybride cloud + lokale modus (detecteert automatisch via cloud én mixmate.local)
- MachineApp: volledig herschreven Discovery-scherm met AirPods-achtige verbindingservaring
- MachineApp: lokale modus stuurt API-calls rechtstreeks naar https://mixmate.local:8000
- MachineApp: cloudmodus stuurt API-calls via /api/machineapp/{id}/proxy/... tunnel
- MachineApp: pour-voortgang via cloud-WS-brug of direct lokale WS afhankelijk van modus
- MachineApp: toont hotspot-instructies (MIXMATE-Setup WiFi) als er geen machine gevonden wordt
- MachineApp: toont cert-acceptatie-instructie als mixmate.local niet vertrouwd is
- Backend: generiek HTTP-proxy endpoint /api/machineapp/{id}/proxy/{path} voor alle REST-calls via tunnel
- Backend: pour WS-brug /ws/machineapp/{id}/pour koppelt browsersessie aan Pi-poortstream

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

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

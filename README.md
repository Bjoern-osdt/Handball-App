# Handball Favoriten (Chrome-Erweiterung)

Derselbe selbst gebaute Ersatz für die nicht mehr funktionierende **7m-App** wie das
Android-Projekt – diesmal als **Chrome-Erweiterung** statt als App zum Installieren.
Favoriten-Mannschaften des **Handballverbands Niedersachsen-Bremen (HVNB)** werden
direkt von [nuLiga](https://hvnb-handball.liga.nu) geladen: Spielergebnisse, Tabelle,
Spielerstatistiken, Spielorte/-zeiten und ein Ein-Klick-Export einzelner Spiele in den
Google Kalender.

Es handelt sich um eine reine Client-Erweiterung (Manifest V3, kein Build-Schritt,
kein Server, keine Cloud) – alle Daten liegen nur lokal im Speicher deines
Chrome-Profils.

## Funktionen

- **Favoriten**: beliebig viele nuLiga-Teams hinzufügen, indem du den Link ihrer
  "Mannschaftsportrait"-Seite einfügst.
- **Schnell hinzufügen**: Bist du gerade auf einer nuLiga-Mannschaftsseite, übernimmt
  ein Klick auf das Erweiterungssymbol automatisch den Link. Alternativ: Rechtsklick
  auf einen Team-Link auf einer beliebigen HVNB-Seite → "Zu Handball Favoriten
  hinzufügen".
- **Spielplan & Ergebnisse**: kompletter Saisonspielplan inkl. Ergebnissen und
  Halbzeitstand.
- **Tabelle**: aktuelle Staffeltabelle, eigenes Team hervorgehoben.
- **Spielerstatistiken**: Torschützenliste, 7m-Tore, Zeitstrafen, Gelbe/Rote Karten
  je Staffel (Spieler des eigenen Vereins hervorgehoben).
- **Spielorte**: Hallenadresse per Klick auf den Spielort, inkl. "Route planen"-Button
  (öffnet Google Maps – der Link kommt direkt von nuLiga).
- **Kalender-Export per Klick**: jedes einzelne Spiel öffnet per Klick einen
  vorausgefüllten Google-Kalender-Termin zum Speichern – kein Google-Login, keine
  Kalender-Berechtigung, kein OAuth nötig. Zusätzlich gibt es oben im Spielplan einen
  Button, der den kompletten Saison-Spielplan als ICS-Datei direkt von nuLiga
  herunterlädt (die gleiche Datei lässt sich in Google Kalender unter "Weitere
  Kalender" → "Per URL" auch als laufendes Abo eintragen).
- **Hintergrund-Sync & Benachrichtigungen**: alle 4 Stunden werden alle Favoriten im
  Hintergrund aktualisiert; bei neu eingetragenen Ergebnissen und kurz vor Anstoß
  (innerhalb von 2 Stunden) gibt es eine Desktop-Benachrichtigung. Ein Klick auf die
  Benachrichtigung öffnet direkt das jeweilige Team.

## Installation (Entwicklermodus – kein Chrome Web Store nötig)

1. Diesen Ordner (`HandballFavoritenWeb`) irgendwo entpacken/speichern, z.B. in
   `Dokumente\Handball-Favoriten`.
2. In Chrome `chrome://extensions` öffnen.
3. Oben rechts **"Entwicklermodus"** aktivieren.
4. **"Entpackte Erweiterung laden"** klicken und den Ordner `HandballFavoritenWeb`
   auswählen (den Ordner mit `manifest.json` darin, nicht dessen übergeordneten
   Ordner).
5. Das Handball-Symbol erscheint in der Symbolleiste (ggf. über das Puzzle-Symbol
   anheften). Ein Klick öffnet die App in einem neuen Tab.

Da die Erweiterung nicht über den Chrome Web Store installiert wird, zeigt Chrome
gelegentlich einen Hinweis auf "Erweiterungen im Entwicklermodus" – das ist normal
und kein Fehler. Nach Code-Änderungen reicht ein Klick auf das Aktualisieren-Symbol
bei der Erweiterung in `chrome://extensions`.

## Bedienung

- **"+"** unten rechts → Link einer teamPortrait-Seite einfügen → "Hinzufügen".
- Auf einen Favoriten tippen öffnet Spielplan/Tabelle/Statistik in drei Reitern.
- Im Spielplan: Kalender-Symbol bei jedem Spiel für den Ein-Klick-Export, Klick auf
  den Spielort-Chip für die Hallenadresse.
- Symbol oben rechts (⟳) aktualisiert den aktuellen Favoriten bzw. (auf der
  Übersicht) alle Favoriten auf einmal.

## Architektur

```
manifest.json      Manifest V3: Permissions, Background-Service-Worker, Icons
background.js       Hintergrund-Sync (chrome.alarms), Benachrichtigungen,
                     Öffnen der App, Kontextmenü
app.html/css/js      Die eigentliche App als Single-Page-UI (Hash-Routing,
                     kein Framework, keine Build-Tools nötig)
src/
  nuligaClient.js     Lädt eine nuLiga-Seite (fetch) und parst sie (DOMParser)
  calendar.js         Google-Kalender-Link + ICS-Abo-Links
  notifications.js    chrome.notifications-Wrapper
  teamNameUtils.js    unscharfer Namensvergleich fürs Hervorheben des eigenen Teams
  data/
    models.js         Datentypen (JSDoc) + die 5 Spielerstatistik-Typen
    repository.js      chrome.storage.local als "Datenbank" + Sync-/Diff-Logik
  parsers/
    htmlTextUtils.js       Text-Normalisierung, <br>-Zeilen, Query-Parameter
    nuligaUrlParser.js     Erkennt/baut teamPortrait-/groupPage-/Statistik-/
                           courtInfo-URLs
    teamPortraitParser.js  Vereins-/Liganame, Spielplan, Kalenderlinks
    groupTableParser.js    Staffeltabelle
    playerStatsParser.js   Spieler-Ranglisten (spaltenreihenfolge-unabhängig)
    venueParser.js         Hallenadresse
```

Da nuLiga keine offizielle API anbietet, liest die Erweiterung die HTML-Seiten
direkt aus. Folgende nuLiga-Seiten werden verwendet:

| Seite | Zweck |
|---|---|
| `teamPortrait` | Vereins-/Liganame, Spielplan/Ergebnisse, Kalenderlinks |
| `groupPage` | Staffeltabelle |
| `groupMeetingStatistics` | Spieler-Ranglisten (Tore, 7m-Tore, Zeitstrafen, Karten) |
| `courtInfo` | Hallenadresse |

Diese HTML-Struktur wurde am **20.09.2026 live gegen hvnb-handball.liga.nu geprüft**
(nicht nur angenommen): Alle Parser wurden gegen reale, aus der Live-Seite entnommene
Beispiel-Daten mit einer automatisierten Node.js-Testsuite (jsdom) verifiziert – u.a.
die Besonderheit, dass die Spalten der Spielerstatistik-Seiten je nach Statistik-Typ
in unterschiedlicher Reihenfolge stehen (deshalb werden sie über die
Spaltenüberschriften erkannt, nie über eine feste Position). Ändert nuLiga sein
Layout grundlegend, müssen ggf. die Parser in `src/parsers/` angepasst werden.

## Warum eine Erweiterung statt einer normalen Webseite?

Chrome-Erweiterungen mit in `manifest.json` deklarierten `host_permissions` dürfen
Cross-Origin-Anfragen an genau diese Domains stellen, ohne dass CORS (das nuLiga
nicht für Fremdzugriffe freigibt) das verhindert. Eine ganz normale, irgendwo
gehostete Webseite könnte nuLiga dagegen nicht direkt per JavaScript abrufen und
bräuchte einen zusätzlichen Proxy-Server. Das war der Grund, hier auf eine
Chrome-Erweiterung statt auf eine eigenständige Web-App zu setzen.

## Bekannte Einschränkungen

- **Scope**: fest auf den Handballverband Niedersachsen-Bremen
  (`hvnb-handball.liga.nu`) zugeschnitten (`host_permissions` in `manifest.json`).
  Der `courtInfo`-Abruf für Hallenadressen verwendet zusätzlich fest
  `federation=HVNB` (siehe `repository.js`, `getVenue`).
- **Teams hinzufügen**: nur per eingefügtem Link, keine In-App-Suche nach Vereinen
  (nuLigas Vereinssuche ist eine zustandsbehaftete Formular-Seite).
- **Spieldauer im Kalendereintrag**: nuLiga liefert keine Spieldauer, daher wird
  pauschal mit 90 Minuten gerechnet.
- **Hintergrund-Sync nur bei laufendem Chrome**: `chrome.alarms` weckt den
  Service Worker zuverlässig auf, aber nur solange Chrome läuft (auch im
  Hintergrund/minimiert reicht das; ist Chrome komplett geschlossen, pausiert der
  Sync bis zum nächsten Start).
- Keine Synchronisierung zwischen mehreren Rechnern/Chrome-Profilen – alle Daten
  liegen nur lokal in `chrome.storage.local` dieses einen Chrome-Profils.

## Für Entwickler: Tests

Die Parser- und Repository-Logik ist mit einer kleinen Node.js/jsdom-Testsuite
gegen reale, live von nuLiga entnommene HTML-Beispiele abgesichert (nicht Teil
dieses Ordners, da für den Betrieb der Erweiterung nicht nötig). Bei Änderungen an
`src/parsers/` oder `src/data/repository.js` empfiehlt es sich, äquivalente Tests
aufzusetzen (jsdom als DOMParser-Ersatz, `chrome.storage.local` und `fetch` mocken).

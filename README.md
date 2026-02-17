# Personenzählung Card für Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)

Custom Lovelace Card für die Anzeige von Personenzählung über MDT Bewegungsmelder mit Laufrichtungserkennung.

## Features

- **Echtzeit-Zählung**: Zeigt Kommen/Gehen Werte des aktuellen Tages
- **Backend-Zählung**: HA zählt 24/7 via Counter + Automation (browserunabhängig)
- **Vortagsvergleich**: Automatisch via HA-Helper oder localStorage
- **Trend-Anzeige**: Pfeile und Prozentwerte zeigen Veränderungen zum Vortag
- **Netto-Anzeige**: Berechnet Personen im Gebäude (Kommen - Gehen), Text frei änderbar
- **1-Klick Setup**: Automatische Erstellung aller Counter, Helper und Automationen direkt aus dem Editor
- **Visueller Editor**: GUI-Editor mit Suchfeld für Entitäten und CSS-Anpassung
- **Animationen**: Puls-Animation bei Wertänderungen
- **Vollständig anpassbar**: Farben, Schriftgrößen, Eckenradien, eigenes CSS

## Schnellstart (2 Schritte)

### Schritt 1: Card installieren

**HACS (empfohlen):**
1. HACS → Frontend → Drei Punkte → Benutzerdefinierte Repositories
2. `huedde/Cursor-Personenz-hlung` hinzufügen, Kategorie: **Lovelace**
3. Installieren → Home Assistant neu starten

**Manuell:**
1. `dist/personenzaehlung-card.js` nach `/config/www/` kopieren
2. Einstellungen → Dashboards → Ressourcen → Hinzufügen:
   - URL: `/local/personenzaehlung-card.js`
   - Typ: JavaScript-Modul
3. Browser-Cache leeren (Strg+Shift+R)

### Schritt 2: Karte hinzufügen & automatisch einrichten

1. Dashboard bearbeiten → Karte hinzufügen → "Personenzählung" suchen
2. Im Editor oben unter **"Automatische Einrichtung"**:
   - Deine zwei MDT Binärsensoren auswählen (Kommen + Gehen)
   - Optional: Prefix anpassen (Standard: `personen`)
   - Auf **"Backend automatisch einrichten"** klicken
3. Fertig! Der Setup-Assistent erstellt automatisch:
   - `counter.personen_kommen_heute` — Zählt Kommen-Impulse
   - `counter.personen_gehen_heute` — Zählt Gehen-Impulse
   - `input_number.personen_kommen_gestern` — Gestern Kommen
   - `input_number.personen_gehen_gestern` — Gestern Gehen
   - 3 Automationen (Kommen/Gehen zählen + Mitternacht-Reset)
   - Die Card-Konfiguration wird automatisch ausgefüllt

> **Tipp**: Kein manuelles YAML nötig! Alles wird direkt in HA erstellt.

### Alternative: Manuell per YAML

Falls du das Backend lieber manuell einrichten möchtest, kopiere `ha-config/personenzaehlung.yaml` nach `/config/packages/` und passe die Sensor-Entity-IDs an. Dann konfiguriere die Card:

```yaml
type: custom:personenzaehlung-card
entity_kommen: counter.personen_kommen_heute
entity_gehen: counter.personen_gehen_heute
card_title: Seitentür zum Gebäude 441
card_subtitle: Personen
net_label: Aktuell im Gebäude
yesterday_mode: entities
entity_yesterday_kommen: input_number.personen_kommen_gestern
entity_yesterday_gehen: input_number.personen_gehen_gestern
```

## Wie die Zählung funktioniert

```
MDT Sensor (binary_sensor)
    ↓ Impuls (off → on)
HA Automation (24/7, browserunabhängig)
    ↓ counter.increment
HA Counter Entity
    ↓ Wert lesen
Personenzählung Card (Anzeige)
```

1. Der MDT Bewegungsmelder sendet bei jeder Person einen kurzen Impuls (off→on→off)
2. Eine HA-Automation erkennt den Impuls und erhöht den Counter um 1
3. Um Mitternacht: Tageswerte werden in die Gestern-Helfer kopiert, Counter wird auf 0 gesetzt
4. Die Card liest nur den Counter-Wert und zeigt ihn an

**Vorteil**: Die Zählung läuft im HA-Backend — unabhängig davon, ob ein Browser/Dashboard offen ist.

## Alle Konfigurationsoptionen

| Option | Typ | Standard | Beschreibung |
|---|---|---|---|
| `entity_kommen` | string | (erforderlich) | Entity-ID für den Kommen-Zähler |
| `entity_gehen` | string | (erforderlich) | Entity-ID für den Gehen-Zähler |
| `card_title` | string | `"Eingang"` | Titel der Karte |
| `card_subtitle` | string | `"Personen"` | Untertitel |
| `net_label` | string | `"Aktuell im Gebaeude"` | Text der Netto-Anzeige (frei änderbar) |
| `yesterday_mode` | string | `"localstorage"` | `"localstorage"` oder `"entities"` |
| `entity_yesterday_kommen` | string | `""` | Entity für gestrige Kommen-Werte |
| `entity_yesterday_gehen` | string | `""` | Entity für gestrige Gehen-Werte |
| `show_yesterday` | boolean | `true` | Vortageswerte anzeigen |
| `show_comparison` | boolean | `true` | Trend-Pfeile und Prozent anzeigen |
| `show_net` | boolean | `true` | Netto-Personen anzeigen |
| `animate_change` | boolean | `true` | Puls-Animation bei Wertänderung |
| `color_kommen` | color | `#4caf50` | Farbe für Kommen (Grün) |
| `color_gehen` | color | `#f44336` | Farbe für Gehen (Rot) |
| `bg_color` | color | `#1c1c1e` | Hintergrund der Karte |
| `text_color` | color | `#ffffff` | Textfarbe |
| `counter_bg` | color | `#2c2c2e` | Hintergrund der Zählerboxen |
| `color_trend_up` | color | `#4caf50` | Farbe für positiven Trend |
| `color_trend_down` | color | `#f44336` | Farbe für negativen Trend |
| `font_size_counter` | number | `32` | Schriftgröße Zähler (px) |
| `font_size_title` | number | `16` | Schriftgröße Titel (px) |
| `border_radius` | number | `12` | Eckenradius Karte (px) |
| `counter_radius` | number | `12` | Eckenradius Zählerboxen (px) |
| `custom_css` | string | `""` | Eigenes CSS |

## Unterstützte Entity-Typen

- `counter.*` — Home Assistant Counter (empfohlen)
- `sensor.*` — Standard-Sensor-Entitäten
- `input_number.*` — Eingabe-Helfer

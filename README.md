# Personenzählung Card für Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)

Custom Lovelace Card für die Anzeige von Personenzählung über MDT Bewegungsmelder mit Laufrichtungserkennung. **Keine API erforderlich.**

## Features

- **Echtzeit-Zählung**: Zeigt Kommen/Gehen Werte des aktuellen Tages
- **Vortagsvergleich ohne API**: Zwei Modi verfügbar:
  - **localStorage (Standard)**: Speichert automatisch im Browser, null Konfiguration nötig
  - **HA-Helper**: Nutzt `input_number` Entitäten + Automation (zuverlässig bei mehreren Geräten)
- **Trend-Anzeige**: Pfeile und Prozentwerte zeigen Veränderungen zum Vortag
- **Netto-Anzeige**: Berechnet "Aktuell im Gebäude" (Kommen - Gehen)
- **Visueller Editor**: Kompletter GUI-Editor mit Entity-Auswahl und CSS-Anpassung
- **Animationen**: Puls-Animation bei Wertänderungen
- **Vollständig anpassbar**: Farben, Schriftgrößen, Eckenradien, eigenes CSS

## Installation

### HACS (empfohlen)

1. Öffne HACS → **Frontend**
2. Klicke oben rechts auf die drei Punkte → **Benutzerdefinierte Repositories**
3. Füge `huedde/Cursor-Personenz-hlung` als Repository hinzu, Kategorie: **Lovelace**
4. Klicke **Installieren**
5. Starte Home Assistant neu
6. Leere den Browser-Cache (Strg+Shift+R)

### Manuell

1. Lade `personenzaehlung-card.js` aus dem `dist/` Ordner herunter
2. Kopiere die Datei nach:
   ```
   /config/www/personenzaehlung-card.js
   ```

3. Füge die Ressource in Home Assistant hinzu:
   - Gehe zu **Einstellungen** → **Dashboards** → **Ressourcen** (oben rechts: drei Punkte)
   - Klicke **Ressource hinzufügen**
   - URL: `/local/personenzaehlung-card.js`
   - Typ: **JavaScript-Modul**

4. Leere den Browser-Cache (Strg+Shift+R)

## Verwendung

### Über den visuellen Editor

1. Bearbeite ein Dashboard
2. Klicke **Karte hinzufügen**
3. Suche nach **Personenzählung**
4. Wähle die Entitäten für Kommen und Gehen aus
5. Wähle den Vortag-Modus (localStorage oder HA-Helper)
6. Passe Farben und Design nach Wunsch an

### YAML-Konfiguration

#### Modus 1: localStorage (Standard — kein Setup nötig)

```yaml
type: custom:personenzaehlung-card
entity_kommen: sensor.mdt_eingang_kommen
entity_gehen: sensor.mdt_eingang_gehen
card_title: Seitentür zum Gebäude 441
card_subtitle: Personen
yesterday_mode: localstorage
```

Die Karte merkt sich die Tageswerte automatisch im Browser. Beim Tageswechsel (Mitternacht) werden die aktuellen Werte als "Gestern" gespeichert.

> **Hinweis**: localStorage ist pro Browser/Gerät. Auf verschiedenen Geräten sieht man unterschiedliche Vortageswerte. Für geräteübergreifende Synchronisation nutze Modus 2.

#### Modus 2: HA-Helper Entitäten

```yaml
type: custom:personenzaehlung-card
entity_kommen: sensor.mdt_eingang_kommen
entity_gehen: sensor.mdt_eingang_gehen
card_title: Seitentür zum Gebäude 441
card_subtitle: Personen
yesterday_mode: entities
entity_yesterday_kommen: input_number.gestern_kommen
entity_yesterday_gehen: input_number.gestern_gehen
```

##### Helper anlegen

In Home Assistant unter **Einstellungen → Geräte & Dienste → Helfer**:

1. `input_number.gestern_kommen` — Min: 0, Max: 9999, Schritt: 1
2. `input_number.gestern_gehen` — Min: 0, Max: 9999, Schritt: 1

##### Automation für Mitternacht-Reset

Unter **Einstellungen → Automatisierungen** neue Automation anlegen:

```yaml
alias: "Personenzählung - Tageswechsel"
description: "Kopiert Tageswerte in Gestern-Helper und setzt zurück"
trigger:
  - platform: time
    at: "23:59:50"
action:
  - service: input_number.set_value
    target:
      entity_id: input_number.gestern_kommen
    data:
      value: "{{ states('sensor.mdt_eingang_kommen') | float(0) }}"
  - service: input_number.set_value
    target:
      entity_id: input_number.gestern_gehen
    data:
      value: "{{ states('sensor.mdt_eingang_gehen') | float(0) }}"
mode: single
```

> **Wichtig**: Passe die Entity-IDs (`sensor.mdt_eingang_kommen` etc.) an deine tatsächlichen Sensor-Namen an!

## Alle Konfigurationsoptionen

| Option | Typ | Standard | Beschreibung |
|---|---|---|---|
| `entity_kommen` | string | (erforderlich) | Entity-ID für den Kommen-Zähler |
| `entity_gehen` | string | (erforderlich) | Entity-ID für den Gehen-Zähler |
| `card_title` | string | `"Eingang"` | Titel der Karte |
| `card_subtitle` | string | `"Personen"` | Untertitel |
| `yesterday_mode` | string | `"localstorage"` | `"localstorage"` oder `"entities"` |
| `entity_yesterday_kommen` | string | `""` | Entity für gestrige Kommen-Werte (nur bei Modus "entities") |
| `entity_yesterday_gehen` | string | `""` | Entity für gestrige Gehen-Werte (nur bei Modus "entities") |
| `show_yesterday` | boolean | `true` | Vortageswerte anzeigen |
| `show_comparison` | boolean | `true` | Trend-Pfeile und Prozent anzeigen |
| `show_net` | boolean | `true` | Netto-Personen (Kommen - Gehen) anzeigen |
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
| `custom_css` | string | `""` | Eigenes CSS (überschreibt andere Werte) |

## Unterstützte Entity-Typen

- `sensor.*` — Standard-Sensor-Entitäten
- `binary_sensor.*` — Binärsensoren
- `counter.*` — Home Assistant Counter
- `input_number.*` — Eingabe-Helfer

# Personenzählung Card für Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)

Custom Lovelace Card für die Anzeige von Personenzählung über MDT Bewegungsmelder mit Laufrichtungserkennung. Unterstützt **mehrere Türen/Eingänge** pro Karte.

## Features

- **Mehrere Türen**: Beliebig viele Eingänge pro Karte mit Einzel-Aufschlüsselung
- **1-Klick Setup**: Automatische Erstellung aller Counter, Helper und Automationen direkt aus dem Editor
- **Backend-Zählung**: HA zählt 24/7 via Counter + Automation (browserunabhängig)
- **Vortagsvergleich**: Automatisch via HA-Helper oder localStorage
- **Trend-Anzeige**: Pfeile und Prozentwerte zeigen Veränderungen zum Vortag
- **Netto-Anzeige**: Berechnet Personen im Gebäude (Kommen - Gehen), Text frei änderbar
- **Visueller Editor**: GUI-Editor mit Suchfeld für Entitäten und CSS-Anpassung
- **Backend aufräumen**: Entfernt alle erstellten Entities und Automationen per Knopfdruck
- **Animationen**: Puls-Animation bei Wertänderungen
- **Vollständig anpassbar**: Farben, Schriftgrößen, Eckenradien, eigenes CSS

## Schnellstart (2 Schritte)

### Schritt 1: Card installieren

**HACS (empfohlen):**
1. HACS → Frontend → Drei Punkte → Benutzerdefinierte Repositories
2. `huedde/Cursor-Personenz-hlung` hinzufügen, Kategorie: **Lovelace**
3. Installieren → Home Assistant neu starten
4. Browser-Cache leeren (Strg+Shift+R)

**Manuell:**
1. `dist/personenzaehlung-card.js` nach `/config/www/` kopieren
2. Einstellungen → Dashboards → Ressourcen → Hinzufügen:
   - URL: `/local/personenzaehlung-card.js`
   - Typ: JavaScript-Modul
3. Browser-Cache leeren (Strg+Shift+R)

### Schritt 2: Karte hinzufügen & Türen einrichten

1. Dashboard bearbeiten → Karte hinzufügen → "Personenzählung" suchen
2. Im Editor unter **"Türen & Einrichtung"**:
   - **Kartentitel** eingeben (z.B. "Gebäude 441") — wird auch für Entity-Namen verwendet
   - Für jede Tür: **Name** + **MDT Binärsensoren** (Kommen/Gehen) angeben
   - Mit **"+ Weitere Tür hinzufügen"** beliebig viele Eingänge anlegen
   - Auf **"Backend einrichten"** klicken
3. Fertig! Der Setup-Assistent erstellt pro Tür automatisch:
   - `counter.{gebaeude}_{tuer}_kommen_heute`
   - `counter.{gebaeude}_{tuer}_gehen_heute`
   - `input_number.{gebaeude}_{tuer}_kommen_gestern`
   - `input_number.{gebaeude}_{tuer}_gehen_gestern`
   - Automationen für Kommen/Gehen-Zählung + Mitternacht-Tageswechsel

> **Tipp**: Die Entity-Namen werden aus Kartentitel + Türname zusammengesetzt — so können mehrere Karten für verschiedene Gebäude parallel laufen.

### Backend aufräumen

Falls du Türen oder die gesamte Karte entfernen möchtest: Im Editor auf **"Backend entfernen"** klicken. Das löscht alle Counter, Helper und Automationen, die für diese Karte erstellt wurden.

## Anzeige

Die Karte zeigt:
- **Gesamtsumme**: Kommen/Gehen über alle Türen
- **Netto-Personen**: Aktuell im Gebäude (Kommen - Gehen)
- **Tür-Details**: Aufschlüsselung pro Eingang (bei 2+ Türen)
- **Vortagsvergleich**: Trend-Pfeile und Prozentwerte

```
┌─────────────────────────────────┐
│ Gebäude 441                     │
│ 👥 Personen (3 Türen)           │
│                                 │
│ ● Heute — Mo, 16.02.2026       │
│ ┌───────────┐ ┌───────────┐    │
│ │ Kommen    │ │ Gehen     │    │
│ │ (Gesamt)  │ │ (Gesamt)  │    │
│ │    23     │ │    18     │    │
│ │ ▲ +15%    │ │ ▼ -5%     │    │
│ └───────────┘ └───────────┘    │
│                                 │
│ 👥 Aktuell im Gebäude     +5   │
│                                 │
│ ── Einzelne Türen ──────────   │
│ Haupteingang    K: 10   G: 7   │
│ Seiteneingang   K: 8    G: 6   │
│ Tiefgarage      K: 5    G: 5   │
│                                 │
│ --- Gestern ─────────────────  │
│ ┌───────────┐ ┌───────────┐    │
│ │ Kommen 20 │ │ Gehen 19  │    │
│ └───────────┘ └───────────┘    │
└─────────────────────────────────┘
```

## Wie die Zählung funktioniert

```
MDT Sensor (binary_sensor) ─ pro Tür
    ↓ Impuls (off → on)
HA Automation (24/7, browserunabhängig) ─ pro Tür
    ↓ counter.increment
HA Counter Entity ─ pro Tür
    ↓ Werte summieren
Personenzählung Card (Anzeige)
```

1. Jeder MDT Bewegungsmelder sendet bei jeder Person einen Impuls (off→on→off)
2. Pro Tür zählt eine HA-Automation die Impulse in separate Counter
3. Um Mitternacht: Alle Tageswerte werden gesichert, Counter auf 0 gesetzt
4. Die Card summiert alle Türen und zeigt Gesamt + Einzelwerte

**Vorteil**: Zählung läuft im HA-Backend — unabhängig vom Browser.

## Konfigurationsoptionen

| Option | Typ | Standard | Beschreibung |
|---|---|---|---|
| `card_title` | string | `"Gebaeude"` | Titel der Karte (auch für Entity-Namen) |
| `card_subtitle` | string | `"Personen"` | Untertitel |
| `net_label` | string | `"Aktuell im Gebaeude"` | Text der Netto-Anzeige |
| `doors` | array | `[]` | Array der Tür-Konfigurationen |
| `yesterday_mode` | string | `"localstorage"` | `"localstorage"` oder `"entities"` |
| `show_yesterday` | boolean | `true` | Vortageswerte anzeigen |
| `show_comparison` | boolean | `true` | Trend-Pfeile anzeigen |
| `show_net` | boolean | `true` | Netto-Personen anzeigen |
| `show_door_details` | boolean | `true` | Einzelne Türen aufschlüsseln |
| `animate_change` | boolean | `true` | Animation bei Wertänderung |
| `color_kommen` | color | `#4caf50` | Farbe für Kommen |
| `color_gehen` | color | `#f44336` | Farbe für Gehen |
| `bg_color` | color | `#1c1c1e` | Hintergrund der Karte |
| `text_color` | color | `#ffffff` | Textfarbe |
| `counter_bg` | color | `#2c2c2e` | Hintergrund Zählerboxen |
| `font_size_counter` | number | `32` | Schriftgröße Zähler (px) |
| `font_size_title` | number | `16` | Schriftgröße Titel (px) |
| `border_radius` | number | `12` | Eckenradius Karte (px) |
| `counter_radius` | number | `12` | Eckenradius Zählerboxen (px) |
| `custom_css` | string | `""` | Eigenes CSS |

### Tür-Konfiguration (doors Array)

Jede Tür hat folgende Felder (werden automatisch vom Setup-Assistenten gesetzt):

```yaml
doors:
  - name: Haupteingang
    entity_kommen: counter.gebaeude_441_haupteingang_kommen_heute
    entity_gehen: counter.gebaeude_441_haupteingang_gehen_heute
    entity_yesterday_kommen: input_number.gebaeude_441_haupteingang_kommen_gestern
    entity_yesterday_gehen: input_number.gebaeude_441_haupteingang_gehen_gestern
```

## Backward-Kompatibilität

Bestehende Konfigurationen mit `entity_kommen` und `entity_gehen` (v2.x) werden automatisch als einzelne Tür erkannt und funktionieren weiterhin.

## Alternative: Manuell per YAML

Falls du das Backend manuell einrichten möchtest, kopiere `ha-config/personenzaehlung.yaml` nach `/config/packages/` und passe die Sensor-Entity-IDs an.

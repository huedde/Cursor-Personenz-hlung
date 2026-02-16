/**
 * Personenzählung Card für Home Assistant
 * MDT Bewegungsmelder mit Laufrichtungserkennung
 * Zeigt aktuellen Tag + Vortag mit Vergleich
 * OHNE API — nutzt localStorage oder HA-Helper für Vortageswerte
 * Visueller Editor mit CSS-Anpassungen und Entity-Auswahl
 */

const CARD_VERSION = "1.1.0";

// ============================================================
// EDITOR (Visueller Konfigurations-Editor)
// ============================================================
class PersonenzaehlungCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._editorRendered) {
      this._populateEntityDropdowns();
    }
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  _render() {
    if (this._editorRendered) return;
    this._editorRendered = true;

    this.innerHTML = `
      <style>
        .editor-container {
          padding: 16px;
          font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif);
        }
        .editor-section {
          margin-bottom: 20px;
          padding: 16px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 8px;
          background: var(--card-background-color, #fff);
        }
        .editor-section h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--primary-text-color, #333);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .editor-row {
          display: flex;
          flex-direction: column;
          margin-bottom: 12px;
        }
        .editor-row label {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 4px;
          color: var(--secondary-text-color, #666);
        }
        .editor-row input,
        .editor-row select {
          padding: 8px 12px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 6px;
          font-size: 14px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #333);
          outline: none;
          transition: border-color 0.2s;
        }
        .editor-row input:focus,
        .editor-row select:focus {
          border-color: var(--primary-color, #03a9f4);
        }
        .editor-row input[type="color"] {
          height: 40px;
          padding: 4px;
          cursor: pointer;
        }
        .editor-row input[type="range"] {
          -webkit-appearance: auto;
        }
        .color-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .range-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .range-row input[type="range"] {
          flex: 1;
        }
        .range-value {
          min-width: 40px;
          text-align: right;
          font-size: 13px;
          color: var(--secondary-text-color, #666);
        }
        .css-preview {
          margin-top: 8px;
          padding: 10px;
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: var(--primary-text-color, #333);
          white-space: pre-wrap;
          word-break: break-all;
          max-height: 120px;
          overflow-y: auto;
        }
        .entity-hint {
          font-size: 11px;
          color: var(--secondary-text-color, #999);
          margin-top: 2px;
          font-style: italic;
        }
        .helper-section {
          display: none;
        }
        .helper-section.visible {
          display: block;
        }
        .info-box {
          background: var(--secondary-background-color, #f0f4ff);
          border-left: 3px solid var(--primary-color, #03a9f4);
          padding: 10px 12px;
          border-radius: 0 6px 6px 0;
          font-size: 12px;
          line-height: 1.5;
          color: var(--primary-text-color, #555);
          margin-bottom: 12px;
        }
      </style>
      <div class="editor-container">

        <!-- Entitäten -->
        <div class="editor-section">
          <h3>Entitaeten (Binaersensoren / Zaehler)</h3>
          <div class="editor-row">
            <label>Sensor "Kommen" (Eingang)</label>
            <select id="entity_kommen">
              <option value="">-- Entitaet auswaehlen --</option>
            </select>
            <span class="entity-hint">binary_sensor.* oder sensor.* / counter.*</span>
          </div>
          <div class="editor-row">
            <label>Sensor "Gehen" (Ausgang)</label>
            <select id="entity_gehen">
              <option value="">-- Entitaet auswaehlen --</option>
            </select>
            <span class="entity-hint">binary_sensor.* oder sensor.* / counter.*</span>
          </div>
          <div class="editor-row">
            <label>Titel der Karte</label>
            <input type="text" id="card_title" placeholder="z.B. Seitentuer zum Gebaeude 441" />
          </div>
          <div class="editor-row">
            <label>Untertitel</label>
            <input type="text" id="card_subtitle" placeholder="z.B. Personen" />
          </div>
        </div>

        <!-- Vortag-Modus -->
        <div class="editor-section">
          <h3>Vortag-Datenquelle</h3>
          <div class="info-box">
            <strong>localStorage (Standard):</strong> Die Karte speichert die Tageswerte automatisch im Browser. Um Mitternacht werden die Werte als "Gestern" gesichert.<br/>
            <strong>HA-Helper:</strong> Nutze input_number Helfer in Home Assistant und eine Automation, die um Mitternacht die Werte kopiert. Zuverlaessiger bei mehreren Browsern/Geraeten.
          </div>
          <div class="editor-row">
            <label>Vortag-Modus</label>
            <select id="yesterday_mode">
              <option value="localstorage">Automatisch (localStorage)</option>
              <option value="entities">HA-Helper Entitaeten</option>
            </select>
          </div>

          <div class="helper-section" id="helper_entities_section">
            <div class="editor-row">
              <label>Gestern "Kommen" (input_number / sensor)</label>
              <select id="entity_yesterday_kommen">
                <option value="">-- Entitaet auswaehlen --</option>
              </select>
              <span class="entity-hint">z.B. input_number.gestern_kommen</span>
            </div>
            <div class="editor-row">
              <label>Gestern "Gehen" (input_number / sensor)</label>
              <select id="entity_yesterday_gehen">
                <option value="">-- Entitaet auswaehlen --</option>
              </select>
              <span class="entity-hint">z.B. input_number.gestern_gehen</span>
            </div>
          </div>
        </div>

        <!-- Anzeige-Optionen -->
        <div class="editor-section">
          <h3>Anzeige-Optionen</h3>
          <div class="editor-row">
            <label>Vortag anzeigen</label>
            <select id="show_yesterday">
              <option value="true">Ja</option>
              <option value="false">Nein</option>
            </select>
          </div>
          <div class="editor-row">
            <label>Vergleich anzeigen (Trend-Pfeile)</label>
            <select id="show_comparison">
              <option value="true">Ja</option>
              <option value="false">Nein</option>
            </select>
          </div>
          <div class="editor-row">
            <label>Netto-Personen anzeigen (Kommen - Gehen)</label>
            <select id="show_net">
              <option value="true">Ja</option>
              <option value="false">Nein</option>
            </select>
          </div>
          <div class="editor-row">
            <label>Animations-Effekt bei Aenderung</label>
            <select id="animate_change">
              <option value="true">Ja</option>
              <option value="false">Nein</option>
            </select>
          </div>
        </div>

        <!-- CSS / Design -->
        <div class="editor-section">
          <h3>Design & CSS</h3>
          <div class="color-grid">
            <div class="editor-row">
              <label>Farbe "Kommen"</label>
              <input type="color" id="color_kommen" value="#4caf50" />
            </div>
            <div class="editor-row">
              <label>Farbe "Gehen"</label>
              <input type="color" id="color_gehen" value="#f44336" />
            </div>
            <div class="editor-row">
              <label>Hintergrundfarbe Karte</label>
              <input type="color" id="bg_color" value="#1c1c1e" />
            </div>
            <div class="editor-row">
              <label>Textfarbe</label>
              <input type="color" id="text_color" value="#ffffff" />
            </div>
            <div class="editor-row">
              <label>Hintergrund Zaehlerbox</label>
              <input type="color" id="counter_bg" value="#2c2c2e" />
            </div>
            <div class="editor-row">
              <label>Akzentfarbe (Trend positiv)</label>
              <input type="color" id="color_trend_up" value="#4caf50" />
            </div>
            <div class="editor-row">
              <label>Akzentfarbe (Trend negativ)</label>
              <input type="color" id="color_trend_down" value="#f44336" />
            </div>
          </div>

          <div class="editor-row" style="margin-top: 16px;">
            <label>Schriftgroesse Zaehler</label>
            <div class="range-row">
              <input type="range" id="font_size_counter" min="16" max="60" value="32" />
              <span class="range-value" id="font_size_counter_val">32px</span>
            </div>
          </div>
          <div class="editor-row">
            <label>Schriftgroesse Titel</label>
            <div class="range-row">
              <input type="range" id="font_size_title" min="12" max="28" value="16" />
              <span class="range-value" id="font_size_title_val">16px</span>
            </div>
          </div>
          <div class="editor-row">
            <label>Eckenradius Karte</label>
            <div class="range-row">
              <input type="range" id="border_radius" min="0" max="24" value="12" />
              <span class="range-value" id="border_radius_val">12px</span>
            </div>
          </div>
          <div class="editor-row">
            <label>Eckenradius Zaehlerbox</label>
            <div class="range-row">
              <input type="range" id="counter_radius" min="0" max="24" value="12" />
              <span class="range-value" id="counter_radius_val">12px</span>
            </div>
          </div>

          <div class="editor-row" style="margin-top:12px;">
            <label>Eigenes CSS (ueberschreibt obige Werte)</label>
            <textarea id="custom_css" rows="4" style="
              padding: 8px 12px;
              border: 1px solid var(--divider-color, #ccc);
              border-radius: 6px;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              background: var(--card-background-color, #fff);
              color: var(--primary-text-color, #333);
              resize: vertical;
            " placeholder="z.B. .card { box-shadow: 0 4px 20px rgba(0,0,0,0.3); }"></textarea>
          </div>

          <div class="editor-row">
            <label>CSS-Vorschau (generiert)</label>
            <div class="css-preview" id="css_preview">Wird automatisch generiert...</div>
          </div>
        </div>

      </div>
    `;

    this._bindEvents();
    this._loadConfig();
    this._toggleHelperSection();
    if (this._hass) this._populateEntityDropdowns();
  }

  _populateEntityDropdowns() {
    if (!this._hass) return;
    const entities = Object.keys(this._hass.states).sort();
    const relevantEntities = entities.filter(
      (e) =>
        e.startsWith("binary_sensor.") ||
        e.startsWith("sensor.") ||
        e.startsWith("counter.") ||
        e.startsWith("input_number.")
    );

    const dropdowns = [
      "entity_kommen",
      "entity_gehen",
      "entity_yesterday_kommen",
      "entity_yesterday_gehen",
    ];

    dropdowns.forEach((id) => {
      const sel = this.querySelector(`#${id}`);
      if (!sel) return;
      const currentVal = sel.value;
      sel.innerHTML = '<option value="">-- Entitaet auswaehlen --</option>';
      relevantEntities.forEach((eid) => {
        const friendly =
          this._hass.states[eid]?.attributes?.friendly_name || eid;
        const opt = document.createElement("option");
        opt.value = eid;
        opt.textContent = `${friendly} (${eid})`;
        sel.appendChild(opt);
      });
      if (currentVal) sel.value = currentVal;
      else if (this._config[id]) sel.value = this._config[id];
    });
  }

  _toggleHelperSection() {
    const mode = this._getVal("yesterday_mode");
    const section = this.querySelector("#helper_entities_section");
    if (section) {
      section.classList.toggle("visible", mode === "entities");
    }
  }

  _bindEvents() {
    const fields = [
      "entity_kommen",
      "entity_gehen",
      "entity_yesterday_kommen",
      "entity_yesterday_gehen",
      "card_title",
      "card_subtitle",
      "yesterday_mode",
      "show_yesterday",
      "show_comparison",
      "show_net",
      "animate_change",
      "color_kommen",
      "color_gehen",
      "bg_color",
      "text_color",
      "counter_bg",
      "color_trend_up",
      "color_trend_down",
      "font_size_counter",
      "font_size_title",
      "border_radius",
      "counter_radius",
      "custom_css",
    ];

    fields.forEach((id) => {
      const el = this.querySelector(`#${id}`);
      if (!el) return;
      const evtType =
        el.tagName === "SELECT" || el.tagName === "TEXTAREA"
          ? "change"
          : "input";
      el.addEventListener(evtType, () => {
        if (id === "yesterday_mode") this._toggleHelperSection();
        this._updateConfig();
      });
    });
  }

  _loadConfig() {
    const c = this._config;
    const setVal = (id, val) => {
      const el = this.querySelector(`#${id}`);
      if (el && val !== undefined) el.value = val;
    };

    setVal("entity_kommen", c.entity_kommen);
    setVal("entity_gehen", c.entity_gehen);
    setVal("entity_yesterday_kommen", c.entity_yesterday_kommen);
    setVal("entity_yesterday_gehen", c.entity_yesterday_gehen);
    setVal("card_title", c.card_title || "");
    setVal("card_subtitle", c.card_subtitle || "Personen");
    setVal("yesterday_mode", c.yesterday_mode || "localstorage");
    setVal("show_yesterday", c.show_yesterday !== false ? "true" : "false");
    setVal("show_comparison", c.show_comparison !== false ? "true" : "false");
    setVal("show_net", c.show_net !== false ? "true" : "false");
    setVal("animate_change", c.animate_change !== false ? "true" : "false");
    setVal("color_kommen", c.color_kommen || "#4caf50");
    setVal("color_gehen", c.color_gehen || "#f44336");
    setVal("bg_color", c.bg_color || "#1c1c1e");
    setVal("text_color", c.text_color || "#ffffff");
    setVal("counter_bg", c.counter_bg || "#2c2c2e");
    setVal("color_trend_up", c.color_trend_up || "#4caf50");
    setVal("color_trend_down", c.color_trend_down || "#f44336");
    setVal("font_size_counter", c.font_size_counter || 32);
    setVal("font_size_title", c.font_size_title || 16);
    setVal("border_radius", c.border_radius || 12);
    setVal("counter_radius", c.counter_radius || 12);
    setVal("custom_css", c.custom_css || "");

    this._updateRangeDisplays();
    this._updateCSSPreview();
  }

  _getVal(id) {
    const el = this.querySelector(`#${id}`);
    return el ? el.value : "";
  }

  _updateConfig() {
    this._updateRangeDisplays();
    this._updateCSSPreview();

    const newConfig = {
      type: "custom:personenzaehlung-card",
      entity_kommen: this._getVal("entity_kommen"),
      entity_gehen: this._getVal("entity_gehen"),
      entity_yesterday_kommen: this._getVal("entity_yesterday_kommen"),
      entity_yesterday_gehen: this._getVal("entity_yesterday_gehen"),
      card_title: this._getVal("card_title"),
      card_subtitle: this._getVal("card_subtitle"),
      yesterday_mode: this._getVal("yesterday_mode"),
      show_yesterday: this._getVal("show_yesterday") === "true",
      show_comparison: this._getVal("show_comparison") === "true",
      show_net: this._getVal("show_net") === "true",
      animate_change: this._getVal("animate_change") === "true",
      color_kommen: this._getVal("color_kommen"),
      color_gehen: this._getVal("color_gehen"),
      bg_color: this._getVal("bg_color"),
      text_color: this._getVal("text_color"),
      counter_bg: this._getVal("counter_bg"),
      color_trend_up: this._getVal("color_trend_up"),
      color_trend_down: this._getVal("color_trend_down"),
      font_size_counter: parseInt(this._getVal("font_size_counter")) || 32,
      font_size_title: parseInt(this._getVal("font_size_title")) || 16,
      border_radius: parseInt(this._getVal("border_radius")) || 12,
      counter_radius: parseInt(this._getVal("counter_radius")) || 12,
      custom_css: this._getVal("custom_css"),
    };

    this._config = newConfig;

    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  _updateRangeDisplays() {
    const ranges = [
      ["font_size_counter", "px"],
      ["font_size_title", "px"],
      ["border_radius", "px"],
      ["counter_radius", "px"],
    ];
    ranges.forEach(([id, unit]) => {
      const el = this.querySelector(`#${id}`);
      const disp = this.querySelector(`#${id}_val`);
      if (el && disp) disp.textContent = `${el.value}${unit}`;
    });
  }

  _updateCSSPreview() {
    const preview = this.querySelector("#css_preview");
    if (!preview) return;
    const css = `.card {
  background: ${this._getVal("bg_color") || "#1c1c1e"};
  color: ${this._getVal("text_color") || "#ffffff"};
  border-radius: ${this._getVal("border_radius") || 12}px;
}
.counter-box {
  background: ${this._getVal("counter_bg") || "#2c2c2e"};
  border-radius: ${this._getVal("counter_radius") || 12}px;
}
.counter-value {
  font-size: ${this._getVal("font_size_counter") || 32}px;
}
.kommen { color: ${this._getVal("color_kommen") || "#4caf50"}; }
.gehen  { color: ${this._getVal("color_gehen") || "#f44336"}; }`;
    preview.textContent = css;
  }
}

customElements.define(
  "personenzaehlung-card-editor",
  PersonenzaehlungCardEditor
);

// ============================================================
// LOCALSTORAGE HELPER
// ============================================================
class PersonenStorage {
  constructor(storageKey) {
    this._key = `personenzaehlung_${storageKey}`;
  }

  _getData() {
    try {
      const raw = localStorage.getItem(this._key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _setData(data) {
    try {
      localStorage.setItem(this._key, JSON.stringify(data));
    } catch (e) {
      console.warn("Personenzaehlung: localStorage Fehler:", e);
    }
  }

  _todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  _yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  update(kommen, gehen) {
    const data = this._getData() || {};
    const todayKey = this._todayKey();

    if (data.currentDay && data.currentDay !== todayKey) {
      data.yesterday = {
        kommen: data.todayKommen || 0,
        gehen: data.todayGehen || 0,
        date: data.currentDay,
      };
      data.todayKommen = 0;
      data.todayGehen = 0;
    }

    data.currentDay = todayKey;
    data.todayKommen = kommen;
    data.todayGehen = gehen;

    if (!data.yesterday) {
      data.yesterday = null;
    }

    this._setData(data);
    return data;
  }

  getYesterday() {
    const data = this._getData();
    if (!data || !data.yesterday) return { kommen: null, gehen: null };

    const expectedYesterday = this._yesterdayKey();

    if (data.yesterday.date === expectedYesterday) {
      return {
        kommen: data.yesterday.kommen,
        gehen: data.yesterday.gehen,
      };
    }

    return { kommen: null, gehen: null };
  }
}

// ============================================================
// HAUPTKARTE
// ============================================================
class PersonenzaehlungCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._lastKommen = null;
    this._lastGehen = null;
    this._storage = null;
  }

  static getConfigElement() {
    return document.createElement("personenzaehlung-card-editor");
  }

  static getStubConfig() {
    return {
      entity_kommen: "",
      entity_gehen: "",
      card_title: "Eingang Gebaeude",
      card_subtitle: "Personen",
      yesterday_mode: "localstorage",
      entity_yesterday_kommen: "",
      entity_yesterday_gehen: "",
      show_yesterday: true,
      show_comparison: true,
      show_net: true,
      animate_change: true,
      color_kommen: "#4caf50",
      color_gehen: "#f44336",
      bg_color: "#1c1c1e",
      text_color: "#ffffff",
      counter_bg: "#2c2c2e",
      color_trend_up: "#4caf50",
      color_trend_down: "#f44336",
      font_size_counter: 32,
      font_size_title: 16,
      border_radius: 12,
      counter_radius: 12,
      custom_css: "",
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    if (!config) throw new Error("Ungueltige Konfiguration");
    this._config = {
      card_title: "Eingang",
      card_subtitle: "Personen",
      yesterday_mode: "localstorage",
      entity_yesterday_kommen: "",
      entity_yesterday_gehen: "",
      show_yesterday: true,
      show_comparison: true,
      show_net: true,
      animate_change: true,
      color_kommen: "#4caf50",
      color_gehen: "#f44336",
      bg_color: "#1c1c1e",
      text_color: "#ffffff",
      counter_bg: "#2c2c2e",
      color_trend_up: "#4caf50",
      color_trend_down: "#f44336",
      font_size_counter: 32,
      font_size_title: 16,
      border_radius: 12,
      counter_radius: 12,
      custom_css: "",
      ...config,
    };

    const storageId = (config.entity_kommen || "default") + "_" + (config.entity_gehen || "default");
    this._storage = new PersonenStorage(storageId.replace(/[^a-zA-Z0-9_]/g, "_"));
  }

  _getEntityValue(entityId) {
    if (!entityId || !this._hass || !this._hass.states[entityId]) return 0;
    const state = this._hass.states[entityId].state;
    const val = parseFloat(state);
    return isNaN(val) ? 0 : val;
  }

  _getYesterdayValues() {
    const c = this._config;

    if (c.yesterday_mode === "entities") {
      const yk = c.entity_yesterday_kommen
        ? this._getEntityValue(c.entity_yesterday_kommen)
        : null;
      const yg = c.entity_yesterday_gehen
        ? this._getEntityValue(c.entity_yesterday_gehen)
        : null;
      return { kommen: yk, gehen: yg };
    }

    if (this._storage) {
      return this._storage.getYesterday();
    }

    return { kommen: null, gehen: null };
  }

  _getTrendIcon(current, previous) {
    if (previous === null || previous === undefined)
      return { icon: "\u2014", class: "neutral" };
    if (current > previous) return { icon: "\u25B2", class: "up" };
    if (current < previous) return { icon: "\u25BC", class: "down" };
    return { icon: "\u25CF", class: "neutral" };
  }

  _getPercentChange(current, previous) {
    if (previous === null || previous === undefined || previous === 0) {
      if (current === 0) return "0%";
      return current > 0 ? "+\u221E" : "-\u221E";
    }
    const pct = ((current - previous) / previous) * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(0)}%`;
  }

  _render() {
    if (!this._hass || !this._config) return;
    const c = this._config;

    const kommen = this._getEntityValue(c.entity_kommen);
    const gehen = this._getEntityValue(c.entity_gehen);
    const net = kommen - gehen;

    if (this._storage && c.yesterday_mode === "localstorage") {
      this._storage.update(kommen, gehen);
    }

    const yData = this._getYesterdayValues();
    const yKommen = yData.kommen;
    const yGehen = yData.gehen;
    const yNet =
      yKommen !== null && yGehen !== null ? yKommen - yGehen : null;

    const trendK = this._getTrendIcon(kommen, yKommen);
    const trendG = this._getTrendIcon(gehen, yGehen);
    const trendNet = this._getTrendIcon(net, yNet);

    const pctK = this._getPercentChange(kommen, yKommen);
    const pctG = this._getPercentChange(gehen, yGehen);

    const animateK =
      c.animate_change &&
      this._lastKommen !== null &&
      this._lastKommen !== kommen;
    const animateG =
      c.animate_change &&
      this._lastGehen !== null &&
      this._lastGehen !== gehen;
    this._lastKommen = kommen;
    this._lastGehen = gehen;

    const now = new Date();
    const todayStr = now.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const modeLabel =
      c.yesterday_mode === "entities"
        ? "HA-Helper"
        : "auto";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes countUp {
          0% { opacity: 0.5; transform: scale(0.9); }
          50% { transform: scale(1.12); }
          100% { opacity: 1; transform: scale(1); }
        }

        .card {
          background: ${c.bg_color};
          color: ${c.text_color};
          border-radius: ${c.border_radius}px;
          padding: 20px;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
          animation: fadeIn 0.4s ease;
        }

        .card-header {
          margin-bottom: 16px;
        }

        .card-title {
          font-size: ${c.font_size_title}px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .card-title .icon {
          font-size: ${c.font_size_title + 2}px;
          opacity: 0.8;
        }

        .card-subtitle {
          font-size: ${Math.max(c.font_size_title - 3, 11)}px;
          opacity: 0.7;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .section-label {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          opacity: 0.6;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .section-label .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${c.color_kommen};
          animation: pulse 2s infinite;
        }

        .counters-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .counter-box {
          background: ${c.counter_bg};
          border-radius: ${c.counter_radius}px;
          padding: 16px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.06);
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: default;
        }

        .counter-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }

        .counter-icon {
          font-size: 22px;
          margin-bottom: 6px;
        }

        .counter-label {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 4px;
          opacity: 0.8;
        }

        .counter-value {
          font-size: ${c.font_size_counter}px;
          font-weight: 700;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }

        .counter-value.kommen {
          color: ${c.color_kommen};
        }

        .counter-value.gehen {
          color: ${c.color_gehen};
        }

        .counter-value.animate {
          animation: countUp 0.5s ease;
        }

        .counter-trend {
          font-size: 12px;
          margin-top: 6px;
          opacity: 0.7;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .trend-icon.up { color: ${c.color_trend_up}; }
        .trend-icon.down { color: ${c.color_trend_down}; }
        .trend-icon.neutral { color: ${c.text_color}; opacity: 0.5; }

        .net-display {
          background: ${c.counter_bg};
          border-radius: ${c.counter_radius}px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .net-label {
          font-size: 13px;
          font-weight: 500;
          opacity: 0.8;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .net-value {
          font-size: ${Math.max(c.font_size_counter - 6, 18)}px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .net-positive { color: ${c.color_kommen}; }
        .net-negative { color: ${c.color_gehen}; }
        .net-zero { opacity: 0.5; }

        .yesterday-section {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 14px;
          margin-top: 4px;
        }

        .yesterday-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .yesterday-box {
          background: rgba(255,255,255,0.03);
          border-radius: ${c.counter_radius}px;
          padding: 12px;
          text-align: center;
          border: 1px dashed rgba(255,255,255,0.08);
        }

        .yesterday-label {
          font-size: 11px;
          opacity: 0.5;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .yesterday-value {
          font-size: ${Math.max(c.font_size_counter - 10, 16)}px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          opacity: 0.6;
        }

        .yesterday-value.kommen { color: ${c.color_kommen}; }
        .yesterday-value.gehen  { color: ${c.color_gehen}; }

        .comparison-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 10px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
        }

        .comparison-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          opacity: 0.7;
        }

        .comparison-item .trend-icon {
          font-size: 11px;
        }

        .storage-badge {
          display: inline-block;
          font-size: 10px;
          opacity: 0.35;
          background: rgba(255,255,255,0.08);
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 8px;
          font-weight: 400;
          text-transform: none;
          letter-spacing: 0;
        }

        .no-data-hint {
          text-align: center;
          font-size: 12px;
          opacity: 0.4;
          padding: 8px;
          font-style: italic;
        }

        ${c.custom_css || ""}
      </style>

      <ha-card>
        <div class="card">

          <div class="card-header">
            <div class="card-title">
              <span class="icon">\uD83D\uDEAA</span>
              ${c.card_title}
            </div>
            <div class="card-subtitle">
              <span>\uD83D\uDC65</span> ${c.card_subtitle}
            </div>
          </div>

          <div class="section-label">
            <span class="dot"></span>
            Heute \u2014 ${todayStr}
          </div>

          <div class="counters-grid">
            <div class="counter-box">
              <div class="counter-icon" style="color: ${c.color_kommen}">\u2B07\uFE0F</div>
              <div class="counter-label">Kommen</div>
              <div class="counter-value kommen ${animateK ? "animate" : ""}">${kommen}</div>
              ${
                c.show_comparison && yKommen !== null
                  ? `<div class="counter-trend">
                      <span class="trend-icon ${trendK.class}">${trendK.icon}</span>
                      <span>${pctK} vs. gestern</span>
                    </div>`
                  : ""
              }
            </div>
            <div class="counter-box">
              <div class="counter-icon" style="color: ${c.color_gehen}">\u2B06\uFE0F</div>
              <div class="counter-label">Gehen</div>
              <div class="counter-value gehen ${animateG ? "animate" : ""}">${gehen}</div>
              ${
                c.show_comparison && yGehen !== null
                  ? `<div class="counter-trend">
                      <span class="trend-icon ${trendG.class}">${trendG.icon}</span>
                      <span>${pctG} vs. gestern</span>
                    </div>`
                  : ""
              }
            </div>
          </div>

          ${
            c.show_net
              ? `<div class="net-display">
                  <div class="net-label">
                    <span>\uD83C\uDFE2</span> Aktuell im Gebaeude
                  </div>
                  <div class="net-value ${net > 0 ? "net-positive" : net < 0 ? "net-negative" : "net-zero"}">
                    ${net > 0 ? "+" : ""}${net}
                    ${
                      c.show_comparison && yNet !== null
                        ? `<span style="font-size: 12px; opacity: 0.5; margin-left: 8px;">
                            <span class="trend-icon ${trendNet.class}">${trendNet.icon}</span>
                          </span>`
                        : ""
                    }
                  </div>
                </div>`
              : ""
          }

          ${
            c.show_yesterday
              ? `<div class="yesterday-section">
                  <div class="section-label" style="opacity: 0.4;">
                    Gestern \u2014 ${yesterdayStr}
                    <span class="storage-badge">${modeLabel}</span>
                  </div>
                  ${
                    yKommen !== null || yGehen !== null
                      ? `<div class="yesterday-grid">
                          <div class="yesterday-box">
                            <div class="yesterday-label">Kommen</div>
                            <div class="yesterday-value kommen">${yKommen !== null ? yKommen : "\u2013"}</div>
                          </div>
                          <div class="yesterday-box">
                            <div class="yesterday-label">Gehen</div>
                            <div class="yesterday-value gehen">${yGehen !== null ? yGehen : "\u2013"}</div>
                          </div>
                        </div>
                        ${
                          c.show_comparison && yKommen !== null && yGehen !== null
                            ? `<div class="comparison-row">
                                <div class="comparison-item">
                                  <span class="trend-icon ${trendK.class}">${trendK.icon}</span>
                                  Kommen: ${pctK}
                                </div>
                                <div class="comparison-item">
                                  <span class="trend-icon ${trendG.class}">${trendG.icon}</span>
                                  Gehen: ${pctG}
                                </div>
                              </div>`
                            : ""
                        }`
                      : `<div class="no-data-hint">
                          Noch keine Vortageswerte vorhanden.<br/>
                          ${c.yesterday_mode === "localstorage"
                            ? "Daten werden nach dem ersten Tageswechsel angezeigt."
                            : "Bitte Helper-Entitaeten konfigurieren."}
                        </div>`
                  }
                </div>`
              : ""
          }

        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    let size = 3;
    if (this._config?.show_net) size += 1;
    if (this._config?.show_yesterday) size += 2;
    return size;
  }
}

customElements.define("personenzaehlung-card", PersonenzaehlungCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "personenzaehlung-card",
  name: "Personenzaehlung",
  description:
    "Zeigt Personen-Kommen/Gehen fuer den aktuellen Tag mit Vortagsvergleich (MDT Bewegungsmelder). Ohne API.",
  preview: true,
  documentationURL: "",
});

console.info(
  `%c PERSONENZAEHLUNG CARD %c v${CARD_VERSION} `,
  "color: white; background: #4caf50; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;",
  "color: white; background: #333; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;"
);

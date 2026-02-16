/**
 * Personenzählung Card für Home Assistant
 * MDT Bewegungsmelder mit Laufrichtungserkennung
 * Zeigt aktuellen Tag + Vortag mit Vergleich
 * OHNE API — nutzt localStorage oder HA-Helper für Vortageswerte
 * Visueller Editor mit CSS-Anpassungen und Entity-Auswahl
 */

const CARD_VERSION = "1.3.0";

// ============================================================
// EDITOR (Visueller Konfigurations-Editor)
// ============================================================
class PersonenzaehlungCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this._entityCache = [];
  }

  set hass(hass) {
    this._hass = hass;
    if (this._hass) {
      const entities = Object.keys(this._hass.states).sort();
      this._entityCache = entities.filter(
        (e) =>
          e.startsWith("binary_sensor.") ||
          e.startsWith("sensor.") ||
          e.startsWith("counter.") ||
          e.startsWith("input_number.")
      );
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
        /* Searchable entity picker */
        .entity-picker {
          position: relative;
        }
        .entity-picker input {
          width: 100%;
          box-sizing: border-box;
        }
        .entity-picker .ep-list {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          max-height: 200px;
          overflow-y: auto;
          background: var(--card-background-color, #fff);
          border: 1px solid var(--divider-color, #ccc);
          border-top: none;
          border-radius: 0 0 6px 6px;
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .entity-picker.open .ep-list {
          display: block;
        }
        .entity-picker .ep-item {
          padding: 6px 12px;
          font-size: 13px;
          cursor: pointer;
          color: var(--primary-text-color, #333);
          border-bottom: 1px solid var(--divider-color, #eee);
        }
        .entity-picker .ep-item:hover,
        .entity-picker .ep-item.active {
          background: var(--primary-color, #03a9f4);
          color: #fff;
        }
        .entity-picker .ep-item .ep-id {
          font-size: 11px;
          opacity: 0.6;
          display: block;
        }
        .entity-picker .ep-empty {
          padding: 8px 12px;
          font-size: 12px;
          opacity: 0.5;
          font-style: italic;
        }
        .entity-picker .ep-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          font-size: 16px;
          opacity: 0.4;
          line-height: 1;
          padding: 4px;
        }
        .entity-picker .ep-clear:hover { opacity: 0.8; }
      </style>
      <div class="editor-container">

        <div class="editor-section">
          <h3>Entitaeten</h3>
          <div class="editor-row">
            <label>Sensor "Kommen" (Eingang)</label>
            <div class="entity-picker" data-field="entity_kommen">
              <input type="text" class="ep-input" placeholder="Suchen oder Entity-ID eingeben..." autocomplete="off" />
              <span class="ep-clear">&times;</span>
              <div class="ep-list"></div>
            </div>
            <span class="entity-hint">binary_sensor.* / sensor.* / counter.* / input_number.*</span>
          </div>
          <div class="editor-row">
            <label>Sensor "Gehen" (Ausgang)</label>
            <div class="entity-picker" data-field="entity_gehen">
              <input type="text" class="ep-input" placeholder="Suchen oder Entity-ID eingeben..." autocomplete="off" />
              <span class="ep-clear">&times;</span>
              <div class="ep-list"></div>
            </div>
            <span class="entity-hint">binary_sensor.* / sensor.* / counter.* / input_number.*</span>
          </div>
          <div class="editor-row">
            <label>Titel der Karte</label>
            <input type="text" id="card_title" placeholder="z.B. Seitentuer zum Gebaeude 441" />
          </div>
          <div class="editor-row">
            <label>Untertitel</label>
            <input type="text" id="card_subtitle" placeholder="z.B. Personen" />
          </div>
          <div class="editor-row">
            <label>Text "Aktuell im Gebaeude"</label>
            <input type="text" id="net_label" placeholder="z.B. Aktuell im Gebaeude" />
          </div>
        </div>

        <div class="editor-section">
          <h3>Vortag-Datenquelle</h3>
          <div class="info-box">
            <strong>localStorage (Standard):</strong> Speichert Tageswerte automatisch im Browser. Um Mitternacht werden die Werte als "Gestern" gesichert.<br/>
            <strong>HA-Helper:</strong> Nutze input_number Helfer + Automation. Zuverlaessiger bei mehreren Geraeten.
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
              <label>Gestern "Kommen"</label>
              <div class="entity-picker" data-field="entity_yesterday_kommen">
                <input type="text" class="ep-input" placeholder="Suchen..." autocomplete="off" />
                <span class="ep-clear">&times;</span>
                <div class="ep-list"></div>
              </div>
            </div>
            <div class="editor-row">
              <label>Gestern "Gehen"</label>
              <div class="entity-picker" data-field="entity_yesterday_gehen">
                <input type="text" class="ep-input" placeholder="Suchen..." autocomplete="off" />
                <span class="ep-clear">&times;</span>
                <div class="ep-list"></div>
              </div>
            </div>
          </div>
        </div>

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
          <div class="editor-row" style="margin-top:16px;">
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
              padding:8px 12px; border:1px solid var(--divider-color,#ccc);
              border-radius:6px; font-family:'Courier New',monospace; font-size:12px;
              background:var(--card-background-color,#fff); color:var(--primary-text-color,#333);
              resize:vertical;
            " placeholder="z.B. .card { box-shadow: 0 4px 20px rgba(0,0,0,0.3); }"></textarea>
          </div>
          <div class="editor-row">
            <label>CSS-Vorschau (generiert)</label>
            <div class="css-preview" id="css_preview">Wird automatisch generiert...</div>
          </div>
        </div>

      </div>
    `;

    this._initEntityPickers();
    this._bindEvents();
    this._loadConfig();
    this._toggleHelperSection();
  }

  _initEntityPickers() {
    this.querySelectorAll(".entity-picker").forEach((picker) => {
      const field = picker.dataset.field;
      const input = picker.querySelector(".ep-input");
      const list = picker.querySelector(".ep-list");
      const clear = picker.querySelector(".ep-clear");

      input.addEventListener("focus", () => {
        this._filterEntityList(picker, input.value);
        picker.classList.add("open");
      });

      input.addEventListener("input", () => {
        this._filterEntityList(picker, input.value);
        picker.classList.add("open");
        this._config[field] = input.value;
        this._updateConfig();
      });

      clear.addEventListener("mousedown", (e) => {
        e.preventDefault();
        input.value = "";
        this._config[field] = "";
        this._updateConfig();
        this._filterEntityList(picker, "");
        input.focus();
      });

      list.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const item = e.target.closest(".ep-item");
        if (!item) return;
        input.value = item.dataset.entity;
        this._config[field] = item.dataset.entity;
        picker.classList.remove("open");
        this._updateConfig();
      });

      input.addEventListener("blur", () => {
        setTimeout(() => picker.classList.remove("open"), 150);
      });
    });
  }

  _filterEntityList(picker, query) {
    const list = picker.querySelector(".ep-list");
    const q = (query || "").toLowerCase();
    const entities = this._entityCache;
    const filtered = entities.filter((eid) => {
      if (!q) return true;
      const friendly = this._hass?.states[eid]?.attributes?.friendly_name || "";
      return eid.toLowerCase().includes(q) || friendly.toLowerCase().includes(q);
    }).slice(0, 50);

    if (filtered.length === 0) {
      list.innerHTML = '<div class="ep-empty">Keine Entitaeten gefunden</div>';
      return;
    }

    list.innerHTML = filtered.map((eid) => {
      const friendly = this._hass?.states[eid]?.attributes?.friendly_name || eid;
      return `<div class="ep-item" data-entity="${eid}">
        ${friendly}<span class="ep-id">${eid}</span>
      </div>`;
    }).join("");
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
      "card_title", "card_subtitle", "net_label",
      "yesterday_mode",
      "show_yesterday", "show_comparison", "show_net", "animate_change",
      "color_kommen", "color_gehen", "bg_color", "text_color",
      "counter_bg", "color_trend_up", "color_trend_down",
      "font_size_counter", "font_size_title",
      "border_radius", "counter_radius",
      "custom_css",
    ];

    fields.forEach((id) => {
      const el = this.querySelector(`#${id}`);
      if (!el) return;
      const evtType = el.tagName === "SELECT" || el.tagName === "TEXTAREA" ? "change" : "input";
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

    const entityFields = [
      "entity_kommen", "entity_gehen",
      "entity_yesterday_kommen", "entity_yesterday_gehen",
    ];
    entityFields.forEach((field) => {
      const picker = this.querySelector(`.entity-picker[data-field="${field}"]`);
      if (picker && c[field]) {
        picker.querySelector(".ep-input").value = c[field];
      }
    });

    setVal("card_title", c.card_title || "");
    setVal("card_subtitle", c.card_subtitle || "Personen");
    setVal("net_label", c.net_label || "Aktuell im Gebaeude");
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

  _getEntityVal(field) {
    const picker = this.querySelector(`.entity-picker[data-field="${field}"]`);
    return picker ? picker.querySelector(".ep-input").value.trim() : "";
  }

  _updateConfig() {
    this._updateRangeDisplays();
    this._updateCSSPreview();

    const newConfig = {
      type: "custom:personenzaehlung-card",
      entity_kommen: this._getEntityVal("entity_kommen"),
      entity_gehen: this._getEntityVal("entity_gehen"),
      entity_yesterday_kommen: this._getEntityVal("entity_yesterday_kommen"),
      entity_yesterday_gehen: this._getEntityVal("entity_yesterday_gehen"),
      card_title: this._getVal("card_title"),
      card_subtitle: this._getVal("card_subtitle"),
      net_label: this._getVal("net_label"),
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
    [["font_size_counter","px"],["font_size_title","px"],["border_radius","px"],["counter_radius","px"]].forEach(([id, unit]) => {
      const el = this.querySelector(`#${id}`);
      const disp = this.querySelector(`#${id}_val`);
      if (el && disp) disp.textContent = `${el.value}${unit}`;
    });
  }

  _updateCSSPreview() {
    const preview = this.querySelector("#css_preview");
    if (!preview) return;
    preview.textContent = `.card {
  background: ${this._getVal("bg_color") || "#1c1c1e"};
  color: ${this._getVal("text_color") || "#ffffff"};
  border-radius: ${this._getVal("border_radius") || 12}px;
}
.counter-box {
  background: ${this._getVal("counter_bg") || "#2c2c2e"};
  border-radius: ${this._getVal("counter_radius") || 12}px;
}
.counter-value { font-size: ${this._getVal("font_size_counter") || 32}px; }
.kommen { color: ${this._getVal("color_kommen") || "#4caf50"}; }
.gehen  { color: ${this._getVal("color_gehen") || "#f44336"}; }`;
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
// HAUPTKARTE (Build-Once / Update-Only — kein Flackern)
// ============================================================
class PersonenzaehlungCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._lastKommen = null;
    this._lastGehen = null;
    this._storage = null;
    this._domBuilt = false;
    this._els = {};
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
      net_label: "Aktuell im Gebaeude",
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
    const oldHass = this._hass;
    this._hass = hass;

    if (!this._config) return;

    const relevantEntities = [
      this._config.entity_kommen,
      this._config.entity_gehen,
      this._config.entity_yesterday_kommen,
      this._config.entity_yesterday_gehen,
    ].filter(Boolean);

    if (oldHass && this._domBuilt) {
      let changed = false;
      for (const eid of relevantEntities) {
        if (oldHass.states[eid] !== hass.states[eid]) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
    }

    if (!this._domBuilt) {
      this._buildDOM();
    }
    this._updateValues();
  }

  setConfig(config) {
    if (!config) throw new Error("Ungueltige Konfiguration");
    this._config = {
      card_title: "Eingang",
      card_subtitle: "Personen",
      net_label: "Aktuell im Gebaeude",
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

    this._domBuilt = false;
    if (this._hass) {
      this._buildDOM();
      this._updateValues();
    }
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
      const yk = c.entity_yesterday_kommen ? this._getEntityValue(c.entity_yesterday_kommen) : null;
      const yg = c.entity_yesterday_gehen ? this._getEntityValue(c.entity_yesterday_gehen) : null;
      return { kommen: yk, gehen: yg };
    }
    if (this._storage) return this._storage.getYesterday();
    return { kommen: null, gehen: null };
  }

  _getTrendIcon(current, previous) {
    if (previous === null || previous === undefined) return { icon: "\u2014", cls: "neutral" };
    if (current > previous) return { icon: "\u25B2", cls: "up" };
    if (current < previous) return { icon: "\u25BC", cls: "down" };
    return { icon: "\u25CF", cls: "neutral" };
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

  _buildDOM() {
    const c = this._config;
    const now = new Date();
    const todayStr = now.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
    const modeLabel = c.yesterday_mode === "entities" ? "HA-Helper" : "auto";

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes countUp {
          0% { opacity: 0.6; transform: scale(0.92); }
          50% { transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        .card {
          background: ${c.bg_color};
          color: ${c.text_color};
          border-radius: ${c.border_radius}px;
          padding: 20px;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }
        .card-header { margin-bottom: 16px; }
        .card-title {
          font-size: ${c.font_size_title}px;
          font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 4px;
        }
        .card-subtitle svg { width: 16px; height: 16px; vertical-align: middle; }
        .card-subtitle {
          font-size: ${Math.max(c.font_size_title - 3, 11)}px;
          opacity: 0.7;
          display: flex; align-items: center; gap: 6px;
        }
        .section-label {
          font-size: 13px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.8px;
          opacity: 0.6; margin-bottom: 10px;
          display: flex; align-items: center; gap: 6px;
        }
        .section-label .dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: ${c.color_kommen};
          animation: pulse 2s infinite;
        }
        .counters-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 12px; margin-bottom: 16px;
        }
        .counter-box {
          background: ${c.counter_bg};
          border-radius: ${c.counter_radius}px;
          padding: 16px; text-align: center;
          border: 1px solid rgba(255,255,255,0.06);
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: default;
        }
        .counter-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .counter-icon { font-size: 22px; margin-bottom: 6px; line-height: 1; }
        .counter-icon svg { width: 28px; height: 28px; }
        .counter-label { font-size: 13px; font-weight: 500; margin-bottom: 4px; opacity: 0.8; }
        .counter-value {
          font-size: ${c.font_size_counter}px;
          font-weight: 700; line-height: 1.1;
          font-variant-numeric: tabular-nums;
          transition: color 0.3s;
        }
        .counter-value.kommen { color: ${c.color_kommen}; }
        .counter-value.gehen { color: ${c.color_gehen}; }
        .counter-value.animate { animation: countUp 0.4s ease; }
        .counter-trend {
          font-size: 12px; margin-top: 6px; opacity: 0.7;
          display: flex; align-items: center; justify-content: center; gap: 4px;
          min-height: 18px;
        }
        .trend-icon.up { color: ${c.color_trend_up}; }
        .trend-icon.down { color: ${c.color_trend_down}; }
        .trend-icon.neutral { color: ${c.text_color}; opacity: 0.5; }
        .net-display {
          background: ${c.counter_bg};
          border-radius: ${c.counter_radius}px;
          padding: 12px 16px;
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .net-label {
          font-size: 13px; font-weight: 500; opacity: 0.8;
          display: flex; align-items: center; gap: 6px;
        }
        .net-label svg { width: 20px; height: 20px; flex-shrink: 0; }
        .net-value {
          font-size: ${Math.max(c.font_size_counter - 6, 18)}px;
          font-weight: 700; font-variant-numeric: tabular-nums;
          transition: color 0.3s;
        }
        .net-positive { color: ${c.color_kommen}; }
        .net-negative { color: ${c.color_gehen}; }
        .net-zero { opacity: 0.5; }
        .yesterday-section {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 14px; margin-top: 4px;
        }
        .yesterday-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        }
        .yesterday-box {
          background: rgba(255,255,255,0.03);
          border-radius: ${c.counter_radius}px;
          padding: 12px; text-align: center;
          border: 1px dashed rgba(255,255,255,0.08);
        }
        .yesterday-label {
          font-size: 11px; opacity: 0.5; margin-bottom: 4px;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .yesterday-value {
          font-size: ${Math.max(c.font_size_counter - 10, 16)}px;
          font-weight: 600; font-variant-numeric: tabular-nums; opacity: 0.6;
        }
        .yesterday-value.kommen { color: ${c.color_kommen}; }
        .yesterday-value.gehen  { color: ${c.color_gehen}; }
        .comparison-row {
          display: flex; align-items: center; justify-content: center;
          gap: 16px; margin-top: 10px; padding: 8px 12px;
          background: rgba(255,255,255,0.03); border-radius: 8px;
        }
        .comparison-item {
          display: flex; align-items: center; gap: 4px;
          font-size: 12px; opacity: 0.7;
        }
        .comparison-item .trend-icon { font-size: 11px; }
        .storage-badge {
          display: inline-block; font-size: 10px; opacity: 0.35;
          background: rgba(255,255,255,0.08);
          padding: 2px 6px; border-radius: 4px; margin-left: 8px;
          font-weight: 400; text-transform: none; letter-spacing: 0;
        }
        .no-data-hint {
          text-align: center; font-size: 12px; opacity: 0.4;
          padding: 8px; font-style: italic;
        }
        .hidden { display: none !important; }
        ${c.custom_css || ""}
      </style>
      <ha-card>
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span data-id="title">${c.card_title}</span>
            </div>
            <div class="card-subtitle">
              <span>\uD83D\uDC65</span> <span data-id="subtitle">${c.card_subtitle}</span>
            </div>
          </div>
          <div class="section-label">
            <span class="dot"></span>
            Heute \u2014 ${todayStr}
          </div>
          <div class="counters-grid">
            <div class="counter-box">
              <div class="counter-icon"><svg viewBox="0 0 24 24" fill="${c.color_kommen}"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg></div>
              <div class="counter-label">Kommen</div>
              <div class="counter-value kommen" data-id="val-kommen">0</div>
              <div class="counter-trend" data-id="trend-kommen"></div>
            </div>
            <div class="counter-box">
              <div class="counter-icon"><svg viewBox="0 0 24 24" fill="${c.color_gehen}"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg></div>
              <div class="counter-label">Gehen</div>
              <div class="counter-value gehen" data-id="val-gehen">0</div>
              <div class="counter-trend" data-id="trend-gehen"></div>
            </div>
          </div>
          <div class="net-display" data-id="net-section">
            <div class="net-label">
              <svg viewBox="0 0 24 24" fill="${c.text_color}" opacity="0.8"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              <span data-id="net-label-text">${c.net_label}</span>
            </div>
            <div class="net-value" data-id="val-net">0</div>
          </div>
          <div class="yesterday-section" data-id="yesterday-section">
            <div class="section-label" style="opacity:0.4;">
              Gestern \u2014 ${yesterdayStr}
              <span class="storage-badge">${modeLabel}</span>
            </div>
            <div data-id="yesterday-content">
              <div class="yesterday-grid">
                <div class="yesterday-box">
                  <div class="yesterday-label">Kommen</div>
                  <div class="yesterday-value kommen" data-id="val-y-kommen">\u2013</div>
                </div>
                <div class="yesterday-box">
                  <div class="yesterday-label">Gehen</div>
                  <div class="yesterday-value gehen" data-id="val-y-gehen">\u2013</div>
                </div>
              </div>
              <div class="comparison-row" data-id="comparison-row">
                <div class="comparison-item">
                  <span class="trend-icon" data-id="cmp-icon-k"></span>
                  <span data-id="cmp-text-k"></span>
                </div>
                <div class="comparison-item">
                  <span class="trend-icon" data-id="cmp-icon-g"></span>
                  <span data-id="cmp-text-g"></span>
                </div>
              </div>
            </div>
            <div class="no-data-hint" data-id="no-data-hint"></div>
          </div>
        </div>
      </ha-card>
    `;

    this._els = {};
    this.shadowRoot.querySelectorAll("[data-id]").forEach((el) => {
      this._els[el.getAttribute("data-id")] = el;
    });

    this._domBuilt = true;
  }

  _setText(id, text) {
    const el = this._els[id];
    if (el && el.textContent !== String(text)) {
      el.textContent = text;
    }
  }

  _setHTML(id, html) {
    const el = this._els[id];
    if (el) el.innerHTML = html;
  }

  _toggleHidden(id, hidden) {
    const el = this._els[id];
    if (el) el.classList.toggle("hidden", hidden);
  }

  _triggerAnimation(id) {
    const el = this._els[id];
    if (!el) return;
    el.classList.remove("animate");
    void el.offsetWidth;
    el.classList.add("animate");
  }

  _updateValues() {
    if (!this._hass || !this._config || !this._domBuilt) return;
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
    const yNet = yKommen !== null && yGehen !== null ? yKommen - yGehen : null;

    const trendK = this._getTrendIcon(kommen, yKommen);
    const trendG = this._getTrendIcon(gehen, yGehen);
    const trendNet = this._getTrendIcon(net, yNet);
    const pctK = this._getPercentChange(kommen, yKommen);
    const pctG = this._getPercentChange(gehen, yGehen);

    const kommenChanged = this._lastKommen !== null && this._lastKommen !== kommen;
    const gehenChanged = this._lastGehen !== null && this._lastGehen !== gehen;

    this._setText("val-kommen", kommen);
    this._setText("val-gehen", gehen);

    if (c.animate_change && kommenChanged) this._triggerAnimation("val-kommen");
    if (c.animate_change && gehenChanged) this._triggerAnimation("val-gehen");

    this._lastKommen = kommen;
    this._lastGehen = gehen;

    if (c.show_comparison && yKommen !== null) {
      this._setHTML("trend-kommen",
        `<span class="trend-icon ${trendK.cls}">${trendK.icon}</span><span>${pctK} vs. gestern</span>`);
    } else {
      this._setHTML("trend-kommen", "");
    }

    if (c.show_comparison && yGehen !== null) {
      this._setHTML("trend-gehen",
        `<span class="trend-icon ${trendG.cls}">${trendG.icon}</span><span>${pctG} vs. gestern</span>`);
    } else {
      this._setHTML("trend-gehen", "");
    }

    this._toggleHidden("net-section", !c.show_net);
    if (c.show_net) {
      const netEl = this._els["val-net"];
      if (netEl) {
        netEl.textContent = (net > 0 ? "+" : "") + net;
        netEl.className = "net-value " + (net > 0 ? "net-positive" : net < 0 ? "net-negative" : "net-zero");
      }
    }

    this._toggleHidden("yesterday-section", !c.show_yesterday);
    if (c.show_yesterday) {
      const hasData = yKommen !== null || yGehen !== null;
      this._toggleHidden("yesterday-content", !hasData);
      this._toggleHidden("no-data-hint", hasData);

      if (hasData) {
        this._setText("val-y-kommen", yKommen !== null ? yKommen : "\u2013");
        this._setText("val-y-gehen", yGehen !== null ? yGehen : "\u2013");

        const showCmp = c.show_comparison && yKommen !== null && yGehen !== null;
        this._toggleHidden("comparison-row", !showCmp);
        if (showCmp) {
          const ik = this._els["cmp-icon-k"];
          const ig = this._els["cmp-icon-g"];
          if (ik) { ik.className = `trend-icon ${trendK.cls}`; ik.textContent = trendK.icon; }
          if (ig) { ig.className = `trend-icon ${trendG.cls}`; ig.textContent = trendG.icon; }
          this._setText("cmp-text-k", `Kommen: ${pctK}`);
          this._setText("cmp-text-g", `Gehen: ${pctG}`);
        }
      } else {
        const hint = this._els["no-data-hint"];
        if (hint) {
          hint.innerHTML = c.yesterday_mode === "localstorage"
            ? "Noch keine Vortageswerte vorhanden.<br/>Daten werden nach dem ersten Tageswechsel angezeigt."
            : "Noch keine Vortageswerte vorhanden.<br/>Bitte Helper-Entitaeten konfigurieren.";
        }
      }
    }
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
  `%c PERSONENZAEHLUNG CARD %c v${CARD_VERSION} (no-flicker) `,
  "color: white; background: #4caf50; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;",
  "color: white; background: #333; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;"
);

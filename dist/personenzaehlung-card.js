/**
 * Personenzaehlung Card fuer Home Assistant
 * MDT Bewegungsmelder mit Laufrichtungserkennung
 * Unterstuetzt mehrere Tueren/Eingaenge
 * Visueller Editor mit Setup-Assistent und CSS-Anpassungen
 */

const CARD_VERSION = "3.0.0";

// ============================================================
// EDITOR
// ============================================================
class PersonenzaehlungCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this._entityCache = [];
    this._setupDoors = [{ name: "", source_kommen: "", source_gehen: "" }];
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
    if (config.doors && config.doors.length > 0) {
      // vorhandene Konfiguration inkl. Quellen wieder in den Setup-Editor laden
      this._setupDoors = config.doors.map((d) => ({
        name: d.name || "",
        source_kommen: d.source_kommen || "",
        source_gehen: d.source_gehen || "",
      }));
    } else if (config.entity_kommen) {
      this._setupDoors = [
        { name: config.card_title || "Eingang", source_kommen: "", source_gehen: "" },
      ];
    }
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
        .editor-row input[type="color"] { height: 40px; padding: 4px; cursor: pointer; }
        .editor-row input[type="range"] { -webkit-appearance: auto; }
        .color-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .range-row { display: flex; align-items: center; gap: 10px; }
        .range-row input[type="range"] { flex: 1; }
        .range-value {
          min-width: 40px; text-align: right; font-size: 13px;
          color: var(--secondary-text-color, #666);
        }
        .css-preview {
          margin-top: 8px; padding: 10px;
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 6px; font-family: 'Courier New', monospace;
          font-size: 12px; color: var(--primary-text-color, #333);
          white-space: pre-wrap; word-break: break-all;
          max-height: 120px; overflow-y: auto;
        }
        .entity-hint {
          font-size: 11px; color: var(--secondary-text-color, #999);
          margin-top: 2px; font-style: italic;
        }
        .info-box {
          background: var(--secondary-background-color, #f0f4ff);
          border-left: 3px solid var(--primary-color, #03a9f4);
          padding: 10px 12px; border-radius: 0 6px 6px 0;
          font-size: 12px; line-height: 1.5;
          color: var(--primary-text-color, #555);
          margin-bottom: 12px;
        }
        /* Entity picker */
        .entity-picker { position: relative; }
        .entity-picker input { width: 100%; box-sizing: border-box; }
        .entity-picker .ep-list {
          display: none; position: absolute; top: 100%; left: 0; right: 0;
          max-height: 200px; overflow-y: auto;
          background: var(--card-background-color, #fff);
          border: 1px solid var(--divider-color, #ccc); border-top: none;
          border-radius: 0 0 6px 6px; z-index: 10;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .entity-picker.open .ep-list { display: block; }
        .entity-picker .ep-item {
          padding: 6px 12px; font-size: 13px; cursor: pointer;
          color: var(--primary-text-color, #333);
          border-bottom: 1px solid var(--divider-color, #eee);
        }
        .entity-picker .ep-item:hover {
          background: var(--primary-color, #03a9f4); color: #fff;
        }
        .entity-picker .ep-item .ep-id {
          font-size: 11px; opacity: 0.6; display: block;
        }
        .entity-picker .ep-empty {
          padding: 8px 12px; font-size: 12px; opacity: 0.5; font-style: italic;
        }
        .entity-picker .ep-clear {
          position: absolute; right: 8px; top: 50%;
          transform: translateY(-50%); cursor: pointer;
          font-size: 16px; opacity: 0.4; line-height: 1; padding: 4px;
        }
        .entity-picker .ep-clear:hover { opacity: 0.8; }
        /* Door entries */
        .door-entry {
          border: 1px solid var(--divider-color, #ddd);
          border-radius: 8px; padding: 12px;
          margin-bottom: 10px;
          background: var(--secondary-background-color, rgba(0,0,0,0.02));
        }
        .door-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 10px;
        }
        .door-number {
          font-weight: 600; font-size: 13px;
          color: var(--primary-text-color, #333);
        }
        .door-remove {
          cursor: pointer; font-size: 18px; line-height: 1;
          opacity: 0.4; padding: 2px 6px; border-radius: 4px;
          background: none; border: none;
          color: var(--primary-text-color, #666);
        }
        .door-remove:hover { opacity: 1; background: rgba(244,67,54,0.1); color: #f44336; }
        .door-configured {
          font-size: 11px; opacity: 0.5; margin-top: 4px;
          font-style: italic; word-break: break-all;
        }
        .add-door-btn {
          width: 100%; padding: 10px; background: transparent;
          border: 2px dashed var(--divider-color, #ccc);
          border-radius: 8px; font-size: 13px; font-weight: 500;
          color: var(--secondary-text-color, #888); cursor: pointer;
          margin-bottom: 12px; transition: border-color 0.2s, color 0.2s;
        }
        .add-door-btn:hover {
          border-color: var(--primary-color, #03a9f4);
          color: var(--primary-color, #03a9f4);
        }
        /* Setup */
        .setup-btn {
          flex: 1; padding: 12px;
          background: var(--primary-color, #03a9f4); color: white;
          border: none; border-radius: 8px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: background 0.2s, opacity 0.2s;
        }
        .setup-btn:hover { filter: brightness(1.1); }
        .setup-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cleanup-btn { background: #c62828 !important; }
        .setup-log {
          margin-top: 12px; max-height: 250px; overflow-y: auto;
          font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.5;
        }
        .setup-log-item { padding: 2px 0; }
        .setup-log-item.success { color: #4caf50; }
        .setup-log-item.error { color: #f44336; }
        .setup-log-item.info { color: var(--secondary-text-color, #999); }
      </style>
      <div class="editor-container">

        <div class="editor-section">
          <h3>Tueren & Einrichtung</h3>
          <div class="info-box">
            Fuer jede Tuer: Name und MDT Binaersensoren angeben.<br/>
            Klicke dann <strong>"Backend einrichten"</strong> — alle Counter, Helper und Automationen werden automatisch erstellt.
          </div>
          <div class="editor-row">
            <label>Titel der Karte (z.B. Gebaeudebezeichnung)</label>
            <input type="text" id="card_title" placeholder="z.B. Gebaeude 441" />
          </div>
          <div id="doors-setup-container"></div>
          <button id="add_door_btn" class="add-door-btn">+ Weitere Tuer hinzufuegen</button>
          <div style="display:flex; gap:8px; margin-top:12px;">
            <button id="setup_btn" class="setup-btn">Backend einrichten</button>
            <button id="cleanup_btn" class="setup-btn cleanup-btn">Backend entfernen</button>
          </div>
          <div id="setup_log" class="setup-log"></div>
        </div>

        <div class="editor-section">
          <h3>Anzeige</h3>
          <div class="editor-row">
            <label>Untertitel</label>
            <input type="text" id="card_subtitle" placeholder="z.B. Personen" />
          </div>
          <div class="editor-row">
            <label>Text "Aktuell im Gebaeude"</label>
            <input type="text" id="net_label" placeholder="z.B. Aktuell im Gebaeude" />
          </div>
          <div class="editor-row">
            <label>Tuer-Details anzeigen</label>
            <select id="show_door_details">
              <option value="true">Ja</option>
              <option value="false">Nein</option>
            </select>
          </div>
          <div class="editor-row">
            <label>Vortagsvergleich</label>
            <select id="show_yesterday">
              <option value="true">Ja</option>
              <option value="false">Nein</option>
            </select>
          </div>
          <div class="editor-row">
            <label>Trend-Pfeile</label>
            <select id="show_comparison">
              <option value="true">Ja</option>
              <option value="false">Nein</option>
            </select>
          </div>
          <div class="editor-row">
            <label>Netto-Personen (Kommen - Gehen)</label>
            <select id="show_net">
              <option value="true">Ja</option>
              <option value="false">Nein</option>
            </select>
          </div>
          <div class="editor-row">
            <label>Korrektur: Netto nie negativ (Bewegungsmelder)</label>
            <select id="auto_balance">
              <option value="false">Nein</option>
              <option value="true">Ja</option>
            </select>
          </div>
          <div class="editor-row">
            <label>Animation bei Aenderung</label>
            <select id="animate_change">
              <option value="true">Ja</option>
              <option value="false">Nein</option>
            </select>
          </div>
        </div>

        <div class="editor-section">
          <h3>Vortag-Datenquelle</h3>
          <div class="info-box">
            <strong>localStorage:</strong> Speichert Tageswerte im Browser. Um Mitternacht automatisch gesichert.<br/>
            <strong>HA-Helper:</strong> Wird beim Setup automatisch erstellt. Zuverlaessiger bei mehreren Geraeten.
          </div>
          <div class="editor-row">
            <label>Vortag-Modus</label>
            <select id="yesterday_mode">
              <option value="localstorage">Automatisch (localStorage)</option>
              <option value="entities">HA-Helper Entitaeten (empfohlen)</option>
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
              <label>Trend positiv</label>
              <input type="color" id="color_trend_up" value="#4caf50" />
            </div>
            <div class="editor-row">
              <label>Trend negativ</label>
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
            <label>Eigenes CSS</label>
            <textarea id="custom_css" rows="4" style="
              padding:8px 12px; border:1px solid var(--divider-color,#ccc);
              border-radius:6px; font-family:'Courier New',monospace; font-size:12px;
              background:var(--card-background-color,#fff); color:var(--primary-text-color,#333);
              resize:vertical;
            " placeholder="z.B. .card { box-shadow: 0 4px 20px rgba(0,0,0,0.3); }"></textarea>
          </div>
          <div class="editor-row">
            <label>CSS-Vorschau</label>
            <div class="css-preview" id="css_preview">Wird automatisch generiert...</div>
          </div>
        </div>

      </div>
    `;

    this._renderDoorsSetup();
    this._initDoorDelegation();
    this._bindEvents();
    this._loadConfig();
  }

  // -- Dynamic door rendering --
  _renderDoorsSetup() {
    const container = this.querySelector("#doors-setup-container");
    if (!container) return;

    container.innerHTML = this._setupDoors
      .map((door, idx) => {
        const configDoor = (this._config.doors || [])[idx];
        const configured = configDoor && configDoor.entity_kommen
          ? `Konfiguriert: ${configDoor.entity_kommen} / ${configDoor.entity_gehen}`
          : "";

        return `
        <div class="door-entry" data-door-idx="${idx}">
          <div class="door-header">
            <span class="door-number">Tuer ${idx + 1}</span>
            ${this._setupDoors.length > 1 ? `<button class="door-remove" data-door-idx="${idx}">&times;</button>` : ""}
          </div>
          <div class="editor-row">
            <label>Name der Tuer</label>
            <input type="text" class="door-name" data-door-idx="${idx}" value="${this._esc(door.name)}" placeholder="z.B. Haupteingang" />
          </div>
          <div class="editor-row">
            <label>Sensor "Kommen" (Binaersensor)</label>
            <div class="entity-picker" data-door-idx="${idx}" data-door-field="source_kommen" data-filter="binary_sensor">
              <input type="text" class="ep-input" value="${this._esc(door.source_kommen)}" placeholder="binary_sensor.mdt_..." autocomplete="off" />
              <span class="ep-clear">&times;</span>
              <div class="ep-list"></div>
            </div>
          </div>
          <div class="editor-row">
            <label>Sensor "Gehen" (Binaersensor)</label>
            <div class="entity-picker" data-door-idx="${idx}" data-door-field="source_gehen" data-filter="binary_sensor">
              <input type="text" class="ep-input" value="${this._esc(door.source_gehen)}" placeholder="binary_sensor.mdt_..." autocomplete="off" />
              <span class="ep-clear">&times;</span>
              <div class="ep-list"></div>
            </div>
          </div>
          ${configured ? `<div class="door-configured">${configured}</div>` : ""}
        </div>`;
      })
      .join("");

  }

  _esc(str) {
    return (str || "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  _initDoorDelegation() {
    const container = this.querySelector("#doors-setup-container");
    if (!container) return;

    container.addEventListener("input", (e) => {
      const input = e.target;
      const picker = input.closest(".entity-picker[data-door-idx]");
      if (picker && input.classList.contains("ep-input")) {
        const idx = parseInt(picker.dataset.doorIdx);
        const field = picker.dataset.doorField;
        this._setupDoors[idx][field] = input.value;
        this._filterEntityList(picker, input.value);
        picker.classList.add("open");
        return;
      }
      if (input.classList.contains("door-name")) {
        const idx = parseInt(input.dataset.doorIdx);
        this._setupDoors[idx].name = input.value;
      }
    });

    container.addEventListener(
      "focus",
      (e) => {
        const input = e.target;
        if (!input.classList.contains("ep-input")) return;
        const picker = input.closest(".entity-picker[data-door-idx]");
        if (picker) {
          this._filterEntityList(picker, input.value);
          picker.classList.add("open");
        }
      },
      true
    );

    container.addEventListener(
      "blur",
      (e) => {
        const input = e.target;
        if (!input.classList.contains("ep-input")) return;
        const picker = input.closest(".entity-picker[data-door-idx]");
        if (picker) setTimeout(() => picker.classList.remove("open"), 150);
      },
      true
    );

    container.addEventListener("mousedown", (e) => {
      const item = e.target.closest(".ep-item");
      if (item) {
        e.preventDefault();
        const picker = item.closest(".entity-picker[data-door-idx]");
        const input = picker.querySelector(".ep-input");
        const idx = parseInt(picker.dataset.doorIdx);
        const field = picker.dataset.doorField;
        input.value = item.dataset.entity;
        this._setupDoors[idx][field] = item.dataset.entity;
        picker.classList.remove("open");
        return;
      }

      const clear = e.target.closest(".ep-clear");
      if (clear) {
        e.preventDefault();
        const picker = clear.closest(".entity-picker[data-door-idx]");
        const input = picker.querySelector(".ep-input");
        const idx = parseInt(picker.dataset.doorIdx);
        const field = picker.dataset.doorField;
        input.value = "";
        this._setupDoors[idx][field] = "";
        this._filterEntityList(picker, "");
        input.focus();
        return;
      }

      const remove = e.target.closest(".door-remove");
      if (remove) {
        e.preventDefault();
        this._removeDoor(parseInt(remove.dataset.doorIdx));
      }
    });
  }

  _filterEntityList(picker, query) {
    const list = picker.querySelector(".ep-list");
    const q = (query || "").toLowerCase();
    const filter = picker.dataset.filter;
    const entities = filter
      ? this._entityCache.filter((e) => e.startsWith(filter + "."))
      : this._entityCache;

    const filtered = entities
      .filter((eid) => {
        if (!q) return true;
        const friendly =
          this._hass?.states[eid]?.attributes?.friendly_name || "";
        return (
          eid.toLowerCase().includes(q) ||
          friendly.toLowerCase().includes(q)
        );
      })
      .slice(0, 50);

    if (filtered.length === 0) {
      list.innerHTML = '<div class="ep-empty">Keine Entitaeten gefunden</div>';
      return;
    }

    list.innerHTML = filtered
      .map((eid) => {
        const friendly =
          this._hass?.states[eid]?.attributes?.friendly_name || eid;
        return `<div class="ep-item" data-entity="${eid}">
          ${friendly}<span class="ep-id">${eid}</span>
        </div>`;
      })
      .join("");
  }

  _addDoor() {
    this._setupDoors.push({ name: "", source_kommen: "", source_gehen: "" });
    this._renderDoorsSetup();
  }

  _removeDoor(idx) {
    if (this._setupDoors.length <= 1) return;
    this._setupDoors.splice(idx, 1);
    if (this._config.doors) {
      this._config.doors.splice(idx, 1);
      this._updateConfig();
    }
    this._renderDoorsSetup();
  }

  _bindEvents() {
    const fields = [
      "card_title", "card_subtitle", "net_label",
      "yesterday_mode",
      "show_yesterday", "show_comparison", "show_net", "show_door_details", "auto_balance", "animate_change",
      "color_kommen", "color_gehen", "bg_color", "text_color",
      "counter_bg", "color_trend_up", "color_trend_down",
      "font_size_counter", "font_size_title",
      "border_radius", "counter_radius",
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
        this._updateConfig();
      });
    });

    const addBtn = this.querySelector("#add_door_btn");
    if (addBtn) addBtn.addEventListener("click", () => this._addDoor());

    const setupBtn = this.querySelector("#setup_btn");
    if (setupBtn) setupBtn.addEventListener("click", () => this._runSetup());

    const cleanupBtn = this.querySelector("#cleanup_btn");
    if (cleanupBtn) cleanupBtn.addEventListener("click", () => this._runCleanup());
  }

  _loadConfig() {
    const c = this._config;
    const setVal = (id, val) => {
      const el = this.querySelector(`#${id}`);
      if (el && val !== undefined) el.value = val;
    };

    setVal("card_title", c.card_title || "");
    setVal("card_subtitle", c.card_subtitle || "Personen");
    setVal("net_label", c.net_label || "Aktuell im Gebaeude");
    setVal("yesterday_mode", c.yesterday_mode || "localstorage");
    setVal("show_yesterday", c.show_yesterday !== false ? "true" : "false");
    setVal("show_comparison", c.show_comparison !== false ? "true" : "false");
    setVal("show_net", c.show_net !== false ? "true" : "false");
    setVal("show_door_details", c.show_door_details !== false ? "true" : "false");
    setVal("auto_balance", c.auto_balance ? "true" : "false");
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
      card_title: this._getVal("card_title"),
      card_subtitle: this._getVal("card_subtitle"),
      net_label: this._getVal("net_label"),
      yesterday_mode: this._getVal("yesterday_mode"),
      show_yesterday: this._getVal("show_yesterday") === "true",
      show_comparison: this._getVal("show_comparison") === "true",
      show_net: this._getVal("show_net") === "true",
      show_door_details: this._getVal("show_door_details") === "true",
      auto_balance: this._getVal("auto_balance") === "true",
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
      doors: this._config.doors || [],
    };

    this._config = newConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: newConfig },
        bubbles: true,
        composed: true,
      })
    );
  }

  _updateRangeDisplays() {
    [
      ["font_size_counter", "px"],
      ["font_size_title", "px"],
      ["border_radius", "px"],
      ["counter_radius", "px"],
    ].forEach(([id, unit]) => {
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

  _slugify(text) {
    return (text || "")
      .trim()
      .toLowerCase()
      .replace(/[aäÄ]/g, (m) => (m === "a" ? "a" : "ae"))
      .replace(/[öÖ]/g, "oe")
      .replace(/[üÜ]/g, "ue")
      .replace(/[ß]/g, "ss")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  _logSetup(msg, type) {
    const log = this.querySelector("#setup_log");
    if (!log) return;
    const item = document.createElement("div");
    item.className = "setup-log-item" + (type ? " " + type : "");
    item.textContent = msg;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }

  async _runSetup() {
    const cardSlug = this._slugify(this._getVal("card_title"));
    if (!cardSlug) {
      this._logSetup("Bitte Kartentitel eingeben!", "error");
      return;
    }

    for (let i = 0; i < this._setupDoors.length; i++) {
      const d = this._setupDoors[i];
      if (!d.name || !this._slugify(d.name)) {
        this._logSetup(`Tuer ${i + 1}: Bitte Name eingeben!`, "error");
        return;
      }
      if (!d.source_kommen || !d.source_gehen) {
        this._logSetup(`Tuer ${i + 1} (${d.name}): Bitte beide Sensoren auswaehlen!`, "error");
        return;
      }
    }

    const btn = this.querySelector("#setup_btn");
    const log = this.querySelector("#setup_log");
    if (log) log.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "Wird eingerichtet...";

    const cardTitle = this._getVal("card_title").trim();
    const doors = [];
    const allCreatedIds = [];
    let ok = true;

    for (let i = 0; i < this._setupDoors.length; i++) {
      const d = this._setupDoors[i];
      const doorSlug = this._slugify(d.name);

      this._logSetup(`=== Tuer: ${d.name} ===`);

      const helpers = [
        { domain: "counter", id: `${cardSlug}_${doorSlug}_kommen_heute`, name: `${cardTitle} ${d.name} Kommen Heute`, icon: "mdi:account-arrow-right", opts: { initial: 0, step: 1, minimum: 0 } },
        { domain: "counter", id: `${cardSlug}_${doorSlug}_gehen_heute`, name: `${cardTitle} ${d.name} Gehen Heute`, icon: "mdi:account-arrow-left", opts: { initial: 0, step: 1, minimum: 0 } },
        { domain: "input_number", id: `${cardSlug}_${doorSlug}_kommen_gestern`, name: `${cardTitle} ${d.name} Kommen Gestern`, icon: "mdi:account-arrow-right-outline", opts: { min: 0, max: 99999, step: 1, mode: "box" } },
        { domain: "input_number", id: `${cardSlug}_${doorSlug}_gehen_gestern`, name: `${cardTitle} ${d.name} Gehen Gestern`, icon: "mdi:account-arrow-left-outline", opts: { min: 0, max: 99999, step: 1, mode: "box" } },
      ];

      for (const h of helpers) {
        const eid = `${h.domain}.${h.id}`;
        if (this._hass.states[eid]) {
          this._logSetup(`  ${eid} existiert bereits`, "info");
          continue;
        }
        try {
          await this._hass.callWS({ type: `${h.domain}/create`, name: h.name, icon: h.icon, ...h.opts });
          allCreatedIds.push(eid);
          this._logSetup(`  ${eid} erstellt`, "success");
        } catch (err) {
          const msg = err.message || String(err);
          if (msg.includes("already") || msg.includes("exists")) {
            this._logSetup(`  ${eid} existiert bereits`, "info");
          } else {
            this._logSetup(`  Fehler: ${msg}`, "error");
            ok = false;
          }
        }
      }

      const automations = [
        {
          id: `pz_${cardSlug}_${doorSlug}_kommen`,
          config: {
            alias: `PZ ${cardTitle} ${d.name} - Kommen`,
            description: `Zaehlt +1 bei Impuls von ${d.source_kommen}`,
            mode: "queued", max: 50,
            trigger: [{ platform: "state", entity_id: d.source_kommen, from: "off", to: "on" }],
            condition: [],
            action: [{ service: "counter.increment", target: { entity_id: `counter.${cardSlug}_${doorSlug}_kommen_heute` } }],
          },
        },
        {
          id: `pz_${cardSlug}_${doorSlug}_gehen`,
          config: {
            alias: `PZ ${cardTitle} ${d.name} - Gehen`,
            description: `Zaehlt +1 bei Impuls von ${d.source_gehen}`,
            mode: "queued", max: 50,
            trigger: [{ platform: "state", entity_id: d.source_gehen, from: "off", to: "on" }],
            condition: [],
            action: [{ service: "counter.increment", target: { entity_id: `counter.${cardSlug}_${doorSlug}_gehen_heute` } }],
          },
        },
      ];

      for (const a of automations) {
        try {
          this._logSetup(`  Automation: ${a.config.alias}...`);
          await this._hass.callApi("POST", `config/automation/config/${a.id}`, { id: a.id, ...a.config });
          allCreatedIds.push(`automation:${a.id}`);
          this._logSetup(`  Automation erstellt`, "success");
        } catch (err) {
          this._logSetup(`  Fehler: ${err.message || err}`, "error");
          ok = false;
        }
      }

      doors.push({
        name: d.name,
        source_kommen: d.source_kommen,
        source_gehen: d.source_gehen,
        entity_kommen: `counter.${cardSlug}_${doorSlug}_kommen_heute`,
        entity_gehen: `counter.${cardSlug}_${doorSlug}_gehen_heute`,
        entity_yesterday_kommen: `input_number.${cardSlug}_${doorSlug}_kommen_gestern`,
        entity_yesterday_gehen: `input_number.${cardSlug}_${doorSlug}_gehen_gestern`,
      });
    }

    this._logSetup("=== Tageswechsel-Automation ===");
    const midnightActions = [];
    const resetIds = [];
    for (const door of doors) {
      midnightActions.push(
        { service: "input_number.set_value", target: { entity_id: door.entity_yesterday_kommen }, data: { value: `{{ states('${door.entity_kommen}') | float(0) }}` } },
        { service: "input_number.set_value", target: { entity_id: door.entity_yesterday_gehen }, data: { value: `{{ states('${door.entity_gehen}') | float(0) }}` } }
      );
      resetIds.push(door.entity_kommen, door.entity_gehen);
    }
    midnightActions.push({ service: "counter.reset", target: { entity_id: resetIds } });

    try {
      const mId = `pz_${cardSlug}_tageswechsel`;
      await this._hass.callApi("POST", `config/automation/config/${mId}`, {
        id: mId,
        alias: `PZ ${cardTitle} - Tageswechsel`,
        description: "Mitternacht: Tageswerte sichern, Zaehler zuruecksetzen",
        mode: "single",
        trigger: [{ platform: "time", at: "00:00:00" }],
        condition: [],
        action: midnightActions,
      });
      allCreatedIds.push(`automation:${mId}`);
      this._logSetup("  Tageswechsel-Automation erstellt", "success");
    } catch (err) {
      this._logSetup(`  Fehler: ${err.message || err}`, "error");
      ok = false;
    }

    // Label erstellen und allen Entitaeten zuweisen
    if (ok && allCreatedIds.length > 0) {
      this._logSetup("=== Gruppierung (Label) ===");
      const labelName = `${cardTitle} (automatic)`;
      let labelId = null;

      try {
        const result = await this._hass.callWS({
          type: "config/label_registry/create",
          name: labelName,
          icon: "mdi:account-group",
          color: "#4CAF50",
        });
        labelId = result.label_id;
        this._logSetup(`  Label "${labelName}" erstellt`, "success");
      } catch (err) {
        try {
          const labels = await this._hass.callWS({ type: "config/label_registry/list" });
          const existing = labels.find((l) => l.name === labelName);
          if (existing) {
            labelId = existing.label_id;
            this._logSetup(`  Label "${labelName}" existiert bereits`, "info");
          }
        } catch (e) {
          this._logSetup("  Label-System nicht verfuegbar", "info");
        }
      }

      if (labelId) {
        try {
          const entityReg = await this._hass.callWS({ type: "config/entity_registry/list" });
          let labeled = 0;

          for (const cid of allCreatedIds) {
            let entry;
            if (cid.startsWith("automation:")) {
              const uniqueId = cid.replace("automation:", "");
              entry = entityReg.find((e) => e.unique_id === uniqueId);
            } else {
              entry = entityReg.find((e) => e.entity_id === cid);
            }

            if (entry) {
              const currentLabels = entry.labels || [];
              if (!currentLabels.includes(labelId)) {
                await this._hass.callWS({
                  type: "config/entity_registry/update",
                  entity_id: entry.entity_id,
                  labels: [...currentLabels, labelId],
                });
                labeled++;
              }
            }
          }

          this._logSetup(`  ${labeled} Entitaeten mit Label gruppiert`, "success");
        } catch (err) {
          this._logSetup(`  Gruppierung fehlgeschlagen: ${err.message || err}`, "info");
        }
      }
    }

    if (ok) {
      this._config.doors = doors;
      const modeSelect = this.querySelector("#yesterday_mode");
      if (modeSelect) modeSelect.value = "entities";
      this._config.yesterday_mode = "entities";
      this._updateConfig();
      this._renderDoorsSetup();
      this._logSetup("Fertig! Alle Entitaeten und Automationen eingerichtet.", "success");
    } else {
      this._logSetup("Einrichtung mit Fehlern. Bitte oben pruefen.", "error");
    }

    btn.disabled = false;
    btn.textContent = "Backend einrichten";
  }

  async _runCleanup() {
    const cardSlug = this._slugify(this._getVal("card_title"));
    if (!cardSlug) {
      this._logSetup("Bitte Kartentitel eingeben!", "error");
      return;
    }

    const btn = this.querySelector("#cleanup_btn");
    const log = this.querySelector("#setup_log");
    if (log) log.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "Wird entfernt...";

    const doorsToClean = (this._config.doors || []).length > 0
      ? this._config.doors
      : this._setupDoors.filter((d) => d.name).map((d) => ({ name: d.name }));

    for (const door of doorsToClean) {
      const doorSlug = this._slugify(door.name);
      if (!doorSlug) continue;

      this._logSetup(`=== Tuer: ${door.name} ===`);

      const helpers = [
        { domain: "counter", id: `counter.${cardSlug}_${doorSlug}_kommen_heute` },
        { domain: "counter", id: `counter.${cardSlug}_${doorSlug}_gehen_heute` },
        { domain: "input_number", id: `input_number.${cardSlug}_${doorSlug}_kommen_gestern` },
        { domain: "input_number", id: `input_number.${cardSlug}_${doorSlug}_gehen_gestern` },
      ];

      for (const h of helpers) {
        if (!this._hass.states[h.id]) {
          this._logSetup(`  ${h.id} nicht vorhanden`, "info");
          continue;
        }
        try {
          await this._hass.callWS({ type: `${h.domain}/delete`, entity_id: h.id });
          this._logSetup(`  ${h.id} entfernt`, "success");
        } catch (err) {
          this._logSetup(`  Fehler: ${err.message || err}`, "error");
        }
      }

      const autoIds = [
        `pz_${cardSlug}_${doorSlug}_kommen`,
        `pz_${cardSlug}_${doorSlug}_gehen`,
      ];
      for (const aId of autoIds) {
        try {
          await this._hass.callApi("DELETE", `config/automation/config/${aId}`);
          this._logSetup(`  Automation ${aId} entfernt`, "success");
        } catch (err) {
          const msg = err.message || String(err);
          if (msg.includes("not found") || msg.includes("404")) {
            this._logSetup(`  Automation nicht vorhanden`, "info");
          } else {
            this._logSetup(`  Fehler: ${msg}`, "error");
          }
        }
      }
    }

    this._logSetup("=== Tageswechsel-Automation ===");
    try {
      await this._hass.callApi("DELETE", `config/automation/config/pz_${cardSlug}_tageswechsel`);
      this._logSetup("  Tageswechsel-Automation entfernt", "success");
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes("not found") || msg.includes("404")) {
        this._logSetup("  Nicht vorhanden", "info");
      } else {
        this._logSetup(`  Fehler: ${msg}`, "error");
      }
    }

    this._logSetup("=== Label entfernen ===");
    const cardTitle = this._getVal("card_title").trim();
    const labelName = `${cardTitle} (automatic)`;
    try {
      const labels = await this._hass.callWS({ type: "config/label_registry/list" });
      const existing = labels.find((l) => l.name === labelName);
      if (existing) {
        await this._hass.callWS({
          type: "config/label_registry/delete",
          label_id: existing.label_id,
        });
        this._logSetup(`  Label "${labelName}" entfernt`, "success");
      } else {
        this._logSetup("  Label nicht vorhanden", "info");
      }
    } catch (err) {
      this._logSetup(`  Label entfernen: ${err.message || err}`, "info");
    }

    this._config.doors = [];
    this._updateConfig();
    this._renderDoorsSetup();
    this._logSetup("Fertig! Backend-Entitaeten, Automationen und Label entfernt.", "success");

    btn.disabled = false;
    btn.textContent = "Backend entfernen";
  }
}

customElements.define("personenzaehlung-card-editor", PersonenzaehlungCardEditor);

// ============================================================
// LOCALSTORAGE HELPER (Fallback fuer Vortagswerte)
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
    }

    data.currentDay = todayKey;
    data.todayKommen = kommen;
    data.todayGehen = gehen;
    if (!data.yesterday) data.yesterday = null;
    this._setData(data);
  }

  getYesterday() {
    const data = this._getData();
    if (!data || !data.yesterday) return { kommen: null, gehen: null };
    if (data.yesterday.date === this._yesterdayKey()) {
      return { kommen: data.yesterday.kommen, gehen: data.yesterday.gehen };
    }
    return { kommen: null, gehen: null };
  }
}

// ============================================================
// HAUPTKARTE (Multi-Door, Build-Once / Update-Only)
// ============================================================
class PersonenzaehlungCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._lastTotalKommen = null;
    this._lastTotalGehen = null;
    this._storages = [];
    this._domBuilt = false;
    this._els = {};
  }

  static getConfigElement() {
    return document.createElement("personenzaehlung-card-editor");
  }

  static getStubConfig() {
    return {
      card_title: "Gebaeude",
      card_subtitle: "Personen",
      net_label: "Aktuell im Gebaeude",
      yesterday_mode: "localstorage",
      show_yesterday: true,
      show_comparison: true,
      show_net: true,
      show_door_details: true,
      auto_balance: false,
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
      doors: [],
    };
  }

  set hass(hass) {
    const oldHass = this._hass;
    this._hass = hass;
    if (!this._config) return;

    const doors = this._config.doors || [];
    const relevantEntities = doors
      .flatMap((d) => [
        d.entity_kommen,
        d.entity_gehen,
        d.entity_yesterday_kommen,
        d.entity_yesterday_gehen,
      ])
      .filter(Boolean);

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

    if (!this._domBuilt) this._buildDOM();
    this._updateValues();
  }

  setConfig(config) {
    if (!config) throw new Error("Ungueltige Konfiguration");

    let doors = config.doors;
    if (!doors && config.entity_kommen) {
      doors = [
        {
          name: config.card_title || "Eingang",
          entity_kommen: config.entity_kommen,
          entity_gehen: config.entity_gehen || "",
          entity_yesterday_kommen: config.entity_yesterday_kommen || "",
          entity_yesterday_gehen: config.entity_yesterday_gehen || "",
        },
      ];
    }

    this._config = {
      card_title: "Gebaeude",
      card_subtitle: "Personen",
      net_label: "Aktuell im Gebaeude",
      yesterday_mode: "localstorage",
      show_yesterday: true,
      show_comparison: true,
      show_net: true,
      show_door_details: true,
      auto_balance: false,
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
      doors: doors || [],
    };

    this._storages = (this._config.doors || []).map((door) => {
      const sid = (
        (door.entity_kommen || "def") +
        "_" +
        (door.entity_gehen || "def")
      ).replace(/[^a-zA-Z0-9_]/g, "_");
      return new PersonenStorage(sid);
    });

    this._domBuilt = false;
    if (this._hass) {
      this._buildDOM();
      this._updateValues();
    }
  }

  _getEntityValue(entityId) {
    if (!entityId || !this._hass || !this._hass.states[entityId]) return 0;
    const val = parseFloat(this._hass.states[entityId].state);
    return isNaN(val) ? 0 : val;
  }

  _getTrendIcon(current, previous) {
    if (previous === null || previous === undefined)
      return { icon: "\u2014", cls: "neutral" };
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
    return `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`;
  }

  _buildDOM() {
    const c = this._config;
    const doors = c.doors || [];
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
    const modeLabel = c.yesterday_mode === "entities" ? "HA-Helper" : "auto";
    const showDetails = c.show_door_details && doors.length > 1;

    const doorDetailsHTML = showDetails
      ? `
        <div class="door-details" data-id="door-details">
          <div class="section-label" style="opacity:0.4;">Einzelne Tueren</div>
          ${doors
            .map(
              (door, i) => `
            <div class="door-detail-row">
              <span class="door-detail-name">${door.name || "Tuer " + (i + 1)}</span>
              <span class="door-detail-values">
                <span style="color:${c.color_kommen}"><svg viewBox="0 0 24 24" fill="${c.color_kommen}" width="16" height="16" style="vertical-align:middle;margin-right:2px;"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg> <span data-id="door-${i}-k">0</span></span>
                <span style="color:${c.color_gehen}"><svg viewBox="0 0 24 24" fill="${c.color_gehen}" width="16" height="16" style="vertical-align:middle;margin-right:2px;"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg> <span data-id="door-${i}-g">0</span></span>
              </span>
            </div>`
            )
            .join("")}
        </div>`
      : "";

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
          font-weight: 600; display: flex; align-items: center; gap: 8px;
          margin-bottom: 4px;
        }
        .card-subtitle {
          font-size: ${Math.max(c.font_size_title - 3, 11)}px;
          opacity: 0.7; display: flex; align-items: center; gap: 6px;
        }
        .card-subtitle svg { width: 16px; height: 16px; vertical-align: middle; }
        .section-label {
          font-size: 13px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.8px;
          opacity: 0.6; margin-bottom: 10px;
          display: flex; align-items: center; gap: 6px;
        }
        .section-label .dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: ${c.color_kommen}; animation: pulse 2s infinite;
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
          transition: transform 0.2s, box-shadow 0.2s; cursor: default;
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
          font-variant-numeric: tabular-nums; transition: color 0.3s;
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
          font-weight: 700; font-variant-numeric: tabular-nums; transition: color 0.3s;
        }
        .net-positive { color: ${c.color_kommen}; }
        .net-negative { color: ${c.color_gehen}; }
        .net-zero { opacity: 0.5; }
        /* Door details */
        .door-details {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 12px; margin-bottom: 16px;
        }
        .door-detail-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 12px; border-radius: 6px; margin-bottom: 4px;
          background: rgba(255,255,255,0.03);
        }
        .door-detail-name {
          font-size: 13px; font-weight: 500; opacity: 0.8;
        }
        .door-detail-values {
          display: flex; gap: 16px; align-items: center;
          font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums;
        }
        .door-detail-values svg {
          width: 18px; height: 18px; vertical-align: middle;
        }
        /* Yesterday */
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
        .yesterday-value.gehen { color: ${c.color_gehen}; }
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
        }
        .no-data-hint {
          text-align: center; font-size: 12px; opacity: 0.4;
          padding: 8px; font-style: italic;
        }
        .no-doors-hint {
          text-align: center; font-size: 13px; opacity: 0.5;
          padding: 20px; font-style: italic;
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
              <svg viewBox="0 0 24 24" fill="currentColor" opacity="0.7"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              <span data-id="subtitle">${c.card_subtitle}</span>
              ${doors.length > 1 ? `<span style="opacity:0.5; font-size:11px;">(${doors.length} Tueren)</span>` : ""}
            </div>
          </div>
          ${doors.length === 0 ? '<div class="no-doors-hint">Keine Tueren konfiguriert.<br/>Bitte im Editor Tueren hinzufuegen und einrichten.</div>' : `
          <div class="section-label">
            <span class="dot"></span>
            Heute \u2014 ${todayStr}
          </div>
          <div class="counters-grid">
            <div class="counter-box">
              <div class="counter-icon"><svg viewBox="0 0 24 24" fill="${c.color_kommen}"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg></div>
              <div class="counter-label">Kommen${doors.length > 1 ? " (Gesamt)" : ""}</div>
              <div class="counter-value kommen" data-id="val-kommen">0</div>
              <div class="counter-trend" data-id="trend-kommen"></div>
            </div>
            <div class="counter-box">
              <div class="counter-icon"><svg viewBox="0 0 24 24" fill="${c.color_gehen}"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg></div>
              <div class="counter-label">Gehen${doors.length > 1 ? " (Gesamt)" : ""}</div>
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
          ${doorDetailsHTML}
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
          `}
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
    if (el && el.textContent !== String(text)) el.textContent = text;
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
    const doors = c.doors || [];
    if (doors.length === 0) return;

    let totalKommen = 0;
    let totalGehen = 0;
    let totalYKommen = 0;
    let totalYGehen = 0;
    let hasYData = false;

    for (let i = 0; i < doors.length; i++) {
      const door = doors[i];
      const rawKommen = this._getEntityValue(door.entity_kommen);
      const rawGehen = this._getEntityValue(door.entity_gehen);

      // Korrektur: Netto pro Tuer nie negativ
      let dk = rawKommen;
      let dg = rawGehen;
      if (c.auto_balance && dg > dk) {
        dk = dg;
      }

      totalKommen += dk;
      totalGehen += dg;

      let yk = null;
      let yg = null;
      if (c.yesterday_mode === "entities") {
        let rawYK = door.entity_yesterday_kommen
          ? this._getEntityValue(door.entity_yesterday_kommen)
          : null;
        let rawYG = door.entity_yesterday_gehen
          ? this._getEntityValue(door.entity_yesterday_gehen)
          : null;

        // gleiche Korrektur auch fuer Vortag zur Anzeige
        if (c.auto_balance && rawYK !== null && rawYG !== null && rawYG > rawYK) {
          rawYK = rawYG;
        }
        yk = rawYK;
        yg = rawYG;
      } else if (this._storages[i]) {
        this._storages[i].update(dk, dg);
        const y = this._storages[i].getYesterday();
        yk = y.kommen;
        yg = y.gehen;
      }

      if (yk !== null) {
        totalYKommen += yk;
        hasYData = true;
      }
      if (yg !== null) {
        totalYGehen += yg;
        hasYData = true;
      }

      this._setText(`door-${i}-k`, dk);
      this._setText(`door-${i}-g`, dg);
    }

    const net = totalKommen - totalGehen;

    const kommenChanged =
      this._lastTotalKommen !== null && this._lastTotalKommen !== totalKommen;
    const gehenChanged =
      this._lastTotalGehen !== null && this._lastTotalGehen !== totalGehen;

    this._setText("val-kommen", totalKommen);
    this._setText("val-gehen", totalGehen);

    if (c.animate_change && kommenChanged) this._triggerAnimation("val-kommen");
    if (c.animate_change && gehenChanged) this._triggerAnimation("val-gehen");

    this._lastTotalKommen = totalKommen;
    this._lastTotalGehen = totalGehen;

    const yKommen = hasYData ? totalYKommen : null;
    const yGehen = hasYData ? totalYGehen : null;

    const trendK = this._getTrendIcon(totalKommen, yKommen);
    const trendG = this._getTrendIcon(totalGehen, yGehen);
    const pctK = this._getPercentChange(totalKommen, yKommen);
    const pctG = this._getPercentChange(totalGehen, yGehen);

    if (c.show_comparison && yKommen !== null) {
      this._setHTML(
        "trend-kommen",
        `<span class="trend-icon ${trendK.cls}">${trendK.icon}</span><span>${pctK} vs. gestern</span>`
      );
    } else {
      this._setHTML("trend-kommen", "");
    }

    if (c.show_comparison && yGehen !== null) {
      this._setHTML(
        "trend-gehen",
        `<span class="trend-icon ${trendG.cls}">${trendG.icon}</span><span>${pctG} vs. gestern</span>`
      );
    } else {
      this._setHTML("trend-gehen", "");
    }

    this._toggleHidden("net-section", !c.show_net);
    if (c.show_net) {
      const netEl = this._els["val-net"];
      if (netEl) {
        netEl.textContent = (net > 0 ? "+" : "") + net;
        netEl.className =
          "net-value " +
          (net > 0 ? "net-positive" : net < 0 ? "net-negative" : "net-zero");
      }
    }

    this._toggleHidden("yesterday-section", !c.show_yesterday);
    if (c.show_yesterday) {
      this._toggleHidden("yesterday-content", !hasYData);
      this._toggleHidden("no-data-hint", hasYData);

      if (hasYData) {
        this._setText("val-y-kommen", yKommen !== null ? yKommen : "\u2013");
        this._setText("val-y-gehen", yGehen !== null ? yGehen : "\u2013");

        const showCmp = c.show_comparison && yKommen !== null;
        this._toggleHidden("comparison-row", !showCmp);
        if (showCmp) {
          const ik = this._els["cmp-icon-k"];
          const ig = this._els["cmp-icon-g"];
          if (ik) {
            ik.className = `trend-icon ${trendK.cls}`;
            ik.textContent = trendK.icon;
          }
          if (ig) {
            ig.className = `trend-icon ${trendG.cls}`;
            ig.textContent = trendG.icon;
          }
          this._setText("cmp-text-k", `Kommen: ${pctK}`);
          this._setText("cmp-text-g", `Gehen: ${pctG}`);
        }
      } else {
        const hint = this._els["no-data-hint"];
        if (hint) {
          hint.innerHTML =
            c.yesterday_mode === "localstorage"
              ? "Noch keine Vortageswerte vorhanden.<br/>Daten werden nach dem ersten Tageswechsel angezeigt."
              : "Noch keine Vortageswerte vorhanden.<br/>Bitte Backend einrichten.";
        }
      }
    }
  }

  getCardSize() {
    let size = 3;
    if (this._config?.show_net) size += 1;
    if (this._config?.show_door_details && (this._config?.doors?.length || 0) > 1) size += 1;
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
    "Personen-Kommen/Gehen mit mehreren Tueren, Vortagsvergleich und automatischem Backend-Setup (MDT Bewegungsmelder).",
  preview: true,
  documentationURL: "",
});

console.info(
  `%c PERSONENZAEHLUNG CARD %c v${CARD_VERSION} (multi-door) `,
  "color: white; background: #4caf50; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;",
  "color: white; background: #333; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;"
);

// Self-contained Home Assistant card. No external dependencies or optimistic level updates.
class ParmairSpeedCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._busy = false;
    this._error = "";
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;height:100%}
        ha-card{padding:16px;box-sizing:border-box;border-radius:16px;color:var(--primary-text-color);background:var(--ha-card-background,var(--card-background-color));border:1px solid var(--divider-color);box-shadow:none}
        .top,.speed,.actions,.meta{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .title{margin:0;font-size:17px;font-weight:700;line-height:1.4}
        .sub,.note,.meta{color:var(--secondary-text-color);font-size:12px;line-height:1.5}
        .sub{margin-top:3px}.badge{font-size:11px;font-weight:600;border-radius:20px;padding:4px 9px;white-space:nowrap;background:rgba(245,158,11,.13);color:var(--warning-color,#c47b00)}
        .badge.good{background:rgba(22,163,74,.14);color:var(--success-color,#16a34a)}
        .speed{margin:18px 0 10px;font-size:14px}.value{font-size:23px;font-weight:750;line-height:1}
        .bar{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px}
        .segment{height:12px;border-radius:8px;background:var(--divider-color)}.segment.active{background:#16a34a}
        button{font:inherit;color:inherit;cursor:pointer;border:1px solid var(--divider-color);background:transparent;border-radius:24px;min-height:44px;padding:8px 16px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:600}
        button:hover:not(:disabled){background:rgba(22,163,74,.1);border-color:#16a34a}button:focus-visible{outline:3px solid var(--primary-color);outline-offset:2px}button:disabled{opacity:.4;cursor:not-allowed}
        .sign{font-size:21px;font-weight:400;line-height:1}.meta{margin-top:12px;flex-wrap:wrap;gap:4px 12px}.note{margin:10px 0 0}.error{color:var(--error-color,#db4437)}
        @media(max-width:380px){ha-card{padding:14px}.top{align-items:flex-start}.badge{font-size:10px}.title{font-size:16px}button{padding:8px 12px}.value{font-size:21px}}
      </style>
      <ha-card>
        <div class="top"><div><h2 class="title">Parmair ventilation</h2><div class="sub">Power-based level estimate</div></div><span class="badge"></span></div>
        <div class="speed"><span>Fan speed <small>(estimate)</small></span><span class="value" aria-live="polite"></span></div>
        <div class="bar" role="img" aria-label="Estimated fan level"><span class="segment"></span><span class="segment"></span><span class="segment"></span><span class="segment"></span><span class="segment"></span></div>
        <div class="actions"><button class="minus" type="button"><span class="sign" aria-hidden="true">−</span>Slower</button><button class="plus" type="button"><span class="sign" aria-hidden="true">+</span>Faster</button></div>
        <div class="meta"><span class="power"></span><span class="lock"></span></div>
        <p class="note"></p><p class="error note" role="alert" hidden></p>
      </ha-card>`;
    this.shadowRoot.querySelector(".minus").addEventListener("click", () => this._press(-1));
    this.shadowRoot.querySelector(".plus").addEventListener("click", () => this._press(1));
  }

  setConfig(config) {
    const required = [
      "entity",
      "power_entity",
      "mean_entity",
      "online_entity",
      "enable_entity",
      "minus_entity",
      "plus_entity",
    ];
    for (const key of required) {
      if (typeof config[key] !== "string" || !config[key].includes(".")) {
        throw new Error(`Missing entity: ${key}`);
      }
    }
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  static model(hass, config) {
    const state = (key) => hass.states[config[key]]?.state;
    const numeric = (s) =>
      typeof s === "string" && s.trim() !== "" && Number.isFinite(Number(s));
    const raw = state("power_entity");
    const mean = state("mean_entity");
    const validPower =
      numeric(raw) && numeric(mean) &&
      Number(raw) >= 20 && Number(raw) <= 220 &&
      Number(mean) >= 20 && Number(mean) <= 220;
    const level = validPower && /^[1-5]$/.test(state("entity"))
      ? Number(state("entity"))
      : null;

    return {
      level,
      raw: numeric(raw) ? Number(raw) : null,
      online: state("online_entity") === "on",
      enabled: state("enable_entity") === "on",
      // A never-pressed button can be "unknown" and still accept a press.
      minusAvailable: ![undefined, "unavailable"].includes(state("minus_entity")),
      plusAvailable: ![undefined, "unavailable"].includes(state("plus_entity")),
    };
  }

  _render() {
    if (!this._hass || !this._config) return;
    const m = ParmairSpeedCard.model(this._hass, this._config);
    const q = (selector) => this.shadowRoot.querySelector(selector);
    q(".title").textContent = this._config.title || "Parmair ventilation";
    q(".value").textContent = m.level === null ? "— / 5" : `${m.level} / 5`;
    q(".badge").textContent = !m.online ? "Controller offline" : m.level === null ? "Level unknown" : "Level estimated";
    q(".badge").classList.toggle("good", m.online && m.level !== null);
    q(".bar").setAttribute("aria-label", m.level === null ? "Fan level unknown" : `Estimated fan level ${m.level} / 5`);
    this.shadowRoot.querySelectorAll(".segment").forEach((segment, i) => {
      segment.classList.toggle("active", m.level !== null && i < m.level);
    });
    q(".minus").disabled = this._busy || !m.online || !m.enabled || !m.minusAvailable || m.level === 1;
    q(".plus").disabled = this._busy || !m.online || !m.enabled || !m.plusAvailable || m.level === 5;
    q(".power").textContent = m.raw === null ? "Power measurement unavailable" : `Power ${m.raw.toLocaleString("en-GB", { maximumFractionDigits: 1 })} W · mean 20 s`;
    q(".lock").textContent = !m.online ? "No controller connection" : this._busy ? "Sending press…" : m.enabled ? "Control enabled" : "Control locked";
    q(".note").textContent = !m.online ? "Speed control requires a controller connection." : !m.enabled ? "Turn on Enable control below. The level is an estimate; post-heating may distort it." : "Each press changes speed by one step. The estimate updates with a delay; post-heating may distort it.";
    q(".error").hidden = !this._error;
    q(".error").textContent = this._error;
  }

  async _press(direction) {
    if (!this._hass || !this._config || this._busy) return;
    const m = ParmairSpeedCard.model(this._hass, this._config);
    const blocked = direction < 0
      ? !m.minusAvailable || m.level === 1
      : !m.plusAvailable || m.level === 5;
    if (!m.online || !m.enabled || blocked) return;
    this._busy = true;
    this._error = "";
    this._render();
    try {
      await this._hass.callService("button", "press", {
        entity_id: direction < 0 ? this._config.minus_entity : this._config.plus_entity,
      });
    } catch {
      this._error = "Failed to send the press. Check the connection and try again.";
    } finally {
      // Throttle only; never increment the measured level optimistically.
      setTimeout(() => {
        this._busy = false;
        this._render();
      }, 750);
    }
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return { columns: "full", rows: "auto", min_columns: 6 };
  }
}

if (!customElements.get("parmair-speed-card")) {
  customElements.define("parmair-speed-card", ParmairSpeedCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "parmair-speed-card",
    name: "Parmair ventilation",
    description: "Five level segments and button control that respects the control lock.",
  });
}

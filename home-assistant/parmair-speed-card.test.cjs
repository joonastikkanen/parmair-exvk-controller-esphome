const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function fixture(overrides = {}) {
  const elements = new Map();
  const timers = [];
  let Card;
  const context = {
    HTMLElement: class {},
    window: {},
    customElements: { get: () => undefined, define: (_name, cls) => { Card = cls; } },
    setTimeout: (fn) => timers.push(fn),
  };
  vm.runInNewContext(fs.readFileSync(`${__dirname}/parmair-speed-card.js`, "utf8"), context);
  const config = { entity: "sensor.level", power_entity: "sensor.power", mean_entity: "sensor.mean", online_entity: "binary_sensor.online", enable_entity: "switch.enable", minus_entity: "button.minus", plus_entity: "button.plus" };
  const values = { "sensor.level": "3", "sensor.power": "107", "sensor.mean": "107", "binary_sensor.online": "on", "switch.enable": "on", "button.minus": "unknown", "button.plus": "unknown", ...overrides };
  const calls = [];
  const hass = { states: Object.fromEntries(Object.entries(values).map(([key, state]) => [key, { state }])), callService: async (...args) => { calls.push(args); } };
  const card = Object.create(Card.prototype);
  Object.assign(card, { _config: config, _hass: hass, _busy: false, _error: "" });
  Object.defineProperty(card, "shadowRoot", { value: {
    querySelector: (selector) => {
      if (!elements.has(selector)) elements.set(selector, { textContent: "", disabled: false, classList: { toggle() {} }, setAttribute() {} });
      return elements.get(selector);
    },
    querySelectorAll: () => Array.from({ length: 5 }, () => ({ classList: { toggle() {} } })),
  } });
  return { card, Card, config, hass, calls, timers, elements };
}

test("all five measured levels and unknown/invalid power", () => {
  for (const [level, power] of [[1, 36], [2, 91], [3, 107], [4, 122], [5, 160]]) {
    const f = fixture({ "sensor.level": String(level), "sensor.power": String(power), "sensor.mean": String(power) });
    assert.equal(f.Card.model(f.hass, f.config).level, level);
  }
  for (const power of ["unknown", "unavailable", "", "NaN", "723", "19.9"]) {
    const f = fixture({ "sensor.power": power });
    assert.equal(f.Card.model(f.hass, f.config).level, null);
    const mean = fixture({ "sensor.mean": power });
    assert.equal(mean.Card.model(mean.hass, mean.config).level, null);
  }
  for (const level of ["Unknown", "unknown", "0", "6", "3.5"]) {
    const f = fixture({ "sensor.level": level });
    assert.equal(f.Card.model(f.hass, f.config).level, null);
  }
});

test("render uses the measured level and respects the lock", () => {
  const f = fixture({ "switch.enable": "off" });
  f.card._render();
  assert.equal(f.elements.get(".value").textContent, "3 / 5");
  assert.equal(f.elements.get(".minus").disabled, true);
  assert.equal(f.elements.get(".plus").disabled, true);
  f.hass.states["sensor.power"].state = "723";
  f.card._render();
  assert.equal(f.elements.get(".value").textContent, "— / 5");
  assert.equal(f.elements.get(".badge").textContent, "Level unknown");
});

test("locked, offline, unavailable, and boundary commands never call services", async () => {
  for (const [overrides, direction] of [[{ "switch.enable": "off" }, 1], [{ "binary_sensor.online": "off" }, -1], [{ "button.plus": "unavailable" }, 1], [{ "sensor.level": "1", "sensor.power": "36", "sensor.mean": "36" }, -1], [{ "sensor.level": "5", "sensor.power": "160", "sensor.mean": "160" }, 1]]) {
    const f = fixture(overrides);
    await f.card._press(direction);
    assert.equal(f.calls.length, 0);
  }
});

test("press sends one correct command, throttles, never invents a new level", async () => {
  const f = fixture();
  await f.card._press(-1);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0][0], "button");
  assert.equal(f.calls[0][1], "press");
  assert.equal(f.calls[0][2].entity_id, "button.minus");
  await f.card._press(1);
  assert.equal(f.calls.length, 1);
  assert.equal(f.hass.states["sensor.level"].state, "3");
  f.timers.shift()();
  await f.card._press(1);
  assert.equal(f.calls[1][2].entity_id, "button.plus");
});

test("failed calls expose an error and release the throttle", async () => {
  const f = fixture();
  f.hass.callService = async () => { throw new Error("offline"); };
  await f.card._press(1);
  assert.match(f.card._error, /Failed to send/);
  f.timers.shift()();
  assert.equal(f.card._busy, false);
});

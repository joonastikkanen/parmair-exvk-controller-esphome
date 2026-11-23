# Building the dashboard

This dashboard connects to Home Assistant; it is not a UI mockup. The card
shows a power-based fan-level estimate and sends one short ESPHome button
press at a time. It does not automatically set a target speed.

## 1. Prerequisites and entity IDs

Install the [ESPHome controller](getting-started.md) and [power sensors](power-sensor.md)
first. Replace the example IDs with your actual entity IDs if HA assigns different ones.

| Purpose | Example entity |
|---|---|
| Estimated level | `sensor.parmair_detected_fan_level` |
| Shelly raw power (W) | `sensor.shelly_plug_s_g3_ilmanvaihtokone_power` |
| Mean power | `sensor.parmair_power_mean_20s` |
| Controller connection | `binary_sensor.parmair_yhteys` |
| Control enable | `switch.parmair_painikeohjaus_sallittu` |
| Minus / plus | `button.parmair_nopeus_miinus` / `button.parmair_nopeus_plus` |
| House | `button.parmair_talopainike` |
| Unit power 0/1 press | `button.parmair_virta_0_1` |
| ESP32 restart | `button.parmair_ilmanvaihtokone_kaynnista_ohjain_uudelleen` |

The Finnish words in existing entity IDs are retained for compatibility.

## 2. Install the JavaScript card

1. Copy [`parmair-speed-card.js`](../home-assistant/parmair-speed-card.js) to
   `/config/www/parmair-speed-card.js` in Home Assistant. Create `www` if needed.
   Do not copy the file into the ESPHome directory.
2. Open **Settings → Dashboards → Resources** (the exact path depends on HA's
   version; enable advanced mode in your profile if needed).
3. Add a resource:

   ```text
   URL: /local/parmair-speed-card.js?v=1
   Type: JavaScript module
   ```

4. Fully refresh the browser. In the mobile app, clear the frontend cache if needed.
5. For updates, replace the JS file and increment the version in the same
   resource URL (`?v=2`, etc.). Do not register the card twice.

The card needs no Mushroom, card-mod, button-card, or other custom cards.
It uses HA theme colors and styles scoped to its Shadow DOM.

If an existing installation uses an inline module encoded in its resource
URL, edit that resource when switching to a file-based resource rather than
keeping both versions registered.

## 3. Add a card to the existing utility-room view

1. Back up the dashboard's raw configuration.
2. Edit the utility-room view and choose **Add card → Manual**.
3. Paste [`parmair-speed-card.yaml`](../home-assistant/parmair-speed-card.yaml).
4. Check all seven entity IDs, save, and leave edit mode.
5. Add an enable switch below the card. Without enabling control, the speed
   buttons remain locked after boot:

   ```yaml
   type: tile
   entity: switch.parmair_painikeohjaus_sallittu
   name: Enable control
   icon: mdi:shield-lock-outline
   tap_action:
     action: toggle
   icon_tap_action:
     action: toggle
   ```

`title` is optional and defaults to `Parmair ventilation`. `grid_options`
controls the sections-view layout, not the ventilation unit.

## 4. Alternative: complete example view

[`dashboard-view.yaml`](../home-assistant/dashboard-view.yaml) includes the
ventilation card, enable switch, connection status, house and power buttons,
diagnostics, and ESP32 restart.

- This file is **one view**, not a complete dashboard or an HA package.
- In the raw configuration editor, add its contents as a new item under the
  existing `views:` list. Indent the whole view under its `-` marker. Do not
  replace the entire dashboard with this file.
- If `path: kodinhoitohuone` already exists, add only the required cards to
  its `sections` list. Preserve lights and other existing cards.
- A new separate dashboard needs at least a `views:` list containing this
  view. Its URL identifier must contain a hyphen, for example `dashboard-parmair`.
- The other cards in this example are built into HA.

The template does not automatically add this home's private room sensors,
lights, or other devices. Add your own entities separately.

## 5. Display and button behavior

- A valid estimate appears as `3 / 5` with three green segments.
- Missing measurements or power outside 20–220 W display `— / 5`.
  This **does not mean the unit has stopped**; its actual state is not confirmed.
- Speed buttons are blocked when the ESP32 is offline, control is not ON,
  the button entity is missing/unavailable, or a command is in progress.
- Slower is disabled at level 1 and faster at level 5. Manual control remains
  possible at an unknown level if connection and enable conditions are met.
- A press does not optimistically change the displayed level. The display
  follows the sensor with the 20-second averaging delay; delay alone does
  not indicate a failed command.
- The local 750 ms throttle does not block other browsers or automations.
  ESPHome provides the shared pulse lock.
- Power 0/1 simulates the original unit button. ESP32 restart is a separate
  action. Both request confirmation in the example view.
- Visibility conditions are UI features, not access controls. The ESPHome
  enable switch also blocks presses originating outside the dashboard.

## Troubleshooting

| Problem | Check |
|---|---|
| `Custom element doesn't exist: parmair-speed-card` | Resource URL, module type, browser cache |
| No displayed level | Both power values are numeric and in range; level sensor state |
| Frozen estimate | Power-meter updates; retaining the last sample does not guarantee freshness |
| Disabled buttons | Connection, enable switch, boundary level 1/5 |
| Button service not found | Entity exists and uses the button domain |
| Old JS still displayed | Increment the resource URL version and reload |

## MCP workflow

1. Read the current dashboard, resource list, and actual entities.
2. Register JS as a module or update the existing resource using its current ID.
3. Read the current dashboard config hash and patch only the ventilation
   section. Do not replace other views.
4. Verify the saved configuration and rendering at phone and desktop widths.
5. Test commands with mock services unless physical button presses are
   separately authorized. Installing the dashboard does not require a real press.

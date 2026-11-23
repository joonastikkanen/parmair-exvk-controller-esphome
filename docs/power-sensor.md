# Shelly power measurement and fan-level estimation

Configure this in **Home Assistant**, not ESPHome. The sensor reports an
estimated level 1–5 or the string `Unknown`. It does not control the unit.

## 1. Check the source

Connect the meter using HA's Shelly integration and check:

```text
sensor.shelly_plug_s_g3_ilmanvaihtokone_power
```

It must measure the whole unit's **instantaneous power in watts (W)**.
Do not use voltage, current, or cumulative energy (kWh). For energy consumption,
use Shelly's energy sensor or a suitable Riemann-sum integration helper
separately; this project's mean sensor does not calculate kWh.

If your power entity has another ID, replace **all** source references in
the package and the dashboard's `power_entity`. Use the same source in both.

## 2. Choose one installation method

### A. New installation: complete YAML package

1. Back up the existing HA configuration.
2. Copy [`parmair-power.yaml`](../home-assistant/parmair-power.yaml) to
   `/config/packages/parmair-power.yaml`.
3. If packages are not enabled, add the following key to your existing
   `homeassistant:` block. Do not create a duplicate root block:

   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```

   If you already use another package structure, follow it without changing
   existing includes.
4. Run HA's configuration check under **Developer tools → YAML**.
5. The first platform-style statistics sensor requires an HA restart.
   Plan for this to briefly interrupt other integrations and automations.
   Restarting the ESP32 does not reload HA configuration.
6. Check `sensor.parmair_power_mean_20s` and
   `sensor.parmair_detected_fan_level`. If an entity already exists, HA may
   add a suffix; correct references before continuing.

### B. Mean as a UI helper

1. Open **Settings → Devices & services → Helpers → Create helper → Statistics**.
2. Name: `Parmair power mean 20s`; source: the Shelly power entity above.
3. Characteristic: **mean**; maximum age: **20 seconds**; keep last sample:
   **yes**; precision: **2 decimal places**.
4. Do not limit the sample count below the samples needed for 20 seconds.
   If the UI permits, leave the count limit empty and limit by age only.
5. Check/set its entity ID to `sensor.parmair_power_mean_20s`.
6. Install **only the `template:` section** from the package in a package
   file, or append it to your existing `template:` list. Do not also install
   the `sensor:` statistics block.
7. Check configuration and call `template.reload` from the YAML tools.
   Enabling package includes for the first time requires an HA restart first.

The template needs custom `attributes`, so the complete definition is provided
in YAML. HA may generate the UI helper's internal unique ID; these references
use its visible **entity_id** instead.

> **Do not install the full package alongside existing equivalent sensors.**
> If a mean helper and template already exist, update them instead of creating
> duplicates. The complete package is intended for a new installation.

## 3. Calibration and boundaries

Starting readings for levels 1–5: **36 / 91 / 107 / 122 / 160 W**.
Boundaries are the midpoints between adjacent readings.

| Estimated level | 20 s mean |
|---|---|
| 1 | 20 ≤ P < 63.5 W |
| 2 | 63.5 ≤ P < 99 W |
| 3 | 99 ≤ P < 114.5 W |
| 4 | 114.5 ≤ P < 141 W |
| 5 | 141 ≤ P ≤ 220 W |
| Unknown | Raw power or mean is missing or outside 20–220 W |

To calibrate your unit:

1. Select a speed on the original controller and confirm it on its display.
2. Wait for speed and power to stabilize and the 20-second window to update.
3. Record multiple readings at each level, not just one value.
4. Establish the heater's effect. Do not disable the unit's protections to measure it.
5. Adjust the template's four boundaries and test values just below and at
   each boundary. An exact boundary selects the higher level.
6. If needed, update the 20–220 W validity limits in **both** the template
   and card JS. The card checks the range independently.

## 4. Verification and limitations

- With these boundaries, 107 W gives level 3, 160 W level 5, and 723 W Unknown.
- Both inputs use `is_number`. HA's `unknown`/`unavailable` states are not
  accidentally converted to zero and level 1.
- `keep_last_sample: true` retains the last sample after it ages out. This
  does not guarantee freshness if a meter freezes in a numeric state. No
  separate freshness monitoring is implemented here.
- `mean` is an arithmetic sample mean, not a time-weighted mean. Samples
  within the window and the meter's update interval affect the result.
- During speed changes, the mean can briefly pass through the wrong level's
  range. There is no hysteresis or automatic target-speed regulation.
- Readings above 220 W are rejected, but partial heating below 220 W can
  still resemble a plausible wrong level. These boundaries do not reliably
  identify heater operation.

Do not use this estimate as a safety function or reliable on/off feedback.
For later template-only changes, configuration checking and `template.reload`
are usually sufficient; `homeassistant.reload_custom_templates` and an ESP32
restart are not the appropriate reload operations.

## Installing through MCP

Tool names depend on the server. The workflow used here was:

1. Read the current source and look for existing sensors before creating any.
2. Create the statistics helper through its config flow using the settings above.
3. Verify its final entity ID before adding the template.
4. Read the existing `template` list. Add the sensor with a scoped YAML
   change, preserving other sensors; review the preview diff and confirm.
5. Test using HA's Jinja engine, check HA configuration, call `template.reload`,
   and read the states of both sensors.

Do not use ESPHome's `update_config` tool on HA's `configuration.yaml`.

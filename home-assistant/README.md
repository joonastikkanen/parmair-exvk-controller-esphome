# Home Assistant files

These files do not belong in ESPHome Device Builder.

| File | Installation location / purpose |
|---|---|
| `parmair-power.yaml` | HA package: statistics mean and template level estimate |
| `parmair-speed-card.js` | Lovelace module, for example under `/config/www/` |
| `parmair-speed-card.yaml` | Single Lovelace card configuration |
| `dashboard-view.yaml` | One view for the dashboard's `views:` list |
| `parmair-speed-card.test.cjs` | Local mock tests for the card |

## Guides

- [Power-sensor installation and calibration](../docs/power-sensor.md)
- [Dashboard installation and usage](../docs/dashboard.md)
- [Complete project installation](../docs/getting-started.md)

The mean can be created as a UI helper and the template as YAML. Do not install
the complete power package alongside existing equivalent sensors. MCP resource
or configuration IDs are not needed for a new installation. Example Finnish
entity IDs are retained for compatibility and are not credentials.

## Testing

Use Node.js's built-in test runner; no npm dependencies are needed:

```sh
node --test home-assistant/parmair-speed-card.test.cjs
```

Tests use mock states and service calls only. They do not connect to Home
Assistant or press real buttons. Also check layout, keyboard access, and
theme colors in a browser.

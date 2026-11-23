# Installation from scratch

## 1. Hardware and software

- Seeed Studio **XIAO ESP32-C3**, its Wi-Fi antenna, and a USB data cable.
- A safe, isolated USB supply capable of handling ESP32 Wi-Fi current peaks.
- For the installed supply arrangement: a **12 V to 5 V buck converter**
  suitable for the measured input voltage and ESP32 Wi-Fi current peaks,
  with appropriate input protection and insulated mounting. Verify that the
  Parmair source can supply the additional load.
- Suitable wires, insulation, strain relief, a multimeter, and an oscilloscope
  if needed to check the signals.
- Home Assistant and the ESPHome Device Builder app, or a local ESPHome installation.
- A local 2.4 GHz Wi-Fi network.
- Shelly Plug S G3 or a comparable HA-connected **power meter reporting W**.
  Select a meter suitable for the unit's electrical load and installation
  environment. Fixed mains wiring requires a qualified electrician.

This repository specifically targets the XIAO ESP32-C3. D-labels on other
ESP32-C3 boards do not necessarily correspond to the same GPIO numbers.

## 2. Identify and measure the controller first

Read the complete [wiring guide](wiring.md). Do not open the unit's 230 V
electrical compartment for this modification. Do not bypass its protections.

1. Switch off the unit, disconnect the wall controller, and verify it is de-energized.
2. Identify the five-conductor keypad ribbon. Establish and photograph your
   own numbering direction before measuring. The original annotated numbering
   photo has been removed; do not infer pin order from wire colors.
3. Measure resistance with the ribbon carefully disconnected from the PCB.
   Pressed contact pairs should match the [recorded measurements](measurements.md).
   Never measure continuity or resistance on an energized circuit.
4. Verify common ground on your own PCB. Pin 5 on this unit was later
   confirmed as common ground by the owner; a photo alone cannot verify yours.
5. Check each signal's polarity, voltage relative to ground, pull-down current,
   and any scanning behavior using suitable instruments. Confirm safe low
   voltage and isolation from mains before taking energized measurements.
6. Resolve power-off and back-powering behavior. If the requirements for direct
   GPIO control are not met, stop and use a suitable external driver or isolation.

## 3. Prepare ESPHome

Initially keep the **XIAO disconnected from all Parmair signals**.

1. Copy `esphome/parmair-controller.yaml` into Device Builder as a new
   `parmair-controller.yaml` device. Do not overwrite another device's settings.
2. Copy `esphome/secrets.example.yaml` to a local `secrets.yaml`, or add its
   keys to Device Builder's shared secrets file.
3. Fill in the SSID, Wi-Fi password, fallback network password (at least eight
   characters), and API encryption key. The key must be 32 random bytes in base64:

   ```sh
   python -c 'import base64,secrets; print(base64.b64encode(secrets.token_bytes(32)).decode())'
   ```

4. Check the board is `seeed_xiao_esp32c3` and the framework is `esp-idf`.
5. Run **Validate** in Device Builder, or locally:

   ```sh
   esphome config esphome/parmair-controller.yaml
   esphome compile esphome/parmair-controller.yaml
   ```

6. Connect the XIAO using a USB data cable. Install the first firmware over USB
   using Device Builder's Install workflow or a suitable ESPHome Web workflow.
   Subsequent updates can use OTA.
7. Attach the antenna and check the logs for Wi-Fi, API, and NTP connectivity.

Check the pinout against [Seeed's documentation](https://wiki.seeedstudio.com/XIAO_ESP32C3_Getting_Started/).
This project avoids boot-strapping pins such as GPIO2/8/9 for button control.

## 4. Connect to Home Assistant and verify entities

Add the discovered ESPHome device under **Settings → Devices & services**.
Enter its IP address and the API encryption key if requested.

Verify that four control buttons, a control-enable switch, a restart button,
and NTP/Wi-Fi diagnostics are available.

**Entity IDs may differ from the examples.** HA assigns them during initial
setup and can retain them after display-name changes. Check the actual IDs
in the entity settings and adapt the dashboard YAML accordingly. English UI
labels do not rename existing Finnish entity IDs automatically. If you rename
an existing entity ID, update every dashboard and automation that uses it.

## 5. Test and wire the hardware

1. Test outputs while disconnected from the unit. Control starts disabled.
   OFF means high impedance: a released, disconnected GPIO can float. Any test
   load must be known and compatible with 3.3 V logic.
2. Verify that an enabled button press generates a 200 ms LOW pulse. The
   shared script rejects overlapping commands and leaves a 200 ms recovery gap.
3. Check boot/reset and Wi-Fi loss. Software cannot guarantee pulse duration
   during a lockup and does not replace electrical protection.
4. Wire everything with **both devices de-energized**. Start with GPIO3 in
   parallel with the minus button, plus common ground. Do not connect unknown points.
5. Test the original button and the HA button. Add the other three signals
   only after one channel operates reliably.
6. Provide insulation, strain relief, and secure mounting. Do not pinch the
   ribbon or wires when closing the case. Leave space for the antenna.

The owner's [PCB, XIAO, and enclosure photos](../photos/README.md#current-build)
show the physical layout. The installed supply uses a **12 V to 5 V buck
converter**. After disconnected USB bench tests, follow the [power wiring
and checks](wiring.md#power-supply): verify the source and polarity, set/check
the output at 5 V before connection, and connect the converter output directly
to the XIAO's **5V and GND pins**, not through USB-C. Never connect 12 V to
the XIAO or 5 V to its 3V3/GPIO pins.
Do not connect external buck power and USB power simultaneously unless a
suitable verified power-selection/backfeed-protection arrangement is present.

Do not test by cutting only ESP32 power while the unit's signals remain
connected until suitable back-power protection has been implemented.

## 6. Set up power sensors and the dashboard

1. Connect the Shelly through its Home Assistant integration and verify power in W.
2. Install the [power package and calibrate the levels](power-sensor.md).
3. Install the [dashboard card and view](dashboard.md).
4. Enable control only when you want to use the buttons. Allow approximately
   20 seconds after a speed change before interpreting the averaged level.

## Acceptance checklist

- [ ] All four original buttons work and the unit's own protections remain intact.
- [ ] Disabling control blocks HA presses; resetting the ESP32 restores the lock.
- [ ] One command produces one short press, not a continuous pull-down.
- [ ] Control and status recover predictably after Wi-Fi loss.
- [ ] Shelly power and estimated level match individually tested speeds.
- [ ] Missing measurements or out-of-range power produce Unknown.
- [ ] Power and restart controls request confirmation on the dashboard.
- [ ] Power-supply and back-power protections are implemented, not just documented.

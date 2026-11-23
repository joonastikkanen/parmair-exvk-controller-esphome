# Recorded measurements

These results apply to this particular unit. They are owner-reported
measurements or interpretations of photos, not a universal Parmair pinout.

## Keypad

The ribbon has five conductors. Numbering 1–5 was recorded from left to right
in the viewing direction of an earlier annotated photo. That photo is no
longer in the repository. Establish the viewing direction on your own hardware;
do not treat left-to-right order in the remaining photos as confirmed numbering.
The old photo's handwritten `+`/`−` annotations were not used as wiring data.

Resistance was measured with the keypad ribbon **disconnected from the PCB**:

| Button | Pins | Pressed | Released |
|---|---|---:|---|
| Minus | 1–5 | Approximately 20 Ω | Reported open circuit |
| Plus | 2–5 | Approximately 20 Ω | Reported open circuit |
| House | 3–5 | Approximately 20 Ω | Reported open circuit |
| Power 0/1 | 4–5 | Approximately 30 Ω | Reported open circuit |

Approximately 3 V released and 0.5 V pressed were reported across the minus
button. Detailed voltage, current, and scanning measurements for every channel
are not recorded here. The owner later confirmed the buttons' connection to
PCB ground. Current wiring relies on that confirmation; neither a photo nor
a 3 V difference between two wires proves direct GPIO compatibility.

Approximately 11.82 V was previously measured on the controller. The owner
confirmed that the installed build uses a 12 V to 5 V buck converter to power
the XIAO. The exact tap points, available current, converter model, and
protection specifications are not recorded here; verify them on your own unit.

## Fan levels and electrical power

The owner's screenshots, ordered from level 1 to 5, showed these instantaneous readings:

| Level | Screenshot reading | Boundary to the next level (midpoint) |
|---|---:|---:|
| 1 | 36 W | 63.5 W |
| 2 | 91 W | 99 W |
| 3 | 107 W | 114.5 W |
| 4 | 122 W | 141 W |
| 5 | 160 W | – |

Source: `sensor.shelly_plug_s_g3_ilmanvaihtokone_power`.
These are calibration starting points, not statistically established ranges.
Heater operation and transitional readings during speed changes can confuse
detection. [Calibrate again](power-sensor.md) for your own unit.

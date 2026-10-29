# Imperial to Metric Converter
Plugin to convert measurements between imperial and metric.

## Usage:
Use the command palette, right click menu or select text and run commands.

### Examples:
- Convert a simple value: select `12 ft` and run "Convert selection" → `3.66 m` (default 2 decimals)
- Foot symbol: select `5'` → converts to `1.52 m`
- Hyphenated measurements: select `90-foot` → converts to `27.43 m`
- Temperatures: select `32 °F` → converts to `0.00 °C`; `100 °C` → `212.00 °F`
- Spelled-out units: select `12 inches` → converts to `30.48 cm`
- Mixed units: select `5 ft 3 in` → converts to `1.60 m`
- Compact mixed units: `6'3"` → `1.91 m`; `5 ft 30 in` → `2.29 m`
- Ranges: select `10-15 ft` → converts to `3.05 m-4.57 m`
- Ton variants: `5 short tons` → `4535.92 kg`; `1 long ton` → `1016.05 kg`
- Multiple values in a sentence: select `The board is 5 ft long and 2 in thick.` → converts both values in place
- Fractions: select `1 1/2 in` → converts to `3.81 cm`
- Insert original + converted: select `12 ft` and run "Insert original + converted" → `12 ft (3.66 m)`
- Auto-convert on paste: choose whether to paste the original with its conversion (`5 ft (1.52 m)`) or only the conversion (`1.52 m`)
- Liquid measures: `1 cup`, `1 fl oz`, `1 qt`, `1 tbsp`, and `1 tsp` use the selected US customary or UK / Imperial definition; qualifiers such as `(US)`, `(UK)`, and `(Imperial)` explicitly select one

## Features:
### Conversion
- Convert selection: replaces
- Insert original + converted: inserts `original (converted)` so you can keep both.
- Input: prompts for a value and lets you choose Auto (convert to the opposite detected system), Metric, US customary, or UK / Imperial; display the result or insert it at the current editor selection. Auto uses the default target if detection fails.
- Default hotkeys: `Mod+Shift+M` converts the selection; `Mod+Alt+Shift+M` keeps the original and adds the conversion; `Mod+Alt+A/M/I` opens the Auto, Metric, or Imperial input command.
- Rounding: choose Fixed decimals (default), Practical precision based on the output unit, or Whole units in settings.
- Practical precision uses unit-appropriate precision—for example, whole millimeters and grams, one decimal for centimeters and milliliters, and two decimals for meters and kilograms.
<img src="https://github.com/p0shkar/ImperialToMetric-for-Obsidian/blob/main/.github/Convert.gif" alt="Convert">

### Hover Preview
- Toggle: inline hover preview to show converted values on mouseover in the editor or Read mode.
- Default hotkey: `Mod+Shift+H` toggles hover previews.
- Enable/Disable commands reflect whether hover preview and auto-convert on paste are currently on.
- Different decimal settings: you can configure how many decimals the converted value will be and set a different number of decimals that the hover preview will show.
- Hover previews follow the selected rounding mode; Fixed decimals uses the hover decimal setting.
<img src="https://github.com/p0shkar/ImperialToMetric-for-Obsidian/blob/main/.github/Hover.gif" alt="Hover">

### Auto-Convert on Paste
- Toggle: auto-convert pasted measurements into the active editor (opt-in setting).
- Default hotkey: `Mod+Shift+P` toggles auto-convert on paste.
- Paste output format: select `Original + converted` to keep both values or `Converted only` to replace the pasted text with its conversion.
<img src="https://github.com/p0shkar/ImperialToMetric-for-Obsidian/blob/main/.github/Paste.gif" alt="Auto-Convert on Paste">

#### Supported units (aliases recognized):
- Length (imperial): `in`, `ft`, `yd`, `mi` and many spelled forms and localized names (inch, inches, foot, feet, pulgada, zoll, etc.)
- Length (metric): `mm`, `cm`, `m`, `km` and spelled forms (meter, metre, metro, etc.)
- Mass (imperial): `oz`, `lb`, `st`, `ton` (configurable short/metric ton), `short ton`, `long ton`
- Mass (metric): `g`, `kg`, `t` (tonne)
- Volume: `cup`, `fl oz`, `tsp`, `tbsp`, `gill`, `pt`, `qt`, `gal`, `ml`, `l` - US customary or UK definitions are selectable
- Temperature: `C`, `°C`, `Celsius`, `F`, `°F`, `Fahrenheit`

Liquid conversion factors (milliliters per unit):

| Unit | US Customary | UK / Imperial |
| --- | ---: | ---: |
| Cup | 236.588 | 284.131 |
| Fluid ounce | 29.574 | 28.413 |
| Teaspoon | 4.929 | 4.736 |
| Tablespoon | 14.787 | 17.758 |
| Gill | 118.294 | 142.065 |
| Pint | 473.176 | 568.261 |
| Quart | 946.353 | 1136.523 |
| Gallon | 3785.412 | 4546.090 |

UK cup and spoon factors are fixed plugin values and may differ from recipe conventions. Explicit `(US)`, `(UK)`, or `(Imperial)` input qualifiers override the liquid measure setting.

### Settings
- Define the default measurement system (Metric, US customary, or UK / Imperial)
- Specify number of decimals when converting and when hovering
- Choose Fixed decimals, Practical precision by output unit, or Whole units rounding; practical precision uses whole mm/g, one decimal for cm/ml, and two decimals for m/kg
- Choose a custom inline hover background color or reset to the Obsidian theme default
- Choose US customary or UK / Imperial liquid measure definitions for cups, fluid ounces, spoons, gills, pints, quarts, and gallons
- Define preferred units of measurements or set it to auto to let the plugin decide
- Toggle Inline Hover and Auto-Convert on Paste settings.
<img src="https://github.com/p0shkar/ImperialToMetric-for-Obsidian/blob/main/.github/Settings.png" alt="Settings">

## Known limitations
- Parsing relies on heuristics and regexes; some complex or ambiguous text may not be parsed correctly.
- Localization: unit aliases include several common translations but are not exhaustive.
- Liquid measure definitions follow the selected US/UK preference, with explicit `(US)`, `(UK)`, or `(Imperial)` qualifiers available for input. UK cup and spoon measures are fixed plugin values and may differ from recipe-specific conventions.

## What's New
### 0.1.2
- New: Default hotkeys are available for conversion, input, and toggle commands. Customize them in Obsidian's Hotkeys settings.
- New: Choose Fixed decimals, Practical precision by output unit, or Whole units rounding.
- Fix: Hover previews now work over measurements in Read mode as well as the editor.
- Fix: Hover previews now work over measurements in callouts in the editor as well as Read mode.
- New: Hyphenated measurements such as `90-foot` are now supported.
- Improvement: Updated code dependencies.
- Improvement: Code refactoring

### 0.1.1
- New: Support for converting a wide range of measurement types, such as temperatures.
- New: Parsing of mixed and compound values, such as fractional values, mixed expressions and ranges.
- Fix: Multiple values in a single sentence now converts seperatly on hover.
- New: Automatic recognition of common unit aliases and spellings, such as "inches" and '.
- New: Explicit liquid qualifiers like (US), (UK), and (Imperial), such as "1 gallon (US)" or "1 gallon (UK)".
- New: Selectable background color for the hover feature to increase readability across different themes
- New: Added tests (for use during development)
- New: Added some right click menu choices and command palette commands
- Improvement: Better handling of ambiguous or mixed-unit conversions
- Improvement: More flexible output formatting for inserted conversions
- Improvement: More precise control over decimal precision for both conversions and hover previews
- Improvement: Improved support for configurable default system preferences and measurement settings
- Improvement: Renamed some command palette commands to be more consistent across the plugin
- Improvement: Improved toggle settings in the command palette to update based on its current state
- Improvement: Improved settings menu with Topics/Grouped settings and more
- Improvement: "Convert Input": Added buttons to insert the converted value, and not only output it as it did previously
- Improvement: "Convert Input": Added a drop-list to be able to select what you want to convert into; Auto/Metric/Imperial

## To Do
Please add suggestions for future features or updates as issues in GitHub or send me a message there.

## Install from the Obsidian Community Plugin store
1. Open Obsidian.
2. Go to Settings -> Community plugins.
3. Make sure Safe Mode is off.
4. Click Browse.
5. Search for "Imperial to Metric Converter".
6. Click Install, then Enable.
7. Open the plugin settings and configure your preferences.

## Caveat
I'm not a developer, therefore this plugin and its current implementation are largely vibe coded. The feature set is functional, but the codebase may still contain rough edges, assumptions, and areas that need cleanup or hardening.

## Contributing
Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Contact
Oskar Norén - [p0shkar](https://github.com/p0shkar)

Project Link - [ImperialToMetric-for-Obsidian](https://github.com/p0shkar/ImperialToMetric-for-Obsidian)

## Support
Support me with liquid energy:

<a href="https://www.buymeacoffee.com/p0shkar" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" ></a>
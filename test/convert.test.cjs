const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const { buildSync } = require('esbuild');

function loadTypeScript(entryPoint){
  const filename = path.resolve(__dirname, entryPoint);
  const { outputFiles } = buildSync({
    entryPoints: [filename],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(outputFiles[0].text, filename);
  return loaded.exports;
}

const converter = loadTypeScript('../src/convert.ts');
const unitAliases = loadTypeScript('../src/unit-aliases.ts');
const hover = loadTypeScript('../src/hover.ts');
const convert = (value, target = 'metric', options = {}) => converter.convertOnce(
  value,
  target,
  options.decimals ?? 2,
  options.metricLength ?? 'auto',
  options.imperialLength ?? 'auto',
  options.imperialMass ?? 'auto',
  options.imperialVolume ?? 'auto',
  options.tonType ?? 'short',
  options.liquidMeasureType ?? 'us',
  options.roundingMode ?? 'fixed-decimals',
  options.customLiquidMeasureFactors ?? {}
);

test('converts simple and fractional measurements', () => {
  assert.equal(convert('12 ft'), '3.66 m');
  assert.equal(convert('1 1/2 in'), '3.81 cm');
  assert.equal(convert('12 inches'), '30.48 cm');
});

test('converts every unit alias listed for each language', () => {
  const expected = {
    in: '2.54 cm', ft: '30.48 cm', yd: '91.44 cm', mi: '1.61 km',
    mm: '1.00 mm', cm: '1.00 cm', m: '1.00 m', km: '1.00 km',
    g: '1.00 g', kg: '1.00 kg', t: '1000.00 kg',
    oz: '28.35 g', lb: '453.59 g', st: '6.35 kg', ton: '907.18 kg',
    'short-ton': '907.18 kg', 'long-ton': '1016.05 kg',
    'fl-oz': '29.57 ml', gal: '3.79 L', qt: '946.35 ml', pt: '473.18 ml',
    cup: '236.59 ml', tbsp: '14.79 ml', tsp: '4.93 ml', gill: '118.29 ml',
    l: '1.00 L', ml: '1.00 ml', c: '1.00 °C', f: '-17.22 °C'
  };
  for (const [language, units] of Object.entries(unitAliases.UNIT_ALIASES_BY_LANGUAGE)){
    for (const [unit, aliases] of Object.entries(units)){
      for (const alias of aliases){
        assert.equal(convert(`1 ${alias}`), expected[unit], `${language} alias "${alias}" (${unit})`);
      }
    }
  }
});

test('matches localized aliases case-insensitively, including accented forms', () => {
  assert.equal(convert('1 MÈTRES'), '1.00 m');
  assert.equal(convert('1 KILOGRAMMES'), '1.00 kg');
  assert.equal(convert('1 PULGADAS'), '2.54 cm');
  assert.equal(convert('1 FUß'), '30.48 cm');
  assert.equal(convert('1 ZOLL'), '2.54 cm');
});

test('localized aliases do not match as substrings inside unrelated words', () => {
  assert.equal(convert('The meterologist arrived.'), null);
  assert.equal(convert('There are 3 metrospheres.'), null);
});

test('language alias groups never assign one spelling to different units', () => {
  const targetsByAlias = new Map();
  for (const [language, units] of Object.entries(unitAliases.UNIT_ALIASES_BY_LANGUAGE)){
    for (const [unit, aliases] of Object.entries(units)){
      for (const alias of aliases){
        const existingTarget = targetsByAlias.get(alias);
        assert.ok(!existingTarget || existingTarget.unit === unit, `${language} alias "${alias}" conflicts with ${existingTarget?.language}`);
        targetsByAlias.set(alias, { language, unit });
      }
    }
  }
});

test('parses negative simple and fractional measurements accurately', () => {
  assert.equal(convert('-12 ft'), '-3.66 m');
  assert.equal(convert('-1/2 in'), '-1.27 cm');
  assert.equal(convert('-1 1/2 in'), '-3.81 cm');
  assert.equal(convert('2 1/4 ft'), '68.58 cm');
  assert.equal(convert('-1 m', 'imperial'), '-1.09 yd');
  assert.equal(convert('-1 kg', 'imperial'), '-2.20 lb');
  assert.equal(convert('-1 l', 'imperial'), '-1.06 qt');
});

test('rejects fractions with a zero denominator', () => {
  assert.equal(convert('1/0 in'), null);
});

test('supports practical precision and whole-unit rounding by output unit', () => {
  assert.equal(convert('1 ft', 'metric', { roundingMode: 'practical-precision' }), '30.5 cm');
  assert.equal(convert('1 lb', 'metric', { roundingMode: 'practical-precision' }), '454 g');
  assert.equal(convert('1 fl oz', 'metric', { roundingMode: 'practical-precision' }), '29.6 ml');
  assert.equal(convert('1 m', 'imperial', { roundingMode: 'practical-precision' }), '1.09 yd');
  assert.equal(convert('100 C', 'imperial', { roundingMode: 'practical-precision' }), '212 °F');
  assert.equal(convert('1 ft', 'metric', { roundingMode: 'whole-units' }), '30 cm');
  assert.equal(convert('1 lb', 'metric', { roundingMode: 'whole-units' }), '454 g');
  assert.equal(convert('1 fl oz', 'metric', { roundingMode: 'whole-units' }), '30 ml');
  assert.equal(convert('1.999 m', 'metric', { metricLength: 'm+cm', roundingMode: 'whole-units' }), '2 m');
  assert.equal(convert('1.9995 m', 'metric', { metricLength: 'm+cm', roundingMode: 'practical-precision' }), '2 m');
  assert.equal(convert('1-2 ft', 'metric', { roundingMode: 'whole-units' }), '30 cm-61 cm');
});

test('converts hyphenated measurements', () => {
  assert.equal(convert('90-foot'), '27.43 m');
  assert.equal(convert('A 90-foot rope.'), 'A 27.43 m rope.');
});

test('preserves punctuation and Markdown around converted values', () => {
  assert.equal(convert('Measure (12 ft), please.'), 'Measure (3.66 m), please.');
  assert.equal(convert('**12 ft**'), '**3.66 m**');
  assert.equal(convert('The `12 ft` board.'), 'The `3.66 m` board.');
});

test('parses comma-separated thousands without dropping digits', () => {
  assert.equal(convert('1,000 ft', 'metric', { metricLength: 'm' }), '304.80 m');
  assert.equal(convert('1,000 lb'), '453.59 kg');
});

test('keeps ambiguous ounce abbreviations dimensionally distinct', () => {
  assert.equal(convert('1 oz'), '28.35 g');
  assert.equal(convert('1 fl oz'), '29.57 ml');
  assert.equal(converter.detectSystemFromText('1 oz'), 'imperial');
  assert.equal(converter.detectSystemFromText('1 fl oz'), 'imperial');
});

test('combines adjacent units and keeps independent sentence measurements separate', () => {
  assert.equal(convert('6\'3"'), '1.91 m');
  assert.equal(convert('5 ft 30 in'), '2.29 m');
  assert.equal(convert('50ft of rope, and 20 yards of yarn.'), '15.24 m of rope, and 18.29 m of yarn.');
});

test('converts range endpoints and preserves surrounding text', () => {
  assert.equal(convert('Range: 10-15 ft wide.'), 'Range: 3.05 m-4.57 m wide.');
  assert.equal(convert('3-5 cm', 'imperial'), '1.18 in-1.97 in');
  assert.equal(convert('Range: -5--2 ft wide.', 'metric', { metricLength: 'm' }), 'Range: -1.52 m--0.61 m wide.');
  assert.equal(convert('Range: -5–-2 ft wide.', 'metric', { metricLength: 'm' }), 'Range: -1.52 m–-0.61 m wide.');
});

test('preserves punctuation around compound measurements', () => {
  assert.equal(convert('Board: (1 1/2 ft 2 in), approximately.'), 'Board: (50.80 cm), approximately.');
  assert.equal(convert('Length [5 ft 3 in]; width [2 ft].'), 'Length [1.60 m]; width [60.96 cm].');
});

test('converts temperatures and identifies their source systems', () => {
  assert.equal(convert('32 °F'), '0.00 °C');
  assert.equal(convert('100 C', 'imperial'), '212.00 °F');
  assert.equal(converter.detectSystemFromText('32 °F'), 'imperial');
  assert.equal(converter.detectSystemFromText('100 °C'), 'metric');
});

test('distinguishes short and long tons', () => {
  assert.equal(convert('5 short tons'), '4535.92 kg');
  assert.equal(convert('1 long ton'), '1016.05 kg');
  assert.equal(converter.detectSystemFromText('1 long ton'), 'imperial');
});

test('applies US and UK liquid preferences and explicit qualifiers', () => {
  assert.equal(convert('1 pint'), '473.18 ml');
  assert.equal(convert('1 pint', 'metric', { liquidMeasureType: 'imperial' }), '568.26 ml');
  assert.equal(convert('1 pint (US)', 'metric', { liquidMeasureType: 'imperial' }), '473.18 ml');
  assert.equal(convert('1 cup', 'metric', { liquidMeasureType: 'imperial' }), '284.13 ml');
  assert.equal(convert('1 fl oz'), '29.57 ml');
  assert.equal(convert('1 qt'), '946.35 ml');
});

test('liquid preferences use the documented factors for all supported units', () => {
  const factors = [
    ['cup', 236.5882365, 284.130625],
    ['fl oz', 29.5735295625, 28.4130625],
    ['tsp', 4.92892159375, 4.73550833333],
    ['tbsp', 14.78676478125, 17.7581640625],
    ['gill', 118.29411825, 142.0653125],
    ['pint', 473.176473, 568.26125],
    ['qt', 946.352946, 1136.5225],
    ['gal', 3785.411784, 4546.09]
  ];
  for (const [unit, usMl, ukMl] of factors){
    const expectedUs = usMl >= 1000 ? `${(usMl / 1000).toFixed(2)} L` : `${usMl.toFixed(2)} ml`;
    assert.equal(convert(`1 ${unit}`, 'metric', { liquidMeasureType: 'us' }), expectedUs, `US ${unit}`);
    const expectedUk = ukMl >= 1000 ? `${(ukMl / 1000).toFixed(2)} L` : `${ukMl.toFixed(2)} ml`;
    assert.equal(convert(`1 ${unit}`, 'metric', { liquidMeasureType: 'imperial' }), expectedUk, `UK ${unit}`);
  }
});

test('custom liquid factors override selected defaults for unqualified input and output', () => {
  const customLiquidMeasureFactors = {
    cup: 250, 'fl-oz': 35, tsp: 6, tbsp: 16, gill: 120, pt: 500, qt: 1000, gal: 4000
  };
  const measures = [
    ['cup', '250.00 ml', '250 ml', '1.00 cup'],
    ['fl oz', '35.00 ml', '35 ml', '1.00 fl oz'],
    ['tsp', '6.00 ml', '6 ml', '1.00 tsp'],
    ['tbsp', '16.00 ml', '16 ml', '1.00 tbsp'],
    ['gill', '120.00 ml', '120 ml', '1.00 gill'],
    ['pint', '500.00 ml', '500 ml', '1.00 pt'],
    ['qt', '1.00 L', '1 L', '1.00 qt'],
    ['gal', '4.00 L', '4 L', '1.00 gal']
  ];
  for (const [unit, expectedMetric, metricInput, expectedImperial] of measures){
    const preferredImperialVolume = unit === 'pint' ? 'pt' : unit;
    assert.equal(convert(`1 ${unit}`, 'metric', { customLiquidMeasureFactors }), expectedMetric, `custom ${unit} input`);
    assert.equal(convert(metricInput, 'imperial', { imperialVolume: preferredImperialVolume, customLiquidMeasureFactors }), expectedImperial, `custom ${unit} output`);
  }
  assert.equal(convert('1 pint', 'metric', { liquidMeasureType: 'imperial', customLiquidMeasureFactors: { cup: 250 } }), '568.26 ml');
  assert.equal(convert('1 cup (US)', 'metric', { liquidMeasureType: 'imperial', customLiquidMeasureFactors }), '236.59 ml');
  assert.equal(convert('1 cup (UK)', 'metric', { customLiquidMeasureFactors }), '284.13 ml');
  assert.equal(convert('1 cup (Imperial)', 'metric', { customLiquidMeasureFactors }), '284.13 ml');
  assert.equal(convert('1-2 cup', 'metric', { customLiquidMeasureFactors }), '250.00 ml-500.00 ml');
});

test('invalid custom liquid factors fall back to the selected convention', () => {
  for (const cup of [0, -250, Number.NaN, Number.POSITIVE_INFINITY, null]){
    assert.equal(convert('1 cup', 'metric', { customLiquidMeasureFactors: { cup } }), '236.59 ml');
  }
});

test('hover resolves compound measurement spans but keeps sentence values distinct', () => {
  const compact = "6'3\"";
  const compactSpan = hover.measurementAtOffset(converter.parseNumberUnit(compact), compact, 2);
  assert.equal(compactSpan, compact);
  assert.equal(convert(compactSpan), '1.91 m');

  const sentence = '50ft of hempen rope, and 20 yards of yarn.';
  const parsed = converter.parseNumberUnit(sentence);
  const firstSpan = hover.measurementAtOffset(parsed, sentence, sentence.indexOf('50ft') + 2);
  const secondSpan = hover.measurementAtOffset(parsed, sentence, sentence.indexOf('yards') + 2);
  assert.equal(firstSpan, '50ft');
  assert.equal(secondSpan, '20 yards');
  assert.equal(convert(firstSpan), '15.24 m');
  assert.equal(convert(secondSpan), '18.29 m');
  assert.equal(hover.measurementAtOffset(parsed, sentence, sentence.indexOf('hempen') + 2), null);
});

test('hovering either endpoint of a range previews the complete range', () => {
  const sentence = 'The rope is 10-15 ft long.';
  const parsed = converter.parseNumberUnit(sentence);
  const rangeStart = sentence.indexOf('10-15 ft');
  const leftEndpoint = hover.measurementAtOffset(parsed, sentence, rangeStart + 1);
  const rightEndpoint = hover.measurementAtOffset(parsed, sentence, rangeStart + 5);

  assert.equal(leftEndpoint, '10-15 ft');
  assert.equal(rightEndpoint, '10-15 ft');
  assert.equal(convert(leftEndpoint), '3.05 m-4.57 m');
  assert.equal(convert(rightEndpoint), '3.05 m-4.57 m');
  assert.equal(hover.measurementAtOffset(parsed, sentence, sentence.indexOf('long')), null);
});

test('resolves automatic and explicit conversion targets', () => {
  assert.equal(converter.resolveTargetSystem('imperial', 'auto', 'imperial'), 'metric');
  assert.equal(converter.resolveTargetSystem('metric', 'auto', 'imperial'), 'imperial');
  assert.equal(converter.resolveTargetSystem(null, 'auto', 'metric'), 'metric');
  assert.equal(converter.resolveTargetSystem('imperial', 'imperial', 'metric'), 'imperial');
});

test('formats auto-converted paste as original plus conversion or converted only', () => {
  assert.equal(converter.formatPasteOutput('20 yards', '18.29 m'), '20 yards (18.29 m)');
  assert.equal(converter.formatPasteOutput('20 yards', '18.29 m', 'converted-only'), '18.29 m');
  assert.equal(converter.formatPasteOutput('  20 yards  ', '  18.29 m  ', 'converted-only'), '18.29 m');
});
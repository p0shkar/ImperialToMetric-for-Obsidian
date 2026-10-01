const IMPERIAL_LENGTH: Record<string, number> = { in: 0.0254, ft:0.3048, yd:0.9144, mi:1609.344 };
const METRIC_LENGTH: Record<string, number> = { mm:0.001, cm:0.01, m:1, km:1000 };
const IMPERIAL_MASS: Record<string, number> = { oz:28.349523125, lb:453.59237, st:6350.29318, ton:907184.74 };
const METRIC_MASS: Record<string, number> = { g:1, kg:1000, t:1000000 };
const IMPERIAL_VOLUME_US: Record<string, number> = {
  gal:3.785411784, qt:0.946352946, pt:0.473176473, cup:0.2365882365,
  'fl-oz':0.0295735295625, tbsp:0.01478676478125, tsp:0.00492892159375, gill:0.11829411825
};
const IMPERIAL_VOLUME_UK: Record<string, number> = {
  gal:4.54609, qt:1.1365225, pt:0.56826125, cup:0.284130625,
  'fl-oz':0.0284130625, tbsp:0.0177581640625, tsp:0.00473550833333, gill:0.1420653125
};
const METRIC_VOLUME: Record<string, number> = { ml:0.001, l:1 };
const TON_SHORT = 907184.74;
const TON_METRIC = 1000000;

const UNIT_ALIASES: Record<string, string> = {
  'inch': 'in', 'inches': 'in', 'in': 'in', '"':'in',
  'foot':'ft','feet':'ft','ft':'ft',"'":'ft',
  'yard':'yd','yards':'yd','yd':'yd',
  'mile':'mi','miles':'mi','mi':'mi',
  'meter':'m','meters':'m','metre':'m','metres':'m','m':'m',
  'centimeter':'cm','centimeters':'cm','centimetre':'cm','cm':'cm',
  'millimeter':'mm','millimeters':'mm','mm':'mm',
  'kilometer':'km','kilometers':'km','kilometre':'km','km':'km',
  'pound':'lb','pounds':'lb','lb':'lb','lbs':'lb',
  'ounce':'oz','ounces':'oz','oz':'oz',
  'fluid ounce':'fl-oz','fluid ounces':'fl-oz','fl oz':'fl-oz','fl-oz':'fl-oz','floz':'fl-oz',
  'gallon':'gal','gallons':'gal','gal':'gal',
  'quart':'qt','quarts':'qt','qt':'qt',
  'pint':'pt','pints':'pt','pt':'pt',
  'cup':'cup','cups':'cup',
  'tablespoon':'tbsp','tablespoons':'tbsp','tbsp':'tbsp','tbspn':'tbsp',
  'teaspoon':'tsp','teaspoons':'tsp','tsp':'tsp',
  'gill':'gill','gills':'gill',
  'liter':'l','litre':'l','liters':'l','litres':'l','l':'l',
  'milliliter':'ml','milliliters':'ml','ml':'ml',
  'c':'c','°c':'c','celsius':'c','centigrade':'c',
  'f':'f','°f':'f','fahrenheit':'f'
};

// localized extras
UNIT_ALIASES['metro'] = 'm'; UNIT_ALIASES['metros'] = 'm';
UNIT_ALIASES['litro'] = 'l'; UNIT_ALIASES['litros'] = 'l';
UNIT_ALIASES['litre'] = 'l'; UNIT_ALIASES['litres'] = 'l';
UNIT_ALIASES['gramo'] = 'g'; UNIT_ALIASES['gramos'] = 'g';
UNIT_ALIASES['gramme'] = 'g'; UNIT_ALIASES['grammes'] = 'g';
UNIT_ALIASES['kilogramo'] = 'kg'; UNIT_ALIASES['kilogramos'] = 'kg';
UNIT_ALIASES['kilogramme'] = 'kg'; UNIT_ALIASES['kilogrammes'] = 'kg';
UNIT_ALIASES['pulgada'] = 'in'; UNIT_ALIASES['pulgadas'] = 'in';
UNIT_ALIASES['pouce'] = 'in'; UNIT_ALIASES['pouces'] = 'in';
UNIT_ALIASES['zoll'] = 'in';
UNIT_ALIASES['pie'] = 'ft'; UNIT_ALIASES['pies'] = 'ft'; UNIT_ALIASES['pies_en'] = 'ft';
UNIT_ALIASES['pied'] = 'ft'; UNIT_ALIASES['pieds'] = 'ft';
UNIT_ALIASES['fuß'] = 'ft'; UNIT_ALIASES['fuss'] = 'ft';
UNIT_ALIASES['libra'] = 'lb'; UNIT_ALIASES['libras'] = 'lb';
UNIT_ALIASES['onza'] = 'oz'; UNIT_ALIASES['onzas'] = 'oz';
UNIT_ALIASES['stone'] = 'st'; UNIT_ALIASES['stones'] = 'st';
UNIT_ALIASES['tonne'] = 't'; UNIT_ALIASES['tonnes'] = 't'; UNIT_ALIASES['ton'] = 'ton';
UNIT_ALIASES['short ton'] = 'short-ton'; UNIT_ALIASES['short tons'] = 'short-ton';
UNIT_ALIASES['long ton'] = 'long-ton'; UNIT_ALIASES['long tons'] = 'long-ton';

function normalizeUnit(u: string) { return u.toLowerCase().replace(/\./g, ''); }

const RANGE_REGEX = /(\d[\d,\s\./]*(?:[a-zA-Z°\."']+)?)\s*([–—-])\s*(\d[\d,\s\./]*(?:[a-zA-Z°\."']+)?)/;
const NUMBER_UNIT_RE = /([-+]?\d{1,3}(?:,\d{3})+(?:\.\d+)?|[-+]?\d*\s*\d+\/\d+|[-+]?\d*\.\d+|[-+]?\d+)\s*((?:(?:short|long)\s+tons?|fluid\s+ounces?|fl\s+oz|floz|ounces?|[a-zA-Z°\."']+))(?:\s*\((US|UK|Imperial)\))?/gi;
const FRACTION_RE = /^(?:([-+]?\d+)\s+)?(\d+)\/(\d+)$/;

export function parseNumberString(nstr: string) {
  nstr = nstr.trim();
  const fracMatch = nstr.match(FRACTION_RE);
  if (fracMatch) {
    const whole = parseInt(fracMatch[1] || '0', 10);
    const num = parseInt(fracMatch[2], 10);
    const den = parseInt(fracMatch[3], 10);
    return whole + num/den;
  }
  const n = parseFloat(nstr.replace(/,/g,''));
  if (!isNaN(n)) return n;
  return null;
}

export function parseNumberUnit(text: string): any | null {
  const rangeSep = text.match(RANGE_REGEX);
  if (rangeSep) {
    const rangeRaw = rangeSep[0].replace(/\.$/, '');
    const left = rangeSep[1].replace(/\.$/, '').trim();
    const right = rangeSep[3].replace(/\.$/, '').trim();
    let leftParsed = parseNumberUnit(left);
    let rightParsed = parseNumberUnit(right);
    const inferUnit = (value: string, reference: any) => {
      const number = parseNumberString(value);
      const referenceParts = reference && reference.parts;
      if (number == null || !referenceParts || referenceParts.length !== 1) return null;
      const unit = referenceParts[0].unit;
      return { parts: [{ value: number, unit, raw: `${value} ${unit}`, index: 0 }], raw: `${value} ${unit}` };
    };
    if (!leftParsed) leftParsed = inferUnit(left, rightParsed);
    if (!rightParsed) rightParsed = inferUnit(right, leftParsed);
    if (!leftParsed || !rightParsed) return null;
    const leftOffset = rangeRaw.indexOf(left) + left.length;
    const rightOffset = rangeRaw.lastIndexOf(right);
    return {
      range: [leftParsed, rightParsed],
      raw: rangeRaw,
      index: rangeSep.index,
      join: rangeSep[0].slice(leftOffset, rightOffset)
    } as any;
  }
    const parts: Array<any> = [];
    NUMBER_UNIT_RE.lastIndex = 0;
    let m;
  while ((m = NUMBER_UNIT_RE.exec(text)) !== null) {
    const num = parseNumberString(m[1]);
    if (num == null) continue;
    let u = normalizeUnit(m[2]);
    if (!UNIT_ALIASES[u]) u = u.replace(/s$/,'');
    if (UNIT_ALIASES[u]) u = UNIT_ALIASES[u];
    const qualifier = m[3]?.toLowerCase();
    if (qualifier && (IMPERIAL_VOLUME_US[u] || IMPERIAL_VOLUME_UK[u])) u = `${u}-${qualifier === 'us' ? 'us' : 'imperial'}`;
    const raw = m[2].endsWith('.') && !m[3] ? m[0].slice(0, -1) : m[0];
    parts.push({ value: num, unit: u, raw, index: m.index });
  }
  if (parts.length === 0) return null;
  return { parts, raw: text } as any;
}

export function toBaseVariant(value: number, unit: string, tonType: 'short'|'metric' = 'short', liquidMeasureType: 'us'|'imperial' = 'us') {
  if (unit === 'c') return { cat: 'temperature', base: value };
  if (unit === 'f') return { cat: 'temperature', base: (value - 32) * 5 / 9 };
  if (IMPERIAL_LENGTH[unit]) return { cat: 'length', base: value * IMPERIAL_LENGTH[unit] };
  if (METRIC_LENGTH[unit]) return { cat: 'length', base: value * METRIC_LENGTH[unit] };
  if (IMPERIAL_MASS[unit]) {
    if (unit === 'ton'){
      const v = tonType === 'metric' ? TON_METRIC : TON_SHORT;
      return { cat: 'mass', base: value * v };
    }
    return { cat: 'mass', base: value * IMPERIAL_MASS[unit] };
  }
  if (unit === 'short-ton') return { cat: 'mass', base: value * TON_SHORT };
  if (unit === 'long-ton') return { cat: 'mass', base: value * 1016046.9088 };
  if (METRIC_MASS[unit]) return { cat: 'mass', base: value * METRIC_MASS[unit] };
  if (unit.endsWith('-us')) {
    const liquidUnit = unit.slice(0, -3);
    if (IMPERIAL_VOLUME_US[liquidUnit]) return { cat: 'volume', base: value * IMPERIAL_VOLUME_US[liquidUnit] };
  }
  if (unit.endsWith('-imperial')) {
    const liquidUnit = unit.slice(0, -9);
    if (IMPERIAL_VOLUME_UK[liquidUnit]) return { cat: 'volume', base: value * IMPERIAL_VOLUME_UK[liquidUnit] };
  }
  if (IMPERIAL_VOLUME_US[unit] || IMPERIAL_VOLUME_UK[unit]) {
    const map = liquidMeasureType === 'imperial' ? IMPERIAL_VOLUME_UK : IMPERIAL_VOLUME_US;
    const factor = map[unit] ?? IMPERIAL_VOLUME_US[unit];
    return { cat: 'volume', base: value * factor };
  }
  if (METRIC_VOLUME[unit]) return { cat: 'volume', base: value * METRIC_VOLUME[unit] };
  return null;
}

function formatMetricLengthMixed(meters:number, decimals:number){
  const metersInt = Math.floor(meters);
  const cm = (meters - metersInt) * 100;
  if (metersInt > 0) return `${metersInt} m ${cm.toFixed(decimals)} cm`;
  return `${cm.toFixed(decimals)} cm`;
}

function formatMetricLength(meters:number, decimals:number, preferred:'auto'|'mm'|'cm'|'m'|'km'|'m+cm' = 'auto'){
  if (preferred !== 'auto'){
    switch(preferred){
      case 'km': return `${(meters/1000).toFixed(decimals)} km`;
      case 'm+cm': return formatMetricLengthMixed(meters, decimals);
      case 'm': return `${meters.toFixed(decimals)} m`;
      case 'cm': return `${(meters*100).toFixed(decimals)} cm`;
      case 'mm': return `${(meters*1000).toFixed(decimals)} mm`;
    }
  }
  if (meters >= 1000) return `${(meters/1000).toFixed(decimals)} km`;
  if (meters >= 1) return `${meters.toFixed(decimals)} m`;
  if (meters >= 0.01) return `${(meters*100).toFixed(decimals)} cm`;
  return `${(meters*1000).toFixed(decimals)} mm`;
}

function formatMetricMass(grams:number, decimals:number){ if (grams >= 1000) return `${(grams/1000).toFixed(decimals)} kg`; return `${grams.toFixed(decimals)} g`; }
function formatMetricVolume(liters:number, decimals:number){ if (liters >= 1) return `${liters.toFixed(decimals)} L`; return `${(liters*1000).toFixed(decimals)} ml`; }
function formatImperialLength(meters:number, decimals:number, preferred:'auto'|'in'|'ft'|'yd'|'mi' = 'auto'){
  if (preferred !== 'auto'){
    switch(preferred){
      case 'mi': return `${(meters/1609.344).toFixed(decimals)} mi`;
      case 'yd': return `${(meters/0.9144).toFixed(decimals)} yd`;
      case 'ft': return `${(meters/0.3048).toFixed(decimals)} ft`;
      case 'in': return `${(meters/0.0254).toFixed(decimals)} in`;
    }
  }
  if (meters >= 1609.344) return `${(meters/1609.344).toFixed(decimals)} mi`;
  if (meters >= 0.9144) return `${(meters/0.9144).toFixed(decimals)} yd`;
  if (meters >= 0.3048) return `${(meters/0.3048).toFixed(decimals)} ft`;
  return `${(meters/0.0254).toFixed(decimals)} in`;
}
function formatImperialMass(grams:number, decimals:number, preferred:'auto'|'oz'|'lb'|'st'|'ton' = 'auto', tonType: 'short'|'metric' = 'short'){
  const tonDiv = tonType === 'metric' ? TON_METRIC : TON_SHORT;
  if (preferred !== 'auto'){
    switch(preferred){
      case 'ton': return `${(grams/tonDiv).toFixed(decimals)} ton`;
      case 'st': return `${(grams/6350.29318).toFixed(decimals)} st`;
      case 'lb': return `${(grams/453.59237).toFixed(decimals)} lb`;
      case 'oz': return `${(grams/28.349523125).toFixed(decimals)} oz`;
    }
  }
  if (grams >= tonDiv) return `${(grams/tonDiv).toFixed(decimals)} ton`;
  if (grams >= 6350.29318) return `${(grams/6350.29318).toFixed(decimals)} st`;
  if (grams >= 453.59237) return `${(grams/453.59237).toFixed(decimals)} lb`;
  return `${(grams/28.349523125).toFixed(decimals)} oz`;
}

function formatImperialVolume(liters:number, decimals:number, preferred:'auto'|'cup'|'pt'|'gal'|'qt'|'fl-oz'|'tbsp'|'tsp'|'gill' = 'auto', liquidMeasureType: 'us'|'imperial' = 'us'){
  const map = liquidMeasureType === 'imperial' ? IMPERIAL_VOLUME_UK : IMPERIAL_VOLUME_US;
  const gal = map.gal;
  const qt = map.qt;
  const pt = map.pt;
  const cup = map.cup;
  if (preferred !== 'auto'){
    switch(preferred){
      case 'gal': return `${(liters/gal).toFixed(decimals)} gal`;
      case 'qt': return `${(liters/qt).toFixed(decimals)} qt`;
      case 'pt': return `${(liters/pt).toFixed(decimals)} pt`;
      case 'cup': return `${(liters/cup).toFixed(decimals)} cup`;
      case 'fl-oz': return `${(liters/map['fl-oz']).toFixed(decimals)} fl oz`;
      case 'tbsp': return `${(liters/map.tbsp).toFixed(decimals)} tbsp`;
      case 'tsp': return `${(liters/map.tsp).toFixed(decimals)} tsp`;
      case 'gill': return `${(liters/map.gill).toFixed(decimals)} gill`;
    }
  }
  if (liters >= gal) return `${(liters/gal).toFixed(decimals)} gal`;
  if (liters >= qt) return `${(liters/qt).toFixed(decimals)} qt`;
  if (liters >= pt) return `${(liters/pt).toFixed(decimals)} pt`;
  if (liters >= cup) return `${(liters/cup).toFixed(decimals)} cup`;
  if (liters >= map['fl-oz']) return `${(liters/map['fl-oz']).toFixed(decimals)} fl oz`;
  if (liters >= map.tbsp) return `${(liters/map.tbsp).toFixed(decimals)} tbsp`;
  return `${(liters/map.tsp).toFixed(decimals)} tsp`;
}

export function convertOnce(text: string, toSystem: 'metric'|'imperial', decimals: number, preferredMetricLength: 'auto'|'mm'|'cm'|'m'|'km'|'m+cm' = 'auto', preferredImperialLength: 'auto'|'in'|'ft'|'yd'|'mi' = 'auto', preferredImperialMass: 'auto'|'oz'|'lb'|'st'|'ton' = 'auto', preferredImperialVolume: 'auto'|'cup'|'pt'|'gal'|'qt'|'fl-oz'|'tbsp'|'tsp'|'gill' = 'auto', tonType: 'short'|'metric' = 'short', liquidMeasureType: 'us'|'imperial' = 'us'): string | null {
  const parsed = parseNumberUnit(text);
  if (!parsed) return null;
  if ((parsed as any).range) {
    const leftRaw = (parsed as any).range[0].raw;
    const rightRaw = (parsed as any).range[1].raw;
    const left: string | null = convertOnce(leftRaw, toSystem, decimals, preferredMetricLength, preferredImperialLength, preferredImperialMass, preferredImperialVolume, tonType, liquidMeasureType);
    const right: string | null = convertOnce(rightRaw, toSystem, decimals, preferredMetricLength, preferredImperialLength, preferredImperialMass, preferredImperialVolume, tonType, liquidMeasureType);
    if (!left || !right) return null;
    const start = (parsed as any).index as number;
    const raw = (parsed as any).raw as string;
    return text.slice(0, start) + left + (parsed as any).join + right + text.slice(start + raw.length);
  }
  const parts = (parsed as any).parts as Array<any>;
  if (!parts) return null;
  const groups: Array<{ start: number; end: number; category: string; base: number }> = [];
  for (const part of parts){
    const value = toBaseVariant(part.value, part.unit, tonType, liquidMeasureType);
    if (!value) continue;
    const previous = groups[groups.length - 1];
    const gap = previous ? text.slice(previous.end, part.index) : '';
    if (previous && previous.category === value.cat && value.cat !== 'temperature' && /^\s*$/.test(gap)){
      previous.end = part.index + part.raw.length;
      previous.base += value.base;
    } else {
      groups.push({ start: part.index, end: part.index + part.raw.length, category: value.cat, base: value.base });
    }
  }
  if (groups.length === 0) return null;
  const format = (base: number, category: string) => {
    if (category === 'temperature'){
      const value = toSystem === 'metric' ? base : base * 9 / 5 + 32;
      return `${value.toFixed(decimals)} °${toSystem === 'metric' ? 'C' : 'F'}`;
    }
    if (toSystem === 'metric'){
      if (category === 'length') return formatMetricLength(base, decimals, preferredMetricLength);
      if (category === 'mass') return formatMetricMass(base, decimals);
      if (category === 'volume') return formatMetricVolume(base, decimals);
    } else {
      if (category === 'length') return formatImperialLength(base, decimals, preferredImperialLength);
      if (category === 'mass') return formatImperialMass(base, decimals, preferredImperialMass, tonType);
      if (category === 'volume') return formatImperialVolume(base, decimals, preferredImperialVolume, liquidMeasureType);
    }
    return null;
  };
  let output = text;
  for (const group of groups.reverse()){
    const formatted = format(group.base, group.category);
    if (!formatted) continue;
    output = output.slice(0, group.start) + formatted + output.slice(group.end);
  }
  return output;
}

export function detectSystemFromText(text: string): 'metric'|'imperial'|null{
  const parsed = parseNumberUnit(text);
  if (!parsed) return null;
  const parts = (parsed as any).parts as Array<any> | undefined;
  const firstUnit = parts && parts.length>0 ? parts[0].unit : (parsed as any).raw || null;
  const checkUnit = (u: string|null) => {
    if (!u) return null;
    const liquidUnit = u.replace(/-(us|imperial)$/, '');
    if (u === 'c') return 'metric';
    if (u === 'f') return 'imperial';
    if (METRIC_LENGTH[u] || METRIC_MASS[u] || METRIC_VOLUME[u]) return 'metric';
    if (IMPERIAL_LENGTH[u] || IMPERIAL_MASS[u] || u === 'short-ton' || u === 'long-ton' || IMPERIAL_VOLUME_US[liquidUnit] || IMPERIAL_VOLUME_UK[liquidUnit]) return 'imperial';
    return null;
  };
  if ((parsed as any).range){
    const left = (parsed as any).range[0];
    if (left && left.parts && left.parts.length>0) return checkUnit(left.parts[0].unit);
  }
  return checkUnit(firstUnit || null);
}

export function resolveTargetSystem(detected: 'metric'|'imperial'|null, choice: 'auto'|'metric'|'imperial', fallback: 'metric'|'imperial'): 'metric'|'imperial'{
  if (choice !== 'auto') return choice;
  if (!detected) return fallback;
  return detected === 'imperial' ? 'metric' : 'imperial';
}

export function formatPasteOutput(original: string, converted: string, mode: 'original-and-converted'|'converted-only' = 'original-and-converted'): string{
  if (mode === 'converted-only') return converted.trim();
  return `${original.trim()} (${converted.trim()})`;
}

const IMPERIAL_LENGTH: Record<string, number> = { in: 0.0254, ft:0.3048, yd:0.9144, mi:1609.344 };
const METRIC_LENGTH: Record<string, number> = { mm:0.001, cm:0.01, m:1, km:1000 };
const IMPERIAL_MASS: Record<string, number> = { oz:28.349523125, lb:453.59237, st:6350.29318, ton:907184.74 };
const METRIC_MASS: Record<string, number> = { g:1, kg:1000, t:1000000 };
const IMPERIAL_VOLUME_US: Record<string, number> = { gal:3.785411784, cup:0.2365882365, pt:0.473176473 };
const METRIC_VOLUME: Record<string, number> = { ml:0.001, l:1 };
const TON_SHORT = 907184.74;
const TON_METRIC = 1000000;

const UNIT_ALIASES: Record<string, string> = {
  'inch': 'in', 'inches': 'in', 'in': 'in', '"':'in',
  'foot':'ft','feet':'ft','ft':'ft',
  'yard':'yd','yards':'yd','yd':'yd',
  'mile':'mi','miles':'mi','mi':'mi',
  'meter':'m','meters':'m','metre':'m','metres':'m','m':'m',
  'centimeter':'cm','centimeters':'cm','centimetre':'cm','cm':'cm',
  'millimeter':'mm','millimeters':'mm','mm':'mm',
  'kilometer':'km','kilometers':'km','kilometre':'km','km':'km',
  'pound':'lb','pounds':'lb','lb':'lb','lbs':'lb',
  'ounce':'oz','ounces':'oz','oz':'oz',
  'gallon':'gal','gallons':'gal','gal':'gal',
  'pint':'pt','pints':'pt','pt':'pt',
  'cup':'cup','cups':'cup',
  'liter':'l','litre':'l','liters':'l','litres':'l','l':'l',
  'milliliter':'ml','milliliters':'ml','ml':'ml'
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

function normalizeUnit(u: string) { return u.toLowerCase().replace(/\./g, '').replace(/s$/,''); }

const RANGE_REGEX = /(\d[\d\s\./]*[a-zA-Z\."]?)\s*([–—-])\s*(\d[\d\s\./]*[a-zA-Z\."]?)/;
const NUMBER_UNIT_RE = /([-+]?\d*\s*\d+\/\d+|[-+]?\d*\.\d+|[-+]?\d+)\s*([a-zA-Z\."]+)/g;
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
    const left = rangeSep[1].trim();
    const right = rangeSep[3].trim();
    return { range: [parseNumberUnit(left), parseNumberUnit(right)], raw: text } as any;
  }
    const parts: Array<any> = [];
    NUMBER_UNIT_RE.lastIndex = 0;
    let m;
  while ((m = NUMBER_UNIT_RE.exec(text)) !== null) {
    const num = parseNumberString(m[1]);
    if (num == null) continue;
    let u = normalizeUnit(m[2]);
    if (UNIT_ALIASES[u]) u = UNIT_ALIASES[u];
    parts.push({ value: num, unit: u, raw: m[0] });
  }
  if (parts.length === 0) return null;
  return { parts, raw: text } as any;
}

export function toBaseVariant(value: number, unit: string, tonType: 'short'|'metric' = 'short') {
  if (IMPERIAL_LENGTH[unit]) return { cat: 'length', base: value * IMPERIAL_LENGTH[unit] };
  if (METRIC_LENGTH[unit]) return { cat: 'length', base: value * METRIC_LENGTH[unit] };
  if (IMPERIAL_MASS[unit]) {
    if (unit === 'ton'){
      const v = tonType === 'metric' ? TON_METRIC : TON_SHORT;
      return { cat: 'mass', base: value * v };
    }
    return { cat: 'mass', base: value * IMPERIAL_MASS[unit] };
  }
  if (METRIC_MASS[unit]) return { cat: 'mass', base: value * METRIC_MASS[unit] };
  if (IMPERIAL_VOLUME_US[unit]) return { cat: 'volume', base: value * IMPERIAL_VOLUME_US[unit] };
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
function formatMetricVolume(liters:number, decimals:number){ if (liters >= 1) return `${liters.toFixed(decimals)} L`; return `${(liters*1000).toFixed(decimals)} mL`; }
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

function formatImperialVolume(liters:number, decimals:number, preferred:'auto'|'cup'|'pt'|'gal' = 'auto'){
  const map = IMPERIAL_VOLUME_US;
  const gal = map['gal'];
  const pt = map['pt'];
  const cup = map['cup'];
  if (preferred !== 'auto'){
    switch(preferred){
      case 'gal': return `${(liters/gal).toFixed(decimals)} gal`;
      case 'pt': return `${(liters/pt).toFixed(decimals)} pt`;
      case 'cup': return `${(liters/cup).toFixed(decimals)} cup`;
    }
  }
  if (liters >= gal) return `${(liters/gal).toFixed(decimals)} gal`;
  if (liters >= pt) return `${(liters/pt).toFixed(decimals)} pt`;
  return `${(liters/cup).toFixed(decimals)} cup`;
}

export function convertOnce(text: string, toSystem: 'metric'|'imperial', decimals: number, preferredMetricLength: 'auto'|'mm'|'cm'|'m'|'km'|'m+cm' = 'auto', preferredImperialLength: 'auto'|'in'|'ft'|'yd'|'mi' = 'auto', preferredImperialMass: 'auto'|'oz'|'lb'|'st'|'ton' = 'auto', preferredImperialVolume: 'auto'|'cup'|'pt'|'gal' = 'auto', tonType: 'short'|'metric' = 'short'): string | null {
  const parsed = parseNumberUnit(text);
  if (!parsed) return null;
  if ((parsed as any).range) {
    const sepMatch = text.match(/([–—-])/);
    const sep = sepMatch ? sepMatch[1] : '-';
    const leftRaw = (parsed as any).range[0].raw;
    const rightRaw = (parsed as any).range[1].raw;
    const left: string | null = convertOnce(leftRaw, toSystem, decimals, preferredMetricLength, preferredImperialLength, preferredImperialMass, preferredImperialVolume, tonType);
    const right: string | null = convertOnce(rightRaw, toSystem, decimals, preferredMetricLength, preferredImperialLength, preferredImperialMass, preferredImperialVolume, tonType);
    if (!left || !right) return null;
    return `${left}${sep}${right}`;
  }
  const parts = (parsed as any).parts as Array<any>;
  if (!parts) return null;
  let totalBase = 0;
  let cat: string|null = null;
  for (const p of parts){
    const u = p.unit;
    const b = toBaseVariant(p.value, u, tonType);
    if (!b) return null;
    if (!cat) cat = b.cat; else if (cat !== b.cat) return null;
    totalBase += b.base;
  }
  if (!cat) return null;
  let formatted = null;
  if (toSystem === 'metric'){
    if (cat === 'length') formatted = formatMetricLength(totalBase, decimals, preferredMetricLength as any);
    if (cat === 'mass') formatted = formatMetricMass(totalBase, decimals);
    if (cat === 'volume') formatted = formatMetricVolume(totalBase, decimals);
  } else {
    if (cat === 'length') formatted = formatImperialLength(totalBase, decimals, preferredImperialLength);
    if (cat === 'mass') formatted = formatImperialMass(totalBase, decimals, preferredImperialMass, tonType);
    if (cat === 'volume') formatted = formatImperialVolume(totalBase, decimals, preferredImperialVolume);
  }
  if (!formatted) return null;
  return text.replace((parsed as any).raw, formatted);
}

export function detectSystemFromText(text: string): 'metric'|'imperial'|null{
  const parsed = parseNumberUnit(text);
  if (!parsed) return null;
  const parts = (parsed as any).parts as Array<any> | undefined;
  const firstUnit = parts && parts.length>0 ? parts[0].unit : (parsed as any).raw || null;
  const checkUnit = (u: string|null) => {
    if (!u) return null;
    if (METRIC_LENGTH[u] || METRIC_MASS[u] || METRIC_VOLUME[u]) return 'metric';
    if (IMPERIAL_LENGTH[u] || IMPERIAL_MASS[u] || IMPERIAL_VOLUME_US[u]) return 'imperial';
    return null;
  };
  if ((parsed as any).range){
    const left = (parsed as any).range[0];
    if (left && left.parts && left.parts.length>0) return checkUnit(left.parts[0].unit);
  }
  return checkUnit(firstUnit || null);
}

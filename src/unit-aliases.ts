export const UNIT_ALIASES_BY_LANGUAGE: Record<string, Record<string, string[]>> = {
  English: {
    in: ['inch', 'inches', 'in', '"'],
    ft: ['foot', 'feet', 'ft', "'"],
    yd: ['yard', 'yards', 'yd'],
    mi: ['mile', 'miles', 'mi'],
    mm: ['millimeter', 'millimeters', 'mm'],
    cm: ['centimeter', 'centimeters', 'centimetre', 'centimetres', 'cm'],
    m: ['meter', 'meters', 'metre', 'metres', 'm'],
    km: ['kilometer', 'kilometers', 'kilometre', 'kilometres', 'km'],
    g: ['gram', 'grams', 'g'],
    kg: ['kilogram', 'kilograms', 'kg'],
    t: ['tonne', 'tonnes', 't'],
    oz: ['ounce', 'ounces', 'oz'],
    lb: ['pound', 'pounds', 'lb', 'lbs'],
    st: ['stone', 'stones', 'st'],
    ton: ['ton'],
    'short-ton': ['short ton', 'short tons'],
    'long-ton': ['long ton', 'long tons'],
    'fl-oz': ['fluid ounce', 'fluid ounces', 'fl oz', 'fl-oz', 'floz'],
    gal: ['gallon', 'gallons', 'gal'],
    qt: ['quart', 'quarts', 'qt'],
    pt: ['pint', 'pints', 'pt'],
    cup: ['cup', 'cups'],
    tbsp: ['tablespoon', 'tablespoons', 'tbsp', 'tbspn'],
    tsp: ['teaspoon', 'teaspoons', 'tsp'],
    gill: ['gill', 'gills'],
    l: ['liter', 'liters', 'litre', 'litres', 'l'],
    ml: ['milliliter', 'milliliters', 'millilitre', 'millilitres', 'ml'],
    c: ['c', '°c', 'celsius', 'centigrade'],
    f: ['f', '°f', 'fahrenheit']
  },
  Spanish: {
    m: ['metro', 'metros'],
    l: ['litro', 'litros'],
    g: ['gramo', 'gramos'],
    kg: ['kilogramo', 'kilogramos'],
    in: ['pulgada', 'pulgadas'],
    ft: ['pie', 'pies', 'pies_en'],
    lb: ['libra', 'libras'],
    oz: ['onza', 'onzas']
  },
  French: {
    in: ['pouce', 'pouces'],
    ft: ['pied', 'pieds'],
    m: ['mètre', 'mètres'],
    l: ['litre', 'litres'],
    g: ['gramme', 'grammes'],
    kg: ['kilogramme', 'kilogrammes']
  },
  German: {
    in: ['zoll'],
    ft: ['fuß', 'fuss']
  }
};

export const UNIT_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(UNIT_ALIASES_BY_LANGUAGE).flatMap(([, units]) =>
    Object.entries(units).flatMap(([unit, aliases]) =>
      aliases.map(alias => [alias, unit])
    )
  )
);

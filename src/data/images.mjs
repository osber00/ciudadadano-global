/**
 * MANIFIESTO DE IMÁGENES — "Ciudadano Global"
 * =============================================================================
 *
 * Cada entrada describe UN elemento héroe recortado (no una página completa).
 * La maquetación editorial —mapas, sellos, cinta, clips, chinchetas, rutas,
 * texturas de papel y tipografía— se construye en HTML/SVG, de modo que el
 * recurso sea responsive, interactivo, accesible e imprimible en vectorial.
 *
 * Por eso los prompts piden FONDO TRANSPARENTE: la imagen es una pieza física
 * recortada que se pega sobre la página, exactamente como en un collage real.
 *
 * Uso:
 *   npm run images              -> genera las que falten
 *   npm run images -- --force   -> regenera todas
 *   npm run images -- --only=portada,cierre
 *   npm run images -- --quality=low   (pruebas baratas)
 */

// -----------------------------------------------------------------------------
// PREÁMBULO COMÚN — condensa las secciones 1, 3, 12, 13 y 14 del PROMPT
// e impone las reglas invariantes del sistema visual de la colección.
// -----------------------------------------------------------------------------
export const STYLE_PREAMBLE = `A REAL DOCUMENTARY PHOTOGRAPH, shot on 35mm film with a 50mm lens, natural available light. Photojournalism. Candid, unposed, authentic. This is a photograph, NOT an illustration and NOT a render.

The photograph has been physically CUT OUT with scissors and is presented on a TRANSPARENT BACKGROUND: only the subject remains, with a thin, slightly uneven white paper edge (about 3px) following its silhouette, showing small hand-cut irregularities. Nothing else — no scene background, no page, no canvas, no frame, no shadow plane, no sticker outline, no glow.

TONE: black and white, desaturated, with a subtle warm tint toward cream and ink. Muted, matte, printed-on-paper quality with a fine halftone print grain. Low contrast, soft midtones. NOT vivid, NOT colourful, NOT sepia.

PEOPLE (when present): authentic human diversity — varied skin tones, cultural backgrounds, genders, ages, body types and features. Contemporary everyday clothing. Natural body language and real expressions. No cultural stereotypes, no ethnic costumes, no national flags, no eye contact with the camera unless explicitly requested.

ABSOLUTELY NO TEXT ANYWHERE IN THE IMAGE. No letters, no words, no numbers, no handwriting, no writing, no scribbles resembling script, no signage, no labels, no captions, no watermarks, no logos. Every page, screen, sign, map and notebook visible in the photograph must be COMPLETELY BLANK or too out of focus to read. This rule is absolute and overrides every other instruction.

DO NOT PRODUCE: illustration, drawing, painting, cartoon, anime, 3D render, CGI, plastic or clay look, glossy finish, digital gradients, dramatic or cinematic lighting, studio strobes, neon colours, oversaturation, heavy sepia, vintage filter, generic corporate stock photography, generic Canva aesthetic, borders, vignettes, drop shadows on the background.

Ultra high resolution, ultra detailed, sharp focus on the subject, premium editorial quality.`;

/**
 * Compone el prompt final de una imagen.
 *
 * El sujeto va PRIMERO porque los modelos de imagen ponderan más los tokens
 * iniciales; el preámbulo de estilo actúa después como restricción.
 *
 * El campo `accent` NO se envía al modelo: la silueta desplazada de papel de
 * color se genera en CSS con `mask-image` sobre el propio PNG, lo que da un
 * recorte exacto y permite cambiar el color sin regenerar la imagen.
 *
 * @param {ImageSpec} img
 * @returns {string}
 */
export function buildPrompt(img) {
  const note = img.note ? `\n\nFRAMING AND INTENT: ${img.note}` : '';
  return `${img.subject}${note}\n\n— — —\n\n${STYLE_PREAMBLE}`;
}

/**
 * @typedef {Object} ImageSpec
 * @property {string} id        Nombre de archivo sin extensión.
 * @property {string} page      Página del recurso donde se usa.
 * @property {'portrait'|'square'|'landscape'} shape
 * @property {'teal'|'coral'|'mustard'} accent  Color de la silueta desplazada.
 * @property {string} subject   Elemento héroe concreto.
 * @property {string} [note]    Dirección adicional.
 */

/** @type {ImageSpec[]} */
export const IMAGES = [
  {
    id: 'portada',
    page: '01 · Portada',
    shape: 'square',
    accent: 'coral',
    subject:
      'Six hands of clearly different skin tones reaching up from below and holding a textured globe together. The globe looks like a papier-mâché school globe: muted teal oceans and mustard-ochre continents, matte, slightly worn. Forearms show contemporary clothing — denim jacket cuff, coral knit sweater, grey sweatshirt, a beaded bracelet. Fingers are spread, actively supporting the globe.',
    note:
      'The globe is in full color and is the brightest element; the hands and sleeves are documentary black-and-white slightly warm-tinted. Composition centered, hands entering from the bottom edge.',
  },
  {
    id: 'dedicatoria',
    page: '02 · Dedicatoria',
    shape: 'landscape',
    accent: 'mustard',
    subject:
      'A pair of hands writing with a pen in an open lined notebook resting on a wooden table. Beside the notebook, a folded paper map corner and a simple ceramic cup. The handwriting must be an illegible abstract ink scribble, never readable letters.',
    note: 'Quiet, intimate, top-down three-quarter angle. Only the hands and objects, no face.',
  },
  {
    id: 'presentacion',
    page: '03 · Presentación',
    shape: 'landscape',
    accent: 'teal',
    subject:
      'Four university students of diverse ethnicities lying and leaning around a large world map spread on the floor, smiling and talking. One of them points at a place on the map with an index finger. Two open notebooks and a pen are nearby. They are genuinely engaged in conversation, looking at the map and at each other, not at the camera.',
    note:
      'Horizontal composition. The map is a real printed physical map with visible fold creases and paper texture. Warm candid energy.',
  },
  {
    id: 'como-usar',
    page: '04 · Cómo usar este libro',
    shape: 'square',
    accent: 'mustard',
    subject:
      'A flat-lay of a young person’s hands organising a study desk: an open blank notebook, three coloured markers, a small stack of blank sticky notes, a pair of scissors and a roll of masking tape. One hand is placing a sticky note onto the notebook page.',
    note: 'Top-down flat lay. All notes and pages are blank — absolutely no writing or text.',
  },
  {
    id: 'apertura-intro',
    page: '06 · Apertura de la Introducción',
    shape: 'portrait',
    accent: 'teal',
    subject:
      'A young person seen from behind with a backpack on one shoulder, standing still in a busy international airport terminal, looking up toward a large departures board. Blurred travellers of many backgrounds move around them.',
    note:
      'The departures board must be an abstract blur of light — no readable letters, numbers or city names. Sense of pause and anticipation amid movement.',
  },
  {
    id: 'conectados',
    page: '07 · Nunca antes tan conectados',
    shape: 'landscape',
    accent: 'coral',
    subject:
      'A candid street-level crowd of visibly diverse people crossing a busy urban intersection: students, a woman in a headscarf, an older man, a person with a bicycle, someone with a laptop bag. Several are mid-stride, a couple are talking to each other.',
    note:
      'Documentary street photography, slight motion in the figures. Cut out as a single horizontal band of people, no buildings or sky.',
  },
  {
    id: 'quien-soy',
    page: '08 · ¿Quién soy yo dentro de este mundo?',
    shape: 'portrait',
    accent: 'teal',
    subject:
      'A thoughtful young adult in three-quarter view standing close to a window, their own faint reflection visible in the glass beside them, creating a subtle doubled self-portrait. Calm, introspective expression, looking slightly off-camera.',
    note: 'Quiet and reflective. Soft window light. The reflection is the conceptual key of the image.',
  },
  {
    id: 'primer-paso',
    page: '09 · Atreverse a descubrir',
    shape: 'landscape',
    accent: 'coral',
    subject:
      'Close-up of a pair of worn contemporary sneakers taking a first step forward onto a stone path, photographed from just above ground level. A folded paper map is held loosely in one hand entering from the top of the frame.',
    note: 'Only shoes, lower legs and the hand with the map. Sense of departure and decision.',
  },
  {
    id: 'cap1',
    page: '10 · Apertura del Capítulo 1',
    shape: 'portrait',
    accent: 'coral',
    subject:
      'A young person of ambiguous, mixed heritage in a calm frontal half-portrait, holding a small matte globe at chest height with both hands, looking directly and openly at the viewer. Contemporary clothing.',
    note:
      'The globe is in muted teal and ochre full color; the person is documentary black-and-white warm-tinted. Direct, confident, human gaze.',
  },
  {
    id: 'identidad',
    page: '11 · 1.1 Identidad',
    shape: 'portrait',
    accent: 'teal',
    subject:
      'A young woman standing in front of a wall covered with overlapping pinned photographs and paper notes, turning to look at one of them. The pinned photographs show blurred, unreadable faces and places. Small pins and a length of thread connect a few of them.',
    note:
      'The pinned images must be soft and abstract, with no readable text. She is the sharp focal point.',
  },
  {
    id: 'reflexiona',
    page: '13 · Reflexiona',
    shape: 'square',
    accent: 'mustard',
    subject:
      'An open notebook with completely blank ruled pages resting on a warm wooden desk, a pen lying in the central crease, and a young person\'s hand resting still beside it, not writing. Soft daylight from one side.',
    note:
      'Intimate top-down angle, shallow depth of field. Contemplative and unhurried. The notebook pages are entirely empty.',
  },
  {
    id: 'cultura',
    page: '14 · 1.2 Cultura, el lente',
    shape: 'square',
    accent: 'teal',
    subject:
      'A pair of ordinary contemporary eyeglasses resting on an open printed atlas page, with the lenses acting as small windows that show the map beneath in sharper focus and slightly different tone than the surrounding page.',
    note:
      'Still-life, no people. The map beneath must be an abstract cartographic pattern of coastlines and grid lines with no readable place names.',
  },
  {
    id: 'perspectivas',
    page: '15 · Las gafas invisibles',
    shape: 'landscape',
    accent: 'coral',
    subject:
      'Two young people sitting facing each other across a small café table in the middle of an animated conversation — one is gesturing with open hands while explaining, the other listens attentively leaning forward. They are visibly from different cultural backgrounds.',
    note:
      'The image must communicate active listening and genuine dialogue, not confrontation. Cut out the two figures and the table only.',
  },
  {
    id: 'diversidad',
    page: '16 · 1.3 Diversidad',
    shape: 'landscape',
    accent: 'teal',
    subject:
      'Five young people of different ethnicities, body types and abilities — including one wheelchair user — gathered around a table covered with sketches and sticky notes, mid-collaboration. Two are talking, one is writing, one is laughing.',
    note:
      'Sketches and notes must be abstract shapes and lines, no readable text. Energy of real teamwork.',
  },
  {
    id: 'aula',
    page: '17 · Diversidad en la universidad',
    shape: 'landscape',
    accent: 'mustard',
    subject:
      'A diverse group of university students in a bright lecture room, seen from a low side angle: some taking notes, one raising a hand to speak, others listening and turning toward the speaker.',
    note: 'Notebooks and screens show only abstract marks. Natural classroom candour.',
  },
  {
    id: 'autoconocimiento',
    page: '18 · 1.4 Autoconocimiento',
    shape: 'portrait',
    accent: 'teal',
    subject:
      'A young man sitting alone on a windowsill with knees drawn up, holding a closed notebook against his chest, looking out and slightly downward in calm self-reflection. Soft daylight on one side of his face.',
    note: 'Stillness and honesty. No dramatic lighting.',
  },
  {
    id: 'raices',
    page: '19 · Raíces y apertura',
    shape: 'portrait',
    accent: 'mustard',
    subject:
      'The base of a large old tree where thick roots spread visibly above the ground, with a young person’s hand resting flat on the bark. Fine moss and soil texture are clearly visible.',
    note: 'The roots occupy most of the frame. Tactile, grounded, warm.',
  },
  {
    id: 'laboratorio',
    page: '20 · Laboratorio de Aprendizaje Intercultural',
    shape: 'landscape',
    accent: 'coral',
    subject:
      'An overhead view of a workshop table with several pairs of hands from different people working simultaneously: cutting paper with scissors, drawing with a marker, arranging blank cards, and placing a length of coloured thread across the table.',
    note: 'Top-down. Only hands, arms and materials. All paper is blank — no text.',
  },
  {
    id: 'act-mapa',
    page: '21 · Actividad 1, Mi mapa cultural',
    shape: 'square',
    accent: 'teal',
    subject:
      'A hand drawing a radial mind-map with a marker on a large blank sheet: a circle in the centre with lines branching outward to smaller empty circles. Coloured pencils lie scattered around the sheet.',
    note: 'The mind map is purely graphic — circles and connecting lines, absolutely no words.',
  },
  {
    id: 'act-arbol',
    page: '22 · Actividad 2, El árbol de mi identidad',
    shape: 'portrait',
    accent: 'mustard',
    subject:
      'A photograph of a sheet of cream paper lying on a table, on which someone has drawn a large tree in black ink: visible spreading roots, a solid trunk, branches, leaves and a few round fruits. The drawing is confident but clearly handmade, with visible pen strokes and slight ink bleed into the paper fibres. A pen rests on the corner of the sheet.',
    note:
      'Photograph the drawing straight on, filling the frame. The drawing carries no labels and no words of any kind — only the tree.',
  },
  {
    id: 'act-historia',
    page: '23 · Actividad 3, Mi historia',
    shape: 'landscape',
    accent: 'coral',
    subject:
      'A horizontal strip of small photographs pegged to a taut string with wooden clothespins, like a personal timeline. The photographs show soft, unreadable everyday moments — a child, a school, a landscape, a group of friends.',
    note: 'The photos are deliberately soft and abstract. No dates, no captions, no text.',
  },
  {
    id: 'espejo',
    page: '24 · El espejo intercultural',
    shape: 'portrait',
    accent: 'teal',
    subject:
      'A young person standing in front of a simple rectangular mirror, seen from slightly behind and to the side, so both the back of their head and their reflected face are visible. The reflected expression is serene and searching.',
    note: 'Plain mirror with a thin frame. Intimate and introspective. No background scene.',
  },
  {
    id: 'carta',
    page: '25 · Diario de Reflexión',
    shape: 'square',
    accent: 'coral',
    subject:
      'A sheet of cream paper, already folded in three so that its inner face is completely hidden, being slipped by a hand into an open envelope that rests on a table. A fountain pen lies beside the envelope. The envelope is plain and unaddressed.',
    note:
      'Warm and personal, photographed from above. Nothing written is visible anywhere: the fold conceals the letter and the envelope is blank.',
  },
  {
    id: 'cierre',
    page: '28 · Cierre',
    shape: 'landscape',
    accent: 'teal',
    subject:
      'Many hands of different skin tones reaching in from all edges toward the centre, where their fingertips meet over a large world map laid flat on a table. Fine coloured threads run between several fingertips, connecting distant points on the map.',
    note:
      'Top-down, symmetrical and expansive. The map is a real printed map with fold creases; place names must be unreadable. The threads are muted teal and coral.',
  },
];

/** Dimensiones admitidas por gpt-image-1.5 según la forma. */
export const SHAPE_SIZES = {
  portrait: '1024x1536',
  square: '1024x1024',
  landscape: '1536x1024',
};

/** Índice por id, para acceso rápido. */
export const IMAGES_BY_ID = Object.fromEntries(IMAGES.map((i) => [i.id, i]));

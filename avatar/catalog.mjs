// Single source of truth for everything the avatar can do.
// Used by index.html (to render) and serve.mjs (to validate /cmd). Param ids come from Alexia.cdi3.json.

// Emotions: Ekman's 7 basic emotions plus streaming-specific ones.
// Each recipe is the target value at intensity 1; intensity t blends linearly from the model default.
export const EMOTIONS = {
  neutral:   { group: 'neutral',  label: '中性', params: {} },
  smile:     { group: 'happiness', label: '微笑', params: { ParamMouthForm: 1, ParamEyeLSmile: 0.6, ParamEyeRSmile: 0.6 } },
  happy:     { group: 'happiness', label: '開心笑', params: { ParamMouthForm: 1, ParamMouthOpenY: 0.7, ParamEyeLOpen: 0, ParamEyeROpen: 0, ParamEyeLSmile: 1, ParamEyeRSmile: 1, ParamBrowLY: 0.5 } },
  // no grin overlay (Param54) here: it paints closed teeth over the mouth, so lip sync can't be seen while she laughs
  laugh:     { group: 'happiness', label: '大笑', params: { ParamMouthForm: 1, ParamMouthOpenY: 0.25, ParamEyeLOpen: 0, ParamEyeROpen: 0, ParamEyeLSmile: 1, ParamEyeRSmile: 1, ParamBrowLY: 0.6, ParamAngleY: 6 } },
  excited:   { group: 'happiness', label: '興奮', params: { Param55: 30, ParamMouthForm: 1, ParamMouthOpenY: 0.6, ParamBrowLY: 0.8, ParamAngleY: 5 } },
  sad:       { group: 'sadness',  label: '難過', params: { ParamMouthForm: -1, ParamBrowLY: -0.6, ParamBrowLForm: -1, ParamEyeLOpen: 0.7, ParamEyeROpen: 0.7, ParamEyeBallY: -0.5, ParamAngleY: -10 } },
  cry:       { group: 'sadness',  label: '哭', params: { Param59: 30, ParamMouthForm: -1, ParamMouthOpenY: 0.35, ParamBrowLY: -0.6, ParamBrowLForm: -1, ParamEyeLOpen: 0.6, ParamEyeROpen: 0.6, ParamAngleY: -8 } },
  angry:     { group: 'anger',    label: '生氣', params: { Param57: 30, Param53: 30, ParamMouthForm: -1, ParamBrowLY: -0.8, ParamBrowLForm: 1, Param51: 0.5, Param52: 0.5, ParamAngleY: -5 } },
  pout:      { group: 'anger',    label: '鼓臉生悶氣', params: { Param21: 1, Param45: 1, Param48: 1, Param58: 15, ParamMouthForm: -1, ParamBrowLY: -0.4, ParamEyeBallX: 0.7, ParamAngleX: 12, ParamAngleZ: 5 } },
  scared:    { group: 'fear',     label: '害怕', params: { Param44: 30, ParamEyeLOpen: 1.2, ParamEyeROpen: 1.2, ParamBrowLY: 1, ParamBrowLForm: -1, ParamMouthForm: -0.6, ParamMouthOpenY: 0.3, ParamAngleY: -6, ParamBodyAngleX: -6 } },
  panic:     { group: 'fear',     label: '慌張', params: { Param56: 30, Param44: 30, ParamMouthOpenY: 0.8, ParamMouthForm: -0.5, ParamBrowLY: 1 } },
  surprised: { group: 'surprise', label: '驚訝', params: { ParamEyeLOpen: 1.2, ParamEyeROpen: 1.2, ParamBrowLY: 1, ParamMouthOpenY: 0.8, Param45: 0.5, ParamAngleY: 6 } },
  confused:  { group: 'surprise', label: '疑惑', params: { Param43: 30, ParamBrowLForm: -0.6, Param20: 15, ParamEyeBallY: 0.5, ParamAngleZ: 14 } },
  disgust:   { group: 'disgust',  label: '嫌棄', params: { ParamMouthForm: -1, Param20: -20, Param53: 30, Param51: 0.6, Param52: 0.6, ParamBrowLY: -0.6, ParamBrowLForm: 1, ParamEyeBallX: 0.5, ParamAngleX: -10, ParamAngleY: 4 } },
  smug:      { group: 'contempt', label: '得意', params: { ParamMouthForm: 1, Param20: 20, Param51: 0.7, Param52: 0.7, ParamEyeLOpen: 0.7, ParamEyeROpen: 0.7, ParamBrowLForm: -0.6, ParamAngleY: 7 } },
  shy:       { group: 'stream',   label: '害羞', params: { Param58: 30, ParamMouthForm: 0.5, ParamEyeLOpen: 0.8, ParamEyeROpen: 0.8, ParamEyeBallX: -0.7, ParamEyeBallY: -0.5, ParamAngleX: -12, ParamAngleZ: -6 } },
  teasing:   { group: 'stream',   label: '調皮', params: { Param46: 1, ParamMouthOpenY: 0.4, ParamMouthForm: 1, ParamEyeLOpen: 0, ParamEyeLSmile: 1, ParamAngleZ: 8 } },
  sleepy:    { group: 'stream',   label: '想睡', params: { ParamEyeLOpen: 0.25, ParamEyeROpen: 0.25, ParamBrowLY: -0.3, ParamMouthOpenY: 0.15, ParamAngleY: -10, ParamAngleZ: 10 } },
  thinking:  { group: 'stream',   label: '思考', params: { ParamEyeBallX: 0.7, ParamEyeBallY: 0.8, Param20: 15, ParamMouthForm: -0.2, ParamBrowLForm: 0.5, ParamAngleX: 10, ParamAngleY: 6 } },
};

export const EMOTION_GROUPS = {
  neutral: '中性', happiness: '快樂', sadness: '悲傷', anger: '憤怒', fear: '恐懼',
  surprise: '驚訝', disgust: '厭惡', contempt: '輕蔑', stream: '直播補充',
};

// Overlay toggles (model ships them as 0/30 switches). They stack on top of any emotion.
export const EFFECTS = {
  blush:       { label: '臉紅', param: 'Param58' },
  sweat:       { label: '流汗', param: 'Param44' },
  tears:       { label: '眼淚', param: 'Param59' },
  dizzy_eyes:  { label: '轉圈眼', param: 'Param56' },
  star_eyes:   { label: '星星眼', param: 'Param55' },
  question:    { label: '問號', param: 'Param43' },
  gloom:       { label: '黑臉陰影', param: 'Param57' },
  grin:        { label: '咧嘴露齒', param: 'Param54' },
  lollipop:    { label: '棒棒糖', param: 'Param60' },
  sunglasses:  { label: '戴墨鏡', param: 'Param64' },
  shades_up:   { label: '墨鏡推到頭上', param: 'Param11' },
  odd_eye:     { label: '異色瞳', param: 'Param62' },
};
export const EFFECT_ON = 30;

// One-shot head/body motions. f(t) gets t in [0,1] over `ms` and returns additive offsets.
// Special keys: y (px, + is down) and s (scale factor delta) move the whole model.
const hump = t => Math.sin(Math.PI * t);
export const GESTURES = {
  nod:       { label: '點頭', ms: 1000, f: t => ({ ParamAngleY: -14 * Math.sin(4 * Math.PI * t) * hump(t) }) },
  shake:     { label: '搖頭', ms: 1200, f: t => ({ ParamAngleX: 18 * Math.sin(5 * Math.PI * t) * hump(t) }) },
  tilt:      { label: '歪頭', ms: 1400, f: t => ({ ParamAngleZ: 16 * hump(t), ParamBodyAngleZ: 4 * hump(t) }) },
  look_away: { label: '別開視線', ms: 1600, f: t => ({ ParamAngleX: -22 * hump(t), ParamEyeBallX: -0.9 * hump(t) }) },
  bounce:    { label: '開心彈跳', ms: 900, f: t => ({ y: -28 * Math.abs(Math.sin(3 * Math.PI * t)), ParamAngleY: 4 * hump(t) }) },
  startle:   { label: '嚇一跳', ms: 600, f: t => ({ y: -36 * hump(Math.min(1, t * 2)), ParamAngleY: 8 * hump(t) }) },
  shiver:    { label: '發抖', ms: 1200, f: t => ({ ParamAngleX: 3 * Math.sin(24 * Math.PI * t), ParamBodyAngleX: 3 * Math.sin(24 * Math.PI * t + 1) }) },
  lean_in:   { label: '往前靠', ms: 1600, f: t => ({ s: 0.07 * hump(t), ParamAngleY: -6 * hump(t) }) },
  sigh:      { label: '嘆氣', ms: 1600, f: t => ({ ParamAngleY: -12 * hump(t), ParamBodyAngleY: -6 * hump(t), y: 8 * hump(t) }) },
  sway:      { label: '左右搖擺', ms: 3000, f: t => ({ ParamAngleZ: 10 * Math.sin(4 * Math.PI * t), ParamBodyAngleZ: 6 * Math.sin(4 * Math.PI * t) }) },
  giggle:    { label: '笑到發抖', ms: 2600, f: t => ({ ParamAngleY: 5 * Math.sin(18 * Math.PI * t) * hump(t) + 4 * hump(t), ParamBodyAngleY: 3 * Math.sin(18 * Math.PI * t + 1) * hump(t), ParamAngleZ: 6 * hump(t), y: -5 * Math.abs(Math.sin(9 * Math.PI * t)) }) },
};

export const OUTFITS = {
  hoodie:      { label: '連帽衣', params: { Param16: 30, Param17: 0 } },
  hoodie_down: { label: '連帽衣脫帽', params: { Param16: 30, Param17: 30 } },
  jacket:      { label: '黑色外套', params: { Param16: 0, Param17: 0 } },
};
export const POSES = {
  default:      { label: '預設', params: { Param61: 0 } },
  arms_crossed: { label: '雙手交叉', params: { Param61: 30 } },
};

// Look direction maps x,y in [-1,1] onto head angle, eyes and a little body turn.
export const LOOK = { ParamAngleX: 20, ParamAngleY: 15, ParamEyeBallX: 1, ParamEyeBallY: 1, ParamBodyAngleX: 6 };

const keys = o => Object.keys(o);
const lines = (o, f) => Object.entries(o).map(([k, v]) => `${k}=${f(v)}`).join(', ');

// Tool definitions in MCP shape (name, description, inputSchema).
export const TOOLS = [
  {
    name: 'avatar_express',
    description: `Set Shiori's facial emotion. It holds until the next call, or reverts to neutral after duration_ms. Emotions: ${lines(EMOTIONS, e => e.label)}.`,
    inputSchema: {
      type: 'object',
      properties: {
        emotion: { type: 'string', enum: keys(EMOTIONS) },
        intensity: { type: 'number', minimum: 0, maximum: 1, default: 0.8 },
        duration_ms: { type: 'integer', minimum: 100, maximum: 60000 },
      },
      required: ['emotion'], additionalProperties: false,
    },
  },
  {
    name: 'avatar_effect',
    description: `Turn an overlay effect on or off. Effects stack on top of the emotion. Effects: ${lines(EFFECTS, e => e.label)}.`,
    inputSchema: {
      type: 'object',
      properties: { effect: { type: 'string', enum: keys(EFFECTS) }, on: { type: 'boolean' } },
      required: ['effect', 'on'], additionalProperties: false,
    },
  },
  {
    name: 'avatar_gesture',
    description: `Play a one-shot head/body motion on top of the current emotion. Gestures: ${lines(GESTURES, g => g.label)}.`,
    inputSchema: {
      type: 'object',
      properties: { gesture: { type: 'string', enum: keys(GESTURES) }, intensity: { type: 'number', minimum: 0, maximum: 1.5, default: 1 } },
      required: ['gesture'], additionalProperties: false,
    },
  },
  {
    name: 'avatar_look',
    description: 'Turn head and eyes toward a point. x: -1 = screen left, 1 = screen right. y: -1 = down, 1 = up. 0,0 looks at the camera. Holds until changed.',
    inputSchema: {
      type: 'object',
      properties: { x: { type: 'number', minimum: -1, maximum: 1 }, y: { type: 'number', minimum: -1, maximum: 1 } },
      required: ['x', 'y'], additionalProperties: false,
    },
  },
  {
    name: 'avatar_outfit',
    description: `Change outfit and/or arm pose. Outfits: ${lines(OUTFITS, o => o.label)}. Poses: ${lines(POSES, p => p.label)}.`,
    inputSchema: {
      type: 'object',
      properties: { outfit: { type: 'string', enum: keys(OUTFITS) }, pose: { type: 'string', enum: keys(POSES) } },
      additionalProperties: false,
    },
  },
  {
    name: 'avatar_reset',
    description: 'Back to neutral: emotion neutral, all effects off, looking at the camera, gestures stopped. Outfit and pose are kept.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'avatar_mouth',
    description: 'Mouth openness for lip sync, 0 = closed, 1 = fully open. Meant for the TTS module at frame rate, not for the LLM.',
    inputSchema: {
      type: 'object',
      properties: { open: { type: 'number', minimum: 0, maximum: 1 } },
      required: ['open'], additionalProperties: false,
    },
  },
];

// Minimal JSON Schema check for the subset used above. Returns an error string or null.
export function validate(tool, args) {
  const def = TOOLS.find(t => t.name === tool);
  if (!def) return `unknown tool: ${tool}`;
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return 'args must be an object';
  const { properties, required = [] } = def.inputSchema;
  for (const k of required) if (!(k in args)) return `missing ${k}`;
  for (const [k, v] of Object.entries(args)) {
    const p = properties[k];
    if (!p) return `unknown argument: ${k}`;
    if (p.type === 'string' && typeof v !== 'string') return `${k} must be a string`;
    if (p.type === 'boolean' && typeof v !== 'boolean') return `${k} must be a boolean`;
    if ((p.type === 'number' || p.type === 'integer') && (typeof v !== 'number' || !Number.isFinite(v))) return `${k} must be a number`;
    if (p.type === 'integer' && !Number.isInteger(v)) return `${k} must be an integer`;
    if (p.enum && !p.enum.includes(v)) return `${k} must be one of ${p.enum.join(', ')}`;
    if (p.minimum !== undefined && v < p.minimum) return `${k} must be >= ${p.minimum}`;
    if (p.maximum !== undefined && v > p.maximum) return `${k} must be <= ${p.maximum}`;
  }
  return null;
}

'use strict';

const palettes = {
  ice: [120, 215, 250],
  mint: [130, 238, 185],
  amber: [255, 188, 108],
  rose: [255, 158, 195],
  violet: [190, 151, 255]
};

function recolorCircuit(frame, key, mode = 'pocket_circuit') {
  if (!key || key === 'original') return frame;
  const custom = /^custom:(#[0-9a-f]{6}):(#[0-9a-f]{6}):(#[0-9a-f]{6})$/i.exec(key);
  const customColors = custom && custom.slice(1).map(hex => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16)));
  const color = palettes[key] || palettes.ice;
  const result = Uint8Array.from(frame);
  for (let i = 0; i < result.length; i += 3) {
    const r = result[i], g = result[i + 1], b = result[i + 2];
    const peak = Math.max(r, g, b);
    if (peak < 8) continue;
    if (mode === 'pocket_starwhale' && !(b > r * 1.12 && b > g * 0.9)) continue;
    if (mode === 'portrait_portal' && peak < 45) continue;
    const light = peak / 255;
    if (customColors) {
      const shade = light > 0.72 ? customColors[0] : light > 0.3 ? customColors[1] : customColors[2];
      const strength = Math.min(1, 0.35 + light * 0.85);
      for (let channel = 0; channel < 3; ++channel)
        result[i + channel] = Math.round(shade[channel] * strength);
      continue;
    }
    const white = Math.max(0, (Math.min(r, g, b) / Math.max(1, peak) - 0.6) / 0.4);
    for (let channel = 0; channel < 3; ++channel)
      result[i + channel] = Math.round(light * (color[channel] * (1 - white) + 255 * white));
  }
  return result;
}
if (typeof module !== 'undefined' && module.exports) module.exports = recolorCircuit;
else globalThis.pixelStudioRecolor = recolorCircuit;

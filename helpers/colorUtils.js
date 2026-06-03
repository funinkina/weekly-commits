export function hexToRgb(hex) {
    const m = String(hex).replace('#', '');
    const n = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
    return [
        parseInt(n.slice(0, 2), 16),
        parseInt(n.slice(2, 4), 16),
        parseInt(n.slice(4, 6), 16),
    ];
}

export function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

export function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive a 4-level intensity ramp from a single accent color by shifting HSL
 * lightness. grade1 = lightest, grade4 = darkest.
 * @param {string} accentHex - Hex color string (e.g. '#40c463')
 * @returns {Object} Theme object with grade0–grade4 keys
 */
export function buildCustomTheme(accentHex) {
    const [h, s, l] = rgbToHsl(...hexToRgb(accentHex || '#40c463'));
    const clamp = v => Math.max(0, Math.min(1, v));
    const shade = dl => rgbToHex(...hslToRgb(h, s, clamp(l + dl)));
    return {
        grade0: '#ebedf0',
        grade1: shade(+0.25),
        grade2: shade(+0.10),
        grade3: shade(0),
        grade4: shade(-0.15),
    };
}

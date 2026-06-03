// Central definition of every shared constant in the extension. This module
// imports nothing GNOME-specific, so it is safe to import from both the shell
// process (extension.js) and the preferences process (prefs.js).

// --- Commit box visuals (top bar) ---
export const BOX_SIZE = 14;
export const BOX_MARGIN = 4;
export const BORDER_RADIUS = 3;
export const DEFAULT_BOX_COLOR = '#888888';

// --- Display & animation ---
export const DATE_FORMAT = { month: 'long' };  // How dates appear in the menu
export const DEFAULT_OPACITY = 50;             // Base opacity for boxes with no commits
export const MAX_OPACITY_INCREASE = 205;       // Maximum opacity boost for active boxes
export const OPACITY_PER_COMMIT = 20;          // How much opacity increases per commit

// --- Popup menu styling ---
export const POPUP_ACTION_ICON_SIZE = 16;
export const POPUP_HEADER_FONT_SIZE = 14;
export const POPUP_TEXT_COLOR = 'rgba(255, 255, 255, 0.96)';
export const POPUP_TABLE_META_COLOR = 'rgba(255, 255, 255, 0.68)';
export const POPUP_COUNT_COLUMN_MIN_WIDTH = 48;

// --- Service type enum values (must match gschema.xml) ---
export const SERVICE_TYPE_GITHUB = 0;
export const SERVICE_TYPE_GITEA = 1;
export const SERVICE_TYPE_GITLAB = 2;

// --- Commit count thresholds for grade-based coloring ---
export const COMMIT_THRESHOLDS = {
    grade2: 3,   // 3–5 commits → grade1 below this
    grade3: 6,   // 6–10 commits
    grade4: 11,  // 11+ commits
};

// --- User-facing messages ---
export const MESSAGES = {
    NO_COMMITS: 'No commit data available',
    PREFS_ERROR: 'Failed to open extension preferences.'
};

// --- Offline cache ---
export const CACHE_VERSION = 1;
export const CACHE_FILENAME = 'commits-cache-v1.json';

// Ordered theme keys. This order MUST match the `theme-name` enum in
// schemas/org.gnome.shell.extensions.weekly-commits.gschema.xml, because the
// stored setting is an enum index into this list. Both the extension and the
// preferences UI derive their ordering from here (single source of truth).
export const THEME_KEYS = [
    'standard', 'classic', 'githubDark', 'halloween', 'teal', 'leftPad',
    'dracula', 'blue', 'panda', 'sunny', 'pink', 'YlGnBu',
    'solarizedDark', 'solarizedLight', 'catpuccin', 'custom',
];

// Color ramps per theme. 'custom' is intentionally absent: it is generated at
// runtime from the user's accent color (see _buildCustomTheme in extension.js).
export const THEMES = {
    standard: {
        text: "#000000",
        meta: "#666666",
        grade4: "#216e39",
        grade3: "#30a14e",
        grade2: "#40c463",
        grade1: "#9be9a8",
        grade0: "#ebedf0"
    },
    classic: {
        text: "#000000",
        meta: "#666666",
        grade4: "#196127",
        grade3: "#239a3b",
        grade2: "#7bc96f",
        grade1: "#c6e48b",
        grade0: "#ebedf0"
    },
    githubDark: {
        text: "#ffffff",
        meta: "#dddddd",
        grade4: "#27d545",
        grade3: "#10983d",
        grade2: "#00602d",
        grade1: "#003820",
        grade0: "#161b22"
    },
    halloween: {
        text: "#000000",
        meta: "#666666",
        grade4: "#03001C",
        grade3: "#FE9600",
        grade2: "#FFC501",
        grade1: "#FFEE4A",
        grade0: "#ebedf0"
    },
    teal: {
        text: "#000000",
        meta: "#666666",
        grade4: "#458B74",
        grade3: "#66CDAA",
        grade2: "#76EEC6",
        grade1: "#7FFFD4",
        grade0: "#ebedf0"
    },
    leftPad: {
        text: "#ffffff",
        meta: "#999999",
        grade4: "#F6F6F6",
        grade3: "#DDDDDD",
        grade2: "#A5A5A5",
        grade1: "#646464",
        grade0: "#2F2F2F"
    },
    dracula: {
        text: "#f8f8f2",
        meta: "#666666",
        grade4: "#ff79c6",
        grade3: "#bd93f9",
        grade2: "#6272a4",
        grade1: "#44475a",
        grade0: "#282a36"
    },
    blue: {
        text: "#C0C0C0",
        meta: "#666666",
        grade4: "#4F83BF",
        grade3: "#416895",
        grade2: "#344E6C",
        grade1: "#263342",
        grade0: "#222222"
    },
    panda: {
        text: "#E6E6E6",
        meta: "#676B79",
        grade4: "#FF4B82",
        grade3: "#19f9d8",
        grade2: "#6FC1FF",
        grade1: "#34353B",
        grade0: "#242526"
    },
    sunny: {
        text: "#000000",
        meta: "#666666",
        grade4: "#a98600",
        grade3: "#dab600",
        grade2: "#e9d700",
        grade1: "#f8ed62",
        grade0: "#fff9ae"
    },
    pink: {
        text: "#000000",
        meta: "#666666",
        grade4: "#61185f",
        grade3: "#a74aa8",
        grade2: "#ca5bcc",
        grade1: "#e48bdc",
        grade0: "#ebedf0"
    },
    YlGnBu: {
        text: "#000000",
        meta: "#666666",
        grade4: "#253494",
        grade3: "#2c7fb8",
        grade2: "#41b6c4",
        grade1: "#a1dab4",
        grade0: "#ebedf0"
    },
    solarizedDark: {
        text: "#93a1a1",
        meta: "#586e75",
        grade4: "#d33682",
        grade3: "#b58900",
        grade2: "#2aa198",
        grade1: "#268bd2",
        grade0: "#073642"
    },
    solarizedLight: {
        text: "#586e75",
        meta: "#93a1a1",
        grade4: "#6c71c4",
        grade3: "#dc322f",
        grade2: "#cb4b16",
        grade1: "#b58900",
        grade0: "#eee8d5"
    },
    catpuccin: {
        text: "#c6d0f5",
        meta: "#a5adce",
        grade4: "#5f9f57",
        grade3: "#81b96f",
        grade2: "#a6d189",
        grade1: "#d4f8c4",
        grade0: "#303446"
    }
};

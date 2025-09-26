import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { fetchContributions, getDates } from './helpers/githubService.js';
import { ExtensionSettings } from './helpers/settings.js';

// Visual constants for the commit boxes in the top bar
const BOX_SIZE = 14;        // Size of each commit box in pixels
const BOX_MARGIN = 4;       // Space between each box
const BORDER_RADIUS = 3;    // Rounded corners for the boxes
const COLORS = {
    ACTIVE: '#4CAF50',      // Green color for days with commits
    INACTIVE: '#8e8e8e',    // Gray color for days without commits
    DEFAULT: '#888888'      // Default fallback color
};

// All available color themes - these match what users see in settings
const THEME_NAMES = {
    standard: "GitHub",             // Classic GitHub green theme
    classic: "GitHub Classic",     // Original GitHub contribution colors
    githubDark: "GitHub Dark",     // GitHub's dark mode colors
    halloween: "Halloween",        // Orange and dark spooky colors
    teal: "Teal",                 // Calming teal/aqua colors
    leftPad: "@left_pad",         // Grayscale theme inspired by the infamous npm package
    dracula: "Dracula",           // Popular dark theme with purple/pink accents
    blue: "Blue",                 // Cool blue gradient theme
    panda: "Panda 🐼",            // Black and white with colorful accents
    sunny: "Sunny",               // Bright yellow/gold theme
    pink: "Pink",                 // Pink/magenta gradient theme
    YlGnBu: "YlGnBu",            // Yellow-Green-Blue scientific colormap
    solarizedDark: 'Solarized Dark',   // Popular developer theme (dark)
    solarizedLight: 'Solarized Light'  // Popular developer theme (light)
};

const THEMES = {
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
    }
};


// Commit count thresholds for grade-based coloring
const COMMIT_THRESHOLDS = {
    grade1: 1,  // 1-2 commits
    grade2: 3,  // 3-5 commits  
    grade3: 6,  // 6-10 commits
    grade4: 11  // 11+ commits
};

const MESSAGES = {
    NO_DATA: 'No data available',
    NO_COMMITS: 'No commit data available',
    MISSING_CREDENTIALS: 'Missing GitHub username or token',
    PREFS_ERROR: 'Failed to open extension preferences.'
};

// Display and animation settings
const DATE_FORMAT = { month: 'short' };        // How dates appear in the menu
const DEFAULT_OPACITY = 50;                    // Base opacity for boxes with no commits
const MAX_OPACITY_INCREASE = 205;              // Maximum opacity boost for active boxes
const OPACITY_PER_COMMIT = 20;                 // How much opacity increases per commit

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init(preferences, extension) {
            super._init(0.0, _('Weekly Commits'));

            this.menu.setSourceAlignment(0);

            this._preferences = preferences;
            this._extension = extension;
            this._prefsChangedId = null;
            this._boxes = [];
            this._refreshTimeoutId = null;
            this._commitSection = null;
            this._separator = null;

            this._buildUI();
            this._setupMenuItems();
            this._updateContributionDisplay();

            this._prefsChangedId = this._preferences.connectChanged(() => {
                this._clearCommitInfoItems();
                this._updateContributionDisplay().finally(() => {
                    this._refreshMenu();
                });
            });
        }

        _buildUI() {
            // Create the main container that holds our week of commit boxes
            const containerBox = new St.BoxLayout({
                vertical: true,
                x_expand: false,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER
            });

            // Horizontal row that will contain all 7 day boxes
            const hbox = new St.BoxLayout({
                x_expand: false,
                y_expand: false,
                y_align: Clutter.ActorAlign.CENTER
            });

            // Create 7 boxes (one for each day of the week)
            for (let i = 0; i < 7; i++) {
                // Container for each individual day box
                const boxContainer = new St.Widget({
                    layout_manager: new Clutter.BinLayout(),
                    x_expand: false,
                    y_expand: false,
                    height: BOX_SIZE,
                    width: BOX_SIZE,
                    style: `margin-right: ${BOX_MARGIN}px;`
                });

                // The actual visual box that shows commit activity
                const box = new St.Widget({
                    style_class: 'commit-box',
                    height: BOX_SIZE,
                    width: BOX_SIZE,
                    style: this._getBoxStyle(COLORS.DEFAULT, true), // Start with empty styling
                    opacity: DEFAULT_OPACITY,
                });

                boxContainer.add_child(box);
                this._boxes.push(box);            // Keep track of all boxes for updates
                hbox.add_child(boxContainer);
            }

            containerBox.add_child(hbox);
            this.add_child(containerBox);         // Add to the panel button
        }

        _setupMenuItems() {
            // Add "Refresh Now" button to the dropdown menu
            const refreshItem = new PopupMenu.PopupMenuItem(_('Refresh Now'));
            refreshItem.connect('activate', () => {
                // Show user we're working on it
                refreshItem.label.text = _('Refreshing...');

                // Clear old commit info and fetch new data
                this._clearCommitInfoItems();

                this._updateContributionDisplay().finally(() => {
                    // Reset button text when done
                    refreshItem.label.text = _('Refresh Now');
                    this._refreshMenu();
                });
            });
            this.menu.addMenuItem(refreshItem);

            // Add "Settings" button to open extension preferences
            const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                this._openPreferences()
            });
            this.menu.addMenuItem(settingsItem);
        }

        async _openPreferences() {
            try {
                await this._extension.openPreferences();
            } catch (e) {
                console.error('Failed to open preferences:', e);
                Main.notify(_('Error'), _(MESSAGES.PREFS_ERROR));
            }
        }

        _getBoxStyle(bgColor, isEmpty = false) {
            // Create the CSS styling for each commit activity box
            let style = `background-color: ${bgColor}; width: ${BOX_SIZE}px; height: ${BOX_SIZE}px; border-radius: ${BORDER_RADIUS}px;`;
            
            // Add a very subtle border so boxes are always visible, even on pure black backgrounds
            style += ' border: 1px solid rgba(255, 255, 255, 0.08);';
            
            return style;
        }

        _getCommitGrade(count) {
            // Determine how "intense" the color should be based on commit count
            // This follows GitHub's contribution graph logic
            if (count === 0) return 'grade0';                              // No commits = lightest/empty
            if (count < COMMIT_THRESHOLDS.grade2) return 'grade1';         // 1-2 commits = light
            if (count < COMMIT_THRESHOLDS.grade3) return 'grade2';         // 3-5 commits = medium
            if (count < COMMIT_THRESHOLDS.grade4) return 'grade3';         // 6-10 commits = dark
            return 'grade4';                                                // 11+ commits = darkest
        }

        _getThemedColor(count, themeName, colorMode) {
            // Get the color scheme for the current theme
            const theme = THEMES[themeName] || THEMES.standard;
            
            if (colorMode === 'grade') {
                // Grade mode: different colors for different activity levels (like GitHub)
                const grade = this._getCommitGrade(count);
                return theme[grade];
            } else {
                // Opacity mode: same color for all, just varies transparency
                return count > 0 ? theme.grade3 : theme.grade0;
            }
        }

        _getCommitGrade(count) {
            if (count === 0) return 'grade0';
            if (count < COMMIT_THRESHOLDS.grade2) return 'grade1';
            if (count < COMMIT_THRESHOLDS.grade3) return 'grade2';
            if (count < COMMIT_THRESHOLDS.grade4) return 'grade3';
            return 'grade4';
        }

        _getThemedColor(count, themeName, colorMode) {
            const theme = THEMES[themeName] || THEMES.standard;
            
            if (colorMode === 'grade') {
                const grade = this._getCommitGrade(count);
                return theme[grade];
            } else {
                // Opacity mode - use grade1 color as base for active, grade0 for inactive
                return count > 0 ? theme.grade3 : theme.grade0;
            }
        }

        _formatDateWithCommits(date, count) {
            const today = new Date();
            const isToday = date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();

            const commitText = count === 1 ? 'commit' : 'commits';

            if (isToday) {
                return {
                    label: `Today: ${count} ${commitText}`,
                };
            } else {
                const monthName = date.toLocaleString('en-US', DATE_FORMAT);
                const day = date.getDate();
                return {
                    label: `${monthName} ${day}: ${count} ${commitText}`,
                };
            }
        }

        _updateCommitInfoSection(dates, counts) {
            if (!this._commitSection) {
                this._commitSection = new PopupMenu.PopupMenuSection();
                this.menu.addMenuItem(this._commitSection, 0);

                this._commitItems = [];

                for (let i = 0; i < 7; i++) {
                    const textItem = new St.Label({
                        text: '',
                        style_class: 'commit-text-item',
                        x_align: Clutter.ActorAlign.START,
                        y_align: Clutter.ActorAlign.CENTER,
                        style: 'font-family: monospace;'
                    });

                    const itemBin = new St.BoxLayout({
                        style_class: 'popup-menu-item',
                        reactive: false,
                        can_focus: false,
                        track_hover: false,
                        style: 'padding-top: 2px; padding-bottom: 2px;'
                    });

                    itemBin.add_child(textItem);
                    this._commitSection.box.add_child(itemBin);
                    this._commitItems.push({ bin: itemBin, label: textItem });
                }

                if (!this._separator) {
                    this._separator = new PopupMenu.PopupSeparatorMenuItem();
                    this.menu.addMenuItem(this._separator, 1);
                }
            }

            if (this._commitItems) {
                dates.forEach((date, index) => {
                    const count = counts[index];
                    const { label } = this._formatDateWithCommits(date, count);

                    if (this._commitItems[index]) {
                        this._commitItems[index].label.text = label;
                    }
                });
            }
        }

        async _updateContributionDisplay() {
            try {
                // Make sure we have boxes to update
                if (!this._boxes || !this._boxes.length) {
                    return;
                }

                // Get user's settings from the preferences
                const {
                    githubUsername: username,
                    githubToken: token,
                    showCurrentWeekOnly,
                    weekStartDay,
                    highlightCurrentDay
                } = this._preferences;

                // Can't do anything without GitHub creds
                if (!username || !token) {
                    console.warn(`Weekly Commits Extension: ${MESSAGES.MISSING_CREDENTIALS}`);
                    this._setDefaultBoxAppearance();
                    return;
                }

                // Fetch commit data from GitHub API
                const counts = await fetchContributions(username, token, showCurrentWeekOnly, weekStartDay);

                // Double-check boxes still exist (user might have disabled extension)
                if (!this._boxes || !this._boxes.length) {
                    return;
                }

                if (counts && counts.length === 7) {
                    //Update both the boxes and the dropdown menu
                    const dates = getDates(false, showCurrentWeekOnly, weekStartDay);

                    this._updateCommitInfoSection(dates, counts);

                    // Update each box with its commit count and styling
                    counts.forEach((count, index) => {
                        if (this._boxes[index]) {
                            const isToday = this._isToday(dates[index]);
                            const shouldHighlight = highlightCurrentDay && isToday;

                            this._setBoxAppearance(this._boxes[index], count, shouldHighlight);
                        }
                    });
                } else {
                    // Something went wrong with the GitHub API
                    console.error('Weekly Commits Extension: Failed to get valid contribution counts.');
                    this._setDefaultBoxAppearance();
                }
            } catch (e) {
                // Handle errors
                console.error(`Weekly Commits Extension: Error updating display - ${e.message}`);
                if (this._boxes && this._boxes.length) {
                    this._setDefaultBoxAppearance();
                }
            }

            // Set up the next automatic refresh
            this._scheduleNextRefresh();
            return Promise.resolve();
        }

        _isToday(date) {
            const today = new Date();
            return date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        }

        _setBoxAppearance(box, count = 0, highlight = false) {

            // Get current theme settings - map enum index to theme key according to schema
            const themeKeys = [
                'standard', 'classic', 'githubDark', 'halloween', 'teal', 'leftPad', 
                'dracula', 'blue', 'panda', 'sunny', 'pink', 'YlGnBu', 
                'solarizedDark', 'solarizedLight'
            ];
            const currentThemeName = themeKeys[this._preferences.themeName] || 'standard';
            
            // Convert user's color mode preference (number from settings) to mode name
            const colorModeNames = ['opacity', 'grade'];
            const currentColorMode = colorModeNames[this._preferences.colorMode] || 'opacity';
            
            // Get the appropriate color for this day's commit count
            let color = this._getThemedColor(count, currentThemeName, currentColorMode);
            const isEmpty = count === 0;
            
            // Special case: empty boxes get a subtle white fill so they're visible on dark backgrounds
            if (isEmpty) {
                color = 'rgba(255, 255, 255, 0.12)'; // Just enough white to see on pure black
            }
            
            let opacity = 255; // Default to full opacity
            
            if (currentColorMode === 'opacity') {
                // In opacity mode, boxes get more opaque with more commits
                opacity = count > 0
                    ? DEFAULT_OPACITY + Math.min(count * OPACITY_PER_COMMIT, MAX_OPACITY_INCREASE)
                    : 255; // Empty boxes stay fully opaque so the subtle fill is visible
            }

            if (highlight) {
                box.opacity = opacity;
                box.style = `${this._getBoxStyle(color, isEmpty)} border: 2px solid rgba(255, 255, 255, 0.6); box-shadow: 0 0 4px rgba(255, 255, 255, 0.3);`;
            } else {
                // Regular days just get the themed color and opacity
                box.opacity = opacity;
                box.style = this._getBoxStyle(color, isEmpty);
            }
        }

        _scheduleNextRefresh() {
            if (this._refreshTimeoutId) {
                GLib.Source.remove(this._refreshTimeoutId);
            }

            const interval = this._preferences.refreshInterval;
            this._refreshTimeoutId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                interval,
                () => {
                    this._updateContributionDisplay();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }

        _clearCommitInfoItems() {
            if (this._commitItems) {
                this._commitItems = [];
            }

            if (this._commitSection) {
                try {
                    this._commitSection.destroy();
                } catch (e) {
                    console.log('Error destroying commit section:', e);
                }
                this._commitSection = null;
            }

            if (this._separator) {
                try {
                    this._separator.destroy();
                } catch (e) {
                    console.log('Error destroying separator:', e);
                }
                this._separator = null;
            }
        }

        _setDefaultBoxAppearance() {
            this._boxes.forEach(box => {
                this._setBoxAppearance(box, 0, false);
            });

            this._clearCommitInfoItems();

            const commitSection = new PopupMenu.PopupMenuSection();
            const item = new PopupMenu.PopupMenuItem(MESSAGES.NO_COMMITS);
            commitSection.addMenuItem(item);
            this.menu.addMenuItem(commitSection, 0);
            this._commitSection = commitSection;

            if (!this._separator) {
                this._separator = new PopupMenu.PopupSeparatorMenuItem();
                this.menu.addMenuItem(this._separator, 1);
            }
        }

        _refreshMenu() {
            if (this.menu.isOpen) {
                this.menu.close();
                this.menu.open();
            }
        }

        destroy() {
            this._boxes.forEach(box => {
                box.remove_all_transitions();
            });

            if (this._refreshTimeoutId) {
                GLib.Source.remove(this._refreshTimeoutId);
                this._refreshTimeoutId = null;
            }

            if (this._prefsChangedId) {
                this._preferences.disconnectChanged(this._prefsChangedId);
                this._prefsChangedId = null;
            }

            this._clearCommitInfoItems();
            this._boxes = null;
            this._cache = null;
            this._commitItems = null;

            super.destroy();
        }
    });

export default class WeeklyCommitsExtension extends Extension {
    enable() {
        // Set up user preferences and settings
        this._preferences = new ExtensionSettings(this);

        // Listen for changes to panel position settings so we can move the indicator
        this._positionChangedId = this._preferences._settings.connect('changed', (settings, key) => {
            if (key === 'panel-position' || key === 'panel-index') {
                this._updateIndicatorPosition();
            }
        });

        // Wait a bit before creating the indicator to ensure GNOME Shell is ready
        // This prevents issues during login/startup
        this._enableTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            if (this._preferences) {
                this._indicator = new Indicator(this._preferences, this);
                this._updateIndicatorPosition();
            }
            this._enableTimeoutId = null;
            return GLib.SOURCE_REMOVE; // Don't repeat this timeout
        });
    }

    _updateIndicatorPosition() {
        // Don't do anything if there's no indicator yet
        if (!this._indicator) return;

        // Convert user's position preference to actual panel position
        const position = ['left', 'center', 'right'][this._preferences.panelPosition] || 'right';
        const index = this._preferences.panelIndex || 0;

        // Remove the old indicator from the panel
        this._indicator.destroy();
        this._indicator = null;

        // Create a new indicator in the new position
        if (this._preferences) {
            this._indicator = new Indicator(this._preferences, this);
            Main.panel.addToStatusArea(this.uuid, this._indicator, index, position);
        }
    }

    disable() {
        // Clean up any pending timeout from the enable phase
        if (this._enableTimeoutId) {
            GLib.Source.remove(this._enableTimeoutId);
            this._enableTimeoutId = null;
        }

        // Stop listening for settings changes
        if (this._positionChangedId) {
            this._preferences._settings.disconnect(this._positionChangedId);
            this._positionChangedId = null;
        }

        // Remove the indicator from the panel
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        // Clean up preferences
        this._preferences = null;
    }
}

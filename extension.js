import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { fetchContributions as fetchGitHubContributions, getDates } from './helpers/githubService.js';
import { fetchContributions as fetchGiteaContributions } from './helpers/giteaService.js';
import { fetchContributions as fetchGitLabContributions } from './helpers/gitlabService.js';
import { ExtensionSettings } from './helpers/settings.js';
import { ContributionCache } from './helpers/cacheService.js';
import {
    BOX_SIZE, BOX_MARGIN, BORDER_RADIUS, COLORS,
    DATE_FORMAT, DEFAULT_OPACITY, MAX_OPACITY_INCREASE, OPACITY_PER_COMMIT,
    POPUP_ACTION_ICON_SIZE, POPUP_HEADER_FONT_SIZE, POPUP_TEXT_COLOR,
    POPUP_TABLE_META_COLOR, POPUP_COUNT_COLUMN_MIN_WIDTH,
    SERVICE_TYPE_GITEA, SERVICE_TYPE_GITLAB,
    COMMIT_THRESHOLDS, MESSAGES, THEMES, THEME_KEYS,
} from './helpers/constants.js';

// Maps a service-type enum value to its fetch implementation. GitHub is the
// default and ignores the trailing instanceUrl argument the others accept.
const CONTRIBUTION_FETCHERS = {
    [SERVICE_TYPE_GITEA]: fetchGiteaContributions,
    [SERVICE_TYPE_GITLAB]: fetchGitLabContributions,
};

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
            this._cacheStatusItem = null;
            this._cacheService = new ContributionCache(this._extension.uuid);

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
                    style: this._getBoxStyle(COLORS.DEFAULT), // Start with empty styling
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
            this._addIconToMenuItem(refreshItem, 'view-refresh-symbolic');
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
            this._addIconToMenuItem(settingsItem, 'preferences-system-symbolic');
            settingsItem.connect('activate', () => {
                this._openPreferences()
            });
            this.menu.addMenuItem(settingsItem);
        }

        _addIconToMenuItem(item, iconName) {
            const icon = new St.Icon({
                icon_name: iconName,
                style_class: 'popup-menu-icon',
                icon_size: POPUP_ACTION_ICON_SIZE,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'margin-left: 8px;',
            });

            item.label.x_expand = true;
            item.label.x_align = Clutter.ActorAlign.START;
            item.label.y_align = Clutter.ActorAlign.CENTER;

            item.add_child(icon);
        }

        _getProviderName() {
            switch (this._preferences.serviceType) {
                case SERVICE_TYPE_GITEA:
                    return 'Gitea';
                case SERVICE_TYPE_GITLAB:
                    return 'GitLab';
                default:
                    return 'GitHub';
            }
        }

        _addPopupHeader(section) {
            const headerBox = new St.BoxLayout({
                style_class: 'popup-menu-item',
                reactive: false,
                can_focus: false,
                track_hover: false,
                style: 'padding: 6px 12px 8px 12px;',
            });

            const title = new St.Label({
                text: `${_('Commits')} • ${this._getProviderName()}`,
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.CENTER,
                style: `font-size: ${POPUP_HEADER_FONT_SIZE}px; font-weight: 700; color: ${POPUP_TEXT_COLOR};`,
            });

            headerBox.add_child(title);
            section.box.add_child(headerBox);
        }

        _addCommitTableHeader(section) {
            const headerRow = new St.BoxLayout({
                style_class: 'popup-menu-item',
                reactive: false,
                can_focus: false,
                track_hover: false,
                style: 'padding: 0 12px 4px 12px; spacing: 6px;',
            });

            const dateHeader = new St.Label({
                text: _('Date'),
                x_expand: true,
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.CENTER,
                style: `font-size: 11px; font-weight: 600; color: ${POPUP_TABLE_META_COLOR};`,
            });

            const commitHeader = new St.Label({
                text: _('Commits'),
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER,
                style: `min-width: ${POPUP_COUNT_COLUMN_MIN_WIDTH}px; text-align: right; font-size: 11px; font-weight: 600; color: ${POPUP_TABLE_META_COLOR};`,
            });

            headerRow.add_child(dateHeader);
            headerRow.add_child(commitHeader);
            section.box.add_child(headerRow);
        }

        async _openPreferences() {
            try {
                await this._extension.openPreferences();
            } catch (e) {
                logError(e, 'Weekly Commits Extension: Failed to open preferences');
                Main.notify(_('Error'), _(MESSAGES.PREFS_ERROR));
            }
        }

        _getBoxStyle(bgColor) {
            // Create the CSS styling for each commit activity box
            let style = `background-color: ${bgColor}; width: ${BOX_SIZE}px; height: ${BOX_SIZE}px; border-radius: ${BORDER_RADIUS}px;`;

            // Add a very subtle border so boxes are always visible, even on pure black backgrounds
            style += ' border: 1px solid rgba(255, 255, 255, 0.08);';

            return style;
        }

        _getCommitGrade(count) {
            // Determine how "intense" the color should be based on commit count.
            // Follows GitHub's contribution graph logic.
            if (count === 0) return 'grade0';                       // no commits = empty
            if (count < COMMIT_THRESHOLDS.grade2) return 'grade1';  // 1-2 commits
            if (count < COMMIT_THRESHOLDS.grade3) return 'grade2';  // 3-5 commits
            if (count < COMMIT_THRESHOLDS.grade4) return 'grade3';  // 6-10 commits
            return 'grade4';                                        // 11+ commits
        }

        _getThemedColor(count, themeName, colorMode) {
            // The 'custom' theme is generated from the user's accent color;
            // every other theme comes from the static THEMES table.
            const theme = themeName === 'custom'
                ? this._buildCustomTheme(this._preferences.customAccentColor)
                : (THEMES[themeName] || THEMES.standard);

            if (colorMode === 'grade') {
                // Grade mode: distinct color per activity level (like GitHub).
                const grade = this._getCommitGrade(count);
                return theme[grade];
            } else {
                // Opacity mode: single base color; transparency varies in _setBoxAppearance.
                return count > 0 ? theme.grade3 : theme.grade0;
            }
        }

        _buildCustomTheme(accentHex) {
            // Derive a 4-level intensity ramp from a single accent color by
            // shifting HSL lightness. grade1 = lightest, grade4 = darkest.
            const [h, s, l] = this._rgbToHsl(...this._hexToRgb(accentHex || '#40c463'));
            const clamp = v => Math.max(0, Math.min(1, v));
            const shade = dl => this._rgbToHex(...this._hslToRgb(h, s, clamp(l + dl)));
            return {
                grade0: '#ebedf0',     // unused (empty boxes get a white fill)
                grade1: shade(+0.25),  // lightest
                grade2: shade(+0.10),
                grade3: shade(0),      // accent = base; also used by opacity mode
                grade4: shade(-0.15),  // darkest
            };
        }

        _hexToRgb(hex) {
            const m = String(hex).replace('#', '');
            const n = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
            return [
                parseInt(n.slice(0, 2), 16),
                parseInt(n.slice(2, 4), 16),
                parseInt(n.slice(4, 6), 16),
            ];
        }

        _rgbToHsl(r, g, b) {
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

        _hslToRgb(h, s, l) {
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

        _rgbToHex(r, g, b) {
            return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        }

        _formatDateWithCommits(date, count) {
            if (this._isToday(date)) {
                return {
                    dateText: 'Today',
                    countText: `${count}`,
                };
            }

            const monthName = date.toLocaleString('en-US', DATE_FORMAT);
            const day = date.getDate();
            return {
                dateText: `${monthName} ${day}`,
                countText: `${count}`,
            };
        }

        _formatCacheTimestamp(isoTimestamp) {
            if (!isoTimestamp) {
                return null;
            }

            const parsedDate = new Date(isoTimestamp);
            if (Number.isNaN(parsedDate.getTime())) {
                return null;
            }

            const now = Date.now();
            const diffMs = Math.max(0, now - parsedDate.getTime());

            const minute = 60 * 1000;
            const hour = 60 * minute;
            const day = 24 * hour;
            const week = 7 * day;
            const month = 30 * day;
            const year = 365 * day;

            const pluralize = (value, unit) => `${value} ${unit}${value === 1 ? '' : 's'} ago`;

            if (diffMs < minute)
                return 'just now';
            if (diffMs < hour)
                return pluralize(Math.floor(diffMs / minute), 'minute');
            if (diffMs < day)
                return pluralize(Math.floor(diffMs / hour), 'hour');
            if (diffMs < week)
                return pluralize(Math.floor(diffMs / day), 'day');
            if (diffMs < month)
                return pluralize(Math.floor(diffMs / week), 'week');
            if (diffMs < year)
                return pluralize(Math.floor(diffMs / month), 'month');

            return pluralize(Math.floor(diffMs / year), 'year');
        }

        _updateCommitInfoSection(dates, counts, options = {}) {
            const {
                isCached = false,
                cachedAt = null,
            } = options;

            if (!this._commitSection) {
                this._commitSection = new PopupMenu.PopupMenuSection();
                this.menu.addMenuItem(this._commitSection, 0);
                this._addPopupHeader(this._commitSection);
                this._addCommitTableHeader(this._commitSection);

                this._commitItems = [];

                for (let i = 0; i < 7; i++) {
                    const dateLabel = new St.Label({
                        text: '',
                        style_class: 'commit-text-item',
                        x_expand: true,
                        x_align: Clutter.ActorAlign.START,
                        y_align: Clutter.ActorAlign.CENTER,
                        style: `color: ${POPUP_TEXT_COLOR};`
                    });

                    const countLabel = new St.Label({
                        text: '',
                        style_class: 'commit-text-item',
                        x_align: Clutter.ActorAlign.END,
                        y_align: Clutter.ActorAlign.CENTER,
                        style: `min-width: ${POPUP_COUNT_COLUMN_MIN_WIDTH}px; text-align: right; color: ${POPUP_TEXT_COLOR}; font-weight: 600;`
                    });

                    const itemBin = new St.BoxLayout({
                        style_class: 'popup-menu-item',
                        reactive: false,
                        can_focus: false,
                        track_hover: false,
                        style: 'padding: 2px 12px; spacing: 6px;'
                    });

                    itemBin.add_child(dateLabel);
                    itemBin.add_child(countLabel);
                    this._commitSection.box.add_child(itemBin);
                    this._commitItems.push({ bin: itemBin, dateLabel, countLabel });
                }

                const cacheStatusLabel = new St.Label({
                    text: '',
                    style_class: 'commit-text-item',
                    x_align: Clutter.ActorAlign.START,
                    y_align: Clutter.ActorAlign.CENTER,
                    style: `font-style: italic; opacity: 0.85; color: ${POPUP_TEXT_COLOR}; padding-top: 4px;`
                });

                const cacheStatusBin = new St.BoxLayout({
                    style_class: 'popup-menu-item',
                    reactive: false,
                    can_focus: false,
                    track_hover: false,
                    style: 'padding: 4px 12px 2px 12px;'
                });

                cacheStatusBin.add_child(cacheStatusLabel);
                this._commitSection.box.add_child(cacheStatusBin);
                this._cacheStatusItem = { bin: cacheStatusBin, label: cacheStatusLabel };
                this._cacheStatusItem.bin.hide();

                if (!this._separator) {
                    this._separator = new PopupMenu.PopupSeparatorMenuItem();
                    this.menu.addMenuItem(this._separator, 1);
                }
            }

            if (this._commitItems) {
                dates.forEach((date, index) => {
                    const count = counts[index];
                    const { dateText, countText } = this._formatDateWithCommits(date, count);

                    if (this._commitItems[index]) {
                        this._commitItems[index].dateLabel.text = dateText;
                        this._commitItems[index].countLabel.text = countText;
                    }
                });
            }

            if (this._cacheStatusItem) {
                if (isCached) {
                    const formattedTimestamp = this._formatCacheTimestamp(cachedAt);
                    this._cacheStatusItem.label.text = formattedTimestamp
                        ? `Cached ${formattedTimestamp}`
                        : 'Cached';
                    this._cacheStatusItem.bin.show();
                } else {
                    this._cacheStatusItem.label.text = '';
                    this._cacheStatusItem.bin.hide();
                }
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
                    username,
                    token,
                    showCurrentWeekOnly,
                    weekStartDay,
                    highlightCurrentDay,
                    serviceType,
                    customInstanceUrl
                } = this._preferences;

                const cacheService = this._cacheService;
                if (!cacheService) {
                    return;
                }

                const cacheContext = {
                    serviceType,
                    username,
                    instanceUrl: customInstanceUrl,
                    showCurrentWeekOnly,
                    weekStartDay,
                };
                const cacheKey = cacheService.buildKey(cacheContext);

                // Can't do anything without credentials
                if (!username || !token) {
                    this._setDefaultBoxAppearance();
                    return;
                }

                let counts = null;
                let cachedResult = null;

                try {
                    // Fetch commit data from the configured service
                    const fetchForService = CONTRIBUTION_FETCHERS[serviceType] ?? fetchGitHubContributions;
                    counts = await fetchForService(username, token, showCurrentWeekOnly, weekStartDay, customInstanceUrl);

                    if (!counts || counts.length !== 7) {
                        throw new Error('Live fetch did not return a valid 7-day count array.');
                    }

                    await cacheService.save(cacheKey, cacheContext, counts);
                } catch (e) {
                    logError(e, 'Weekly Commits Extension: Live fetch failed, trying cache fallback');

                    cachedResult = await cacheService.load(cacheKey);
                    if (cachedResult) {
                        counts = cachedResult.counts;
                    }
                }

                // Double-check boxes still exist (user might have disabled extension)
                if (!this._boxes || !this._boxes.length) {
                    return;
                }

                if (counts && counts.length === 7) {
                    //Update both the boxes and the dropdown menu
                    const dates = getDates(false, showCurrentWeekOnly, weekStartDay);

                    this._updateCommitInfoSection(dates, counts, {
                        isCached: Boolean(cachedResult),
                        cachedAt: cachedResult?.updatedAt || null,
                    });

                    // Update each box with its commit count and styling
                    counts.forEach((count, index) => {
                        if (this._boxes[index]) {
                            const isToday = this._isToday(dates[index]);
                            const shouldHighlight = highlightCurrentDay && isToday;

                            this._setBoxAppearance(this._boxes[index], count, shouldHighlight);
                        }
                    });
                } else {
                    // Something went wrong with the API
                    log('Weekly Commits Extension: Failed to get valid contribution counts.');
                    this._setDefaultBoxAppearance();
                }
            } catch (e) {
                // Handle errors
                logError(e, 'Weekly Commits Extension: Error updating display');
                if (this._boxes && this._boxes.length) {
                    this._setDefaultBoxAppearance();
                }
            }

            // Set up the next automatic refresh
            this._scheduleNextRefresh();
        }

        _isToday(date) {
            const today = new Date();
            return date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        }

        _setBoxAppearance(box, count = 0, highlight = false) {

            // Map the stored theme enum index to its key (order defined in helpers/constants.js)
            const currentThemeName = THEME_KEYS[this._preferences.themeName] || 'standard';

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
                box.style = `${this._getBoxStyle(color)} border: 2px solid rgba(255, 255, 255, 0.6); box-shadow: 0 0 4px rgba(255, 255, 255, 0.3);`;
            } else {
                // Regular days just get the themed color and opacity
                box.opacity = opacity;
                box.style = this._getBoxStyle(color);
            }
        }

        _scheduleNextRefresh() {
            if (this._refreshTimeoutId) {
                GLib.Source.remove(this._refreshTimeoutId);
                this._refreshTimeoutId = null;
            }

            const interval = this._preferences.refreshInterval;
            // One-shot timer: _updateContributionDisplay() re-arms it at its end,
            // so the source must not auto-repeat (returning SOURCE_CONTINUE here
            // while the tail also re-schedules caused duplicate/orphaned sources).
            this._refreshTimeoutId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                interval,
                () => {
                    this._refreshTimeoutId = null;
                    this._updateContributionDisplay();
                    return GLib.SOURCE_REMOVE;
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
                    // Ignore stale actor destroy races during teardown.
                }
                this._commitSection = null;
            }

            if (this._separator) {
                try {
                    this._separator.destroy();
                } catch (e) {
                    // Ignore stale actor destroy races during teardown.
                }
                this._separator = null;
            }

            this._cacheStatusItem = null;
        }

        _setDefaultBoxAppearance() {
            this._boxes.forEach(box => {
                this._setBoxAppearance(box, 0, false);
            });

            this._clearCommitInfoItems();

            const commitSection = new PopupMenu.PopupMenuSection();
            this._addPopupHeader(commitSection);
            const item = new PopupMenu.PopupMenuItem(MESSAGES.NO_COMMITS);
            item.label.style = `color: ${POPUP_TEXT_COLOR};`;
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
            this._cacheService = null;
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
            this._enableTimeoutId = null;
            this._updateIndicatorPosition();
            return GLib.SOURCE_REMOVE; // Don't repeat this timeout
        });
    }

    _updateIndicatorPosition() {
        // Nothing to do once disabled (preferences torn down)
        if (!this._preferences) return;

        // Remove the old indicator from the panel, if any
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        // Convert user's position preference to actual panel position
        const position = ['left', 'center', 'right'][this._preferences.panelPosition] || 'right';
        const index = this._preferences.panelIndex || 0;

        // Create the indicator in the (new) position
        this._indicator = new Indicator(this._preferences, this);
        Main.panel.addToStatusArea(this.uuid, this._indicator, index, position);
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

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { fetchContributions as fetchGitHubContributions } from './helpers/githubService.js';
import { fetchContributions as fetchGiteaContributions } from './helpers/giteaService.js';
import { fetchContributions as fetchGitLabContributions } from './helpers/gitlabService.js';
import { getDates } from './helpers/dateUtils.js';
import { buildCustomTheme } from './helpers/colorUtils.js';
import { ExtensionSettings } from './helpers/settings.js';
import { ContributionCache } from './helpers/cacheService.js';
import { destroySession } from './helpers/http.js';
import {
    BOX_SIZE, BOX_MARGIN, BORDER_RADIUS, DEFAULT_BOX_COLOR,
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

const COLOR_MODE_NAMES = ['opacity', 'grade'];

function getCommitGrade(count) {
    if (count === 0) return 'grade0';
    if (count < COMMIT_THRESHOLDS.grade2) return 'grade1';
    if (count < COMMIT_THRESHOLDS.grade3) return 'grade2';
    if (count < COMMIT_THRESHOLDS.grade4) return 'grade3';
    return 'grade4';
}

function getThemedColor(count, themeName, colorMode, accentColor) {
    const theme = themeName === 'custom'
        ? buildCustomTheme(accentColor)
        : (THEMES[themeName] || THEMES.standard);

    if (colorMode === 'grade') {
        return theme[getCommitGrade(count)];
    }
    return count > 0 ? theme.grade3 : theme.grade0;
}

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init(preferences, extension) {
            super._init(0.0, _('Weekly Commits'));

            this.menu.setSourceAlignment(0);

            this._preferences = preferences;
            this._extension = extension;
            this._boxes = [];
            this._refreshTimeoutId = null;
            this._commitSection = null;
            this._separator = null;
            this._cacheStatusItem = null;
            this._cacheService = new ContributionCache(this._extension.uuid);

            this._buildUI();
            this._setupMenuItems();
            this._updateContributionDisplay();

            this._preferences.settings.connectObject('changed', () => {
                this._clearCommitInfoItems();
                this._updateContributionDisplay().finally(() => {
                    this._refreshMenu();
                });
            }, this);
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
                    style: this._getBoxStyle(DEFAULT_BOX_COLOR),
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
            refreshItem.connectObject('activate', () => {
                // Show user we're working on it
                refreshItem.label.text = _('Refreshing...');

                // Clear old commit info and fetch new data
                this._clearCommitInfoItems();

                this._updateContributionDisplay().finally(() => {
                    // Reset button text when done
                    refreshItem.label.text = _('Refresh Now');
                    this._refreshMenu();
                });
            }, this);
            this.menu.addMenuItem(refreshItem);

            // Add "Settings" button to open extension preferences
            const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            this._addIconToMenuItem(settingsItem, 'preferences-system-symbolic');
            settingsItem.connectObject('activate', () => this._openPreferences(), this);
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

        _formatDateWithCommits(date, count) {
            if (this._isToday(date)) {
                return {
                    dateText: _('Today'),
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

            const pluralize = (value, unit) => `${value} ${unit}${value === 1 ? '' : 's'} ${_('ago')}`;

            if (diffMs < minute)
                return _('just now');
            if (diffMs < hour)
                return pluralize(Math.floor(diffMs / minute), _('minute'));
            if (diffMs < day)
                return pluralize(Math.floor(diffMs / hour), _('hour'));
            if (diffMs < week)
                return pluralize(Math.floor(diffMs / day), _('day'));
            if (diffMs < month)
                return pluralize(Math.floor(diffMs / week), _('week'));
            if (diffMs < year)
                return pluralize(Math.floor(diffMs / month), _('month'));

            return pluralize(Math.floor(diffMs / year), _('year'));
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
                        ? `${_('Cached')} ${formattedTimestamp}`
                        : _('Cached');
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

                const cacheContext = {
                    serviceType,
                    username,
                    instanceUrl: customInstanceUrl,
                    showCurrentWeekOnly,
                    weekStartDay,
                };
                const cacheKey = this._cacheService.buildKey(cacheContext);

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

                    await this._cacheService.save(cacheKey, cacheContext, counts);
                } catch (e) {
                    logError(e, 'Weekly Commits Extension: Live fetch failed, trying cache fallback');

                    cachedResult = await this._cacheService.load(cacheKey);
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

                    const themeName = THEME_KEYS[this._preferences.themeName] || 'standard';
                    const colorMode = COLOR_MODE_NAMES[this._preferences.colorMode] || 'opacity';
                    const accentColor = this._preferences.customAccentColor;

                    counts.forEach((count, index) => {
                        if (this._boxes[index]) {
                            const shouldHighlight = highlightCurrentDay && this._isToday(dates[index]);
                            this._setBoxAppearance(this._boxes[index], count, shouldHighlight, themeName, colorMode, accentColor);
                        }
                    });
                } else {
                    console.error('Weekly Commits Extension: Failed to get valid contribution counts.');
                    this._setDefaultBoxAppearance();
                }
            } catch (e) {
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

        _setBoxAppearance(box, count = 0, highlight = false, themeName = 'standard', colorMode = 'opacity', accentColor = '#40c463') {
            let color = getThemedColor(count, themeName, colorMode, accentColor);
            const isEmpty = count === 0;

            // Special case: empty boxes get a subtle white fill so they're visible on dark backgrounds
            if (isEmpty) {
                color = 'rgba(255, 255, 255, 0.12)'; // Just enough white to see on pure black
            }

            let opacity = 255; // Default to full opacity

            if (colorMode === 'opacity') {
                opacity = count > 0
                    ? DEFAULT_OPACITY + Math.min(count * OPACITY_PER_COMMIT, MAX_OPACITY_INCREASE)
                    : 255;
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
                this._commitSection.destroy();
                this._commitSection = null;
            }

            if (this._separator) {
                this._separator.destroy();
                this._separator = null;
            }

            this._cacheStatusItem = null;
        }

        _setDefaultBoxAppearance() {
            const themeName = THEME_KEYS[this._preferences.themeName] || 'standard';
            const colorMode = COLOR_MODE_NAMES[this._preferences.colorMode] || 'opacity';
            const accentColor = this._preferences.customAccentColor;
            this._boxes.forEach(box => {
                this._setBoxAppearance(box, 0, false, themeName, colorMode, accentColor);
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

            this._preferences.settings.disconnectObject(this);

            this._clearCommitInfoItems();
            this._boxes = null;
            this._cacheService = null;
            this._commitItems = null;

            super.destroy();
        }
    });

export default class WeeklyCommitsExtension extends Extension {
    enable() {
        this._preferences = new ExtensionSettings(this);

        this._preferences.settings.connectObject(
            'changed::panel-position', () => this._updateIndicatorPosition(),
            'changed::panel-index', () => this._updateIndicatorPosition(),
            this
        );

        // Wait a bit before creating the indicator to ensure GNOME Shell is ready
        // This prevents issues during login/startup
        this._enableTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            this._enableTimeoutId = null;
            this._updateIndicatorPosition();
            return GLib.SOURCE_REMOVE;
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

        this._preferences.settings.disconnectObject(this);

        // Remove the indicator from the panel
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        // Clean up preferences
        this._preferences = null;

        // Abort any in-flight requests and drop the shared Soup session so
        // it doesn't outlive the extension.
        destroySession();
    }
}

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

const BOX_SIZE = 14;
const BOX_MARGIN = 4;
const BORDER_RADIUS = 3;
const COLORS = {
    ACTIVE: '#4CAF50',
    INACTIVE: '#8e8e8e',
    DEFAULT: '#888888'
};
const MESSAGES = {
    NO_DATA: 'No data available',
    NO_COMMITS: 'No commit data available',
    MISSING_CREDENTIALS: 'Missing GitHub username or token',
    PREFS_ERROR: 'Failed to open extension preferences.'
};
const DATE_FORMAT = { month: 'short' };
const DEFAULT_OPACITY = 50;
const MAX_OPACITY_INCREASE = 205;
const OPACITY_PER_COMMIT = 20;

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
            const containerBox = new St.BoxLayout({
                vertical: true,
                x_expand: false,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER
            });

            const hbox = new St.BoxLayout({
                x_expand: false,
                y_expand: false,
                y_align: Clutter.ActorAlign.CENTER
            });

            for (let i = 0; i < 7; i++) {
                const boxContainer = new St.Widget({
                    layout_manager: new Clutter.BinLayout(),
                    x_expand: false,
                    y_expand: false,
                    height: BOX_SIZE,
                    width: BOX_SIZE,
                    style: `margin-right: ${BOX_MARGIN}px;`
                });

                const box = new St.Widget({
                    style_class: 'commit-box',
                    height: BOX_SIZE,
                    width: BOX_SIZE,
                    style: this._getBoxStyle(COLORS.DEFAULT),
                    opacity: DEFAULT_OPACITY,
                });

                boxContainer.add_child(box);
                this._boxes.push(box);
                hbox.add_child(boxContainer);
            }

            containerBox.add_child(hbox);
            this.add_child(containerBox);
        }

        _setupMenuItems() {
            const refreshItem = new PopupMenu.PopupMenuItem(_('Refresh Now'));
            refreshItem.connect('activate', () => {
                refreshItem.label.text = _('Refreshing...');

                this._clearCommitInfoItems();

                this._updateContributionDisplay().finally(() => {
                    refreshItem.label.text = _('Refresh Now');
                    this._refreshMenu();
                });
            });
            this.menu.addMenuItem(refreshItem);

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

        _getBoxStyle(bgColor) {
            return `background-color: ${bgColor}; width: ${BOX_SIZE}px; height: ${BOX_SIZE}px; border-radius: ${BORDER_RADIUS}px;`;
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

        _setBoxAppearance(box, count = 0, tooltipText = null) {
            const opacity = count > 0
                ? DEFAULT_OPACITY + Math.min(count * OPACITY_PER_COMMIT, MAX_OPACITY_INCREASE)
                : DEFAULT_OPACITY;

            const color = count > 0 ? COLORS.ACTIVE : COLORS.INACTIVE;

            box.opacity = opacity;
            box.style = this._getBoxStyle(color);

            if (tooltipText) {
                box.tooltip_text = tooltipText;
            }
        }

        async _updateContributionDisplay() {
            try {
                if (!this._boxes || !this._boxes.length) {
                    return;
                }

                const {
                    githubUsername: username,
                    githubToken: token,
                    showCurrentWeekOnly,
                    weekStartDay
                } = this._preferences;

                if (!username || !token) {
                    console.warn(`Weekly Commits Extension: ${MESSAGES.MISSING_CREDENTIALS}`);
                    this._setDefaultBoxAppearance();
                    return;
                }

                const counts = await fetchContributions(username, token, showCurrentWeekOnly, weekStartDay);

                if (!this._boxes || !this._boxes.length) {
                    return;
                }

                if (counts && counts.length === 7) {
                    const dates = getDates(false, showCurrentWeekOnly, weekStartDay);

                    this._updateCommitInfoSection(dates, counts);

                    counts.forEach((count, index) => {
                        if (this._boxes[index]) {
                            this._setBoxAppearance(this._boxes[index], count);
                        }
                    });
                } else {
                    console.error('Weekly Commits Extension: Failed to get valid contribution counts.');
                    this._setDefaultBoxAppearance();
                }
            } catch (e) {
                console.error(`Weekly Commits Extension: Error updating display - ${e.message}`);
                if (this._boxes && this._boxes.length) {
                    this._setDefaultBoxAppearance();
                }
            }

            this._scheduleNextRefresh();
            return Promise.resolve();
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
                this._setBoxAppearance(box, 0, MESSAGES.NO_DATA);
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
        this._preferences = new ExtensionSettings(this);

        this._positionChangedId = this._preferences._settings.connect('changed', (settings, key) => {
            if (key === 'panel-position' || key === 'panel-index') {
                this._updateIndicatorPosition();
            }
        });

        this._enableTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            if (this._preferences) {
                this._indicator = new Indicator(this._preferences, this);
                this._updateIndicatorPosition();
            }
            this._enableTimeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _updateIndicatorPosition() {
        if (!this._indicator) return;

        const position = ['left', 'center', 'right'][this._preferences.panelPosition] || 'right';
        const index = this._preferences.panelIndex || 0;

        this._indicator.destroy();
        this._indicator = null;

        if (this._preferences) {
            this._indicator = new Indicator(this._preferences, this);
            Main.panel.addToStatusArea(this.uuid, this._indicator, index, position);
        }
    }

    disable() {
        if (this._enableTimeoutId) {
            GLib.Source.remove(this._enableTimeoutId);
            this._enableTimeoutId = null;
        }

        if (this._positionChangedId) {
            this._preferences._settings.disconnect(this._positionChangedId);
            this._positionChangedId = null;
        }

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        this._preferences = null;
    }
}


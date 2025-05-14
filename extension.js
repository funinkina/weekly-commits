import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { fetchWeeklyContributions } from './githubService.js';
import { Preferences } from './perfs.js';

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init(preferences) {
            super._init(0.0, _('Weekly Commits'));

            this._preferences = preferences;
            this._prefsChangedId = null;
            this._boxes = [];
            this._BOX_SIZE = 14;
            this._BOX_MARGIN = 4;
            this._BORDER_RADIUS = 3;
            this._refreshTimeoutId = null;

            let containerBox = new St.BoxLayout({
                vertical: true,
                x_expand: false,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER
            });

            let hbox = new St.BoxLayout({
                x_expand: false,
                y_expand: false,
                y_align: Clutter.ActorAlign.CENTER
            });

            for (let i = 0; i < 7; i++) {
                let boxContainer = new St.Widget({
                    layout_manager: new Clutter.BinLayout(),
                    x_expand: false,
                    y_expand: false,
                    height: this._BOX_SIZE,
                    width: this._BOX_SIZE,
                    style: `margin-right: ${this._BOX_MARGIN}px;`
                });

                let box = new St.Widget({
                    style_class: 'commit-box',
                    height: this._BOX_SIZE,
                    width: this._BOX_SIZE,
                    style: this._getBoxStyle('#888888'),
                    opacity: 50,
                });

                boxContainer.add_child(box);
                this._boxes.push(box);
                hbox.add_child(boxContainer);
            }

            containerBox.add_child(hbox);
            this.add_child(containerBox);

            this._updateContributionDisplay();

            this._prefsChangedId = this._preferences.connectChanged(() => {
                this._updateContributionDisplay();
            });

            let item = new PopupMenu.PopupMenuItem(_('Refresh Now'));
            item.connect('activate', () => {
                this._updateContributionDisplay();
            });
            this.menu.addMenuItem(item);

            let settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                this._openPreferences();
            });
            this.menu.addMenuItem(settingsItem);
        }

        _getBoxStyle(bgColor) {
            return `background-color: ${bgColor}; width: ${this._BOX_SIZE}px; height: ${this._BOX_SIZE}px; border-radius: ${this._BORDER_RADIUS}px;`;
        }

        _openPreferences() {
            try {
                Main.extensionManager.openExtensionPrefs('weekly-commits@funinkina.is-a.dev', '', {});
            } catch (e) {
                console.error('Failed to open preferences:', e);
                Main.notify(_('Error'), _('Failed to open extension preferences.'));
            }
        }

        async _updateContributionDisplay() {
            try {
                const username = this._preferences.githubUsername;
                const token = this._preferences.githubToken;

                if (!username || !token) {
                    console.warn('Weekly Commits Extension: Missing GitHub username or token');
                    this._setDefaultBoxAppearance();
                    return;
                }

                const counts = await fetchWeeklyContributions(username, token);

                if (counts && counts.length === 7) {
                    // Generate dates for the last 7 days (today and 6 days before)
                    const dates = [];
                    for (let i = 6; i >= 0; i--) {
                        const date = new Date();
                        date.setDate(date.getDate() - i);
                        dates.push(date);
                    }

                    // Clear previous commit info menu items
                    this._clearCommitInfoItems();

                    // Create a submenu section for commit info
                    let commitSection = new PopupMenu.PopupMenuSection();

                    // Add commit info for each day as plain text items
                    dates.forEach((date, index) => {
                        const count = counts[index];
                        const monthName = date.toLocaleString('en-US', { month: 'short' });
                        const day = date.getDate();
                        const commitText = count === 1 ? 'commit' : 'commits';
                        const label = `${monthName} ${day}: ${count} ${commitText}`;

                        // Create a plain text item instead of a PopupMenuItem
                        let textItem = new St.Label({
                            text: label,
                            style_class: 'commit-text-item',
                            x_align: Clutter.ActorAlign.START,
                            y_align: Clutter.ActorAlign.CENTER
                        });

                        // Create an item bin to hold our text
                        let itemBin = new St.BoxLayout({
                            style_class: 'popup-menu-item',
                            reactive: false,
                            can_focus: false,
                            track_hover: false,
                            style: 'padding-top: 6px; padding-bottom: 6px;'
                        });

                        itemBin.add_child(textItem);

                        // Add the item to the section
                        commitSection.box.add_child(itemBin);
                    });

                    // Add the section to the menu at the top
                    this.menu.addMenuItem(commitSection, 0);
                    this._commitSection = commitSection;

                    // Update the box appearances
                    counts.forEach((count, index) => {
                        if (this._boxes[index]) {
                            const box = this._boxes[index];
                            box.opacity = 50 + Math.min(count * 20, 205);

                            if (count > 0) {
                                box.style = this._getBoxStyle('#4CAF50');
                            } else {
                                box.style = this._getBoxStyle('#8e8e8e');
                            }

                            // Keep the tooltips too
                            const date = dates[index];
                            const monthName = date.toLocaleString('en-US', { month: 'short' });
                            const day = date.getDate();
                            const commitText = count === 1 ? 'commit' : 'commits';
                            const tooltip = `${monthName} ${day}: ${count} ${commitText}`;

                            box.set_hover(true);
                            box.tooltip_text = tooltip;
                        }
                    });
                } else {
                    console.error('Weekly Commits Extension: Failed to get valid contribution counts.');
                    this._setDefaultBoxAppearance();
                }
            } catch (e) {
                console.error(`Weekly Commits Extension: Error updating display - ${e.message}`);
                this._setDefaultBoxAppearance();
            }

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
            // Remove previous commit info section if it exists
            if (this._commitSection) {
                this._commitSection.destroy();
                this._commitSection = null;
            }
        }

        _setDefaultBoxAppearance() {
            this._boxes.forEach(box => {
                box.opacity = 50;
                box.style = this._getBoxStyle('#888888');
                box.tooltip_text = 'No data available';
            });

            // Clear and add a default message to the menu
            this._clearCommitInfoItems();
            let commitSection = new PopupMenu.PopupMenuSection();
            let item = new PopupMenu.PopupMenuItem('No commit data available');
            commitSection.addMenuItem(item);
            this.menu.addMenuItem(commitSection, 0);
            this._commitSection = commitSection;
        }

        destroy() {
            if (this._refreshTimeoutId) {
                GLib.Source.remove(this._refreshTimeoutId);
                this._refreshTimeoutId = null;
            }

            if (this._prefsChangedId) {
                this._preferences.disconnectChanged(this._prefsChangedId);
                this._prefsChangedId = null;
            }

            super.destroy();
        }
    });

export default class WeeklyCommitsExtension extends Extension {
    enable() {
        this._preferences = new Preferences(this);

        this._enableTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            if (this._preferences) {
                this._indicator = new Indicator(this._preferences);
                Main.panel.addToStatusArea(this.uuid, this._indicator, 0, 'right');
            }
            this._enableTimeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    disable() {
        if (this._enableTimeoutId) {
            GLib.Source.remove(this._enableTimeoutId);
            this._enableTimeoutId = null;
        }

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        this._preferences = null;
    }
}
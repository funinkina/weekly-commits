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

            this._refreshTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3600, () => {
                this._updateContributionDisplay();
                return GLib.SOURCE_CONTINUE;
            });

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
                    counts.forEach((count, index) => {
                        if (this._boxes[index]) {
                            const box = this._boxes[index];
                            box.opacity = 50 + Math.min(count * 20, 205);

                            if (count > 0) {
                                box.style = this._getBoxStyle('#4CAF50');
                            } else {
                                box.style = this._getBoxStyle('#8e8e8e');
                            }
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
        }

        _setDefaultBoxAppearance() {
            this._boxes.forEach(box => {
                box.opacity = 50;
                box.style = this._getBoxStyle('#888888');
            });
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
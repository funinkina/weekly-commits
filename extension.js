import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';
import Clutter from 'gi://Clutter';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const GITHUB_TOKEN = '***REMOVED***';
const GITHUB_USERNAME = 'funinkina';

function _getLast7DaysISO() {
    const dates = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

async function _fetchWeeklyContributions(username, token) {
    if (!token || token === 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN' || !username || username === 'YOUR_GITHUB_USERNAME') {
        console.error('Weekly Commits Extension: GitHub token or username is not configured.');
        return Array(7).fill(0);
    }

    const targetDates = _getLast7DaysISO();
    const queryFromDate = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString();
    const queryToDate = new Date().toISOString();

    const query = `
    query {
        user(login: "${username}") {
            contributionsCollection(from: "${queryFromDate}", to: "${queryToDate}") {
                contributionCalendar {
                    weeks {
                        contributionDays {
                            date
                            contributionCount
                        }
                    }
                }
            }
        }
    }`;

    const session = new Soup.Session();
    const message = Soup.Message.new('POST', 'https://api.github.com/graphql');
    if (!message) {
        throw new Error('Failed to create Soup.Message');
    }
    message.request_headers.append('Authorization', `bearer ${token}`);
    message.request_headers.append('Content-Type', 'application/json');
    message.request_headers.append('User-Agent', 'GNOME Shell Extension Weekly Commits');

    const queryBytes = new GLib.Bytes(new TextEncoder().encode(JSON.stringify({ query })));
    message.set_request_body_from_bytes('application/json', queryBytes);

    let responseBytes;
    try {
        responseBytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
    } catch (e) {
        console.error(`Weekly Commits Extension: Network error - ${e.message}`);
        throw e;
    }

    const responseStr = new TextDecoder().decode(responseBytes.get_data());
    const result = JSON.parse(responseStr);

    if (result.errors) {
        console.error('Weekly Commits Extension: GitHub API Error:', result.errors);
        throw new Error(result.errors.map(e => e.message).join(', '));
    }

    if (!result.data || !result.data.user || !result.data.user.contributionsCollection) {
        console.error('Weekly Commits Extension: Unexpected API response structure:', result);
        throw new Error('Unexpected API response structure.');
    }

    const allContributionDays = result.data.user.contributionsCollection.contributionCalendar.weeks
        .flatMap(week => week.contributionDays);

    const contributionMap = new Map();
    allContributionDays.forEach(day => contributionMap.set(day.date, day.contributionCount));

    return targetDates.map(date => contributionMap.get(date) || 0);
}


const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('Weekly Commits'));

            this._boxes = [];
            this._BOX_SIZE = 12;
            this._BOX_MARGIN = 2;

            let containerBox = new St.BoxLayout({
                vertical: true,
                x_expand: false,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER
            });

            let hbox = new St.BoxLayout({
                style_class: 'panel-status-menu-box weekly-commits-hbox',
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
                    style: 'background-color: #888888;',
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

            let item = new PopupMenu.PopupMenuItem(_('Refresh Now'));
            item.connect('activate', () => {
                this._updateContributionDisplay();
            });
            this.menu.addMenuItem(item);

            let settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                Main.notify(_('Settings'), _('Configure GitHub username and token in extension preferences.'));
            });
            this.menu.addMenuItem(settingsItem);
        }

        async _updateContributionDisplay() {
            try {
                const counts = await _fetchWeeklyContributions(GITHUB_USERNAME, GITHUB_TOKEN);

                if (counts && counts.length === 7) {
                    counts.forEach((count, index) => {
                        if (this._boxes[index]) {
                            const box = this._boxes[index];
                            box.opacity = 50 + Math.min(count * 20, 205);

                            if (count > 0) {
                                box.style = `background-color: #4CAF50; width: ${this._BOX_SIZE}px; height: ${this._BOX_SIZE}px;`;
                            } else {
                                box.style = `background-color: #8e8e8e; width: ${this._BOX_SIZE}px; height: ${this._BOX_SIZE}px;`;
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
                box.style = `background-color: #888888; width: ${this._BOX_SIZE}px; height: ${this._BOX_SIZE}px;`;
            });
        }

        destroy() {
            if (this._refreshTimeoutId) {
                GLib.Source.remove(this._refreshTimeoutId);
                this._refreshTimeoutId = null;
            }
            super.destroy();
        }
    });

export default class IndicatorExampleExtension extends Extension {
    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
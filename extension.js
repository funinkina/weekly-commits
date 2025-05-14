import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup'; // For making HTTP requests

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// It's highly recommended to not hardcode tokens or usernames.
// Consider using GSettings for storing these values.
const GITHUB_TOKEN = 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN'; // IMPORTANT: Replace with your GitHub token
const GITHUB_USERNAME = 'YOUR_GITHUB_USERNAME'; // IMPORTANT: Replace with your GitHub username

// Helper function to get ISO date strings for the last 7 days (oldest to newest)
function _getLast7DaysISO() {
    const dates = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]); // 'YYYY-MM-DD'
    }
    return dates;
}

// Helper function to fetch daily contributions for the last 7 days
async function _fetchWeeklyContributions(username, token) {
    if (!token || token === 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN' || !username || username === 'YOUR_GITHUB_USERNAME') {
        console.error('Weekly Commits Extension: GitHub token or username is not configured.');
        // Return an array of zeros or throw an error to indicate misconfiguration
        return Array(7).fill(0);
    }

    const targetDates = _getLast7DaysISO();
    const queryFromDate = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(); // Fetch a bit more to ensure calendar coverage
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
    message.request_headers.append('User-Agent', 'GNOME Shell Extension Weekly Commits'); // Good practice
    
    const queryBytes = new GLib.Bytes(new TextEncoder().encode(JSON.stringify({ query })));
    message.set_request_body_from_bytes('application/json', queryBytes);

    let responseBytes;
    try {
        responseBytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
    } catch (e) {
        console.error(`Weekly Commits Extension: Network error - ${e.message}`);
        throw e; // Re-throw to be caught by the caller
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
            let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box weekly-commits-hbox' });

            for (let i = 0; i < 7; i++) {
                let box = new St.Bin({
                    style_class: 'commit-box',
                    style: 'width: 5px; height: 5px; margin-right: 2px; background-color: #888888;', // Default grey
                    opacity: 50, // Default low opacity
                });
                this._boxes.push(box);
                hbox.add_child(box);
            }

            this.add_child(hbox);
            this._updateContributionDisplay(); // Initial fetch and display

            // Refresh periodically (e.g., every hour)
            this._refreshTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3600, () => {
                this._updateContributionDisplay();
                return GLib.SOURCE_CONTINUE; // Keep repeating
            });

            let item = new PopupMenu.PopupMenuItem(_('Refresh Now'));
            item.connect('activate', () => {
                this._updateContributionDisplay();
            });
            this.menu.addMenuItem(item);

            let settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                // In a real extension, this would open the extension's preferences dialog
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
                            // Opacity: 0 commits -> 50, 1 commit -> 70, ..., 10+ commits -> 255
                            box.opacity = 50 + Math.min(count * 20, 205);
                            
                            // Color: Green for commits, darker grey for no commits
                            if (count > 0) {
                                box.style = 'background-color: #4CAF50; width: 5px; height: 5px; margin-right: 2px;'; // Green
                            } else {
                                box.style = 'background-color: #555555; width: 5px; height: 5px; margin-right: 2px;'; // Darker Grey
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
                box.style = 'background-color: #888888; width: 5px; height: 5px; margin-right: 2px;'; // Default grey
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

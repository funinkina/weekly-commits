import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import About from './helpers/about.js';

export default class WeeklyCommitsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.weekly-commits');

        const page = new Adw.PreferencesPage();
        page.set_title(_('Settings'));
        page.set_icon_name('preferences-system-symbolic');
        window.add(page);
        window.add(new About(this));
        window.set_title(_('Weekly Commits Settings'));

        const group = new Adw.PreferencesGroup();
        group.set_title(_('GitHub Credentials'));
        group.set_description(_('Enter your GitHub username and personal access token'));
        page.add(group);

        const usernameRow = new Adw.EntryRow({
            title: _('GitHub Username'),
            text: settings.get_string('github-username') || ''
        });
        group.add(usernameRow);

        const tokenRow = new Adw.PasswordEntryRow({
            title: _('GitHub Personal Access Token'),
            text: settings.get_string('github-token') || ''
        });
        group.add(tokenRow);

        const refreshGroup = new Adw.PreferencesGroup();
        refreshGroup.set_title(_('Update Settings'));
        page.add(refreshGroup);

        const intervalRow = new Adw.ComboRow({
            title: _('Refresh Interval'),
            subtitle: _('How often to check for new contributions')
        });

        const intervals = [
            { value: 900, label: _('15 minutes') },
            { value: 1800, label: _('30 minutes') },
            { value: 3600, label: _('1 hour') },
            { value: 7200, label: _('2 hours') },
            { value: 14400, label: _('4 hours') },
            { value: 21600, label: _('6 hours') },
            { value: 43200, label: _('12 hours') },
            { value: 86400, label: _('24 hours') }
        ];

        const intervalModel = new Gtk.StringList();
        intervals.forEach(interval => intervalModel.append(interval.label));
        intervalRow.model = intervalModel;

        const currentInterval = settings.get_int('refresh-interval');
        let activeIndex = intervals.findIndex(interval => interval.value === currentInterval);
        if (activeIndex === -1) activeIndex = 5;
        intervalRow.selected = activeIndex;

        refreshGroup.add(intervalRow);

        const saveButton = new Gtk.Button({
            label: _('Save'),
            halign: Gtk.Align.CENTER,
            margin_top: 12
        });
        refreshGroup.add(saveButton);

        saveButton.connect('clicked', () => {
            settings.set_string('github-username', usernameRow.text);
            settings.set_string('github-token', tokenRow.text);
            settings.set_int('refresh-interval', intervals[intervalRow.selected].value);
            window.close();
        });

        const spacerGroup = new Adw.PreferencesGroup();
        page.add(spacerGroup);

        spacerGroup.set_vexpand(true);

        const infoGroup = new Adw.PreferencesGroup();
        infoGroup.set_vexpand(false);
        infoGroup.set_valign(Gtk.Align.END);
        page.add(infoGroup);

        const infoRow = new Adw.ActionRow({
            title: _('About Personal Access Tokens'),
            subtitle: _('Generate a token with "read:user" scope at GitHub Developer Settings')
        });

        const linkButton = new Gtk.LinkButton({
            label: _('Open GitHub Token Settings'),
            uri: 'https://github.com/settings/tokens'
        });
        infoRow.add_suffix(linkButton);
        infoGroup.add(infoRow);
    }
}

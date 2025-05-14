import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class WeeklyCommitsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.weekly-commits');

        const page = new Adw.PreferencesPage();
        page.set_title(_('Settings'));
        page.set_icon_name('preferences-system-symbolic');
        window.add(page);

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

        const saveButton = new Gtk.Button({
            label: _('Save'),
            halign: Gtk.Align.CENTER,
            margin_top: 12
        });
        group.add(saveButton);

        saveButton.connect('clicked', () => {
            settings.set_string('github-username', usernameRow.text);
            settings.set_string('github-token', tokenRow.text);
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
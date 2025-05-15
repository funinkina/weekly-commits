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

        const group = new Adw.PreferencesGroup();
        group.set_title(_('GitHub Credentials'));
        group.set_description(_('Enter your GitHub username and personal access token'));

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
        refreshGroup.set_title(_('Auto Update Settings'));

        const intervalRow = new Adw.ComboRow({
            title: _('Refresh Interval'),
            subtitle: _('How often to check for new contributions?')
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

        const positionGroup = new Adw.PreferencesGroup();
        positionGroup.set_title(_('Panel Position'));
        positionGroup.set_description(_('Customize the position of the extension in the panel'));

        const positionRow = new Adw.ComboRow({
            title: _('Location'),
            subtitle: _('Which section of the panel to use')
        });

        const positions = [
            { value: 0, label: _('Left') },
            { value: 1, label: _('Center') },
            { value: 2, label: _('Right') }
        ];

        const positionModel = new Gtk.StringList();
        positions.forEach(position => positionModel.append(position.label));
        positionRow.model = positionModel;

        const currentPosition = settings.get_enum('panel-position');
        positionRow.selected = currentPosition;

        positionGroup.add(positionRow);

        const indexRow = new Adw.SpinRow({
            title: _('Index'),
            subtitle: _('Position within the chosen section (0 is leftmost)'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 20,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('panel-index')
            })
        });

        positionGroup.add(indexRow);

        const saveActionGroup = new Adw.PreferencesGroup();
        const saveButton = new Gtk.Button({
            label: _('Save'),
            css_classes: ['suggested-action'],
            halign: Gtk.Align.CENTER,
            margin_top: 12,
            margin_bottom: 12
        });
        saveActionGroup.add(saveButton);

        page.add(group);
        page.add(refreshGroup);
        page.add(positionGroup);
        page.add(saveActionGroup);

        const spacerGroup = new Adw.PreferencesGroup();
        spacerGroup.set_vexpand(true);
        page.add(spacerGroup);

        const infoGroup = new Adw.PreferencesGroup();
        infoGroup.set_vexpand(false);
        infoGroup.set_valign(Gtk.Align.END);

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

        page.add(infoGroup);

        window.add(page);
        window.add(new About(this));
        window.set_title(_('Weekly Commits Settings'));
        window.set_default_size(650, 750);

        saveButton.connect('clicked', () => {
            settings.set_string('github-username', usernameRow.text);
            settings.set_string('github-token', tokenRow.text);
            settings.set_int('refresh-interval', intervals[intervalRow.selected].value);
            settings.set_enum('panel-position', positionRow.selected);
            settings.set_int('panel-index', indexRow.value);
        });
    }
}
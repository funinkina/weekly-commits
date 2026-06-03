import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    SERVICE_TYPE_GITHUB, SERVICE_TYPE_GITEA, SERVICE_TYPE_GITLAB, THEME_KEYS,
} from './helpers/constants.js';

export default class WeeklyCommitsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.weekly-commits');

        const page = new Adw.PreferencesPage({
            title: _('Settings'),
            icon_name: 'preferences-system-symbolic',
        });

        page.add(this._buildCredentialsGroup(settings));
        page.add(this._buildRefreshGroup(settings));
        page.add(this._buildDisplayGroup(settings));
        page.add(this._buildPanelGroup(settings));
        page.add(this._buildInfoGroup(settings));

        window.add(page);

        this._addAboutButton(window);

        window.set_title(_('Weekly Commits Settings'));
        window.set_default_size(650, 750);
    }

    _buildCredentialsGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: _('Service Credentials'),
            description: _('Enter your git hosting service and credentials'),
        });

        const serviceRow = new Adw.ComboRow({
            title: _('Git Service'),
            subtitle: _('Choose the git hosting service to track contributions from'),
            model: this._makeStringList([_('GitHub'), _('Gitea / Forgejo'), _('GitLab')]),
            selected: settings.get_enum('service-type'),
        });
        group.add(serviceRow);

        const instanceUrlRow = new Adw.EntryRow({
            title: _('Instance URL'),
            text: settings.get_string('custom-instance-url') || '',
        });
        instanceUrlRow.connect('notify::text', () =>
            settings.set_string('custom-instance-url', instanceUrlRow.text));
        group.add(instanceUrlRow);

        const usernameRow = new Adw.EntryRow({
            title: _('Username'),
            text: settings.get_string('github-username') || '',
        });
        usernameRow.connect('notify::text', () =>
            settings.set_string('github-username', usernameRow.text));
        group.add(usernameRow);

        const tokenRow = new Adw.PasswordEntryRow({
            title: _('Personal Access Token'),
            text: settings.get_string('github-token') || '',
        });
        tokenRow.connect('notify::text', () =>
            settings.set_string('github-token', tokenRow.text));
        group.add(tokenRow);

        const updateServiceVisibility = () => {
            instanceUrlRow.visible =
                serviceRow.selected === SERVICE_TYPE_GITEA ||
                serviceRow.selected === SERVICE_TYPE_GITLAB;
        };
        serviceRow.connect('notify::selected', () => {
            settings.set_enum('service-type', serviceRow.selected);
            updateServiceVisibility();
        });
        updateServiceVisibility();

        return group;
    }

    _buildRefreshGroup(settings) {
        const group = new Adw.PreferencesGroup({ title: _('Auto Update Settings') });

        const intervals = [
            { value: 900, label: _('15 minutes') },
            { value: 1800, label: _('30 minutes') },
            { value: 3600, label: _('1 hour') },
            { value: 7200, label: _('2 hours') },
            { value: 14400, label: _('4 hours') },
            { value: 21600, label: _('6 hours') },
            { value: 43200, label: _('12 hours') },
            { value: 86400, label: _('24 hours') },
        ];

        let activeIndex = intervals.findIndex(i => i.value === settings.get_int('refresh-interval'));
        if (activeIndex === -1) activeIndex = 5;

        const intervalRow = new Adw.ComboRow({
            title: _('Refresh Interval'),
            subtitle: _('How often to check for new contributions?'),
            model: this._makeStringList(intervals.map(i => i.label)),
            selected: activeIndex,
        });
        intervalRow.connect('notify::selected', () =>
            settings.set_int('refresh-interval', intervals[intervalRow.selected].value));
        group.add(intervalRow);

        return group;
    }

    _buildDisplayGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: _('Display Settings'),
            description: _('Configure how commit data is displayed'),
        });

        group.add(this._makeSwitchRow(settings, 'highlight-current-day',
            _('Highlight current day'),
            _('Add a white border around the current day\'s box')));

        const showWeekOnlyRow = this._makeSwitchRow(settings, 'show-current-week-only',
            _('Show current week\'s commits only'),
            _('Display commits for the current week instead of the last 7 days'));
        group.add(showWeekOnlyRow);

        const weekStartRow = new Adw.ComboRow({
            title: _('Week starts on'),
            subtitle: _('Select which day the week begins'),
            model: this._makeStringList([
                _('Sunday'), _('Monday'), _('Tuesday'), _('Wednesday'),
                _('Thursday'), _('Friday'), _('Saturday'),
            ]),
            selected: settings.get_enum('week-start-day'),
        });
        weekStartRow.connect('notify::selected', () =>
            settings.set_enum('week-start-day', weekStartRow.selected));
        weekStartRow.sensitive = showWeekOnlyRow.active;
        showWeekOnlyRow.connect('notify::active', () =>
            weekStartRow.sensitive = showWeekOnlyRow.active);
        group.add(weekStartRow);

        const colorModeRow = new Adw.ComboRow({
            title: _('Color Mode'),
            subtitle: _('Choose between opacity-based or grade-based coloring'),
            model: this._makeStringList([_('Opacity Mode'), _('Grade Mode')]),
            selected: settings.get_enum('color-mode'),
        });
        colorModeRow.connect('notify::selected', () =>
            settings.set_enum('color-mode', colorModeRow.selected));
        group.add(colorModeRow);

        // Labels keyed by theme key. The display order comes solely from
        // THEME_KEYS (which mirrors the schema enum), so ordering lives in one
        // place. Literals stay inside _() here for gettext extraction.
        const themeLabels = {
            standard: _('GitHub'),
            classic: _('GitHub Classic'),
            githubDark: _('GitHub Dark'),
            halloween: _('Halloween'),
            teal: _('Teal'),
            leftPad: _('@left_pad'),
            dracula: _('Dracula'),
            blue: _('Blue'),
            panda: _('Panda 🐼'),
            sunny: _('Sunny'),
            pink: _('Pink'),
            YlGnBu: _('YlGnBu'),
            solarizedDark: _('Solarized Dark'),
            solarizedLight: _('Solarized Light'),
            catpuccin: _('Catpuccin'),
            custom: _('Custom'),
        };

        const themeRow = new Adw.ComboRow({
            title: _('Color Theme'),
            subtitle: _('Select a color theme for commit visualization'),
            model: this._makeStringList(THEME_KEYS.map(key => themeLabels[key])),
            selected: settings.get_enum('theme-name'),
        });
        themeRow.connect('notify::selected', () =>
            settings.set_enum('theme-name', themeRow.selected));
        group.add(themeRow);

        // Custom theme: pick one accent color; the intensity ramp is generated automatically
        const accentRow = new Adw.ActionRow({
            title: _('Custom Accent Color'),
            subtitle: _('Pick one color; the intensity ramp is generated automatically'),
        });

        const colorBtn = new Gtk.ColorDialogButton({
            dialog: new Gtk.ColorDialog(),
            valign: Gtk.Align.CENTER,
        });

        const rgba = new Gdk.RGBA();
        rgba.parse(settings.get_string('custom-accent-color') || '#40c463');
        colorBtn.set_rgba(rgba);

        colorBtn.connect('notify::rgba', () => {
            const c = colorBtn.get_rgba();
            const hex = '#' + [c.red, c.green, c.blue]
                .map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
            settings.set_string('custom-accent-color', hex);
        });

        accentRow.add_suffix(colorBtn);
        accentRow.activatable_widget = colorBtn;
        group.add(accentRow);

        const CUSTOM_THEME_INDEX = THEME_KEYS.indexOf('custom');
        const updateAccentVisible = () => {
            accentRow.visible = themeRow.selected === CUSTOM_THEME_INDEX;
        };
        themeRow.connect('notify::selected', updateAccentVisible);
        updateAccentVisible();

        return group;
    }

    _buildPanelGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: _('Panel Position'),
            description: _('Customize the position of the extension in the panel'),
        });

        const positionRow = new Adw.ComboRow({
            title: _('Location'),
            subtitle: _('Which section of the panel to use'),
            model: this._makeStringList([_('Left'), _('Center'), _('Right')]),
            selected: settings.get_enum('panel-position'),
        });
        positionRow.connect('notify::selected', () =>
            settings.set_enum('panel-position', positionRow.selected));
        group.add(positionRow);

        group.add(this._makeSpinRow(settings, 'panel-index',
            _('Index'), _('Position within the chosen section (0 is leftmost)'), 0, 20, 1));

        return group;
    }

    _buildInfoGroup(settings) {
        const group = new Adw.PreferencesGroup();

        const infoRow = new Adw.ActionRow({
            title: _('About Personal Access Tokens'),
            subtitle: _('Generate a fine grained personal access token with "All Repositories" access.'),
        });
        const linkButton = new Gtk.LinkButton({
            label: _('Open GitHub Token Settings'),
            uri: 'https://github.com/settings/personal-access-tokens/new',
            valign: Gtk.Align.CENTER,
        });
        infoRow.add_suffix(linkButton);
        group.add(infoRow);

        const giteaInfoRow = new Adw.ActionRow({
            title: _('About Gitea / Forgejo Tokens'),
            subtitle: _('Generate an access token in your instance under Settings → Applications.'),
        });
        group.add(giteaInfoRow);

        const gitlabInfoRow = new Adw.ActionRow({
            title: _('About GitLab Tokens'),
            subtitle: _('Generate a Personal Access Token in your GitLab profile and enable read_api scope.'),
        });
        group.add(gitlabInfoRow);

        const updateInfoVisibility = () => {
            const selected = settings.get_enum('service-type');
            infoRow.visible = selected === SERVICE_TYPE_GITHUB;
            giteaInfoRow.visible = selected === SERVICE_TYPE_GITEA;
            gitlabInfoRow.visible = selected === SERVICE_TYPE_GITLAB;
        };
        settings.connect('changed::service-type', updateInfoVisibility);
        updateInfoVisibility();

        return group;
    }

    _addAboutButton(window) {
        const button = new Gtk.Button({
            icon_name: 'emblem-favorite-symbolic',
            tooltip_text: _('About'),
        });
        button.add_css_class('flat');
        button.connect('clicked', () => this._showAbout(window));

        const headerBar = this._findHeaderBar(window);
        if (headerBar)
            headerBar.pack_start(button);
    }

    _findHeaderBar(widget) {
        if (widget instanceof Adw.HeaderBar || widget instanceof Gtk.HeaderBar)
            return widget;
        let child = widget.get_first_child?.();
        while (child) {
            const found = this._findHeaderBar(child);
            if (found) return found;
            child = child.get_next_sibling();
        }
        return null;
    }

    _showAbout(parent) {
        const about = new Adw.AboutWindow({
            transient_for: parent,
            modal: true,
            application_name: _('Weekly Commits'),
            version: String(this.metadata.version ?? ''),
            comments: _('See your weekly GitHub, Gitea / Forgejo or GitLab commits in the top bar.'),
            developer_name: 'Aryan Kushwaha',
            website: 'https://github.com/funinkina/weekly-commits',
            issue_url: 'https://github.com/funinkina/weekly-commits/issues',
            support_url: 'https://www.buymeacoffee.com/funinkina',
            developers: ['Aryan Kushwaha <hello@funinkina.co.in>'],
            copyright: '© 2025–2026 Aryan Kushwaha',
            license_type: Gtk.License.MIT_X11,
        });

        about.add_link(_('GNOME Extensions'), 'https://extensions.gnome.org/extension/8146/weekly-commits/');
        about.add_link(_('GitHub Sponsors'), 'https://github.com/sponsors/funinkina');
        about.add_link(_('Developer Website'), 'https://funinkina.is-a.dev/');

        about.present();
    }

    _makeStringList(labels) {
        const model = new Gtk.StringList();
        for (const label of labels) model.append(label);
        return model;
    }

    _makeSwitchRow(settings, key, title, subtitle) {
        const row = new Adw.SwitchRow({ title, subtitle });
        row.active = settings.get_boolean(key);
        row.connect('notify::active', () => settings.set_boolean(key, row.active));
        return row;
    }

    _makeSpinRow(settings, key, title, subtitle, lower, upper, step) {
        const row = new Adw.SpinRow({
            title,
            subtitle,
            adjustment: new Gtk.Adjustment({
                lower, upper, step_increment: step,
                value: settings.get_int(key),
            }),
        });
        row.connect('notify::value', () => settings.set_int(key, row.value));
        return row;
    }
}

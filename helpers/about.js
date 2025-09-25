'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class About extends Adw.PreferencesPage {
    static {
        GObject.registerClass(this);
    }

    constructor(extensionObject) {
        super({
            title: _('About'),
            icon_name: 'help-about-symbolic',
            name: 'about'
        });

        const extensionDir = extensionObject.path;
        const iconFile = GLib.build_filenamev([extensionDir, 'weekly-commits-logo.png']);
        const extensionName = extensionObject.metadata.name;
        const extensionVersion = extensionObject.metadata.version || '1.0';
        const extensionDescription = extensionObject.metadata.description;
        const supportedShellVersions = extensionObject.metadata['shell-version'];
        const githubLink = 'https://github.com/funinkina/weekly-commits';
        const issueFeatureLink = 'https://github.com/funinkina/weekly-commits/issues';
        const authorBlogsLink = 'https://funinkina.is-a.dev/';
        const gnomeExtensionsLink = 'https://extensions.gnome.org/extension/8146/weekly-commits/';

        const headerGroup = new Adw.PreferencesGroup();
        this.add(headerGroup);

        const headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 10,
            margin_top: 24,
            margin_bottom: 24,
            hexpand: true,
            halign: Gtk.Align.CENTER
        });

        const iconImage = new Gtk.Image({
            pixel_size: 128
        });

        try {
            if (Gio.File.new_for_path(iconFile).query_exists(null)) {
                const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(iconFile, 128, 128);
                iconImage.set_from_pixbuf(pixbuf);
            } else {
                iconImage.set_from_icon_name('application-x-addon-symbolic');
            }
        } catch (e) {
            console.error(`Error loading icon: ${e.message}`);
            iconImage.set_from_icon_name('application-x-addon-symbolic');
        }

        const nameLabel = new Gtk.Label({
            label: `<b><span size="x-large">${extensionName}</span></b>`,
            use_markup: true
        });

        const descriptionLabel = new Gtk.Label({
            label: `<i>${extensionDescription}</i>`,
            use_markup: true,
            wrap: true,
            max_width_chars: 50,
            justify: Gtk.Justification.CENTER
        });

        const versionLabel = new Gtk.Label({
            label: `<span size="small" color="#888">Version ${extensionVersion}</span>`,
            use_markup: true
        });

        headerBox.append(iconImage);
        headerBox.append(nameLabel);
        headerBox.append(descriptionLabel);
        headerBox.append(versionLabel);
        headerGroup.add(headerBox);

        // Quick overview
        const overviewGroup = new Adw.PreferencesGroup({
            title: _('What This Extension Does')
        });
        this.add(overviewGroup);

        const overviewRow = new Adw.ActionRow({
            title: _('GitHub Commit Visualization'),
            subtitle: _('Shows your weekly GitHub activity in the top bar with 14 beautiful themes, smart coloring, auto-updates, and customizable positioning.')
        });

        const overviewIcon = new Gtk.Image({
            icon_name: 'view-grid-symbolic'
        });
        overviewRow.add_prefix(overviewIcon);
        overviewGroup.add(overviewRow);



        const authorGroup = new Adw.PreferencesGroup({
            title: _('The Developer')
        });
        this.add(authorGroup);

        const moreInfo = new Adw.ActionRow({
            title: _("Visit Developer's Website"),
            subtitle: _('Explore funinkina\'s projects, blog, work and more'),
            activatable: true
        });

        const blogIcon = new Gtk.Image({
            icon_name: 'user-info-symbolic'
        });
        moreInfo.add_prefix(blogIcon);
        authorGroup.add(moreInfo);
        this._makeRowClickable(moreInfo, authorBlogsLink);

        // Sponsor button for funinkina (below developer info)
        const funinkinaSponsorsLink = 'https://github.com/sponsors/funinkina';
        const funinkinaSponsorsRow = new Adw.ActionRow({
            title: _('Sponsor funinkina'),
            subtitle: _('Support the creator on GitHub Sponsors'),
            activatable: true
        });

        const funinkinaSponsorsIcon = new Gtk.Image({
            icon_name: 'starred-symbolic',
        });
        funinkinaSponsorsRow.add_prefix(funinkinaSponsorsIcon);
        authorGroup.add(funinkinaSponsorsRow);
        this._makeRowClickable(funinkinaSponsorsRow, funinkinaSponsorsLink);

        const buyMeCoffeeLink = 'https://www.buymeacoffee.com/funinkina';
        const coffeeRow = new Adw.ActionRow({
            title: _('Buy Me a Coffee'),
            subtitle: _('Quick one-time support for the project'),
            activatable: true
        });

        const coffeeIcon = new Gtk.Image({
            icon_name: 'cafe-symbolic'
        });
        coffeeRow.add_prefix(coffeeIcon);
        authorGroup.add(coffeeRow);
        this._makeRowClickable(coffeeRow, buyMeCoffeeLink);

        const contributorsGroup = new Adw.PreferencesGroup({
            title: _('Contributor')
        });
        this.add(contributorsGroup);

        const contributorRow = new Adw.ActionRow({
            title: _('Aryan-Techie'),
            subtitle: _('Developer - github.com/aryan-techie'),
            activatable: true
        });

        const contributorIcon = new Gtk.Image({
            icon_name: 'system-users-symbolic'
        });
        contributorRow.add_prefix(contributorIcon);
        contributorsGroup.add(contributorRow);
        this._makeRowClickable(contributorRow, 'https://aryantechie.com');

        // Sponsor button for Aryan-Techie (below contributor info)
        const aryanSponsorsLink = 'https://github.com/sponsors/Aryan-Techie';
        const aryanSponsorsRow = new Adw.ActionRow({
            title: _('Sponsor Aryan-Techie'),
            subtitle: _('Support the contributor on GitHub Sponsors'),
            activatable: true
        });

        const aryanSponsorsIcon = new Gtk.Image({
            icon_name: 'starred-symbolic',
        });
        aryanSponsorsRow.add_prefix(aryanSponsorsIcon);
        contributorsGroup.add(aryanSponsorsRow);
        this._makeRowClickable(aryanSponsorsRow, aryanSponsorsLink);

        // Links section moved to bottom
        const linksGroup = new Adw.PreferencesGroup({
            title: _('Get Involved'),
            description: _('Explore, contribute, and get help')
        });
        this.add(linksGroup);

        const gnomeExtensionsRow = new Adw.ActionRow({
            title: _('GNOME Extensions'),
            subtitle: _('Official extension page - Leave a review!'),
            activatable: true
        });

        const gnomeIcon = new Gtk.Image({
            icon_name: 'org.gnome.Extensions-symbolic'
        });
        gnomeExtensionsRow.add_prefix(gnomeIcon);
        linksGroup.add(gnomeExtensionsRow);
        this._makeRowClickable(gnomeExtensionsRow, gnomeExtensionsLink);

        const githubRow = new Adw.ActionRow({
            title: _('Source Code'),
            subtitle: _('View on GitHub - Star the repository!'),
            activatable: true
        });

        const githubIcon = new Gtk.Image({
            icon_name: 'text-x-generic-symbolic'
        });
        githubRow.add_prefix(githubIcon);
        linksGroup.add(githubRow);
        this._makeRowClickable(githubRow, githubLink);

        const issueRow = new Adw.ActionRow({
            title: _('Report Issue or Request Feature'),
            subtitle: _('Help us to make this extension even better'),
            activatable: true
        });

        const issueIcon = new Gtk.Image({
            icon_name: 'dialog-question-symbolic'
        });
        issueRow.add_prefix(issueIcon);
        linksGroup.add(issueRow);
        this._makeRowClickable(issueRow, issueFeatureLink);
    }

    _makeRowClickable(row, link) {
        row.set_tooltip_text(link);
        row.connect('activated', () => {
            try {
                Gio.AppInfo.launch_default_for_uri_async(link, null, null, (result) => {
                    try {
                        Gio.AppInfo.launch_default_for_uri_finish(result);
                    } catch (e) {
                        console.error(`Error opening link ${link}: ${e.message}`);
                    }
                });
            } catch (e) {
                console.error(`Error launching URI ${link}: ${e.message}`);
            }
        });
    }
}
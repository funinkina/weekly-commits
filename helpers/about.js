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
        const githubLink = 'https://github.com/funinkina/weekly-commits';
        const issueFeatureLink = 'https://github.com/funinkina/weekly-commits/issues/new';
        const authorBlogsLink = 'https://funinkina.is-a.dev/';

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
            label: `<b><span size="large">${extensionName}</span></b>`,
            use_markup: true
        });

        const authorLabel = new Gtk.Label({
            label: `<span size="small">by funinkina</span>`,
            use_markup: true
        });

        headerBox.append(iconImage);
        headerBox.append(nameLabel);
        headerBox.append(authorLabel);
        headerGroup.add(headerBox);

        const linksGroup = new Adw.PreferencesGroup();
        this.add(linksGroup);

        const githubRow = new Adw.ActionRow({
            title: _('GitHub Repository'),
            subtitle: githubLink,
            activatable: true
        });

        const githubIcon = new Gtk.Image({
            icon_name: 'web-browser-symbolic'
        });
        githubRow.add_prefix(githubIcon);
        linksGroup.add(githubRow);
        this._makeRowClickable(githubRow, githubLink);

        const issueRow = new Adw.ActionRow({
            title: _('Report Issue or Request Feature'),
            subtitle: _('Help improve this extension'),
            activatable: true
        });

        const issueIcon = new Gtk.Image({
            icon_name: 'dialog-question-symbolic'
        });
        issueRow.add_prefix(issueIcon);
        linksGroup.add(issueRow);
        this._makeRowClickable(issueRow, issueFeatureLink);

        const authorGroup = new Adw.PreferencesGroup({
            title: _('More About the Author')
        });
        this.add(authorGroup);

        const moreInfo = new Adw.ActionRow({
            title: _('More about me'),
            subtitle: authorBlogsLink,
            activatable: true
        });

        const blogIcon = new Gtk.Image({
            icon_name: 'user-info-symbolic'
        });
        moreInfo.add_prefix(blogIcon);
        authorGroup.add(moreInfo);
        this._makeRowClickable(moreInfo, authorBlogsLink);

        const buyMeCoffeeLink = 'https://www.buymeacoffee.com/funinkina';
        const coffeeRow = new Adw.ActionRow({
            title: _('Buy Me a Coffee'),
            subtitle: _('Support me if you like my work.'),
            activatable: true
        });

        const coffeeIcon = new Gtk.Image({
            icon_name: 'emblem-favorite-symbolic'
        });
        coffeeRow.add_prefix(coffeeIcon);
        authorGroup.add(coffeeRow);
        this._makeRowClickable(coffeeRow, buyMeCoffeeLink);
    }

    _makeRowClickable(row, link) {
        row.set_tooltip_text(link);
        row.connect('activated', () => {
            try {
                Gio.AppInfo.launch_default_for_uri_async(link, null, null, (source, result) => {
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

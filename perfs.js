import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export class Preferences {
    constructor(extension) {
        this._extension = extension;
        this._settings = this._getSettings();
    }

    _getSettings() {
        const schema = 'org.gnome.shell.extensions.weekly-commits';

        const schemaDir = this._extension.dir.get_child('schemas');
        let schemaSource;

        if (schemaDir.query_exists(null)) {
            schemaSource = Gio.SettingsSchemaSource.new_from_directory(
                schemaDir.get_path(),
                Gio.SettingsSchemaSource.get_default(),
                false
            );
        } else {
            schemaSource = Gio.SettingsSchemaSource.get_default();
        }

        const schemaObj = schemaSource.lookup(schema, true);

        if (!schemaObj) {
            throw new Error(`Schema ${schema} could not be found.`);
        }

        return new Gio.Settings({ settings_schema: schemaObj });
    }

    get githubUsername() {
        return this._settings.get_string('github-username') || '';
    }

    set githubUsername(value) {
        this._settings.set_string('github-username', value || '');
    }

    get githubToken() {
        return this._settings.get_string('github-token') || '';
    }

    set githubToken(value) {
        this._settings.set_string('github-token', value || '');
    }

    connectChanged(callback) {
        return this._settings.connect('changed', callback);
    }

    disconnectChanged(handlerId) {
        this._settings.disconnect(handlerId);
    }
}
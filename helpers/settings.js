export class ExtensionSettings {
    constructor(extension) {
        this._extension = extension;
        this._settings = extension.getSettings();
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

    get refreshInterval() {
        return this._settings.get_int('refresh-interval');
    }

    set refreshInterval(value) {
        this._settings.set_int('refresh-interval', value);
    }

    connectChanged(callback) {
        return this._settings.connect('changed', callback);
    }

    disconnectChanged(handlerId) {
        this._settings.disconnect(handlerId);
    }
}

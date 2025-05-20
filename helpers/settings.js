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

    get panelPosition() {
        return this._settings.get_enum('panel-position');
    }

    set panelPosition(value) {
        this._settings.set_enum('panel-position', value);
    }

    get panelIndex() {
        return this._settings.get_int('panel-index');
    }

    set panelIndex(value) {
        this._settings.set_int('panel-index', value);
    }

    get highlightCurrentDay() {
        return this._settings.get_boolean('highlight-current-day');
    }

    set highlightCurrentDay(value) {
        this._settings.set_boolean('highlight-current-day', value);
    }

    get showCurrentWeekOnly() {
        return this._settings.get_boolean('show-current-week-only');
    }

    set showCurrentWeekOnly(value) {
        this._settings.set_boolean('show-current-week-only', value);
    }

    get weekStartDay() {
        return this._settings.get_enum('week-start-day');
    }

    set weekStartDay(value) {
        this._settings.set_enum('week-start-day', value);
    }

    connectChanged(callback) {
        return this._settings.connect('changed', callback);
    }

    disconnectChanged(handlerId) {
        this._settings.disconnect(handlerId);
    }
}
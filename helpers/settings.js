export class ExtensionSettings {
    constructor(extension) {
        this._extension = extension;
        this._settings = extension.getSettings();
    }

    get serviceType() {
        return this._settings.get_enum('service-type');
    }

    set serviceType(value) {
        this._settings.set_enum('service-type', value);
    }

    get customInstanceUrl() {
        return this._settings.get_string('custom-instance-url') || '';
    }

    set customInstanceUrl(value) {
        this._settings.set_string('custom-instance-url', value || '');
    }

    // Note: the underlying gsettings keys keep their historical 'github-*'
    // names (renaming them would break existing installs); only the accessor
    // names are service-neutral, since they apply to every supported service.
    get username() {
        return this._settings.get_string('github-username') || '';
    }

    set username(value) {
        this._settings.set_string('github-username', value || '');
    }

    get token() {
        return this._settings.get_string('github-token') || '';
    }

    set token(value) {
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

    get themeName() {
        return this._settings.get_enum('theme-name');
    }

    set themeName(value) {
        this._settings.set_enum('theme-name', value);
    }

    get colorMode() {
        return this._settings.get_enum('color-mode');
    }

    set colorMode(value) {
        this._settings.set_enum('color-mode', value);
    }

    get customAccentColor() {
        return this._settings.get_string('custom-accent-color') || '#40c463';
    }

    set customAccentColor(value) {
        this._settings.set_string('custom-accent-color', value || '#40c463');
    }

    connectChanged(callback) {
        return this._settings.connect('changed', callback);
    }

    disconnectChanged(handlerId) {
        this._settings.disconnect(handlerId);
    }

    connectSettingChanged(key, callback) {
        return this._settings.connect(`changed::${key}`, callback);
    }

    disconnectSettingChanged(handlerId) {
        this._settings.disconnect(handlerId);
    }
}
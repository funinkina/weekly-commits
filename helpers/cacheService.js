"use strict";
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const CACHE_VERSION = 1;
const CACHE_FILENAME = 'commits-cache-v1.json';

function normalizeInstanceUrl(value = '') {
    return value.trim().replace(/\/+$/, '').toLowerCase();
}

function sanitizeCounts(counts) {
    if (!Array.isArray(counts) || counts.length !== 7) {
        return null;
    }

    const sanitized = counts.map(count => {
        if (!Number.isFinite(count) || count < 0) {
            return null;
        }

        return Math.round(count);
    });

    return sanitized.includes(null) ? null : sanitized;
}

export class ContributionCache {
    constructor(extensionUuid) {
        this._cacheDirPath = GLib.build_filenamev([
            GLib.get_user_cache_dir(),
            extensionUuid,
        ]);
        this._cachePath = GLib.build_filenamev([
            this._cacheDirPath,
            CACHE_FILENAME,
        ]);
        this._cacheFile = Gio.File.new_for_path(this._cachePath);
    }

    get cachePath() {
        return this._cachePath;
    }

    buildKey({
        serviceType,
        username,
        instanceUrl,
        showCurrentWeekOnly,
        weekStartDay,
    }) {
        const normalizedUsername = (username || '').trim().toLowerCase();
        const normalizedInstanceUrl = normalizeInstanceUrl(instanceUrl);

        const key = [
            `v${CACHE_VERSION}`,
            String(serviceType),
            normalizedUsername,
            normalizedInstanceUrl,
            showCurrentWeekOnly ? '1' : '0',
            String(weekStartDay),
        ].join('|');

        return key;
    }

    async load(cacheKey) {
        try {
            const cacheData = await this._readCache();
            const entry = cacheData.entries[cacheKey];
            if (!entry) {
                return null;
            }

            const sanitizedEntry = this._sanitizeEntry(entry);
            if (!sanitizedEntry) {
                return null;
            }

            return {
                counts: sanitizedEntry.counts,
                updatedAt: sanitizedEntry.updatedAt,
            };
        } catch (e) {
            logError(e, 'Weekly Commits Extension: Failed to load cache data');
            return null;
        }
    }

    async save(cacheKey, context, counts) {
        const sanitizedCounts = sanitizeCounts(counts);
        if (!sanitizedCounts) {
            return false;
        }

        try {
            const cacheData = await this._readCache();

            cacheData.entries[cacheKey] = {
                serviceType: context.serviceType,
                username: (context.username || '').trim(),
                instanceUrl: normalizeInstanceUrl(context.instanceUrl || ''),
                showCurrentWeekOnly: Boolean(context.showCurrentWeekOnly),
                weekStartDay: context.weekStartDay,
                updatedAt: new Date().toISOString(),
                counts: sanitizedCounts,
            };

            await this._writeCache(cacheData);
            return true;
        } catch (e) {
            logError(e, 'Weekly Commits Extension: Failed to save cache data');
            return false;
        }
    }

    async _readCache() {
        this._ensureCacheDirectory();

        if (!this._cacheFile.query_exists(null)) {
            return {
                version: CACHE_VERSION,
                entries: {},
            };
        }

        let contents;
        try {
            [contents] = await this._cacheFile.load_contents_async(null);
        } catch (e) {
            logError(e, 'Weekly Commits Extension: Failed reading cache file');
            return {
                version: CACHE_VERSION,
                entries: {},
            };
        }

        const contentString = new TextDecoder('utf-8').decode(contents);
        if (!contentString.trim()) {
            return {
                version: CACHE_VERSION,
                entries: {},
            };
        }

        try {
            const parsed = JSON.parse(contentString);
            return this._sanitizeRoot(parsed);
        } catch (e) {
            logError(e, 'Weekly Commits Extension: Cache file is not valid JSON');
            return {
                version: CACHE_VERSION,
                entries: {},
            };
        }
    }

    _sanitizeRoot(root) {
        if (!root || typeof root !== 'object') {
            return {
                version: CACHE_VERSION,
                entries: {},
            };
        }

        if (root.version !== CACHE_VERSION || typeof root.entries !== 'object' || Array.isArray(root.entries)) {
            return {
                version: CACHE_VERSION,
                entries: {},
            };
        }

        const sanitizedEntries = {};
        for (const [key, value] of Object.entries(root.entries)) {
            const sanitizedEntry = this._sanitizeEntry(value);
            if (sanitizedEntry) {
                sanitizedEntries[key] = sanitizedEntry;
            }
        }

        return {
            version: CACHE_VERSION,
            entries: sanitizedEntries,
        };
    }

    _sanitizeEntry(entry) {
        if (!entry || typeof entry !== 'object') {
            return null;
        }

        if (!entry.updatedAt || Number.isNaN(new Date(entry.updatedAt).getTime())) {
            return null;
        }

        const sanitizedCounts = sanitizeCounts(entry.counts);
        if (!sanitizedCounts) {
            return null;
        }

        return {
            serviceType: Number.isInteger(entry.serviceType) ? entry.serviceType : -1,
            username: typeof entry.username === 'string' ? entry.username : '',
            instanceUrl: normalizeInstanceUrl(typeof entry.instanceUrl === 'string' ? entry.instanceUrl : ''),
            showCurrentWeekOnly: Boolean(entry.showCurrentWeekOnly),
            weekStartDay: Number.isInteger(entry.weekStartDay) ? entry.weekStartDay : 1,
            updatedAt: entry.updatedAt,
            counts: sanitizedCounts,
        };
    }

    async _writeCache(cacheData) {
        this._ensureCacheDirectory();

        const bytes = new GLib.Bytes(
            new TextEncoder().encode(JSON.stringify(cacheData, null, 2))
        );

        await new Promise((resolve, reject) => {
            this._cacheFile.replace_contents_bytes_async(
                bytes,
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null,
                (file, result) => {
                    try {
                        file.replace_contents_finish(result);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }
            );
        });

        cacheDebugLog(`Cache file write complete: ${this._cachePath}; entries=${Object.keys(cacheData.entries).length}`);
    }

    _ensureCacheDirectory() {
        const cacheDirectory = Gio.File.new_for_path(this._cacheDirPath);

        try {
            cacheDirectory.make_directory_with_parents(null);
        } catch (e) {
            if (!e.matches || !e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.EXISTS)) {
                throw e;
            }
        }
    }
}

"use strict";
import Soup from 'gi://Soup';

// User-Agent sent with every API request.
export const USER_AGENT = 'GNOME Shell Extension Weekly Commits';

let _session = null;

// Single Soup session shared by every contribution fetcher so connections are
// pooled and TLS handshakes reused, instead of constructing a fresh session
// (and connection) on every request. Created lazily on first use during
// enable() and torn down via destroySession() in disable().
export function getSession() {
    if (!_session) {
        _session = new Soup.Session();
    }

    return _session;
}

// Aborts any pending requests and drops the shared session. Must be called
// from disable() so no Soup.Session (and its connections) outlives the
// extension.
export function destroySession() {
    if (_session) {
        _session.abort();
        _session = null;
    }
}

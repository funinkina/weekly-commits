"use strict";
import Soup from 'gi://Soup';

// Single Soup session shared by every contribution fetcher so connections are
// pooled and TLS handshakes reused, instead of constructing a fresh session
// (and connection) on every request. Only imported in the shell process.
export const session = new Soup.Session();

// User-Agent sent with every API request.
export const USER_AGENT = 'GNOME Shell Extension Weekly Commits';

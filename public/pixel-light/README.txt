PIXEL G1s controller — /pixel-light/

Unlisted static controller. Do not add to navigation, blog posts, or sitemap.
index.html includes noindex/nofollow; this discourages indexing, not access.
No accounts, telemetry, dependencies, server, secrets, or hard-coded device address.

Deployment: existing site npm ci / npm run build workflow copies this public
directory unchanged to dist/pixel-light/. No separate deployment is required.
Verification: open https://gatnash.com/pixel-light/ in Android Chrome, tap
Connect light, select Pixel-G1s, then Apply brightness. Disconnect other
phones first. On load, reconnect to the last light if the browser exposes
previously granted devices. First use, unsupported browsers, revoked permission,
multiple lights without a saved choice, or an unavailable light fall back to
Connect light. No automatic permission picker, retry loop, or setting writes.
The default requested brightness is 5%; Apply is still required to change it.
Connection attempts time out after 15 seconds. Connecting does not change settings; values are requests,
not readings. White temperature and HSI colour remain experimental.

50% brightness packets matched the physically verified Windows test. The
standalone app's focused protocol tests and mobile UI/offline checks passed.
Android browser-to-light operation still requires user observation.

Service worker scope is /pixel-light/ only. Cached access needs a successful
first visit and can be removed by browser cache eviction. For a release,
increment CACHE in sw.js; close controller tabs and reopen online to update.
No background or iPhone control. Never broaden the service worker scope.

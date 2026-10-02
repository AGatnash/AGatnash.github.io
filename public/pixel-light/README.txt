PIXEL G1s controller — /pixel-light/

Unlisted static controller. Do not add to navigation, blog posts, or sitemap.
index.html includes noindex/nofollow; this discourages indexing, not access.
No accounts, telemetry, dependencies, server, secrets, or hard-coded device address.

Deployment: existing site npm ci / npm run build workflow copies this public
directory unchanged to dist/pixel-light/. No separate deployment is required.
Verification: open https://gatnash.com/pixel-light/ in Android Chrome, tap
Connect light, select Pixel-G1s, then Apply brightness. Disconnect other
phones first. Connecting does not change settings; values are requests,
not readings. White temperature and HSI colour remain experimental.

50% brightness packets matched the physically verified Windows test. The
standalone app's focused protocol tests and mobile UI/offline checks passed.
Android browser-to-light operation still requires user observation.

Service worker scope is /pixel-light/ only. Cached access needs a successful
first visit and can be removed by browser cache eviction. For a release,
increment CACHE in sw.js; close controller tabs and reopen online to update.
No background or iPhone control. Never broaden the service worker scope.

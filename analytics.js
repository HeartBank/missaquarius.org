// Site analytics: Cloudflare Web Analytics + HeartBank /api/track beacon.
// No-ops on local hosts so development doesn't emit CORS/network errors.
(function () {
    var h = location.hostname;
    if (
        h === "localhost" ||
        h === "127.0.0.1" ||
        h === "::1" ||
        h === "[::1]" ||
        h === "" ||
        h.endsWith(".local") ||
        location.protocol === "file:"
    ) {
        return;
    }

    // Cloudflare Web Analytics
    var cf = document.createElement("script");
    cf.defer = true;
    cf.src = "https://static.cloudflareinsights.com/beacon.min.js";
    cf.setAttribute(
        "data-cf-beacon",
        '{"token": "c14a2966c3ed43f1943cb9687d6b65bf"}'
    );
    document.head.appendChild(cf);

    // HeartBank analytics → thonly.org/api/track
    var ENDPOINT = "https://thonly.org/api/track";
    var deviceId;
    try {
        deviceId = localStorage.getItem("ma-device");
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem("ma-device", deviceId);
        }
    } catch (e) {
        deviceId = "anon";
    }
    function post(event, data) {
        try {
            fetch(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event: event,
                    data: data,
                    deviceId: deviceId,
                    location: Intl.DateTimeFormat().resolvedOptions().timeZone
                }),
                keepalive: true
            }).catch(function () {});
        } catch (e) {}
    }
    post("page_view", { path: location.pathname, ref: document.referrer });
    document.addEventListener("click", function (e) {
        // A click inside a shadow root is retargeted at the document, so
        // e.target is the HOST element and closest() from it never reaches the
        // anchor — which missed every link in a Lit component, i.e. nearly all
        // of them. composedPath() crosses shadow boundaries; closest() stays as
        // the pre-shadow-DOM fallback.
        var a = null;
        var path = (e.composedPath && e.composedPath()) || [];
        for (var i = 0; i < path.length; i++) {
            if (path[i].nodeType === 1 && path[i].matches("a[href]")) {
                a = path[i];
                break;
            }
        }
        if (!a && e.target.closest) a = e.target.closest("a[href]");
        if (!a) return;
        post("link_click", {
            href: a.href,
            internal: String(a.host === location.host)
        });
    });
})();

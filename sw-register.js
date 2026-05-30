// Service worker registration + "new version" refresh toast.
// Shared across all pages. Bumping CACHE in sw.js ships a new worker; this
// script detects the waiting worker and prompts the user to refresh. The
// click activates the waiting worker (SKIP_WAITING), which reloads the page.
(function () {
    if (!("serviceWorker" in navigator)) return;

    function showToast(onRefresh) {
        if (document.getElementById("sw-update-toast")) return;
        var bar = document.createElement("div");
        bar.id = "sw-update-toast";
        bar.setAttribute("role", "alert");
        bar.style.cssText = [
            "position:fixed",
            "left:50%",
            "bottom:16px",
            "transform:translateX(-50%)",
            "z-index:2147483647",
            "display:flex",
            "align-items:center",
            "gap:12px",
            "max-width:calc(100% - 32px)",
            "padding:12px 16px",
            "border-radius:10px",
            "background:#1f2937",
            "color:#fff",
            "box-shadow:0 10px 25px rgba(0,0,0,.25)",
            "font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif"
        ].join(";");

        var msg = document.createElement("span");
        msg.textContent = "A new version is available.";

        var refresh = document.createElement("button");
        refresh.type = "button";
        refresh.textContent = "Refresh";
        refresh.style.cssText =
            "cursor:pointer;border:0;border-radius:8px;padding:8px 14px;" +
            "background:#f59e0b;color:#fff;font-weight:600;";
        refresh.addEventListener("click", onRefresh);

        var close = document.createElement("button");
        close.type = "button";
        close.setAttribute("aria-label", "Dismiss");
        close.innerHTML = "&times;";
        close.style.cssText =
            "cursor:pointer;border:0;background:transparent;color:#cbd5e1;" +
            "font-size:20px;line-height:1;padding:0 4px;";
        close.addEventListener("click", function () {
            bar.remove();
        });

        bar.appendChild(msg);
        bar.appendChild(refresh);
        bar.appendChild(close);
        document.body.appendChild(bar);
    }

    // Set only when the user intentionally activates a waiting worker. The
    // controllerchange reload must fire for that case but NOT for the very
    // first install's clients.claim() — otherwise the initial (uncontrolled)
    // page load reloads itself and double-fires analytics/page_view.
    var refreshing = false;

    function promptUpdate(reg) {
        showToast(function () {
            if (reg.waiting) {
                refreshing = true;
                reg.waiting.postMessage({ type: "SKIP_WAITING" });
            }
        });
    }

    window.addEventListener("load", function () {
        navigator.serviceWorker
            .register("/sw.js")
            .then(function (reg) {
                // A worker may already be waiting from a previous visit.
                if (reg.waiting && navigator.serviceWorker.controller) {
                    promptUpdate(reg);
                }
                reg.addEventListener("updatefound", function () {
                    var installing = reg.installing;
                    if (!installing) return;
                    installing.addEventListener("statechange", function () {
                        if (
                            installing.state === "installed" &&
                            navigator.serviceWorker.controller
                        ) {
                            promptUpdate(reg);
                        }
                    });
                });
            })
            .catch(function () {});

        // Reload once the new worker takes control — but only when the user
        // asked for it. The first-ever install's clients.claim() also fires
        // controllerchange; reloading then would re-run page scripts and
        // double-count analytics on the initial visit.
        var reloaded = false;
        navigator.serviceWorker.addEventListener(
            "controllerchange",
            function () {
                if (!refreshing || reloaded) return;
                reloaded = true;
                window.location.reload();
            }
        );
    });
})();

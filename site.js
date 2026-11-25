// The language and theme choices, from the footer's two toggles (founder 2026-11-24: "add language toggle and theme
// toggle to the footer (one line, space between)"). Ported from heartbank.org's src/site.ts so the estate behaves one way.
// Nothing about a person is stored beyond the two choices, and every storage call is wrapped: storage can be blocked
// and the page must read the same without it.
(function () {
    var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
    var put = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* blocked: the page still works */ } };
    var del = function (k) { try { localStorage.removeItem(k); } catch (e) { /* blocked */ } };

    // ---- language: stored choice → the browser's language → timezone as the last tiebreak only. ----
    // Only the ROOT redirects, so a crawler (English, no storage) sees every page as written, and a visit to a
    // page by link is never overridden once the reader has chosen with the toggle.
    document.querySelectorAll("a[data-lang]").forEach(function (a) {
        a.addEventListener("click", function () { put("ma-lang", a.getAttribute("data-lang") || "en"); });
    });
    if (location.pathname === "/") {
        var stored = get("ma-lang");
        var lang = (navigator.language || "").toLowerCase();
        var tz = "";
        try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* unknown */ }
        var wantsKhmer =
            stored === "km" ||
            (!stored && lang.indexOf("km") === 0) ||
            // a Khmer reader in Long Beach has a Pacific timezone, so timezone only breaks a tie
            (!stored && (lang === "" || lang.indexOf("en") === 0) && tz === "Asia/Phnom_Penh");
        if (wantsKhmer) location.replace("/km/" + location.search + location.hash);
    }

    // ---- theme: the system's by default; the toggle is an override that can be cleared (Auto). ----
    var root = document.documentElement;
    var paint = function (choice) {
        if (choice === "light" || choice === "dark") root.setAttribute("data-theme", choice);
        else root.removeAttribute("data-theme");
        document.querySelectorAll("[data-theme-choice]").forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.getAttribute("data-theme-choice") === choice));
        });
    };
    var saved = get("ma-theme");
    paint(saved === "light" || saved === "dark" ? saved : "auto");
    document.querySelectorAll("[data-theme-choice]").forEach(function (b) {
        b.addEventListener("click", function () {
            var choice = b.getAttribute("data-theme-choice") || "auto";
            if (choice === "auto") del("ma-theme"); else put("ma-theme", choice);
            paint(choice);
        });
    });
})();

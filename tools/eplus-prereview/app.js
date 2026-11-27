/* eplus-prereview web page: pick run folders, run the checker in a worker, show the report. */
(function () {
  "use strict";
  var root = document.getElementById("pr-app");
  if (!root) return;
  var BUNDLE = root.getAttribute("data-bundle");
  var VERSION = root.getAttribute("data-version");
  var REPO = root.getAttribute("data-repo");
  var EMAIL = root.getAttribute("data-email");
  var KEEP = /\.(sql|err|idf|expidf)$/i;
  var STORE = "prereview.project.v1";

  var state = { proposed: [], baselines: [], result: null, busy: false };
  var worker = null, warm = null, pending = null;

  function $(sel) { return root.querySelector(sel); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(b > 104857600 ? 0 : 1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }

  // ---- worker -------------------------------------------------------------------------
  function getWorker() {
    if (worker) return worker;
    worker = new Worker(root.getAttribute("data-worker"));
    worker.onmessage = function (ev) {
      var m = ev.data;
      if (m.type === "ready" && warm) { warm.resolve(); }
      if ((m.type === "result" || m.type === "error") && pending) {
        var p = pending; pending = null;
        if (m.type === "error") p.reject(new Error(m.message)); else p.resolve(m.payload);
      }
      if (m.type === "error" && warm && !warm.done) { warm.reject(new Error(m.message)); }
    };
    worker.onerror = function (e) {
      var msg = "The checker stopped unexpectedly" + (e && e.message ? " (" + e.message + ")" : "") +
        ". Very large SQL files can exhaust the browser's memory; try a desktop browser or the command-line version.";
      if (pending) { pending.reject(new Error(msg)); pending = null; }
      if (warm && !warm.done) warm.reject(new Error(msg));
      worker.terminate(); worker = null; warm = null;
    };
    return worker;
  }

  function prewarm() {
    if (warm) return warm.promise;
    warm = {};
    warm.promise = new Promise(function (res, rej) {
      warm.resolve = function () { warm.done = true; res(); };
      warm.reject = function (e) { warm.done = true; var w = warm; warm = null; rej(e); };
    });
    getWorker().postMessage({ type: "init", bundle: BUNDLE });
    return warm.promise;
  }

  // ---- collecting files -----------------------------------------------------------------
  function readEntries(reader) {
    return new Promise(function (res, rej) { reader.readEntries(res, rej); });
  }
  function walk(entry, prefix, out) {
    if (entry.isFile) {
      if (!KEEP.test(entry.name)) return Promise.resolve();
      return new Promise(function (res) {
        entry.file(function (f) { out.push({ path: prefix + entry.name, file: f }); res(); }, function () { res(); });
      });
    }
    if (entry.isDirectory) {
      var reader = entry.createReader(), all = [];
      var next = function () {
        return readEntries(reader).then(function (batch) {
          if (!batch.length) return Promise.all(all.map(function (c) { return walk(c, prefix + entry.name + "/", out); }));
          all = all.concat(Array.prototype.slice.call(batch));
          return next();
        });
      };
      return next();
    }
    return Promise.resolve();
  }
  function fromDrop(dt) {
    var out = [], jobs = [];
    var items = dt.items ? Array.prototype.slice.call(dt.items) : [];
    var entries = items.map(function (it) { return it.webkitGetAsEntry ? it.webkitGetAsEntry() : null; });
    if (entries.some(Boolean)) {
      entries.forEach(function (en) { if (en) jobs.push(walk(en, "", out)); });
      return Promise.all(jobs).then(function () { return out; });
    }
    Array.prototype.forEach.call(dt.files || [], function (f) { if (KEEP.test(f.name)) out.push({ path: f.name, file: f }); });
    return Promise.resolve(out);
  }
  function fromInput(input) {
    var out = [];
    Array.prototype.forEach.call(input.files || [], function (f) {
      if (KEEP.test(f.name)) out.push({ path: f.webkitRelativePath || f.name, file: f });
    });
    return out;
  }

  // Group files into runs: one run per folder, split by file stem when a folder holds several .sql files.
  function groupRuns(items) {
    var dirs = {};
    items.forEach(function (it) {
      var i = it.path.lastIndexOf("/");
      var dir = i < 0 ? "" : it.path.slice(0, i);
      (dirs[dir] = dirs[dir] || []).push(it);
    });
    var runs = [];
    Object.keys(dirs).sort().forEach(function (dir) {
      var files = dirs[dir];
      var stem = function (n) { return n.replace(/\.[^.]+$/, ""); };
      var sqls = files.filter(function (it) { return /\.sql$/i.test(it.file.name); });
      var hasErr = files.some(function (it) { return /\.err$/i.test(it.file.name); });
      if (!sqls.length && !hasErr) return;
      var base = dir ? dir.split("/").pop() : "";
      if (sqls.length <= 1) {
        runs.push({ name: base || (sqls[0] ? stem(sqls[0].file.name) : "run"), path: dir, files: files.map(function (x) { return x.file; }) });
        return;
      }
      sqls.forEach(function (s) {
        var st = stem(s.file.name);
        var own = files.filter(function (it) {
          var n = it.file.name;
          return stem(n) === st || (st === "eplusout" && n === "in.idf");
        });
        runs.push({ name: (base ? base + " · " : "") + st, path: dir + "/" + st, files: own.map(function (x) { return x.file; }) });
      });
    });
    return runs;
  }

  // ---- rendering the picked runs --------------------------------------------------------
  function runTags(run) {
    var have = function (re) { return run.files.some(function (f) { return re.test(f.name); }); };
    var size = run.files.reduce(function (a, f) { return a + f.size; }, 0);
    return [["SQL", have(/\.sql$/i)], ["ERR", have(/\.err$/i)], ["IDF", have(/\.(idf|expidf)$/i)]]
      .map(function (t) { return '<span class="pr-tag' + (t[1] ? "" : " is-off") + '">' + t[0] + "</span>"; }).join("") +
      '<span class="pr-size">' + fmtSize(size) + "</span>";
  }
  function drawList(kind) {
    var list = $("[data-list='" + kind + "']");
    list.innerHTML = "";
    state[kind].forEach(function (run, i) {
      var li = el("li", "pr-run");
      var name = el("span", "pr-run-name", run.path || run.name);
      var tags = el("span", "pr-run-tags"); tags.innerHTML = runTags(run);
      var rm = el("button", "pr-rm", "Remove"); rm.type = "button";
      rm.setAttribute("aria-label", "Remove " + (run.path || run.name));
      rm.onclick = function () { state[kind].splice(i, 1); drawList(kind); refresh(); };
      li.appendChild(name); li.appendChild(tags); li.appendChild(rm);
      list.appendChild(li);
    });
    var zone = $("[data-zone='" + kind + "']");
    zone.classList.toggle("has-runs", state[kind].length > 0);
  }
  function note(kind, text) {
    var n = $("[data-note='" + kind + "']");
    n.textContent = text || "";
    n.hidden = !text;
  }

  function addRuns(kind, items) {
    note(kind, "");
    var runs = groupRuns(items);
    if (!runs.length) {
      note(kind, "No EnergyPlus results found there. Pick the run folder that holds eplusout.sql (or <name>.sql) and eplusout.err.");
      return;
    }
    if (kind === "proposed") {
      var pick = runs;
      if (runs.length > 1) {
        var prop = runs.filter(function (r) { return /prop/i.test(r.path); });
        if (prop.length === 1) {
          pick = prop;
          var others = runs.filter(function (r) { return r !== prop[0]; });
          state.baselines = state.baselines.concat(others);
          drawList("baselines");
          note("proposed", "Found " + runs.length + " runs. Took “" + prop[0].path + "” as the proposed model and added the other " + others.length + " as baselines; move them if that's wrong.");
        } else {
          note("proposed", "Found " + runs.length + " runs here. Drop only the proposed model's run folder, or name it with “proposed”.");
          return;
        }
      }
      state.proposed = [pick[0]];
    } else {
      state.baselines = state.baselines.concat(runs);
      if (state.baselines.length > 8) note(kind, "That's more than the usual four baseline orientations. Check each one is a baseline run.");
    }
    drawList(kind);
    refresh();
    prewarm().catch(function () {});
  }

  // ---- drop zones -----------------------------------------------------------------------
  ["proposed", "baselines"].forEach(function (kind) {
    var zone = $("[data-zone='" + kind + "']");
    zone.addEventListener("dragover", function (e) { e.preventDefault(); zone.classList.add("is-over"); });
    zone.addEventListener("dragleave", function (e) { if (!zone.contains(e.relatedTarget)) zone.classList.remove("is-over"); });
    zone.addEventListener("drop", function (e) {
      e.preventDefault(); zone.classList.remove("is-over");
      fromDrop(e.dataTransfer).then(function (items) { addRuns(kind, items); });
    });
    zone.querySelectorAll("input[type=file]").forEach(function (input) {
      input.addEventListener("change", function () { addRuns(kind, fromInput(input)); input.value = ""; });
    });
  });
  // Stop a stray drop elsewhere from opening the file in the tab.
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("drop", function (e) { e.preventDefault(); });

  // ---- project facts --------------------------------------------------------------------
  var form = $("#pr-form");
  function project() {
    var fd = new FormData(form), o = {};
    fd.forEach(function (v, k) { o[k] = typeof v === "string" ? v.trim() : v; });
    o.rotation_exception = !!form.querySelector("[name=rotation_exception]").checked;
    return o;
  }
  function syncEdition() {
    var ed = form.querySelector("[name=edition]:checked").value;
    form.querySelectorAll("[data-ed]").forEach(function (n) { n.hidden = n.getAttribute("data-ed") !== ed; });
  }
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved) Object.keys(saved).forEach(function (k) {
      var inputs = form.querySelectorAll("[name='" + k + "']");
      inputs.forEach(function (n) {
        if (n.type === "radio") n.checked = n.value === saved[k];
        else if (n.type === "checkbox") n.checked = !!saved[k];
        else if (k !== "name") n.value = saved[k];
      });
    });
  } catch (e) { /* storage unavailable */ }
  form.addEventListener("change", function () {
    syncEdition();
    try { var p = project(); delete p.name; localStorage.setItem(STORE, JSON.stringify(p)); } catch (e) { /* ignore */ }
  });
  syncEdition();

  // ---- running --------------------------------------------------------------------------
  var go = $("#pr-go"), status = $("#pr-status");
  function refresh() {
    go.disabled = state.busy || !state.proposed.length;
    $("#pr-hint").textContent = !state.proposed.length ? "Add the proposed run to start." :
      !state.baselines.length ? "No baselines yet: checks that compare proposed and baseline will be skipped." : "";
  }
  function setStatus(text, cls) { status.textContent = text; status.className = "pr-status" + (cls ? " " + cls : ""); }

  go.addEventListener("click", function () {
    if (go.disabled) return;
    state.busy = true; refresh();
    var t0 = performance.now();
    var first = !(warm && warm.done);
    setStatus(first ? "Loading the checker (about 14 MB, once per visit)…" : "Checking…", "is-busy");
    prewarm().then(function () {
      setStatus("Checking " + (1 + state.baselines.length) + " run" + (state.baselines.length ? "s" : "") + "…", "is-busy");
      return new Promise(function (res, rej) {
        pending = { resolve: res, reject: rej };
        var runs = state.proposed.concat(state.baselines).map(function (r) { return { name: r.name, shown: r.path || r.name, files: r.files }; });
        getWorker().postMessage({ type: "run", bundle: BUNDLE, runs: runs, project: project(), forceMount: /[?&]mount=1/.test(location.search) });
      });
    }).then(function (out) {
      if (out.error) throw new Error(out.error);
      state.result = out;
      showResult(out, (performance.now() - t0) / 1000);
      setStatus("");
    }).catch(function (err) {
      setStatus(String(err.message || err), "is-error");
    }).then(function () { state.busy = false; refresh(); });
  });

  // ---- results --------------------------------------------------------------------------
  var ORDER = ["FAIL", "REVIEW", "PASS", "INFO", "SKIPPED"];
  function counts(findings) {
    var c = {}; ORDER.forEach(function (k) { c[k] = 0; });
    findings.forEach(function (f) { c[f.status] = (c[f.status] || 0) + 1; });
    return c;
  }
  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function slug(s) { return (s || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project"; }

  function feedbackBody(out) {
    var j = out.json, c = counts(j.findings);
    var lines = j.findings.filter(function (f) { return f.status === "FAIL" || f.status === "REVIEW"; })
      .map(function (f) { return "- " + f.status + " " + f.rule_id; });
    var uniq = lines.filter(function (x, i) { return lines.indexOf(x) === i; });
    return [
      "**What happened?** (false alarm / missed something a reviewer flagged / crash / unclear fix)",
      "", "", "",
      "**Which rule, and what did the reviewer actually say?**", "", "", "",
      "---",
      "Please don't paste project names, drawings or model files here.",
      "",
      "prereview " + out.version + " (web), 90.1-" + (j.project.edition || "?") + ", " + j.models.length + " runs",
      "Counts: " + ORDER.map(function (k) { return k + " " + c[k]; }).join(", "),
      "Flagged rule ids:", uniq.join("\n") || "(none)"
    ].join("\n");
  }

  function showResult(out, secs) {
    var j = out.json, c = counts(j.findings);
    var box = $("#pr-result");
    box.hidden = false;
    $("#pr-counts").innerHTML = ORDER.map(function (k) {
      return '<div class="pr-count pr-count--' + k.toLowerCase() + (c[k] ? "" : " is-zero") + '"><dt>' + k + "</dt><dd>" + c[k] + "</dd></div>";
    }).join("");
    $("#pr-meta").textContent = j.models.length + " run" + (j.models.length > 1 ? "s" : "") + " checked in " +
      secs.toFixed(1) + " s, prereview " + out.version + ". Nothing left this browser.";
    var frame = $("#pr-frame");
    frame.srcdoc = out.html;
    var name = slug(j.project.name);
    $("#pr-dl-html").onclick = function () { download("prereview-" + name + ".html", out.html, "text/html"); };
    $("#pr-dl-json").onclick = function () { download("prereview-" + name + ".json", JSON.stringify(j, null, 1), "application/json"); };
    var body = feedbackBody(out);
    $("#pr-fb-gh").href = "https://github.com/" + REPO + "/issues/new?title=" +
      encodeURIComponent("Web check feedback: ") + "&body=" + encodeURIComponent(body);
    $("#pr-fb-mail").href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("eplus-prereview feedback") +
      "&body=" + encodeURIComponent(body);
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  frameFit();
  function frameFit() {
    var frame = $("#pr-frame");
    frame.addEventListener("load", function () {
      try {
        var d = frame.contentDocument;
        if (d && d.documentElement) frame.style.height = Math.max(600, d.documentElement.scrollHeight + 24) + "px";
      } catch (e) { /* sandboxed */ }
    });
  }

  var vEl = document.getElementById("pr-version");
  if (vEl) vEl.textContent = VERSION;
  refresh();
})();

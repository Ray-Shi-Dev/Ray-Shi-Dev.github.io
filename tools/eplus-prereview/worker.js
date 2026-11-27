/* eplus-prereview in the browser. Runs the Python checker in Pyodide inside this worker.
   The run files are mounted read-only from the File objects the user picked (WORKERFS):
   nothing is copied off the machine, and nothing is sent anywhere. */
"use strict";
const PYODIDE = "/assets/pyodide/0.27.7/";
importScripts(PYODIDE + "pyodide.js");

const COPY_LIMIT = 1200 * 1048576;
let ready = null;

function init(bundle) {
  if (!ready) {
    ready = (async () => {
      const py = await loadPyodide({ indexURL: PYODIDE, stdout: () => {}, stderr: () => {} });
      await py.loadPackage("sqlite3", { messageCallback: () => {}, errorCallback: () => {} });
      const res = await fetch(bundle);
      if (!res.ok) throw new Error("Could not load the checker (" + res.status + ").");
      py.unpackArchive(await res.arrayBuffer(), "zip", { extractDir: "/lib" });
      py.runPython("import sys\nsys.path.insert(0, '/lib')\nimport prereview.api, prereview.report.html");
      return py;
    })();
    ready.catch(() => { ready = null; });
  }
  return ready;
}

const RUN_PY = `
import json, traceback
from prereview import __version__
from prereview.api import review, to_json
from prereview.report.html import render
from prereview.rules.base import ProjectInfo

def _go(spec):
    spec = json.loads(spec)
    pj = spec["project"]
    info = ProjectInfo(
        name=pj.get("name") or "Untitled project",
        edition=pj.get("edition") or "2010",
        building_type=pj.get("building_type") or None,
        floors_above_grade=int(pj["floors"]) if str(pj.get("floors") or "").strip().isdigit() else None,
        heating_source=pj.get("heating_source") or None,
        climate_zone=(pj.get("climate_zone") or "").strip().upper() or None,
        rotation_exception=bool(pj.get("rotation_exception")),
    )
    try:
        ctx, findings = review(spec["proposed"], spec["baselines"], info)
    except ValueError as exc:
        return json.dumps({"error": str(exc)})
    for m, shown in zip(ctx.models, spec["shown"]):
        m.path = shown
    try:
        data = to_json(ctx, findings)
        for m in data["models"]:
            m.pop("path", None)
        return json.dumps({"html": render(ctx, findings), "json": data, "version": __version__}, default=str)
    finally:
        for m in ctx.models:
            if m.sql is not None:
                m.sql.close()
`;

self.onmessage = async (ev) => {
  const msg = ev.data;
  try {
    if (msg.type === "init") {
      await init(msg.bundle);
      self.postMessage({ type: "ready" });
      return;
    }
    if (msg.type !== "run") return;
    const py = await init(msg.bundle);
    const FS = py.FS;
    const mounted = [], copied = [];
    const dirs = [];
    try {
      // Copy into memory when it fits (SQLite reads it ~30x faster than through WORKERFS);
      // very large runs are mounted in place instead, which is slower but needs no copy.
      const total = msg.runs.reduce((a, r) => a + r.files.reduce((b, f) => b + f.size, 0), 0);
      const copy = total < COPY_LIMIT && !msg.forceMount;
      for (let i = 0; i < msg.runs.length; i++) {
        const run = msg.runs[i];
        const dir = "/runs/r" + i + "/" + run.name.replace(/[^A-Za-z0-9 _.-]/g, "_");
        FS.mkdirTree(dir);
        if (copy) {
          for (const f of run.files) FS.writeFile(dir + "/" + f.name, new Uint8Array(await f.arrayBuffer()));
          copied.push(dir);
        } else {
          FS.mount(FS.filesystems.WORKERFS, { files: run.files }, dir);
          mounted.push(dir);
        }
        dirs.push(dir);
      }
      const spec = { project: msg.project, proposed: dirs[0], baselines: dirs.slice(1),
                     shown: msg.runs.map((r) => r.shown || r.name) };
      py.globals.set("_spec", JSON.stringify(spec));
      const out = py.runPython(RUN_PY + "\n_go(_spec)");
      self.postMessage({ type: "result", payload: JSON.parse(out) });
    } finally {
      for (const d of mounted) { try { FS.unmount(d); } catch (e) { /* already gone */ } }
      for (const d of copied) {
        try { for (const n of FS.readdir(d)) if (n !== "." && n !== "..") FS.unlink(d + "/" + n); } catch (e) { /* ignore */ }
      }
    }
  } catch (err) {
    self.postMessage({ type: "error", message: String((err && err.message) || err) });
  }
};

/* Harbor - certificates, grades and diplomas.
 *
 * How it works (no changes needed in the adventure apps):
 *  - Each child has a "grade year" record (families/{CODE}_hb -> years[child][gradeId]) holding a BASELINE snapshot of every
 *    app's progress taken when that grade began. Progress for the grade = current progress minus baseline.
 *    A child's first record starts with a zero baseline, so everything done so far counts toward their current grade.
 *    Changing a child's year/class in Harbor closes the old year (awards are issued) and starts a fresh baseline.
 *  - Per app: completion = units finished / the app's goal (apps.js `goal`), quality = accuracy / star average.
 *    Certificate at >= CERT_AT of the goal. Score = 60% quality + 40% completion. Bands never say "fail".
 *  - Diploma: DIPLOMA_MIN or more certificates in the same grade year.
 *  - Awards are written once and kept (never taken back), so they are safe to print and keep.
 */
(function () {
  "use strict";
  const CERT_AT = 0.8, DIPLOMA_MIN = 3, W_QUALITY = 0.6, W_DONE = 0.4, MASTERED_MIN_TRIES = 5, MASTERED_PCT = 70;
  const A = {
    data: { years: {}, style: {} },   // mirror of families/{CODE}_hb
    loaded: "", ver: 1, onChange: null
  };
  const key = id => String(id).replace(/[^A-Za-z0-9_-]/g, "_");
  const zero = () => ({ units: 0, stars: 0, at: 0, co: 0, qSum: 0, qN: 0 });
  A.BANDS = [
    { min: 90, name: "With Distinction", short: "Distinction", letter: "A", emoji: "🌟" },
    { min: 75, name: "With Merit", short: "Merit", letter: "B", emoji: "🏅" },
    { min: 60, name: "Proficient", short: "Proficient", letter: "C", emoji: "✅" },
    { min: 0, name: "Developing", short: "Developing", letter: "D", emoji: "🌱" }
  ];
  A.band = score => A.BANDS.find(b => score >= b.min);
  A.label = (e, kid) => { const b = A.band(e.score); return A.styleOf(kid) === "letters" ? b.letter : b.name; };
  A.styleOf = kid => (A.data.style && A.data.style[key(kid.id)]) || "bands";

  /* ---- cumulative metrics for one app ---- */
  A.metrics = function (S, helpers, p, app) {
    const m = zero();
    if (app.subject) {
      const topics = helpers.topicsOf(p).filter(t => t.subject === app.subject);
      topics.forEach(t => { m.at += t.at; m.co += t.co; if (t.at >= MASTERED_MIN_TRIES && t.pct >= MASTERED_PCT) m.units++; });
      m.qSum = m.co; m.qN = m.at;   // accuracy over questions
      return m;
    }
    const pr = (S.cache && S.cache[app.progress] && S.cache[app.progress][p.id]) || null;
    if (!pr) return m;
    ["labs", "ch", "games"].forEach(g => Object.values(pr[g] || {}).forEach(x => { const s = Math.max(0, Math.min(3, x.stars || 0)); m.stars += s; m.qSum += s / 3 * 100; m.qN++; }));
    Object.values(pr.quiz || {}).forEach(x => { m.stars += (x.pct >= 90 ? 3 : x.pct >= 70 ? 2 : 1); m.qSum += Math.max(0, Math.min(100, x.pct || 0)); m.qN++; });
    m.units = Object.keys(pr.badges || {}).length;
    return m;
  };
  const diff = (c, b) => { b = b || zero(); const d = {}; for (const k in c) d[k] = Math.max(0, (c[k] || 0) - (b[k] || 0)); return d; };

  /* ---- grade for one app in one grade year ---- */
  A.evaluate = function (cur, base, app) {
    const d = diff(cur, base), goal = (app.goal && app.goal.units) || 10;
    const completion = Math.min(1, d.units / goal);
    const quality = d.qN > 0 ? Math.max(0, Math.min(100, d.qSum / d.qN)) : 0;
    const score = Math.round(W_QUALITY * quality + W_DONE * completion * 100);
    return { units: d.units, goal, completion, quality: Math.round(quality), score, earned: completion >= CERT_AT && d.qN > 0 };
  };

  A.apps = () => window.HARBOR_APPS.filter(a => a.goal && (a.subject || a.progress));

  /* ---- persistence ---- */
  async function ref(H) { const { F, db } = await H.fsLoad(); return { F, r: F.doc(db, "families", H.S.family + "_hb") }; }
  A.load = async function (H) {
    if (!H.S.family) return;
    try {
      const { F, r } = await ref(H); const s = await F.getDoc(r);
      const d = s.exists() ? s.data() : {};
      A.data = { years: d.years || {}, style: d.style || {} }; A.loaded = H.S.family;
    } catch (e) { /* offline: keep what we have */ }
  };
  async function write(H, patch) {
    const { F, r } = await ref(H);
    await F.setDoc(r, Object.assign({ app: "harbor", v: A.ver, ts: Date.now() }, patch), { merge: true });
  }

  /* ---- keep records up to date; issue anything newly earned ---- */
  A.sync = async function (H) {
    if (!H.S.family || !H.S.cache) return;
    await A.load(H);   // always start from the stored copy so two devices never disagree
    const kids = H.profiles(), apps = A.apps(), patch = { years: {} }, news = [];
    kids.forEach(p => {
      const ck = key(p.id), gk = key(p.gradeId), years = (A.data.years[ck] = A.data.years[ck] || {});
      let yr = years[gk];
      if (!yr) {   // first time we see this grade for this child: baseline is zero unless they already had a different grade on record
        yr = years[gk] = { startedAt: Date.now(), grade: String(p.gradeId), base: {}, awards: {} };
        patch.years[ck] = patch.years[ck] || {}; patch.years[ck][gk] = { startedAt: yr.startedAt, grade: yr.grade, base: {}, awards: {} };
      }
      let changed = false;
      apps.forEach(app => {
        if (yr.awards && yr.awards[app.id]) return;
        const cur = A.metrics(H.S, H, p, app), ev = A.evaluate(cur, yr.base && yr.base[app.id], app);
        if (ev.earned) {
          const aw = { score: ev.score, quality: ev.quality, completion: Math.round(ev.completion * 100), at: Date.now() };
          yr.awards = yr.awards || {}; yr.awards[app.id] = aw; changed = true;
          patch.years[ck] = patch.years[ck] || {}; patch.years[ck][gk] = patch.years[ck][gk] || {};
          patch.years[ck][gk].awards = Object.assign(patch.years[ck][gk].awards || {}, { [app.id]: aw });
          news.push({ kid: p, app, kind: "certificate" });
        }
      });
      const aws = Object.entries(yr.awards || {});
      if (aws.length >= DIPLOMA_MIN && !yr.diploma) {
        const avg = Math.round(aws.reduce((a, [, x]) => a + x.score, 0) / aws.length);
        yr.diploma = { score: avg, apps: aws.map(([k]) => k), at: Date.now() }; changed = true;
        patch.years[ck] = patch.years[ck] || {}; patch.years[ck][gk] = patch.years[ck][gk] || {};
        patch.years[ck][gk].diploma = yr.diploma;
        news.push({ kid: p, kind: "diploma" });
      }
    });
    if (Object.keys(patch.years).length) { try { await write(H, patch); } catch (e) { return; } }
    news.forEach(n => H.toast(n.kind === "diploma" ? "🎓 " + n.kid.name + " earned a diploma!" : "🏅 " + n.kid.name + " earned the " + n.app.name.replace(" Adventure", "") + " certificate!"));
    if (A.onChange) A.onChange();
  };

  /* ---- a new year/class: close the old year (issue awards), then start a fresh baseline ---- */
  A.rollover = async function (H, p, newGrade) {
    if (String(p.gradeId) === String(newGrade)) return;
    await A.sync(H);   // issue anything already earned in the old grade
    const ck = key(p.id), gk = key(newGrade), years = (A.data.years[ck] = A.data.years[ck] || {});
    if (years[gk]) return;   // moved back to a grade that already has a record: keep it
    const base = {}; A.apps().forEach(app => { base[app.id] = A.metrics(H.S, H, p, app); });
    const yr = { startedAt: Date.now(), grade: String(newGrade), base, awards: {} };
    years[gk] = yr;
    try { await write(H, { years: { [ck]: { [gk]: yr } } }); } catch (e) { }
  };

  A.setStyle = async function (H, p, style) {
    A.data.style = A.data.style || {}; A.data.style[key(p.id)] = style;
    try { await write(H, { style: { [key(p.id)]: style } }); } catch (e) { }
  };

  /* ---- views of the data for the UI ---- */
  A.yearsFor = p => Object.values(A.data.years[key(p.id)] || {}).sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
  A.current = p => (A.data.years[key(p.id)] || {})[key(p.gradeId)] || null;
  A.progressRows = function (H, p) {
    const yr = A.current(p) || { base: {}, awards: {} };
    return A.apps().filter(a => !H.S.hidden.includes(a.id)).map(app => {
      const cur = A.metrics(H.S, H, p, app), ev = A.evaluate(cur, yr.base && yr.base[app.id], app), aw = yr.awards && yr.awards[app.id];
      return { app, ev, award: aw || null };
    }).filter(r => r.ev.units > 0 || r.award || r.ev.completion > 0 || H.hasAny(p, r.app));
  };

  /* ---- printable certificate (outline only: saves ink) ---- */
  A.certificateHTML = function (H, p, grade, kind, appId) {
    const yr = (A.data.years[key(p.id)] || {})[key(grade)]; if (!yr) return "";
    const g = window.HARBOR_GRADES[grade], gl = g ? (g[H.country()] || g.IE) : "";
    const e = kind === "diploma" ? yr.diploma : (yr.awards || {})[appId]; if (!e) return "";
    const date = new Date(e.at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    const mark = A.label(e, p), app = window.HARBOR_APPS.find(a => a.id === appId);
    const names = kind === "diploma" ? yr.diploma.apps.map(id => { const a = window.HARBOR_APPS.find(x => x.id === id); return a ? a.name : id; }).join(" · ") : "";
    return `<div class="cert"><div class="cert-in">
      <div class="cert-top">${kind === "diploma" ? "🎓" : (app ? app.emoji : "🏅")}</div>
      <p class="cert-kind">${kind === "diploma" ? "Diploma of Achievement" : "Certificate of Completion"}</p>
      <p class="cert-small">This is proudly presented to</p>
      <h1 class="cert-name">${H.esc(p.name)}</h1>
      <p class="cert-small">${kind === "diploma" ? "for completing the " + H.esc(gl) + " programme across" : "for completing " + H.esc(gl) + " in"}</p>
      <h2 class="cert-what">${kind === "diploma" ? H.esc(names) : H.esc(app ? app.name : "")}</h2>
      <p class="cert-mark">${H.esc(mark)}</p>
      <div class="cert-foot"><span>${H.esc(date)}</span><span>Harbor · Siler Technology</span><span>Teacher: ____________</span></div>
    </div></div>`;
  };
  A.showCertificate = function (H, html) {
    if (!html) return;
    let o = document.getElementById("certOverlay"); if (o) o.remove();
    o = document.createElement("div"); o.id = "certOverlay";
    o.innerHTML = `<div class="cert-bar"><button class="btn sm" id="certPrint">🖨️ Print / Save as PDF</button><button class="btn sm ghost" id="certClose">Close</button></div>${html}`;
    document.body.appendChild(o);
    o.querySelector("#certClose").onclick = () => o.remove();
    o.querySelector("#certPrint").onclick = () => { try { window.print(); } catch (e) { H.toast("Printing isn't available here. Open Harbor in your browser to print."); } };
  };
  A.css = `
#certOverlay{position:fixed;inset:0;z-index:99;background:#fff;overflow:auto;padding:calc(var(--sat) + 10px) 12px 24px}
.cert-bar{display:flex;gap:8px;justify-content:center;margin-bottom:12px}
.cert{max-width:860px;margin:0 auto;aspect-ratio:1.414/1;border:3px double #1A2E4A;padding:10px;background:#fff;color:#1A2E4A;font-family:Georgia,serif}
.cert-in{height:100%;border:1px solid #1A2E4A;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4% 6%;gap:1.2%}
.cert-top{font-size:clamp(2rem,7vw,3.4rem)}
.cert-kind{font-size:clamp(1rem,3.6vw,1.7rem);letter-spacing:.12em;text-transform:uppercase;margin:0}
.cert-small{font-size:clamp(.7rem,2vw,1rem);margin:0;font-style:italic}
.cert-name{font-size:clamp(1.5rem,6vw,3rem);margin:0;border-bottom:1px solid #1A2E4A;padding:0 4% 2px}
.cert-what{font-size:clamp(1rem,3.6vw,1.8rem);margin:0}
.cert-mark{font-size:clamp(.9rem,2.6vw,1.3rem);border:1.5px solid #1A2E4A;border-radius:999px;padding:2px 18px;margin:0}
.cert-foot{display:flex;justify-content:space-between;gap:8px;width:100%;font-size:clamp(.55rem,1.6vw,.85rem);margin-top:3%}
@media print{body>*:not(#certOverlay){display:none!important}#certOverlay{position:static;padding:0}.cert-bar{display:none}@page{size:landscape;margin:10mm}}`;
  window.HarborAwards = A;
})();

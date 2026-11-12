/* Harbor - entitlements (what a family has access to). Inert today: HARBOR_ENFORCE_ENTITLEMENTS is false so everything opens.
 *
 * Design (so billing can be added later without touching any adventure app):
 *  - Facts live in Firestore doc  entitlements/{FAMILY_CODE}  = { plan, products:{ <productId>: { kind:"oneTime"|"term", until?:ms } }, ts }
 *    That collection is READ-ONLY for clients (see firebase-rules). Only a server you control (a Cloudflare Worker receiving the
 *    payment provider's webhook) may write it, so nobody can unlock paid apps by editing their own data.
 *  - Apps with tier "free" can never be locked, whatever the document says.
 *  - Offline or unreachable: the last good copy is used; if there is none, the app opens (never lock a child out of learning
 *    because the network dropped).
 *  - Lapsed term plans stop NEW access to that app only. Progress and awards are never removed. */
(function () {
  "use strict";
  const KEY = "harbor_ent_v1";
  const E = { doc: null, loaded: false };
  try { E.doc = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { }
  E.load = async function (H) {
    if (!H.S.family) return;
    try {
      const { F, db } = await H.fsLoad(), s = await F.getDoc(F.doc(db, "entitlements", H.S.family));
      E.doc = s.exists() ? s.data() : { products: {} }; E.loaded = true;
      try { localStorage.setItem(KEY, JSON.stringify(E.doc)); } catch (e) { }
    } catch (e) { /* keep last good copy */ }
  };
  E.can = function (app) {
    if (!app) return true;
    if (!app.tier || app.tier === "free") return true;
    if (!window.HARBOR_ENFORCE_ENTITLEMENTS) return true;
    if (!E.doc) return true;                       // never seen the server: do not lock anyone out
    const p = (E.doc.products || {})[app.id] || (E.doc.products || {}).all;
    if (!p) return false;
    if (p.kind === "term" && p.until && p.until < Date.now()) return false;
    return true;
  };
  window.HarborEnt = E;
})();

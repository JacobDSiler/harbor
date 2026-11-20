# Harbor family ownership — Firestore rules (draft, NOT deployed)

This is the rules change that tightens writes to Google-authenticated owners
once Folio and Math/Words have been updated to use the ownership model. Ship
it only after all three apps know how to sign in.

## Shape

```
match /databases/{db}/documents {
  // Harbor family docs: families/{code} and families/{code}_ea / _mu / _ss /
  // _pg / _ir / _ca side-progress docs. Family code pattern: XX-YYYY where
  // X is uppercase letter, Y is uppercase letter or digit, with no underscore.
  match /families/{docId} {

    // READS: stay public so (a) existing "paste a code on a new device"
    // flows still work, (b) Folio can continue to import unauthenticated,
    // (c) the Harbor website can show a glance view. Family codes are
    // meant to be shareable within a family; the sensitive gate is write.
    allow read: if true;

    // CREATES: anyone can start a new family. If they include ownerUid, it
    // must be their own uid (prevents planting ownership on someone else).
    allow create: if
      !('ownerUid' in request.resource.data) ||
      (request.auth != null && request.resource.data.ownerUid == request.auth.uid);

    // UPDATES + DELETES on the main doc (families/{code}, no underscore):
    //   - If ownerUid is NOT set on the existing doc: anyone may update
    //     (back-compat for unclaimed families).
    //   - If ownerUid IS set: only that signed-in user may write, and
    //     they may not change the ownerUid to a different uid (prevents
    //     silent takeover; transfer must be done via a worker).
    //
    // UPDATES + DELETES on side docs (families/{code}_ea, etc): fall back
    // to the main doc's ownerUid via a get() lookup. Expensive but legal.
    allow update, delete: if
      isMainDoc(docId)
        ? mainWriteAllowed(docId, resource.data, request.resource.data)
        : sideWriteAllowed(docId);
  }

  function isMainDoc(docId) {
    return docId.matches('^[A-Z]{2,}-[A-Z0-9]{3,6}$');
  }
  function mainCode(docId) {
    // "MA-ABCD_ea" -> "MA-ABCD". Side docs are suffixed with _<key>.
    return docId.split('_')[0];
  }
  function mainWriteAllowed(docId, before, after) {
    return !('ownerUid' in before)
      ? true  // unclaimed: open writes (back-compat)
      : (request.auth != null
          && request.auth.uid == before.ownerUid
          && (!('ownerUid' in after) || after.ownerUid == before.ownerUid));
  }
  function sideWriteAllowed(docId) {
    let main = get(/databases/$(database)/documents/families/$(mainCode(docId)));
    return !main.exists
      || !('ownerUid' in main.data)
      || (request.auth != null && request.auth.uid == main.data.ownerUid);
  }
}
```

## Migration notes

- Every family currently in Firestore has NO `ownerUid`. The rule keeps them
  writable until their owner signs in and clicks Claim. Nothing breaks on day
  one.
- Math Adventure, Words Adventure, Sight Singing, Electronics Adventure,
  Music Adventure, Programming Adventure, Irish Studies, Computing Adventure
  all write to side docs (families/{code}_*). They need to be updated to sign
  in with the same Google provider before rules tighten, or they will fail
  writes for every claimed family.
- The `sideWriteAllowed` lookup costs one `get()` per write. For high-volume
  writes (quiz result saves during a game), consider either (a) denormalising
  `ownerUid` into side docs on claim and on first write, or (b) batching
  writes server-side via a Cloudflare Worker.
- `ownerUid` transfer (remarriage, device loss, selling the family to someone
  else, etc.) can't happen through the frontend under these rules. Build a
  tiny worker endpoint that verifies the current owner's ID token + new
  owner's ID token + both parties' consent before writing the new ownerUid.

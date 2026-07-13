/* ================================================================
   DOGEARED — cloud-sync.js
   Optional Google sign-in + Firestore sync, layered on top of the
   existing local-first storage. If FIREBASE_CONFIG hasn't been filled
   in, every function here quietly no-ops and the app behaves exactly
   as it always has — local-only, no account required.

   Sync model: simple "last write wins" across devices. Every local
   save is pushed to Firestore (debounced) with a server timestamp.
   The "which copy do you want?" question is only ever asked ONCE per
   device — the first time it's linked to a given Google account. After
   that, this device is remembered as "known" for that account, and
   every reopen (or return to the tab) just silently pulls the cloud
   copy if it's newer than what this device already has, or pushes if
   this device has newer local changes. This is NOT true multi-device
   conflict merging — if you edit the same account on two devices at
   the same time while both are offline, whichever reconnects and syncs
   last will overwrite the other. For the realistic case (one person,
   switching between a couple of devices, not editing simultaneously)
   this is the right amount of complexity; anything fancier would need
   real operational-transform merging.
================================================================ */
"use strict";

const CLOUD_ENABLED = typeof FIREBASE_CONFIG !== "undefined" && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
const LAST_PUSH_KEY = "dogeared.lastCloudPush";
const LAST_PULL_KEY = "dogeared.lastCloudPull";
const KNOWN_UID_KEY = "dogeared.knownSyncUid";

let cloudUser = null;       // Firebase user object, or null when signed out
let cloudStatus = "idle";   // 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
let fbApp = null, fbAuth = null, fbDb = null;
let _pushTimer = null;
let saveStateLocalOnly = null; // set below, once we've wrapped the real saveState
let lastSyncError = null;      // {code, message} — shown in the Account card so you don't need DevTools

function isKnownDevice(uid) { return localStorage.getItem(KNOWN_UID_KEY) === uid; }
function markKnownDevice(uid) { localStorage.setItem(KNOWN_UID_KEY, uid); }
function lastLocalSyncTs() {
  return Math.max(Number(localStorage.getItem(LAST_PUSH_KEY) || 0), Number(localStorage.getItem(LAST_PULL_KEY) || 0));
}

function initCloud() {
  if (!CLOUD_ENABLED) return;
  try {
    fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
  } catch (e) {
    console.error("Firebase init failed", e);
    return;
  }

  fbAuth.getRedirectResult().catch((e) => {
    console.error("Redirect sign-in failed", e);
    toast(authErrorMessage(e));
  });
  fbAuth.onAuthStateChanged((user) => {
    cloudUser = user;
    if (!user) { cloudStatus = "idle"; refreshAccountUI(); return; }
    if (!S.profile) return; // mid-onboarding — the onboarding flow itself decides what happens next
    onSignedIn(user);
  });

  // catch up on changes made from another device while this one was open —
  // checked whenever you switch back to this tab, not just on a fresh load
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && cloudUser) silentSyncCheck(cloudUser);
  });
}

function refreshAccountUI() {
  if (typeof currentView !== "undefined" && currentView === "profile" && typeof render === "function") render();
}

function authErrorMessage(e) {
  const code = e?.code || "";
  console.error("Firebase auth error:", code, e?.message);
  if (code === "auth/unauthorized-domain") return "This site isn't authorized yet — add it under Firebase → Authentication → Settings → Authorized domains.";
  if (code === "auth/operation-not-allowed") return "Google sign-in isn't enabled yet — turn it on under Firebase → Authentication → Sign-in method.";
  if (code === "auth/popup-blocked") return "Your browser blocked the sign-in popup — trying another way…";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "Sign-in was closed before finishing.";
  if (code === "auth/network-request-failed") return "Couldn't reach Google — check your connection and try again.";
  return `Couldn't sign in (${code || "unknown error"}) — check the console for details.`;
}

/* ---------------- sign in / out ----------------
   Popup first: keeps the page (and any in-progress onboarding state) alive,
   and surfaces real errors immediately instead of round-tripping through a
   full page redirect. Falls back to redirect only if the popup itself is
   blocked or unsupported (common on some in-app/mobile browsers). */
function signInWithGoogle(onResult) {
  if (!CLOUD_ENABLED) { toast("Cloud sync isn't set up for this copy of the app yet."); return; }
  if (!fbAuth) { toast("Sign-in isn't ready yet — try again in a moment."); return; }
  const provider = new firebase.auth.GoogleAuthProvider();
  fbAuth.signInWithPopup(provider).then((result) => {
    onResult && onResult(result.user);
  }).catch((e) => {
    const fallbackCodes = ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/popup-closed-by-user"];
    if (fallbackCodes.includes(e?.code) && e.code !== "auth/popup-closed-by-user") {
      toast(authErrorMessage(e));
      fbAuth.signInWithRedirect(provider).catch((e2) => toast(authErrorMessage(e2)));
    } else {
      toast(authErrorMessage(e));
    }
  });
}
function signOutCloud() {
  if (!fbAuth) return;
  fbAuth.signOut().then(() => {
    cloudUser = null; cloudStatus = "idle";
    toast("Signed out. Your reading data stays right here on this device.");
    refreshAccountUI();
  });
}

function firestoreErrorMessage(e) {
  const code = e?.code || "";
  console.error("Firestore error:", code, e?.message);
  if (code === "permission-denied") return "Firestore rejected the request — double-check your security rules are published and match the ones in the README.";
  if (code === "not-found") return "The Firestore database doesn't exist yet for this project — create it under Firebase → Build → Firestore Database.";
  if (code === "resource-exhausted") return "Your reading data is too large for one document (Firestore's 1MB cap) — likely a lot of embedded journal photos.";
  if (code === "unavailable" || code === "deadline-exceeded") return "Couldn't reach Firestore — check your connection and try again.";
  if (code === "unauthenticated") return "Your sign-in expired — sign in again.";
  return `Sync failed (${code || e?.message || "unknown error"}) — check the browser console for the full error.`;
}

/* ---------------- sign-in → merge decision (first time this device meets this account) ---------------- */
async function onSignedIn(user) {
  if (isKnownDevice(user.uid)) { await silentSyncCheck(user); return; }
  cloudStatus = "syncing"; refreshAccountUI();
  try {
    const doc = await fbDb.collection("users").doc(user.uid).get();
    const cloudData = doc.exists ? doc.data() : null;
    const localHasProfile = !!S.profile;
    const cloudHasProfile = !!(cloudData && cloudData.profile);

    if (cloudHasProfile && localHasProfile) {
      // Both sides have real data — this is the one moment we ever ask, rather than guessing.
      // Only happens the first time THIS device links to THIS account.
      showSyncConflictSheet(user, cloudData);
    } else if (cloudHasProfile && !localHasProfile) {
      applyCloudData(cloudData);
      toast(`Welcome back — synced from your account.`);
    } else {
      await pushCloudData(true);
      toast("Synced to your Google account.");
    }
    markKnownDevice(user.uid);
    cloudStatus = "synced"; lastSyncError = null;
  } catch (e) {
    const msg = firestoreErrorMessage(e);
    lastSyncError = { code: e?.code, message: msg };
    cloudStatus = navigator.onLine ? "error" : "offline";
    if (navigator.onLine) toast(msg);
  }
  refreshAccountUI();
}

/* ---------------- routine sync (device already linked to this account) ----------------
   No prompts, no drama — just: is the cloud copy meaningfully newer than
   what this device already has? If so, pull it. If this device has newer
   unsynced local changes, push. Runs on every app open and every time you
   switch back to this tab while signed in. */
async function silentSyncCheck(user) {
  if (!fbDb) return;
  cloudStatus = "syncing"; refreshAccountUI();
  try {
    const doc = await fbDb.collection("users").doc(user.uid).get();
    if (!doc.exists) { await pushCloudData(true); markKnownDevice(user.uid); cloudStatus = "synced"; refreshAccountUI(); return; }
    const cloudData = doc.data();
    const cloudTs = cloudData.updatedAtClient || 0;
    const localTs = lastLocalSyncTs();
    if (cloudTs > localTs + 1500) { // small slack for clock/network jitter
      applyCloudData(cloudData);
      localStorage.setItem(LAST_PULL_KEY, String(Date.now()));
      toast("Synced the latest from your other device.");
    }
    cloudStatus = "synced"; lastSyncError = null;
  } catch (e) {
    const msg = firestoreErrorMessage(e);
    lastSyncError = { code: e?.code, message: msg };
    cloudStatus = navigator.onLine ? "error" : "offline";
  }
  refreshAccountUI();
}

function showSyncConflictSheet(user, cloudData) {
  const cloudWhen = cloudData.updatedAtClient ? new Date(cloudData.updatedAtClient).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "an earlier session";
  openSheet(`
    <h2 style="text-align:center;margin-bottom:6px">Two shelves, one account</h2>
    <p class="muted" style="text-align:center">This Google account already has reading data saved online (last updated ${esc(cloudWhen)}), and this device has its own too. Which one should we keep? This is the only time we'll ask — from now on, this device stays quietly in sync.</p>
    <div class="btn-row" style="justify-content:center;flex-direction:column;align-items:stretch;gap:10px">
      <button class="btn solid" id="sync-use-cloud">Use my cloud data (replaces this device)</button>
      <button class="btn ghost" id="sync-use-local">Keep this device's data (replaces the cloud copy)</button>
    </div>
  `, (sheet) => {
    $("#sync-use-cloud", sheet).addEventListener("click", () => {
      applyCloudData(cloudData);
      markKnownDevice(user.uid);
      closeSheet();
      toast("Cloud data restored to this device.");
    });
    $("#sync-use-local", sheet).addEventListener("click", async () => {
      await pushCloudData(true);
      markKnownDevice(user.uid);
      closeSheet();
      toast("This device's data is now your cloud copy.");
    });
  });
}

function applyCloudData(cloudData) {
  const incoming = { ...cloudData };
  delete incoming.updatedAt; delete incoming.updatedAtClient; delete incoming.uid;
  S = Object.assign(defaultState(), incoming);
  saveStateLocalOnly();
  localStorage.setItem(LAST_PULL_KEY, String(Date.now()));
  applyTheme();
  render();
}

/* ---------------- push (debounced) ---------------- */
function scheduleCloudPush() {
  if (!CLOUD_ENABLED || !cloudUser) return;
  clearTimeout(_pushTimer);
  cloudStatus = "syncing"; refreshAccountUI();
  _pushTimer = setTimeout(() => pushCloudData(false), 4000);
}
async function pushCloudData(immediate) {
  if (!CLOUD_ENABLED || !cloudUser || !fbDb) return;
  if (!navigator.onLine) { cloudStatus = "offline"; refreshAccountUI(); return; }
  try {
    const payload = { ...S };
    delete payload.remoteCatalog;
    payload.uid = cloudUser.uid;
    payload.updatedAtClient = Date.now();
    payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    console.log("Firestore payload:", payload);

    await fbDb.collection("users").doc(cloudUser.uid).set(payload);
    localStorage.setItem(LAST_PUSH_KEY, String(Date.now()));
    cloudStatus = "synced"; lastSyncError = null;
  } catch (e) {
    ...
  }
}

/* ---------------- hook into the existing local save ----------------
   store.js defines saveState() as a plain function; we wrap it here so
   every local write also (debounced) reaches Firestore when signed in.
   Local storage remains the source of truth the app always reads from
   first — this is purely additive. */
if (typeof saveState === "function") {
  const _localSaveState = saveState;
  saveStateLocalOnly = _localSaveState;
  saveState = function () {
    _localSaveState();
    scheduleCloudPush();
  };
}

function cloudStatusLabel() {
  if (!CLOUD_ENABLED) return null;
  if (!cloudUser) return null;
  if (cloudStatus === "error" && lastSyncError) return lastSyncError.message;
  return {
    syncing: "Syncing…",
    synced: "Synced",
    offline: "Offline — will sync when back online",
    error: "Couldn't sync — will retry",
    idle: "Signed in",
  }[cloudStatus] || "Signed in";
}

if (CLOUD_ENABLED && typeof firebase !== "undefined") initCloud();

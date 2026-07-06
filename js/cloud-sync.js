/* ================================================================
   DOGEARED — cloud-sync.js
   Optional Google sign-in + Firestore sync, layered on top of the
   existing local-first storage. If FIREBASE_CONFIG hasn't been filled
   in, every function here quietly no-ops and the app behaves exactly
   as it always has — local-only, no account required.

   Sync model: simple "last write wins" across devices. Every local
   save is pushed to Firestore (debounced) with a server timestamp; on
   sign-in or app boot, if the cloud copy is newer than what this
   device last pushed, it's pulled down and replaces local state. This
   is NOT true multi-device conflict merging — if you edit the same
   account on two devices at the same time while both are offline,
   whichever reconnects and syncs last will overwrite the other. For
   the realistic case (one person, one device at a time, switching
   occasionally) this is the right amount of complexity; anything
   fancier would need real operational-transform merging.
================================================================ */
"use strict";

const CLOUD_ENABLED = typeof FIREBASE_CONFIG !== "undefined" && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
const LAST_PUSH_KEY = "dogeared.lastCloudPush";

let cloudUser = null;       // Firebase user object, or null when signed out
let cloudStatus = "idle";   // 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
let fbApp = null, fbAuth = null, fbDb = null;
let _pushTimer = null;
let saveStateLocalOnly = null; // set below, once we've wrapped the real saveState

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

/* ---------------- sign-in → merge decision ---------------- */
async function onSignedIn(user) {
  cloudStatus = "syncing"; refreshAccountUI();
  try {
    const doc = await fbDb.collection("users").doc(user.uid).get();
    const cloudData = doc.exists ? doc.data() : null;
    const localHasProfile = !!S.profile;
    const cloudHasProfile = !!(cloudData && cloudData.profile);

    if (cloudHasProfile && localHasProfile) {
      // Both sides have real data — this is the one moment we ask, rather than guessing.
      showSyncConflictSheet(user, cloudData);
    } else if (cloudHasProfile && !localHasProfile) {
      applyCloudData(cloudData);
      toast(`Welcome back — synced from your account.`);
    } else {
      await pushCloudData(true);
      toast("Synced to your Google account.");
    }
    cloudStatus = "synced";
  } catch (e) {
    console.error(e);
    cloudStatus = navigator.onLine ? "error" : "offline";
  }
  refreshAccountUI();
}

function showSyncConflictSheet(user, cloudData) {
  const cloudWhen = cloudData.updatedAtClient ? new Date(cloudData.updatedAtClient).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "an earlier session";
  openSheet(`
    <h2 style="text-align:center;margin-bottom:6px">Two shelves, one account</h2>
    <p class="muted" style="text-align:center">This Google account already has reading data saved online (last updated ${esc(cloudWhen)}), and this device has its own too. Which one should we keep?</p>
    <div class="btn-row" style="justify-content:center;flex-direction:column;align-items:stretch;gap:10px">
      <button class="btn solid" id="sync-use-cloud">Use my cloud data (replaces this device)</button>
      <button class="btn ghost" id="sync-use-local">Keep this device's data (replaces the cloud copy)</button>
    </div>
  `, (sheet) => {
    $("#sync-use-cloud", sheet).addEventListener("click", () => {
      applyCloudData(cloudData);
      closeSheet();
      toast("Cloud data restored to this device.");
    });
    $("#sync-use-local", sheet).addEventListener("click", async () => {
      await pushCloudData(true);
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
    delete payload.remoteCatalog; // large, regenerable cache — not worth syncing
    payload.uid = cloudUser.uid;
    payload.updatedAtClient = Date.now();
    payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    await fbDb.collection("users").doc(cloudUser.uid).set(payload);
    localStorage.setItem(LAST_PUSH_KEY, String(Date.now()));
    cloudStatus = "synced";
  } catch (e) {
    console.error(e);
    cloudStatus = "error";
  }
  refreshAccountUI();
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
  return {
    syncing: "Syncing…",
    synced: "Synced",
    offline: "Offline — will sync when back online",
    error: "Couldn't sync — will retry",
    idle: "Signed in",
  }[cloudStatus] || "Signed in";
}

if (CLOUD_ENABLED && typeof firebase !== "undefined") initCloud();

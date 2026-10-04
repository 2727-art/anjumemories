(function (root) {
  "use strict";
  const KEYS = Object.freeze({ profile: "lastmemoVansabaProfileCompatibility", journal: "lastmemoVansabaProgressionTransaction", backups: "lastmemoVansabaProgressionBackups", compatibility: "lastmemoVansabaProgressionCompatibilityGuard" });
  const PROTECTED = Object.freeze({ shop: "lastmemoVansabaShopState", atlas: "lastmemoVansabaMutationAtlasState", archive: "lastmemoVansabaRunArchive" });
  const MAX_BYTES = 4 * 1024 * 1024;
  const capabilities = Object.freeze(["umbra-owned-v1", "umbra-atlas-v1", "umbra-archive-v2", "progression-journal-v1"]);
  function create(options = {}) {
    const storage = options.storage;
    const ownerId = String(options.ownerId || "local");
    const locks = options.locks;
    const now = options.now || Date.now;
    const makeId = options.randomId || (() => root.crypto?.randomUUID?.() || `${now()}-${Math.random().toString(36).slice(2)}`);
    let profile = null, blocked = false, reason = "", busy = false, pending = false;
    const status = () => ({ blocked, reason, pending, busy, profileId: profile?.profileId || null });
    const block = (message) => { blocked = true; reason = String(message || "recovery-required"); return status(); };
    const read = (key) => { if (!storage) throw new Error("storage-unavailable"); return storage.getItem(key); };
    const write = (key, value) => {
      if (value === null) storage.removeItem(key); else storage.setItem(key, value);
      if (read(key) !== value) throw new Error("storage-readback-mismatch");
    };
    const parse = (raw) => { try { return JSON.parse(raw); } catch (_) { throw new Error("invalid-json-preserved"); } };
    const checkProfile = () => {
      const current = parse(read(KEYS.profile));
      if (!profile || current?.version !== 1 || current.profileId !== profile.profileId || current.epoch !== profile.epoch || current.ownerId !== ownerId) throw new Error("profile-owner-conflict");
    };
    function initialize(settings = {}) {
      try {
        const raw = read(KEYS.profile);
        if (raw === null) {
          if (read(KEYS.journal) !== null) throw new Error("profile-missing-with-journal");
          if (settings.readOnly === true) { pending = true; return status(); }
          profile = { version: 1, profileId: makeId(), epoch: 1, ownerId, createdAt: now() };
          write(KEYS.profile, JSON.stringify(profile));
        } else {
          profile = parse(raw);
          if (profile?.version !== 1 || typeof profile.profileId !== "string" || !profile.profileId || !Number.isSafeInteger(profile.epoch) || profile.epoch < 1 || profile.ownerId !== ownerId) throw new Error("unsupported-profile-preserved");
        }
        pending = read(KEYS.journal) !== null;
        return status();
      } catch (error) { return block(error.message); }
    }
    function validateEntries(entries, internal = false) {
      if (!Array.isArray(entries) || entries.length > 32 || JSON.stringify(entries).length > MAX_BYTES) throw new Error("transaction-size-limit");
      const seen = new Set();
      for (const entry of entries) {
        if (!entry || typeof entry.key !== "string" || !entry.key || (Object.values(KEYS).includes(entry.key) && !(internal && entry.key === KEYS.compatibility)) || seen.has(entry.key)
          || !(entry.before === null || typeof entry.before === "string") || !(entry.after === null || typeof entry.after === "string")) throw new Error("invalid-transaction-entry");
        seen.add(entry.key);
      }
      return entries;
    }
    function validateJournal(tx) {
      if (tx?.version !== 1 || !["PREPARED", "COMMITTED"].includes(tx.phase) || typeof tx.transactionId !== "string"
        || tx.profileId !== profile?.profileId || tx.epoch !== profile?.epoch || tx.ownerId !== ownerId) throw new Error("unsupported-or-foreign-journal-preserved");
      validateEntries(tx.entries, true);
      return tx;
    }
    function persistJournal(tx) { write(KEYS.journal, JSON.stringify(tx)); pending = true; }
    function cleanup() { write(KEYS.journal, null); pending = false; }
    function readGuard() {
      const raw = read(KEYS.compatibility);
      if (raw === null) return { raw, guard: { version: 1, profileId: profile.profileId, epoch: profile.epoch, records: {} } };
      const guard = parse(raw);
      if (guard?.version !== 1 || guard.profileId !== profile.profileId || guard.epoch !== profile.epoch
        || !guard.records || typeof guard.records !== "object" || Array.isArray(guard.records) || raw.length > 8192
        || Object.keys(guard.records).some(key => !Object.values(PROTECTED).includes(key))) throw new Error("compatibility-marker-invalid-preserved");
      return { raw, guard };
    }
    function factsFor(key, raw) {
      if (raw === null) return { minVersion: 0, umbraOwned: false, umbraScope: false };
      const value = parse(raw);
      if (!value || typeof value !== "object") throw new Error("protected-record-invalid-preserved");
      return { minVersion: Math.max(0, Math.floor(Number(value.version) || 0)),
        umbraOwned: key === PROTECTED.shop && Array.isArray(value.playerMechs?.ownedIds) && value.playerMechs.ownedIds.includes("umbraSeraph"),
        umbraScope: key === PROTECTED.atlas && Object.prototype.hasOwnProperty.call(value.mechBuilds || {}, "umbraSeraph") };
    }
    function matchesFacts(facts, expected) {
      return facts.minVersion >= expected.minVersion && (!expected.umbraOwned || facts.umbraOwned) && (!expected.umbraScope || facts.umbraScope);
    }
    function prepareGuard(entries, replace = false) {
      const { raw, guard } = readGuard(); let touched = false;
      for (const entry of entries) {
        if (!Object.values(PROTECTED).includes(entry.key)) continue;
        const next = factsFor(entry.key, entry.after), previous = guard.records[entry.key];
        if (!replace && previous && !matchesFacts(next, previous)) throw new Error("protected-record-downgrade-refused");
        guard.records[entry.key] = next; touched = true;
      }
      const after = JSON.stringify(guard);
      return touched && raw !== after ? { key: KEYS.compatibility, before: raw, after } : null;
    }
    function validateProtectedRecords() {
      if (blocked || pending || !profile) return { ok: false, ...status() };
      try {
        checkProfile();
        const { guard } = readGuard();
        for (const [key, expected] of Object.entries(guard.records)) {
          if (!Number.isSafeInteger(expected?.minVersion) || expected.minVersion < 0
            || typeof expected.umbraOwned !== "boolean" || typeof expected.umbraScope !== "boolean"
            || !matchesFacts(factsFor(key, read(key)), expected)) throw new Error("protected-record-downgrade-preserved");
        }
        return { ok: true, ...status() };
      } catch (error) { block(error.message); return { ok: false, ...status() }; }
    }
    function recordProtectedWrite(key, after) {
      if (!Object.values(PROTECTED).includes(key)) return true;
      if (blocked || pending || busy) throw new Error("protected-write-held");
      try {
        checkProfile();
        if (read(key) !== after) throw new Error("protected-write-readback-mismatch");
        const entry = prepareGuard([{ key, before: read(key), after }]);
        // Normal single-key writes are already verified by their caller. A
        // marker failure holds this session without rolling back newer data.
        if (entry) write(entry.key, entry.after);
        return true;
      } catch (error) { block(error.message); throw error; }
    }
    function validateProtectedWrite(key, after) {
      if (!Object.values(PROTECTED).includes(key)) return true;
      if (blocked || pending || busy) throw new Error("protected-write-held");
      try { checkProfile(); prepareGuard([{ key, before: read(key), after }]); return true; }
      catch (error) { block(error.message); throw error; }
    }
    function commit(tx, from = 0) {
      for (let index = from; index < tx.entries.length; index += 1) {
        checkProfile();
        const entry = tx.entries[index];
        // Recheck the complete prefix and suffix before every write, including
        // unrelated target keys. A detected competing writer is never rolled back.
        tx.entries.forEach((other, offset) => {
          const expected = offset < index ? other.after : other.before;
          if (read(other.key) !== expected) throw new Error("transaction-precondition-conflict");
        });
        write(entry.key, entry.after);
      }
      checkProfile();
      tx.entries.forEach(entry => { if (read(entry.key) !== entry.after) throw new Error("transaction-final-conflict"); });
      tx.phase = "COMMITTED";
      persistJournal(tx);
      cleanup();
      return { ok: true, transactionId: tx.transactionId };
    }
    function recover() {
      if (!profile) initialize();
      if (blocked) return { ok: false, ...status() };
      try {
        checkProfile();
        const raw = read(KEYS.journal);
        if (raw === null) { pending = false; return validateProtectedRecords(); }
        pending = true;
        const tx = validateJournal(parse(raw));
        if (tx.phase === "COMMITTED") { cleanup(); return { ...validateProtectedRecords(), recovered: "cleanup", transactionId: tx.transactionId }; }
        const values = tx.entries.map(entry => read(entry.key));
        if (values.every((value, i) => value === tx.entries[i].before)) { cleanup(); return { ...validateProtectedRecords(), recovered: "cancelled-before-write" }; }
        let prefix = 0;
        while (prefix < tx.entries.length && values[prefix] === tx.entries[prefix].after) prefix += 1;
        if (prefix === 0 || values.slice(prefix).some((value, i) => value !== tx.entries[prefix + i].before)) throw new Error("recovery-state-conflict-preserved");
        const result = commit(tx, prefix);
        return { ...result, ...validateProtectedRecords(), recovered: "roll-forward" };
      } catch (error) { block(error.message); return { ok: false, ...status() }; }
    }
    function backup(tx) {
      const raw = read(KEYS.backups);
      const previous = raw === null ? { version: 1, records: [] } : parse(raw);
      if (previous?.version !== 1 || !Array.isArray(previous.records)) throw new Error("unsupported-backup-preserved");
      const next = { version: 1, records: [...previous.records.slice(-1), { transactionId: tx.transactionId, profileId: tx.profileId, epoch: tx.epoch, ownerId, kind: tx.kind, createdAt: tx.createdAt, entries: tx.entries }] };
      const serialized = JSON.stringify(next);
      if (serialized.length > MAX_BYTES * 2 + 8192) throw new Error("backup-size-limit");
      write(KEYS.backups, serialized);
    }
    async function execute(request = {}) {
      if (!profile) initialize();
      if (blocked || pending || busy) return { ok: false, reason: reason || "transaction-pending", blocked: true };
      if (typeof locks?.request !== "function") return { ok: false, reason: "exclusive-lock-unavailable", blocked: false };
      busy = true;
      try {
        return await locks.request(`lastmemo-progression:${profile.profileId}`, { mode: "exclusive" }, async () => {
          if (blocked) throw new Error(reason || "transaction-blocked");
          checkProfile();
          if (read(KEYS.journal) !== null) throw new Error("another-transaction-pending");
          const transactionId = makeId();
          const prepared = typeof request.prepare === "function" ? await request.prepare({ transactionId, profileId: profile.profileId, epoch: profile.epoch }) : request;
          if (prepared?.ok === false) return { ok: false, reason: prepared.reason || "precondition-rejected", blocked: false };
          const entries = validateEntries(prepared?.entries || []).map(entry => ({ ...entry }));
          const marker = prepareGuard(entries, request.kind === "cloudRestore");
          if (marker) entries.push(marker);
          entries.forEach(entry => { if (read(entry.key) !== entry.before) throw new Error("transaction-precondition-conflict"); });
          if (!entries.length) return { ok: true, transactionId, value: prepared?.value, noop: true };
          const tx = { version: 1, kind: String(request.kind || "progression"), phase: "PREPARED", transactionId, profileId: profile.profileId, epoch: profile.epoch, ownerId, createdAt: now(), entries, metadata: prepared.metadata || request.metadata || null };
          if (JSON.stringify(tx).length > MAX_BYTES) throw new Error("transaction-size-limit");
          backup(tx);
          persistJournal(tx);
          return { ...commit(tx), value: prepared?.value };
        });
      } catch (error) { block(error.message); try { pending = read(KEYS.journal) !== null; } catch (_) { pending = true; } return { ok: false, ...status() }; }
      finally { busy = false; }
    }
    async function recoverAsync() {
      if (blocked) return { ok: false, ...status() };
      if (typeof locks?.request !== "function") return { ok: false, reason: "exclusive-lock-unavailable", blocked: true };
      busy = true;
      try {
        if (!profile) await locks.request("lastmemo-progression-bootstrap", { mode: "exclusive" }, () => initialize());
        if (blocked) return { ok: false, ...status() };
        return await locks.request(`lastmemo-progression:${profile.profileId}`, { mode: "exclusive" }, () => recover());
      }
      catch (error) { block(error.message); return { ok: false, ...status() }; }
      finally { busy = false; }
    }
    return Object.freeze({ initialize, recover, recoverAsync, execute, status, block, validateProtectedRecords, validateProtectedWrite, recordProtectedWrite });
  }
  root.umbraPersistence = Object.freeze({ version: 2, capabilities, keys: KEYS, create });
})(typeof window !== "undefined" ? window : globalThis);

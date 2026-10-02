// Tests for js/core.js — run with:  node --test tests/core.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../js/core.js");

const HOUR = 3600 * 1000;

// Member ids in the same format the app makes them.
const MOM = Core.newId("m");
const ALI = Core.newId("m");
const MADINA = Core.newId("m");
const LATE = Core.newId("m");

function ev(fields) {
  return Object.assign({ v: 1, id: Core.newId("e"), at: Date.now() }, fields);
}

function clean(fields) {
  const e = Core.cleanEvent(ev(fields));
  assert.ok(e, "test event should be valid: " + JSON.stringify(fields));
  return e;
}

test("family code: 16 chars from the safe alphabet, shown in groups of 4", () => {
  const code = Core.newFamilyCode();
  assert.equal(code.length, 16);
  assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/);
  assert.match(Core.formatCode(code), /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
});

test("normalizeCode accepts dashes, spaces and lower case; rejects junk", () => {
  const code = Core.newFamilyCode();
  const typed = " " + Core.formatCode(code).toLowerCase().replace(/-/g, " - ") + " ";
  assert.equal(Core.normalizeCode(typed), code);
  assert.equal(Core.normalizeCode("ABCD"), "");
  assert.equal(Core.normalizeCode("ABCD-EFGH-JKLM-NP0Q"), ""); // 0 is not in the alphabet
  assert.equal(Core.normalizeCode(null), "");
});

test("topic name is valid for ntfy (letters, digits, dash; max 64)", () => {
  const topic = Core.topicFor(Core.newFamilyCode());
  assert.match(topic, /^[-_A-Za-z0-9]{1,64}$/);
});

test("cleanEvent keeps valid events and trims text", () => {
  const cmd = clean({ t: "cmd", from: MOM, to: ["*"], text: "  " + "x".repeat(500), color: "gold", urgent: true });
  assert.equal(cmd.text.length, Core.TEXT_MAX);
  assert.equal(cmd.color, "gold");
  assert.equal(cmd.urgent, true);
});

test("cleanEvent rejects broken or unknown events", () => {
  assert.equal(Core.cleanEvent(null), null);
  assert.equal(Core.cleanEvent("hello"), null);
  assert.equal(Core.cleanEvent(ev({ t: "cmd", from: MOM, to: ["*"] })), null, "cmd without text or preset");
  assert.equal(Core.cleanEvent(ev({ t: "cmd", from: MOM, to: [], text: "hi" })), null, "cmd without recipients");
  assert.equal(Core.cleanEvent(ev({ t: "reply", from: ALI, ref: Core.newId("e"), kind: "maybe" })), null, "unknown reply");
  assert.equal(Core.cleanEvent(ev({ t: "hello", from: ALI, name: "Ali", role: "boss" })), null, "unknown role");
  assert.equal(Core.cleanEvent(ev({ t: "drop_tables", from: ALI })), null, "unknown type");
  assert.equal(Core.cleanEvent(Object.assign(ev({ t: "msg", from: ALI, text: "hi" }), { v: 2 })), null, "other version");
});

test("cleanEvent replaces an unknown color with the default and drops extra fields", () => {
  const cmd = clean({ t: "cmd", from: MOM, to: ["*"], text: "hi", color: "red;background:url(x)", evil: "<script>" });
  assert.equal(cmd.color, "pine");
  assert.equal(cmd.evil, undefined);
});

test("cleanEvent refuses ids that aren't ours (they become object keys)", () => {
  for (const bad of ["__proto__", "constructor", "toString", "hasOwnProperty", "m_a", "", "x".repeat(40)]) {
    assert.equal(Core.cleanEvent(ev({ t: "msg", from: bad, text: "hi" })), null, "from=" + bad);
    assert.equal(Core.cleanEvent(ev({ t: "reply", from: ALI, ref: bad, kind: "ok" })), null, "ref=" + bad);
    assert.equal(Core.cleanEvent(ev({ t: "seen", from: ALI, refs: [bad] })), null, "refs=" + bad);
    assert.equal(Core.cleanEvent(Object.assign(ev({ t: "msg", from: ALI, text: "hi" }), { id: bad })), null, "id=" + bad);
  }
  const cmd = clean({ t: "cmd", from: MOM, to: [ALI, "__proto__", "*"], text: "hi" });
  assert.deepEqual(cmd.to, [ALI, "*"]);
});

test("a forged event with an object-key id can't crash buildView or pollute objects", () => {
  const cmd = clean({ t: "cmd", from: MOM, to: ["*"], text: "Dinner" });
  // Built by hand, as if an older version had stored them without checks.
  const forged = [
    { v: 1, t: "reply", id: "e_forged000001", from: "__proto__", at: Date.now(), ref: cmd.id, kind: "ok" },
    { v: 1, t: "reply", id: "e_forged000002", from: ALI, at: Date.now(), ref: "constructor", kind: "ok" },
    { v: 1, t: "seen", id: "e_forged000003", from: ALI, at: Date.now(), refs: ["toString"] },
  ];
  assert.doesNotThrow(() => Core.buildView([cmd].concat(forged), { __proto__: { name: "x" } }, MOM));
  assert.equal(({}).reply, undefined, "Object.prototype must stay clean");
  assert.equal(({}).seenAt, undefined);
});

test("mergeEvents adds only new events, by id", () => {
  const a = clean({ t: "msg", from: ALI, text: "hi" });
  const b = clean({ t: "msg", from: ALI, text: "again" });
  const first = Core.mergeEvents([], [a, a]);
  assert.equal(first.merged.length, 1);
  assert.equal(first.added.length, 1);
  const second = Core.mergeEvents(first.merged, [a, b]);
  assert.equal(second.merged.length, 2);
  assert.deepEqual(second.added.map((e) => e.id), [b.id]);
});

test("buildView: members come from hello events and from saved members", () => {
  const events = [
    clean({ t: "hello", from: MOM, name: "Mom", role: "parent", family: "Karimovs" }),
    clean({ t: "hello", from: ALI, name: "Ali", role: "child" }),
  ];
  const saved = { [MADINA]: { id: MADINA, name: "Madina", role: "child", lastSeen: 1 } };
  const view = Core.buildView(events, saved, MOM);
  assert.deepEqual(Object.keys(view.members).sort(), [ALI, MADINA, MOM].sort());
  assert.equal(view.familyName, "Karimovs");
  assert.deepEqual(view.children.map((m) => m.name).sort(), ["Ali", "Madina"]);
});

test("buildView: seen and reply update the right recipient of the right command", () => {
  const now = Date.now();
  const cmd = clean({ t: "cmd", from: MOM, to: ["*"], preset: "eat", text: "Come eat", at: now - 5000 });
  const seen = clean({ t: "seen", from: ALI, refs: [cmd.id], at: now - 4000 });
  const reply = clean({ t: "reply", from: ALI, ref: cmd.id, kind: "done", at: now - 3000 });
  const view = Core.buildView([reply, cmd, seen], {}, MOM);
  const c = view.commands[0];
  assert.equal(c.receipts[ALI].reply, "done");
  assert.equal(c.receipts[ALI].seenAt, now - 4000);
  assert.equal(Core.recipientStatus(c, ALI, now), "done");
});

test("recipientStatus: sent, seen, lost after 12 hours", () => {
  const now = Date.now();
  const fresh = Core.buildView([clean({ t: "cmd", from: MOM, to: [ALI], text: "hi", at: now - HOUR })], {}, MOM).commands[0];
  assert.equal(Core.recipientStatus(fresh, ALI, now), "sent");
  const old = Core.buildView([clean({ t: "cmd", from: MOM, to: [ALI], text: "hi", at: now - 13 * HOUR })], {}, MOM).commands[0];
  assert.equal(Core.recipientStatus(old, ALI, now), "lost");
  const seenCmd = clean({ t: "cmd", from: MOM, to: [ALI], text: "hi", at: now - HOUR });
  const seenView = Core.buildView([seenCmd, clean({ t: "seen", from: ALI, refs: [seenCmd.id] })], {}, MOM);
  assert.equal(Core.recipientStatus(seenView.commands[0], ALI, now), "seen");
});

test("commandsFor: a child sees commands for everyone and for them, not for a sibling", () => {
  const all = clean({ t: "cmd", from: MOM, to: ["*"], text: "Dinner" });
  const mine = clean({ t: "cmd", from: MOM, to: [ALI], text: "Call me" });
  const sibling = clean({ t: "cmd", from: MOM, to: [MADINA], text: "Homework" });
  const view = Core.buildView([all, mine, sibling], {}, ALI);
  assert.deepEqual(Core.commandsFor(view, ALI).map((c) => c.text).sort(), ["Call me", "Dinner"]);
});

test("recipientsOf: '*' means every child known now", () => {
  const events = [
    clean({ t: "hello", from: ALI, name: "Ali", role: "child", at: Date.now() - 1000 }),
    clean({ t: "hello", from: MADINA, name: "Madina", role: "child", at: Date.now() - 1000 }),
    clean({ t: "hello", from: MOM, name: "Mom", role: "parent", at: Date.now() - 1000 }),
  ];
  const cmd = clean({ t: "cmd", from: MOM, to: ["*"], text: "Dinner" });
  const view = Core.buildView(events.concat(cmd), {}, MOM);
  assert.deepEqual(Core.recipientsOf(view, view.commands[0]).sort(), [ALI, MADINA].sort());
});

test("cleanEvent: a clock a little ahead counts as now, far-future times are junk", () => {
  const before = Date.now();
  const ahead = clean({ t: "msg", from: ALI, text: "hi", at: before + 10 * 60 * 1000 });
  assert.ok(ahead.at <= Date.now() && ahead.at >= before);
  assert.equal(Core.cleanEvent(ev({ t: "msg", from: ALI, text: "hi", at: before + 48 * HOUR })), null);
  assert.equal(Core.cleanEvent(ev({ t: "msg", from: ALI, text: "hi", at: 1e300 })), null);
});

test("recipientsOf: a child who joined after the broadcast is not counted as 'not delivered'", () => {
  const now = Date.now();
  const cmd = clean({ t: "cmd", from: MOM, to: ["*"], text: "Dinner", at: now - 14 * HOUR });
  const events = [
    clean({ t: "hello", from: ALI, name: "Ali", role: "child", at: now - 20 * HOUR }),
    cmd,
    clean({ t: "hello", from: LATE, name: "Madina", role: "child", at: now - 2 * HOUR }),
  ];
  const view = Core.buildView(events, {}, MOM);
  assert.deepEqual(Core.recipientsOf(view, view.commands[0]), [ALI]);
});

test("mergeMember keeps the first time and the newest name", () => {
  const first = Core.mergeMember(undefined, { from: ALI, name: "Ali", role: "child", at: 100 });
  const later = Core.mergeMember(first, { from: ALI, name: "Alisher", role: "child", at: 500 });
  const stale = Core.mergeMember(later, { from: ALI, name: "Old", role: "child", at: 50 });
  assert.equal(later.name, "Alisher");
  assert.equal(later.since, 100);
  assert.equal(stale.name, "Alisher");
  assert.equal(stale.since, 50);
});

test("prune keeps the newest events and drops very old ones", () => {
  const now = Date.now();
  const many = [];
  for (let i = 0; i < 700; i++) many.push(clean({ t: "msg", from: ALI, text: "n" + i, at: now - (700 - i) * 1000 }));
  many.push(clean({ t: "msg", from: ALI, text: "ancient", at: now - 40 * 24 * HOUR }));
  const kept = Core.prune(many, now);
  assert.equal(kept.length, Core.LOG_MAX);
  assert.ok(!kept.some((e) => e.text === "ancient"));
  assert.ok(kept.some((e) => e.text === "n699"));
});

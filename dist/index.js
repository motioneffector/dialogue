class R extends Error {
  constructor(t) {
    super(t), this.name = "DialogueError", Object.setPrototypeOf(this, new.target.prototype);
  }
}
class y extends R {
  constructor(t, o) {
    super(t), this.field = o, this.name = "ValidationError";
  }
}
class U extends R {
  constructor(t, o, c) {
    super(t), this.dialogueId = o, this.nodeId = c, this.name = "DialogueStructureError";
  }
}
const B = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function v(e, t) {
  if (typeof t == "string" && !B.has(t) && Object.hasOwn(e, t))
    return e[t];
}
function j() {
  const e = /* @__PURE__ */ new Map(), t = {
    get: (o) => e.get(o),
    set: (o, c) => (e.set(o, c), t),
    has: (o) => e.has(o),
    delete: (o) => (e.delete(o), t),
    clear: () => (e.clear(), t),
    increment: (o, c = 1) => {
      const u = (e.get(o) || 0) + c;
      return e.set(o, u), u;
    },
    decrement: (o, c = 1) => {
      const p = e.get(o) || 0, u = Math.max(0, p - c);
      return e.set(o, u), u;
    },
    check: () => !0,
    // Simple implementation
    all: () => Object.fromEntries(e),
    keys: () => Array.from(e.keys())
  };
  return t;
}
function D(e) {
  return e.startsWith("conv:") ? { scope: "conv", key: e.slice(5) } : e.startsWith("game:") ? { scope: "game", key: e.slice(5) } : { scope: "game", key: e };
}
function F(e, t, o) {
  if ("check" in e) {
    const [c, p, u] = e.check, { scope: s, key: i } = D(c), h = s === "game" ? t : o, k = s === "conv" ? i : c, m = h.get(k);
    switch (p) {
      case "==":
        return m === u;
      case "!=":
        return m !== u;
      case ">":
        return m > u;
      case "<":
        return m < u;
      case ">=":
        return m >= u;
      case "<=":
        return m <= u;
      default:
        return !1;
    }
  }
  return "and" in e ? e.and.every((c) => F(c, t, o)) : "or" in e ? e.or.some((c) => F(c, t, o)) : "not" in e ? !F(e.not, t, o) : !1;
}
async function V(e, t, o, c, p) {
  let u;
  try {
    switch (e.type) {
      case "set": {
        const { scope: s, key: i } = D(e.flag), h = s === "game" ? t : o, k = s === "conv" ? i : e.flag;
        h.set(k, e.value), u = e.value;
        break;
      }
      case "clear": {
        const { scope: s, key: i } = D(e.flag), h = s === "game" ? t : o, k = s === "conv" ? i : e.flag;
        h.delete(k), u = !0;
        break;
      }
      case "increment": {
        const { scope: s, key: i } = D(e.flag), h = s === "game" ? t : o, k = s === "conv" ? i : e.flag;
        u = h.increment(k, e.value);
        break;
      }
      case "decrement": {
        const { scope: s, key: i } = D(e.flag), h = s === "game" ? t : o, k = s === "conv" ? i : e.flag;
        u = h.decrement(k, e.value);
        break;
      }
      case "callback": {
        const s = v(c, e.name);
        if (!s)
          throw new Error(`Action handler not registered: ${e.name}`);
        u = await s(e.args);
        break;
      }
    }
    p == null || p(e, u);
  } catch (s) {
    if (e.type === "callback" && !c[e.name])
      throw s;
    console.error("Action execution error:", s);
  }
  return u;
}
async function G(e, t, o, c) {
  let p = e;
  const u = Array.from(p.matchAll(/\{\{(\w+(?::\w+)?)\}\}/g));
  for (const s of u) {
    const i = s[1];
    if (!i) continue;
    let h = "";
    const k = v(o, i);
    if (k) {
      const m = await k(t);
      h = String(m || "");
    } else if (i === "speaker" && c)
      h = c.name;
    else {
      const { scope: m, key: O } = D(i), $ = m === "game" ? t.gameFlags : t.conversationFlags, l = m === "conv" ? O : i, a = $.get(l);
      h = a !== void 0 ? String(a) : "";
    }
    p = p.replace(s[0], h);
  }
  return p;
}
function W(e = {}) {
  const {
    gameFlags: t = j(),
    actionHandlers: o = {},
    speakers: c = {},
    i18n: p,
    interpolation: u = {},
    onNodeEnter: s,
    onNodeExit: i,
    onChoiceSelected: h,
    onDialogueStart: k,
    onDialogueEnd: m,
    onActionExecuted: O,
    onConditionEvaluated: $
  } = e;
  if (t && typeof t.get != "function")
    throw new y("gameFlags must be a valid FlagStore", "gameFlags");
  if (o) {
    for (const [n, r] of Object.entries(o))
      if (typeof r != "function")
        throw new y(`actionHandler "${n}" must be a function`, "actionHandlers");
  }
  if (p) {
    if (typeof p.t != "function")
      throw new y('i18n adapter must have a "t" method', "i18n");
    if (typeof p.hasKey != "function")
      throw new y('i18n adapter must have a "hasKey" method', "i18n");
  }
  let l = null, a = null, I = null, g = j(), x = [];
  const _ = {};
  async function T() {
    if (!l || !a) return null;
    const n = a ? v(l.nodes, a) : void 0;
    if (!n) return null;
    const r = n.speaker ? v(c, n.speaker) : void 0, f = {
      currentNode: n,
      ...r ? { speaker: r } : {},
      gameFlags: t,
      conversationFlags: g
    };
    let d = n.text;
    return p != null && p.hasKey(d) && (d = p.t(d, {})), d = await G(d, f, u, r), { ...n, text: d };
  }
  async function S() {
    I = await T();
  }
  async function z() {
    if (!l || !a) return;
    const n = a ? v(l.nodes, a) : void 0;
    if (n && n.next && (!n.choices || n.choices.length === 0)) {
      i == null || i(n), x.push({
        nodeId: a,
        node: n,
        timestamp: Date.now(),
        conversationFlags: { ...g.all() }
      }), a = n.next;
      const r = a ? v(l.nodes, a) : void 0;
      if (r) {
        if (r.actions)
          for (const d of r.actions)
            await V(d, t, g, o, O);
        await S();
        const f = r.speaker ? v(c, r.speaker) : void 0;
        s == null || s(r, f), await z();
      }
    }
  }
  const K = {
    start: async (n) => {
      l = n, a = n.startNode, g = j(), x = [], k == null || k(n);
      const r = a ? v(l.nodes, a) : void 0;
      if (!r)
        throw new y(`Start node not found: ${n.startNode}`);
      if (r.actions)
        for (const b of r.actions)
          await V(b, t, g, o, O);
      await S();
      const f = r.speaker ? v(c, r.speaker) : void 0;
      s == null || s(r, f), await z(), await S();
      const d = K.isEnded();
      if (d && a) {
        const b = a ? v(l.nodes, a) : void 0;
        b && (m == null || m(n.id, b));
      }
      if (!I)
        throw new y("Failed to initialize dialogue state");
      return {
        currentNode: I,
        availableChoices: K.getChoices(),
        isEnded: d
      };
    },
    getChoices: (n = {}) => {
      if (!l || !a) return [];
      const r = a ? v(l.nodes, a) : void 0;
      if (!(r != null && r.choices)) return [];
      const { includeUnavailable: f = !1, includeDisabled: d = !1, filter: b } = n;
      let N = r.choices;
      return b && (N = N.filter(b)), f ? N.map((w) => {
        const C = w.disabled ? !1 : w.conditions ? F(w.conditions, t, g) : !0;
        w.conditions && $ && $(w.conditions, C);
        const M = {
          ...w,
          available: C
        };
        return !C && !w.disabled && w.conditions && (M.reason = "Conditions not met"), M;
      }) : N.filter((w) => {
        if (w.disabled) return d;
        if (!w.conditions) return !0;
        const C = F(w.conditions, t, g);
        return $ == null || $(w.conditions, C), C;
      });
    },
    choose: async (n) => {
      if (!l || !a)
        throw new y("No active dialogue");
      if (K.isEnded())
        throw new y("Dialogue has ended");
      const r = a ? v(l.nodes, a) : void 0;
      if (!(r != null && r.choices))
        throw new y("No choices available");
      if (n < 0 || n >= r.choices.length)
        throw new y(`Invalid choice index: ${String(n)}`);
      const f = r.choices[n];
      if (!f)
        throw new y(`Invalid choice index: ${String(n)}`);
      if (f.disabled)
        throw new y("Cannot select disabled choice");
      if (f.conditions && !F(f.conditions, t, g))
        throw new y("Choice conditions not met");
      if (h == null || h(f, n), i == null || i(r), x.push({
        nodeId: a,
        node: r,
        choiceIndex: n,
        choice: f,
        timestamp: Date.now(),
        conversationFlags: { ...g.all() }
      }), f.actions)
        for (const w of f.actions)
          await V(w, t, g, o, O);
      a = f.next;
      const d = a ? v(l.nodes, a) : void 0;
      if (!d)
        throw new y(`Target node not found: ${f.next}`);
      if (d.actions)
        for (const w of d.actions)
          await V(w, t, g, o, O);
      await S();
      const b = d.speaker ? c[d.speaker] : void 0;
      s == null || s(d, b), await z(), await S();
      const N = K.isEnded();
      if (N && a) {
        const w = a ? v(l.nodes, a) : void 0;
        w && (m == null || m(l.id, w));
      }
      if (!I)
        throw new y("Failed to complete choice transition");
      return {
        currentNode: I,
        availableChoices: K.getChoices(),
        isEnded: N
      };
    },
    isEnded: () => {
      if (!l || !a) return !1;
      const n = a ? v(l.nodes, a) : void 0;
      return n ? !!(n.isEnd || (!n.choices || n.choices.length === 0) && !n.next) : !1;
    },
    getCurrentNode: () => I != null && I.isEnd ? null : I,
    getHistory: () => [...x],
    back: async () => {
      if (x.length === 0) return;
      const n = x.pop();
      if (!n) return;
      a = n.nodeId, g.clear();
      for (const [f, d] of Object.entries(n.conversationFlags))
        g.set(f, d);
      await S();
      const r = l == null ? void 0 : l.nodes[a];
      if (r) {
        const f = r.speaker ? v(c, r.speaker) : void 0;
        s == null || s(r, f);
      }
    },
    restart: async (n = {}) => {
      if (!l)
        throw new y("No active dialogue");
      x = [];
      const r = await K.start(l);
      return n.preserveConversationFlags || (g.clear(), await S()), r;
    },
    jumpTo: async (n) => {
      if (!l)
        throw new y("No active dialogue");
      const r = v(l.nodes, n);
      if (!r)
        throw new y(`Node not found: ${n}`);
      const f = a;
      if (f) {
        const b = v(l.nodes, f);
        b && (i == null || i(b), x.push({
          nodeId: f,
          node: b,
          timestamp: Date.now(),
          conversationFlags: { ...g.all() }
        }));
      }
      a = n, await S();
      const d = r.speaker ? v(c, r.speaker) : void 0;
      s == null || s(r, d);
    },
    serialize: () => {
      if (!l || !a)
        throw new y("No active dialogue to serialize");
      return {
        dialogueId: l.id,
        currentNodeId: a,
        history: x,
        conversationFlags: g.all()
      };
    },
    deserialize: async (n) => {
      if (!l)
        throw new y("Start a dialogue before deserializing state");
      a = n.currentNodeId, x = n.history, g = j();
      for (const [f, d] of Object.entries(n.conversationFlags))
        g.set(f, d);
      await S();
      const r = a ? v(l.nodes, a) : void 0;
      if (r) {
        const f = r.speaker ? v(c, r.speaker) : void 0;
        s == null || s(r, f);
      }
    },
    getConversationFlags: () => g.all(),
    clearConversationFlags: () => {
      g.clear();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event system accepts varied callback signatures
    on: (n, r) => {
      _[n] ?? (_[n] = []), _[n].push(r);
    }
  };
  return K;
}
const H = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function A(e, t) {
  if (typeof t == "string" && !H.has(t) && Object.hasOwn(e, t))
    return e[t];
}
function Y(e) {
  const t = [];
  if (!e.nodes || Object.keys(e.nodes).length === 0)
    return t.push("Dialogue must have at least one node"), { valid: !1, errors: t };
  A(e.nodes, e.startNode) || t.push(`Start node "${e.startNode}" not found in nodes`);
  const o = /* @__PURE__ */ new Set(), c = [e.startNode];
  for (; c.length > 0; ) {
    const s = c.pop();
    if (!s || o.has(s)) continue;
    o.add(s);
    const i = A(e.nodes, s);
    if (i) {
      if (i.choices)
        for (const h of i.choices)
          A(e.nodes, h.next) ? o.has(h.next) || c.push(h.next) : t.push(`Choice in node "${s}" targets non-existent node "${h.next}"`);
      i.next && !A(e.nodes, i.next) ? t.push(`Node "${s}" auto-advances to non-existent node "${i.next}"`) : i.next && !o.has(i.next) && c.push(i.next);
    }
  }
  const u = Object.keys(e.nodes).filter((s) => !o.has(s));
  return u.length > 0 && t.push(`Unreachable nodes: ${u.join(", ")}`), {
    valid: t.length === 0,
    errors: t
  };
}
function P(e) {
  return {
    t: (t, o) => e.t(t, o),
    hasKey: (t) => e.hasKey(t)
  };
}
export {
  R as DialogueError,
  U as DialogueStructureError,
  y as ValidationError,
  W as createDialogueRunner,
  P as createI18nAdapter,
  Y as validateDialogue
};

// src/engine.mjs
// The engine: pure function E(R, x, C) → (y, ΔC)
// (Salvo 2026, §4)
//
// The engine is invariant, domain-agnostic, stateless. It reads rules,
// input, and canon state, and produces a result and a canon delta. It
// contains no claims, no domain knowledge, and no policy. Operators are
// registered at kernel boot and the engine dispatches over them based on
// the work item's `operator` field.
//
// Determinism: given the same (rules, input, canon view, seed), the engine
// produces the same (result, delta). This is the replayability property
// (§4.3).

export function createEngine(rules, operators) {
  async function apply(item, canon) {
    const op = operators[item.operator];
    if (!op) {
      return {
        result: { error: `unknown operator: ${item.operator}` },
        delta: [
          {
            type: "error",
            payload: {
              message: `unknown operator ${item.operator}`,
              item,
            },
          },
        ],
      };
    }
    // canonView is a read-only projection: the operator can query the
    // canon but cannot append directly. All appends go through the
    // returned delta, which the kernel applies in order.
    const canonView = {
      all: () => canon.all(),
      byType: (t) => canon.byType(t),
      length: () => canon.length(),
      head: () => canon.head(),
    };
    return op(rules, item, canonView);
  }

  function registerOperator(name, fn) {
    operators[name] = fn;
  }

  function listOperators() {
    return Object.keys(operators);
  }

  return { apply, registerOperator, listOperators };
}

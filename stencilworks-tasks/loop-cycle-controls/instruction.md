Templates need a way to rotate through a fixed list of values on each loop pass without hand-rolling counters.

Inside an active `{% for %}`, `{{ loop.cycle("a", "b", ...) }}` picks from its arguments using the current loop index, wraps when it runs out, and renders nothing with no arguments. Nested loops use the innermost one. Existing `loop` fields stay unchanged. Using `loop.cycle` outside any loop is an error whose message says it must be used inside a for loop.

Add `{% cycle ... %}` as well. Anonymous cycles only work inside a loop: they share that loop's cursor, advance when the tag renders, and reset for each new loop. Named groups get separate case-sensitive cursors, work outside loops (even at the template root), and persist across separate loops in one render. The two styles do not interfere. In `{% cycle band "1", "2" %}`, `band` is the group name; a lone identifier or comma-separated identifiers are values. Values can be numbers or filter pipelines; output is the chosen value with no extra separators. A trailing comma adds no slot.

Cycles work inside `if`, `with`, `filter`, and `{% block %}` bodies. `{% cycle %}` with no values is a parse error. Anonymous tags may parse at the root but must fail at render. Empty loops and their `else` branches do not advance state; each render starts clean. Text in `{% raw %}` stays literal and must not affect a following real cycle. Parser and outline should recognize cycle tags: anonymous as `cycle N` (N = value count), named as `cycle name/N` — the example above should outline as containing `cycle band/2`.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.

Expose loop cycling in Stencilworks templates so authors can rotate values across `for` loop iterations.

Wire `{{ loop.cycle("a", "b", ...) }}` to pick the value at the current iteration index, wrapping by argument count; zero arguments yield empty output. Add a `{% cycle ... %}` tag that emits the next value from a comma-separated list each time it runs. An optional first identifier names a group so separate named groups advance independently across the render; anonymous groups reset when a new loop starts. Named groups keep their cursor across later loops in the same render.

Both forms must run only inside an active `for` loop and error when used elsewhere. Existing `loop` fields (`index`, `index0`, `revindex`, `revindex0`, `first`, `last`, `length`, `remaining`, `depth`) stay unchanged. Empty loops must not advance or print cycle output. Re-rendering the same template with the same data must stay stable. Cycle output concatenates without extra separators; values may be expressions, filters, or numbers rendered as text.

`stencil check` and `stencil outline` should accept well-formed cycle syntax. Parse time must reject a cycle tag with no values. Named group labels are case-sensitive.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.

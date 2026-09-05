`{% set %}` should capture rendered bodies and write into map namespaces, not only assign expressions.

Support `{% set name %}…{% endset %}`: render the body to text (honoring active escape mode and nested tags), then bind `name` in the current scope. Nested captures are allowed; inner bindings do not leak unless assigned outside. Whitespace control on the set delimiters behaves like other tags. Keep `{% set name = expression %}` working exactly as today—including errors for illegal left-hand sides.

Also allow `{% set ns.key = expression %}` and `{% set ns.key %}…{% endset %}` when `ns` is a map in scope: update that key without replacing the whole map, preserving insertion order for untouched keys. Missing `ns`, a non-map `ns`, or an empty key is a positioned error. Assignments inside `with` / `for` / blocks follow existing scope rules. Captured text is ordinary text unless filters inside the body mark it safe. An unclosed capture or a capture used as the left-hand side of `=` is a parse error. Inheritance, includes, and filters stay unchanged for templates that never use capture or namespace sets. `stencil check` parses the new forms and rejects unclosed `endset`. Capturing into a name that already exists overwrites it in the current scope only.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.

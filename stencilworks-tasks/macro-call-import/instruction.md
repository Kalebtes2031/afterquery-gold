Add Jinja-style macros, call blocks, and template imports so shared snippets stop being copy-pasted across templates.

`{% macro name(a, b=1) %}…{% endmacro %}` defines a reusable body. Defaults evaluate at call time in the caller's scope. Invoke with `{{ name(1, 2) }}` or `{% call name(args) %}…{% endcall %}`, which supplies a `caller` body the macro may render via `{{ caller() }}`. `{% import "lib" as ns %}` and `{% from "lib" import name as alias %}` load macros into a namespace that does not leak bare names into the outer template. Calling an unknown macro, importing a missing template, or exceeding the existing recursion / include depth budget must fail with a positioned template error naming the template and column.

Macro arguments bind as a fresh scope for the body: outer names stay readable unless shadowed; assignments inside a macro do not mutate the caller. Nested macros are allowed. Import cycles and self-recursive macros without a terminating path must hit the depth limit rather than hang. Keep existing tags, filters, and inheritance unchanged. Unbound names stay strict unless `Options::lenient()` is set.

Expose the feature through `Environment::render` / `render_named` so `include` and `extends` templates can define and import macros the same way. `stencil check` must parse well-formed new tags without error and reject malformed ones with caret diagnostics.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.

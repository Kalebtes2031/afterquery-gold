Filter calls should accept keyword arguments alongside positional ones, so templates can write things like `{{ value | truncate(12, end="..") }}`.

Extend the expression grammar, AST, and printer for this mixed form: positional arguments first, then keywords. A positional argument after a keyword is invalid. Malformed `name=` syntax is a parse error, not something to skip over. Keyword names are case-sensitive and must match what the filter registry declares; calling a keyword a filter does not support should fail and mention the unknown keyword. The registry and each filter's arity rules remain the source of truth for how many arguments are allowed. Keyword values may be any expression, including nested filter pipelines, evaluated left to right.

Errors at parse, check, or render time should carry a useful location and name the filter involved. Filters that already take optional trailing positional arguments should keep working once they are wired through the new calling convention. Templates that use only positional calls must behave exactly as before. `stencil filters -v` should still list filters and, when a filter declares keywords, show those names in the listing.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.

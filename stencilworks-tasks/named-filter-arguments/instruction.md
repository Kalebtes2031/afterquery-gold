In order to pass filter parameters it is necessary to provide keyword argument instead of positional arguments.


Now it is necessary to adapt the expression grammar, AST and printer with respect to the filter argument type `{{value | truncate(12, end="..")}}` and thus allow the usage of both positional and keyword arguments where all positional arguments come before the keyword ones. When creating templates that use any filter we must be able to check the keyword argument validity and thus violation at each stage must result in the creation of errors with unique positions and messages with description of the filter name. The existing filters that have optional ending arguments will remain functional as implementation will migrate to allow the usage of both positional and keyword type at any time.
 

`Filters' arity validation and registry are the ultimate source for how many arguments are valid; the keywords correspond to the names per filter. The value of keywords can be any expression including filter pipelines, and will be evaluated left to right. The command `stencil filters -v` still shows the filters and should show declared keyword names when any. All the existing templates that utilize only positional arguments will still function normally. Invalid `name=` parts of filter arguments are considered parsing errors not silently ignored ones. Filters which do not define any keywords still should reject the keyword calls and state the unknown keyword.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.

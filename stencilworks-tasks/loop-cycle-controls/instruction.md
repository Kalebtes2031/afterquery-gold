Loop cycling must be revealed in the Stencilworks templates so that the author can cycle through their values with each iteration of the `for` loop.

To implement this, you need to use `{{ loop.cycle("a", "b", ...) }}` so that you can access the current iteration index value while the function uses the number of passed values repeatedly and produces an empty result when not provided with arguments. The `{% cycle ... %}` tag must also be created to provide the next item of the value separated with a comma every time it is called, with the optional first identifier allowing to name the group which makes it possible for different named groups to make progress independently of each other while unnamed groups go back to the first value of a collection every time the new loop starts.

Two approaches to perform the task must be implemented in an active 'for' loop. The loop-related variables (index, index0, revindex, revindex0, first, last, length, and remaining and depth) must work accurately. It has to be noted that empty lines never participate in the looping process. One and the same template can be used for rendering several times with the same data.

Stencil check and stencil outline must accept valid cycle syntax. The parsing mechanism will fail to recognize cycle tags with an empty value. The group names must be precise.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.

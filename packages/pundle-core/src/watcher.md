Course of action when files are changed:

Round up all files in current job that match changed file path and store them in `changed`
When the change file queue empties:
  - Create a map of imports and importers of all changed files such that we have a way of referencing changed B file dependency of a dependency of changed A
  - Sort the changed such that dependencies come before dependents
  - Sort the changed such that deleted events come first, then added, finally changed (keeping the original dependency intact)
  - Recompile changed files in vertical queue instead of horizontal queue

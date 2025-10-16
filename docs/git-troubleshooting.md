# Git Troubleshooting Guide

When working on the project you may occasionally run into Git errors that block pulling
new changes. This guide documents the most common recovery steps.

## "Pulling is not possible because you have unmerged files"

This happens when a previous merge or rebase created conflicts that have not yet been
resolved. To recover:

1. **Check the status of the repository**
   ```bash
   git status
   ```
   Files marked as `both modified` still contain conflict markers that must be resolved.

2. **Open each conflicted file and resolve the sections between** `<<<<<<<`, `=======`,
   and `>>>>>>>`. Keep the desired changes and delete the markers.

3. **Mark the conflicts as resolved**
   ```bash
   git add <file>...
   ```

4. **Continue the merge or rebase**
   * If you were merging: `git commit`
   * If you were rebasing: `git rebase --continue`

5. **Retry the pull once the working tree is clean**
   ```bash
   git status
   git pull origin main
   ```

### Abort a conflicted merge or rebase

If you prefer to discard the in-progress merge or rebase entirely:

```bash
git merge --abort   # when merging
git rebase --abort  # when rebasing
```

> **Tip:** You can inspect outstanding conflicted files with `git ls-files -u`.

Keeping commits small and pulling frequently reduces the likelihood of long-running
conflicts.

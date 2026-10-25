# BDT Talent Group Website Hosting

Public GitHub Pages deployment for
[bdttalentgroup.com](https://bdttalentgroup.com/).

This repository is the single source for the website: pushing to `main`
publishes it. The former private source repository, `BDT-Website-Redesign`,
was archived on October 24, 2026 and is no longer kept in sync.

This repository is public. Commit only the static files needed to publish the
website; do not commit credentials, environment files, or private development
material here.

## Validation

Run the dependency-free checks before publishing:

```sh
python3 scripts/check_site.py
node --test scripts/test_forms.cjs
```

Copyright © BDT Talent Group. All rights reserved.

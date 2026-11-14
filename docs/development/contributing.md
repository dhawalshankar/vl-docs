---
title: Contributing
---

# Contributing

VartaLang is maintained across separate web, API, and documentation
codebases. Before making a change, identify which application owns the
behavior and read that repository's README and any local contribution
instructions. The project repositories may be private; access and review are
managed by their maintainers.

## Documentation changes

1. Keep product guidance aligned with the current application.
2. Separate available features from roadmap items and label future work as
   planned.
3. Avoid publishing secrets, internal environment values, private user data,
   or credentials in examples.
4. Prefer links to existing guides and public product pages over duplicated
   instructions.
5. Build the documentation site before submitting a change:

   ```bash
   npm run build
   ```

## Product and API changes

Follow the affected repository's established formatters, linters, tests, and
review process. For changes that cross a frontend/API boundary, update both
the implementation and its directly related documentation. Keep API
credentials and provider keys in server-side configuration; never expose
them through browser variables or source control.

## Reporting a problem

Include the affected product area, steps to reproduce, expected behavior,
and actual behavior. Remove account data, tokens, API keys, and other
sensitive information from screenshots and logs before sharing them.

# Modules and dependencies

`installation-ui` and `micro-ui` share the DIGIT UI Core module framework, so a module built for one is generally usable from the other, and both draw on the same shared component/module conventions. `livelihood-ui` is architecturally independent — a separate Vite/TanStack Router/React Query stack — and does not consume `micro-ui` modules directly; it talks to the same backend services instead.

In practice this means:

- Admin/workbench-style screens (organisation management, master-data management, localization) tend to live in the `micro-ui`-based world.
- Installation's Project Manager/Reviewer/Field Technician screens live in `installation-ui`, also `micro-ui`-based.
- Livelihood's day-to-day support-ticket and facility-manager-facing screens live in `livelihood-ui`, independent of the other two.

There is no mobile or Flutter application in this repository — all three apps are web applications, used on mobile browsers where field or manager workflows need it.

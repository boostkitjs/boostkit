---
'create-rudder-app': patch
---

Fix multiple scaffolder template bugs that broke generated apps:

- Fix `${extraLinksStr}` and `${extraStr}` being written literally instead of interpolated (index page crashed with ReferenceError)
- Align API auth routes with vendor auth pages: `/api/auth/sign-in/email`, `/api/auth/sign-up/email`, `/api/auth/sign-out`, `/api/auth/request-password-reset`, `/api/auth/reset-password`
- Implement real sign-up flow with Hash + User.create + Auth.login
- Add stubs for password reset endpoints

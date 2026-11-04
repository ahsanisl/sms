# EduFlow mobile API (for the Flutter app)

The web app and the mobile app share one sign-in system: **Better Auth** (`src/auth.ts`). Every signed-in browser or phone is a session row in the database (`auth_sessions`). Users can see them under **My Account → Signed-in Devices** and sign the others out. Changing or resetting a password signs out the other devices automatically.

The web app keeps its session in a cookie. The mobile app sends the same session token in a header.

## Sign in

```http
POST /api/auth/sign-in/password
Content-Type: application/json

{ "email": "teacher@school.com", "password": "…", "rememberMe": true }
```

**200 OK**

```json
{
  "token": "SESSION_TOKEN",
  "user": { "id": "…", "name": "…", "email": "…", "role": "teacher", "mustChangePassword": false }
}
```

The same token also comes back in the `set-auth-token` response header. Store it in secure storage, such as `flutter_secure_storage`. Don't use plain shared preferences.

**Errors** (both return JSON with a `message` you can show as-is):

- **401:** the email or password is wrong.
- **429:** too many attempts. Five wrong passwords lock the account for 15 minutes, and too many failures from one network also block it.

If `mustChangePassword` is `true`, the person was given a temporary password. Send them to a change-password screen before anything else. That screen's API doesn't exist yet, so for now open the web app's My Account page.

## Calling the API

Send the token on every request:

```http
GET /api/v1/me
Authorization: Bearer SESSION_TOKEN
```

A **401** means the session expired or was signed out. Send the person back to the sign-in screen.

Sessions last 30 days, and each day of use extends them. If `rememberMe` was `false`, the session lasts only one day.

### `GET /api/v1/me`

Returns the signed-in user, their school, what their role can do (`permissions`, one true/false per module), and, for a parent, their children. Use `permissions` to decide which screens to show. The server checks them again on every request.

## Signing out

```http
POST /api/auth/sign-out
Authorization: Bearer SESSION_TOKEN
Content-Type: application/json

{}
```

Every `POST` to `/api/auth/*` needs `Content-Type: application/json`, even with an empty `{}` body. Otherwise it fails with 415.

## Other Better Auth endpoints

These also accept the bearer token:

- `GET /api/auth/get-session` returns the current session and user.
- `GET /api/auth/list-sessions` lists this user's signed-in devices.
- `POST /api/auth/revoke-other-sessions` signs out every other device.

## Forgotten passwords

This is web only. Open `https://<your-domain>/forgot-password` in the browser. The emailed link opens the web reset page.

## Still to build for the app

Today the web app's screens load their data through server components, not a public API. Each feature the app needs gets a `/api/v1/...` route that:

1. calls `requireSession()` (`src/lib/tenancy.ts`) to identify the user from the bearer token;
2. calls the same service functions the web pages use (`src/services/*`). Those already enforce permissions and campus/child scoping, so a route only translates HTTP to a service call;
3. returns JSON.

Suggested order:

- **Parents:** children's attendance, fees and invoices, results, homework, announcements.
- **Teachers:** today's timetable, mark attendance, homework.
- **Everyone:** change password.

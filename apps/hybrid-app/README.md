# TrustInbox — Hybrid App

Flutter-based mobile application providing feature-parity with the TrustInbox web app. Built with Flutter ^3.11.4.

## Features

- **Inbox** — Notification list with category filtering (Personal / Service Provider / Advertisement), mark-read, delete
- **Callbacks** — Request management with approve / reject / reschedule actions
- **Conversations** — Real-time messaging via GraphQL subscriptions; voice notes, file attachments
- **Documents** — Upload, view, and share documents via presigned MinIO URLs
- **Friends** — Send / accept / decline friend requests; start conversations
- **Service Providers** — Directory, follow, block, active-bot discovery
- **Push Notifications** — FCM (Android) / APNS (iOS) via `firebase_messaging`
- **Settings** — DND schedules, availability slots, privacy preferences, addresses
- **Profile** — Avatar upload, name/bio editing, career history
- **Dark / Light theme** — Follows system preference

## Architecture

| Concern | Package |
|---------|--------|
| Navigation | `go_router ^14.8.1` |
| State management | `provider ^6.1.5` |
| API (GraphQL) | `graphql_flutter ^5.2.1` |
| HTTP / REST | `http ^1.2.2` |
| Push notifications | `firebase_messaging ^15.2.5` |
| Local notifications | `flutter_local_notifications ^18.0.1` |
| Image caching | `cached_network_image ^3.4.1` |
| File picking | `file_picker ^8.1.7`, `image_picker ^1.1.2` |

## Getting Started

1. **Install dependencies:**
   ```bash
   flutter pub get
   ```
2. **Firebase setup:**
   - Android: place `google-services.json` in `android/app/`
   - iOS: place `GoogleService-Info.plist` in `ios/Runner/`
3. **Run:**
   ```bash
   flutter run
   ```
   Ensure the TrustInbox gateway is running at `http://localhost:4000` (or update `lib/config/app_config.dart`).

## Testing

```bash
flutter test          # widget + unit tests
flutter analyze       # static analysis (must be clean)
```

## Directory Layout

```
lib/
  config/      # theme, app constants
  graphql/     # GQL query/mutation strings
  models/      # Dart data models
  providers/   # AuthProvider, NotificationProvider
  router/      # go_router configuration
  screens/     # feature screens (auth, inbox, callbacks, …)
  widgets/     # shared widgets (EmptyState, …)
  main.dart
test/
  widget_test.dart
```

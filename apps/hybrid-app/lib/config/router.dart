import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/setup/permission_setup_screen.dart';
import '../screens/onboarding/onboarding_wizard_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/inbox/inbox_screen.dart';
import '../screens/inbox/notification_detail_screen.dart';
import '../screens/conversations/conversations_screen.dart';
import '../screens/conversations/chat_screen.dart';
import '../screens/callbacks/callbacks_screen.dart';
import '../screens/callbacks/callback_detail_screen.dart';
import '../screens/friends/friends_screen.dart';
import '../screens/service_providers/service_providers_screen.dart';
import '../screens/service_providers/service_provider_detail_screen.dart';
import '../screens/documents/documents_screen.dart';
import '../screens/documents/document_detail_screen.dart';
import '../screens/activity/activity_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/settings/settings_screen.dart';
import '../screens/settings/privacy_screen.dart';
import '../screens/settings/dnd_screen.dart';
import '../screens/settings/availability_screen.dart';
import '../screens/settings/addresses_screen.dart';
import '../screens/settings/blocked_screen.dart';
import '../screens/settings/category_preferences_screen.dart';
import '../screens/settings/theme_screen.dart';
import '../screens/auth/forgot_password_screen.dart';
import '../screens/auth/verify_email_screen.dart';
import '../screens/shell/app_shell.dart';

// ─── App Router ─────────────────────────────────────────
// Mirrors: apps/web/src/app/ route structure

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createRouter(AuthProvider auth) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      final isAuth = auth.isAuthenticated;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');
      final isOnboarding = state.matchedLocation == '/onboarding';
      final isSetup = state.matchedLocation.startsWith('/setup');

      if (auth.isLoading) return null;
      if (!isAuth && !isAuthRoute) return '/auth/login';
      if (isAuth && isAuthRoute) return '/';

      // After auth + permission setup, force onboarding wizard until done.
      if (isAuth && !auth.onboardingComplete && !isOnboarding && !isSetup) {
        return '/onboarding';
      }
      if (isAuth && auth.onboardingComplete && isOnboarding) return '/';
      return null;
    },
    routes: [
      // Auth routes
      GoRoute(
        path: '/auth/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/auth/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/auth/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/auth/verify-email',
        builder: (context, state) {
          final email = state.uri.queryParameters['email'] ?? '';
          return VerifyEmailScreen(email: email);
        },
      ),
      // Permission setup (first-launch)
      GoRoute(
        path: '/setup/permissions',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => PermissionSetupScreen(
          onComplete: () => GoRouter.of(context).go('/'),
        ),
      ),
      // Onboarding wizard (post-permission, first-launch)
      GoRoute(
        path: '/onboarding',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const OnboardingWizardScreen(),
      ),
      // Full-screen routes outside the shell
      GoRoute(
        path: '/conversations/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => ChatScreen(
          conversationId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/inbox/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => NotificationDetailScreen(
          notificationId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/callbacks/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => CallbackDetailScreen(
          callbackId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/documents/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => DocumentDetailScreen(
          documentId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/service-providers/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => ServiceProviderDetailScreen(
          serviceProviderId: state.pathParameters['id']!,
        ),
      ),
      // Dashboard shell (authenticated)
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/inbox',
            builder: (context, state) => const InboxScreen(),
          ),
          GoRoute(
            path: '/conversations',
            builder: (context, state) => const ConversationsScreen(),
          ),
          GoRoute(
            path: '/callbacks',
            builder: (context, state) => const CallbacksScreen(),
          ),
          GoRoute(
            path: '/friends',
            builder: (context, state) => const FriendsScreen(),
          ),
          GoRoute(
            path: '/service-providers',
            builder: (context, state) => const ServiceProvidersScreen(),
          ),
          GoRoute(
            path: '/documents',
            builder: (context, state) => const DocumentsScreen(),
          ),
          GoRoute(
            path: '/activity',
            builder: (context, state) => const ActivityScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/settings/privacy',
            builder: (context, state) => const PrivacyScreen(),
          ),
          GoRoute(
            path: '/settings/dnd',
            builder: (context, state) => const DNDScreen(),
          ),
          GoRoute(
            path: '/settings/availability',
            builder: (context, state) => const AvailabilityScreen(),
          ),
          GoRoute(
            path: '/settings/addresses',
            builder: (context, state) => const AddressesScreen(),
          ),
          GoRoute(
            path: '/settings/blocked',
            builder: (context, state) => const BlockedScreen(),
          ),
          GoRoute(
            path: '/settings/preferences',
            builder: (context, state) => const CategoryPreferencesScreen(),
          ),
          GoRoute(
            path: '/settings/theme',
            builder: (context, state) => const ThemeScreen(),
          ),
        ],
      ),
    ],
  );
}

import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'config/router.dart';
import 'providers/auth_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/notification_provider.dart';
import 'services/graphql_service.dart';
import 'services/push_service.dart';
import 'services/sound_service.dart';
import 'screens/splash/splash_screen.dart';
import 'widgets/internet_guard.dart';
import 'widgets/post_call_prompt.dart';

// ─── TrustInbox Mobile App ──────────────────────────────
// Mirrors: apps/web/ — 1:1 feature parity Flutter port

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initHiveForFlutter();
  await SoundService.hydrate();

  // Firebase — requires google-services.json (Android) and GoogleService-Info.plist (iOS).
  // These files are NOT committed; configure them per environment.
  //
  // IMPORTANT: Do NOT await PushService.initialize() here.
  // On Android 13+, requestPermission() shows a system dialog that blocks
  // the thread — calling it before runApp() freezes the launch screen.
  // Firebase.initializeApp() also gets a short timeout to avoid hanging
  // on devices that are offline when the app first launches.
  try {
    await Firebase.initializeApp().timeout(const Duration(seconds: 5));
    // Fire-and-forget: permission dialog must not block runApp().
    PushService.initialize().ignore();
  } catch (_) {
    // Firebase not configured or timed out — push will be silently disabled.
  }

  runApp(const TrustInboxApp());
}

class TrustInboxApp extends StatelessWidget {
  const TrustInboxApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProxyProvider<AuthProvider, NotificationProvider>(
          create: (ctx) {
            final auth = ctx.read<AuthProvider>();
            return NotificationProvider(getToken: () => auth.token);
          },
          update: (_, auth, previous) {
            if (previous == null) {
              return NotificationProvider(getToken: () => auth.token);
            }
            if (auth.isAuthenticated && !previous.connected) {
              previous.connectSSE();
            } else if (!auth.isAuthenticated && previous.connected) {
              previous.disconnectSSE();
            }
            return previous;
          },
        ),
      ],
      child: const _TrustInboxRoot(),
    );
  }
}

class _TrustInboxRoot extends StatefulWidget {
  const _TrustInboxRoot();

  @override
  State<_TrustInboxRoot> createState() => _TrustInboxRootState();
}

class _TrustInboxRootState extends State<_TrustInboxRoot> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _router = createRouter(auth);
  }

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    return GraphQLProvider(
      client: GraphQLService.client,
      child: MaterialApp.router(
        title: 'TrustInbox',
        debugShowCheckedModeBanner: false,
        theme: buildLightTheme(),
        darkTheme: buildDarkTheme(),
        themeMode: themeProvider.themeMode,
        routerConfig: _router,
        // ── _AppShell overlays SplashScreen while auth is loading.
        // Pure widget state — zero GoRouter timing dependency.
        builder: (_, child) => _AppShell(routerChild: child),
      ),
    );
  }
}

// ─── App Shell ────────────────────────────────────────────
// Watches AuthProvider directly. While isLoading, renders SplashScreen
// on top of everything — the router child is not in the tree so no
// authenticated screens make network calls before the token is ready.
class _AppShell extends StatelessWidget {
  final Widget? routerChild;
  const _AppShell({super.key, this.routerChild});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.isLoading) return const SplashScreen();
    return InternetGuard(
      child: PostCallPrompt(
        child: routerChild ?? const SizedBox.shrink(),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'config/router.dart';
import 'providers/auth_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/notification_provider.dart';
import 'services/graphql_service.dart';
import 'widgets/internet_guard.dart';
import 'widgets/post_call_prompt.dart';

// ─── TrustInbox Mobile App ──────────────────────────────
// Mirrors: apps/web/ — 1:1 feature parity Flutter port

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initHiveForFlutter();
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
    return InternetGuard(
      child: PostCallPrompt(
        child: GraphQLProvider(
          client: GraphQLService.client,
          child: MaterialApp.router(
            title: 'TrustInbox',
            debugShowCheckedModeBanner: false,
            theme: buildLightTheme(),
            darkTheme: buildDarkTheme(),
            themeMode: themeProvider.themeMode,
            routerConfig: _router,
          ),
        ),
      ),
    );
  }
}

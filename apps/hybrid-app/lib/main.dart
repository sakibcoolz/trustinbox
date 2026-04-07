import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'config/router.dart';
import 'providers/auth_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/notification_provider.dart';
import 'services/graphql_service.dart';

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
      ],
      child: Consumer2<AuthProvider, ThemeProvider>(
        builder: (context, auth, themeProvider, _) {
          // Start notification listener when authenticated
          return ChangeNotifierProxyProvider<AuthProvider, NotificationProvider>(
            create: (_) => NotificationProvider(getToken: () => auth.token),
            update: (_, auth, previous) {
              if (previous == null) return NotificationProvider(getToken: () => auth.token);
              if (auth.isAuthenticated && !previous.connected) {
                previous.connectSSE();
              } else if (!auth.isAuthenticated && previous.connected) {
                previous.disconnectSSE();
              }
              return previous;
            },
            child: GraphQLProvider(
              client: GraphQLService.client,
              child: MaterialApp.router(
                title: 'TrustInbox',
                debugShowCheckedModeBanner: false,
                theme: buildLightTheme(),
                darkTheme: buildDarkTheme(),
                themeMode: themeProvider.themeMode,
                routerConfig: createRouter(auth),
              ),
            ),
          );
        },
      ),
    );
  }
}

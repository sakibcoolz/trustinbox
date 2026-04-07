import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/notification_provider.dart';

// ─── App Shell (Bottom Navigation Layout) ───────────────
// Mirrors: apps/web/src/app/(dashboard)/layout.tsx + sidebar + mobile-nav

class AppShell extends StatelessWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  static const _navItems = [
    _NavItem(label: 'Home', icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, path: '/'),
    _NavItem(label: 'Inbox', icon: Icons.inbox_outlined, activeIcon: Icons.inbox, path: '/inbox'),
    _NavItem(label: 'Chats', icon: Icons.chat_bubble_outline, activeIcon: Icons.chat_bubble, path: '/conversations'),
    _NavItem(label: 'Calls', icon: Icons.phone_outlined, activeIcon: Icons.phone, path: '/callbacks'),
    _NavItem(label: 'More', icon: Icons.menu_outlined, activeIcon: Icons.menu, path: '/settings'),
  ];

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location == '/') return 0;
    if (location.startsWith('/inbox')) return 1;
    if (location.startsWith('/conversations')) return 2;
    if (location.startsWith('/callbacks')) return 3;
    return 4;
  }

  @override
  Widget build(BuildContext context) {
    final idx = _currentIndex(context);
    final notifs = context.watch<NotificationProvider>();

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: idx,
        onDestinationSelected: (i) {
          context.go(_navItems[i].path);
        },
        destinations: _navItems.map((item) {
          Widget icon = Icon(item.icon);
          Widget activeIcon = Icon(item.activeIcon);

          // Badge for inbox
          if (item.path == '/inbox' && notifs.unreadCount > 0) {
            icon = Badge(
              label: Text('${notifs.unreadCount}'),
              child: Icon(item.icon),
            );
            activeIcon = Badge(
              label: Text('${notifs.unreadCount}'),
              child: Icon(item.activeIcon),
            );
          }

          return NavigationDestination(
            icon: icon,
            selectedIcon: activeIcon,
            label: item.label,
          );
        }).toList(),
      ),
    );
  }
}

class _NavItem {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final String path;

  const _NavItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.path,
  });
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trustinbox/widgets/empty_state.dart';

void main() {
  // ─── EmptyState widget ──────────────────────────────────
  group('EmptyState', () {
    testWidgets('renders icon, title and subtitle', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'No items',
              subtitle: 'Nothing here yet',
            ),
          ),
        ),
      );

      expect(find.text('No items'), findsOneWidget);
      expect(find.text('Nothing here yet'), findsOneWidget);
      expect(find.byIcon(Icons.inbox), findsOneWidget);
    });

    testWidgets('does not render subtitle when omitted', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'Empty',
            ),
          ),
        ),
      );

      expect(find.text('Empty'), findsOneWidget);
      // No subtitle widget rendered
      expect(find.byType(Text), findsOneWidget);
    });

    testWidgets('renders and fires action button when provided', (tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'Empty',
              action: ElevatedButton(
                onPressed: () => tapped = true,
                child: const Text('Tap me'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Tap me'), findsOneWidget);
      await tester.tap(find.text('Tap me'));
      expect(tapped, isTrue);
    });

    testWidgets('centers content with correct padding', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'Centered',
            ),
          ),
        ),
      );

      expect(find.byType(Center), findsWidgets);
      expect(find.byType(Padding), findsWidgets);
    });
  });
}


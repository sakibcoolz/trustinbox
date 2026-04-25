import 'package:flutter/material.dart';
import '../../../config/theme.dart';

// ─── Typing Indicator ──────────────────────────────────
// Renders "X is typing…" with three animated dots, mirroring the web app.
// Fed from SSE `typing` / `stop_typing` events; the parent screen is
// responsible for clearing the name after ~3s of inactivity.
class TypingIndicator extends StatefulWidget {
  final String? typingUserName;

  const TypingIndicator({super.key, required this.typingUserName});

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))
        ..repeat();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final name = widget.typingUserName;
    if (name == null || name.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: [
          Text(
            '$name is typing',
            style: TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
          const SizedBox(width: 4),
          AnimatedBuilder(
            animation: _ctrl,
            builder: (_, __) {
              // 0..3 dot index
              final i = ((_ctrl.value * 3).floor() % 3) + 1;
              return Text(
                '.' * i,
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              );
            },
          ),
        ],
      ),
    );
  }
}

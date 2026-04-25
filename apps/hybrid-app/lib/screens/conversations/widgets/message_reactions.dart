import 'package:flutter/material.dart';
import '../../../config/theme.dart';
import '../../../models/conversation.dart';

// ─── Message Reactions Strip ───────────────────────────
// Renders the row of emoji-count chips beneath a message bubble.
// Tapping a chip toggles the current user's reaction (mirrors web UX).
class MessageReactions extends StatelessWidget {
  final List<Reaction> reactions;
  final void Function(String emoji) onToggle;

  const MessageReactions({
    super.key,
    required this.reactions,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    if (reactions.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Wrap(
        spacing: 4,
        runSpacing: 4,
        children: reactions.map((r) {
          return InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => onToggle(r.emoji),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: r.mine
                    ? AppColors.accentBlue.withValues(alpha: 0.18)
                    : AppColors.bgCard,
                border: Border.all(
                  color: r.mine
                      ? AppColors.accentBlue
                      : AppColors.borderPrimary,
                  width: 1,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(r.emoji, style: const TextStyle(fontSize: 14)),
                  const SizedBox(width: 4),
                  Text(
                    '${r.count}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: r.mine ? AppColors.accentBlue : AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─── Reaction Picker Bottom Sheet ──────────────────────
class ReactionPickerSheet extends StatelessWidget {
  static const List<String> emojis = [
    '👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏', '🙏',
  ];

  const ReactionPickerSheet({super.key});

  static Future<String?> show(BuildContext context) {
    return showModalBottomSheet<String>(
      context: context,
      builder: (_) => const ReactionPickerSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        child: Wrap(
          spacing: 12,
          runSpacing: 12,
          alignment: WrapAlignment.center,
          children: emojis
              .map((e) => GestureDetector(
                    onTap: () => Navigator.pop(context, e),
                    child: Text(e, style: const TextStyle(fontSize: 32)),
                  ))
              .toList(),
        ),
      ),
    );
  }
}

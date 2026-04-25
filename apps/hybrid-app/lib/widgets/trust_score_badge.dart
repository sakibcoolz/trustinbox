import 'package:flutter/material.dart';
import '../config/theme.dart';

// ─── Trust Score Badge ──────────────────────────────────
// Mirrors web TrustBadge. Tiered colors:
//   80+ green · 60-79 amber · <60 red.
// Renders nothing when score is null so callers can pass through optional values.

class TrustScoreBadge extends StatelessWidget {
  final num? score;
  final double fontSize;
  final EdgeInsets padding;

  const TrustScoreBadge({
    super.key,
    required this.score,
    this.fontSize = 11,
    this.padding = const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
  });

  @override
  Widget build(BuildContext context) {
    final value = score;
    if (value == null) return const SizedBox.shrink();

    final (Color color, Color bg) = value >= 80
        ? (AppColors.statusSuccess, AppColors.statusSuccess.withValues(alpha: 0.12))
        : value >= 60
            ? (AppColors.accentOrange, AppColors.accentOrange.withValues(alpha: 0.12))
            : (AppColors.accentRed, AppColors.accentRed.withValues(alpha: 0.12));

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '${value.toStringAsFixed(0)}% Trust',
        style: TextStyle(
          color: color,
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

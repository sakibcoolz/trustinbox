import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../graphql/settings.dart';
import '../../config/theme.dart';

// ─── Availability Settings Screen ───────────────────────
// Mirrors: apps/web/src/app/(dashboard)/settings/availability/page.tsx

class AvailabilityScreen extends StatefulWidget {
  const AvailabilityScreen({super.key});

  @override
  State<AvailabilityScreen> createState() => _AvailabilityScreenState();
}

class _AvailabilityScreenState extends State<AvailabilityScreen> {
  static const _days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  static const _slotTypes = ['Callback', 'Meeting', 'Any'];

  bool _showForm = false;
  int _day = 1;
  TimeOfDay _startTime = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 17, minute: 0);
  String _slotType = 'Callback';

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Color _slotColor(String type) {
    switch (type) {
      case 'Callback':
        return AppColors.accentBlue;
      case 'Meeting':
        return AppColors.accentPurple;
      default:
        return AppColors.accentGreen;
    }
  }

  Future<void> _pickTime(bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _startTime : _endTime,
    );
    if (picked != null) {
      setState(() => isStart ? _startTime = picked : _endTime = picked);
    }
  }

  void _resetForm() {
    setState(() {
      _showForm = false;
      _day = 1;
      _startTime = const TimeOfDay(hour: 9, minute: 0);
      _endTime = const TimeOfDay(hour: 17, minute: 0);
      _slotType = 'Callback';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Availability'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => setState(() => _showForm = true),
          ),
        ],
      ),
      body: Query(
        options: QueryOptions(
          document: gql(myAvailabilitySlotsQuery),
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading && result.data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final slots = (result.data?['myAvailabilitySlots'] as List<dynamic>?) ?? [];

          return Mutation(
            options: MutationOptions(
              document: gql(createAvailabilitySlotMutation),
              onCompleted: (_) => refetch?.call(),
            ),
            builder: (runCreate, _) {
              return Mutation(
                options: MutationOptions(
                  document: gql(deleteAvailabilitySlotMutation),
                  onCompleted: (_) => refetch?.call(),
                ),
                builder: (runDelete, _) {
                  return ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_showForm) _buildForm(runCreate),

                      // Weekly calendar view
                      ..._days.asMap().entries.map((entry) {
                        final dayIdx = entry.key;
                        final dayName = entry.value;
                        final daySlots = slots
                            .where((s) => (s as Map<String, dynamic>)['dayOfWeek'] == dayIdx)
                            .toList();

                        return Card(
                          margin: const EdgeInsets.only(bottom: 4),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                SizedBox(
                                  width: 80,
                                  child: Text(
                                    dayName.substring(0, 3),
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                  ),
                                ),
                                Expanded(
                                  child: daySlots.isEmpty
                                      ? Text('No availability',
                                          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11))
                                      : Wrap(
                                          spacing: 6,
                                          runSpacing: 6,
                                          children: daySlots.map((s) {
                                            final slot = s as Map<String, dynamic>;
                                            final type = slot['slotType'] as String? ?? 'Any';
                                            final start = slot['startTime'] as String? ?? '';
                                            final end = slot['endTime'] as String? ?? '';
                                            final id = slot['id'] as String;
                                            final color = _slotColor(type);

                                            return Chip(
                                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              visualDensity: VisualDensity.compact,
                                              backgroundColor: color.withValues(alpha: 0.1),
                                              label: Text(
                                                '$type  $start–$end',
                                                style: TextStyle(fontSize: 11, color: color),
                                              ),
                                              deleteIcon: Icon(Icons.close, size: 14, color: color),
                                              onDeleted: () => runDelete({'id': id}),
                                            );
                                          }).toList(),
                                        ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                  );
                },
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildForm(RunMutation runCreate) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('New Availability Slot', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 16),

            // Day picker
            const Text('Day of Week', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
            const SizedBox(height: 4),
            DropdownButtonFormField<int>(
              value: _day,
              items: _days.asMap().entries.map((e) =>
                  DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
              onChanged: (v) => setState(() => _day = v ?? 1),
              decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
            ),
            const SizedBox(height: 12),

            // Time pickers
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => _pickTime(true),
                    child: InputDecorator(
                      decoration: const InputDecoration(labelText: 'Start', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                      child: Text(_fmt(_startTime)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GestureDetector(
                    onTap: () => _pickTime(false),
                    child: InputDecorator(
                      decoration: const InputDecoration(labelText: 'End', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                      child: Text(_fmt(_endTime)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Slot type
            const Text('Slot Type', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
            const SizedBox(height: 4),
            DropdownButtonFormField<String>(
              value: _slotType,
              items: _slotTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
              onChanged: (v) => setState(() => _slotType = v ?? 'Callback'),
              decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
            ),
            const SizedBox(height: 16),

            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(onPressed: _resetForm, child: const Text('Cancel')),
                const SizedBox(width: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentGreen),
                  onPressed: () {
                    runCreate({
                      'input': {
                        'dayOfWeek': _day,
                        'startTime': _fmt(_startTime),
                        'endTime': _fmt(_endTime),
                        'slotType': _slotType,
                      },
                    });
                    _resetForm();
                  },
                  child: const Text('Add Slot', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

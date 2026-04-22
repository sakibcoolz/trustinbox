import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../graphql/settings.dart';
import '../../config/theme.dart';

// ─── DND Settings Screen ────────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/settings/dnd/page.tsx

class DNDScreen extends StatefulWidget {
  const DNDScreen({super.key});

  @override
  State<DNDScreen> createState() => _DNDScreenState();
}

class _DNDScreenState extends State<DNDScreen> {
  static const _days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  bool _showForm = false;
  String? _editId;
  TimeOfDay _startTime = const TimeOfDay(hour: 22, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 7, minute: 0);
  Set<int> _selectedDays = {0, 1, 2, 3, 4, 5, 6};

  String _formatTimeOfDay(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  void _resetForm() {
    setState(() {
      _showForm = false;
      _editId = null;
      _startTime = const TimeOfDay(hour: 22, minute: 0);
      _endTime = const TimeOfDay(hour: 7, minute: 0);
      _selectedDays = {0, 1, 2, 3, 4, 5, 6};
    });
  }

  Future<void> _pickTime(bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _startTime : _endTime,
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startTime = picked;
        } else {
          _endTime = picked;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) { context.pop(); } else { context.go('/settings'); }
          },
        ),
        title: const Text('Do Not Disturb'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => setState(() {
              _showForm = true;
              _editId = null;
            }),
          ),
        ],
      ),
      body: Query(
        options: QueryOptions(
          document: gql(myDNDRulesQuery),
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading && result.data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final rules = (result.data?['myDNDRules'] as List<dynamic>?) ?? [];

          return Mutation(
            options: MutationOptions(
              document: gql(createDNDRuleMutation),
              onCompleted: (_) => refetch?.call(),
            ),
            builder: (runCreate, createResult) {
              return Mutation(
                options: MutationOptions(
                  document: gql(deleteDNDRuleMutation),
                  onCompleted: (_) => refetch?.call(),
                ),
                builder: (runDelete, deleteResult) {
                  return Mutation(
                    options: MutationOptions(
                      document: gql(updateDNDRuleMutation),
                      onCompleted: (_) => refetch?.call(),
                    ),
                    builder: (runUpdate, updateResult) {
                      return ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_showForm) _buildForm(runCreate, runDelete),

                          if (rules.isEmpty && !_showForm)
                            _buildEmptyState()
                          else
                            ...rules.map((rule) => _buildRuleCard(
                              rule as Map<String, dynamic>,
                              runUpdate,
                              runDelete,
                            )),
                        ],
                      );
                    },
                  );
                },
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 64),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: AppColors.accentPurple.withValues(alpha: 0.15),
              child: const Icon(Icons.nights_stay_outlined, size: 28, color: AppColors.accentPurple),
            ),
            const SizedBox(height: 12),
            Text('No DND rules yet', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 4),
            Text('Add a rule to set quiet hours.', style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }

  Widget _buildForm(RunMutation runCreate, RunMutation runDelete) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _editId != null ? 'Edit Rule' : 'New DND Rule',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            ),
            const SizedBox(height: 16),

            // Time pickers
            Row(
              children: [
                Expanded(
                  child: _TimePicker(
                    label: 'Start Time',
                    time: _startTime,
                    onTap: () => _pickTime(true),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _TimePicker(
                    label: 'End Time',
                    time: _endTime,
                    onTap: () => _pickTime(false),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Day selector
            const Text('Active Days', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: List.generate(7, (i) {
                final selected = _selectedDays.contains(i);
                return GestureDetector(
                  onTap: () => setState(() {
                    if (selected) {
                      _selectedDays.remove(i);
                    } else {
                      _selectedDays.add(i);
                    }
                  }),
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: selected ? AppColors.accentPurple : AppColors.bgElevated,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      _days[i],
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: selected ? Colors.white : AppColors.textSecondary,
                      ),
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 16),

            // Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(onPressed: _resetForm, child: const Text('Cancel')),
                const SizedBox(width: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentBlue),
                  onPressed: () {
                    if (_editId != null) {
                      runDelete({'id': _editId});
                    }
                    runCreate({
                      'input': {
                        'scopeType': 'GLOBAL',
                        'startTime': _formatTimeOfDay(_startTime),
                        'endTime': _formatTimeOfDay(_endTime),
                        'daysOfWeek': _selectedDays.toList()..sort(),
                        'isActive': true,
                      },
                    });
                    _resetForm();
                  },
                  child: Text(
                    _editId != null ? 'Update Rule' : 'Create Rule',
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRuleCard(Map<String, dynamic> rule, RunMutation runUpdate, RunMutation runDelete) {
    final id = rule['id'] as String;
    final start = rule['startTime'] as String? ?? '';
    final end = rule['endTime'] as String? ?? '';
    final isActive = rule['isActive'] as bool? ?? true;
    final daysOfWeek = (rule['daysOfWeek'] as List<dynamic>?)?.cast<int>() ?? [];

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isActive
              ? AppColors.accentPurple.withValues(alpha: 0.15)
              : AppColors.bgElevated,
          child: Icon(Icons.nights_stay_outlined,
              color: isActive ? AppColors.accentPurple : AppColors.textMuted),
        ),
        title: Row(
          children: [
            Text('$start – $end', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isActive
                    ? AppColors.statusSuccess.withValues(alpha: 0.1)
                    : AppColors.bgElevated,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                isActive ? 'Active' : 'Paused',
                style: TextStyle(
                  fontSize: 10,
                  color: isActive ? AppColors.statusSuccess : AppColors.textMuted,
                ),
              ),
            ),
          ],
        ),
        subtitle: Text(
          daysOfWeek.map((d) => _days[d]).join(', '),
          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (val) {
            switch (val) {
              case 'toggle':
                runUpdate({'id': id, 'input': {'isActive': !isActive}});
                break;
              case 'edit':
                setState(() {
                  _editId = id;
                  final parts = start.split(':');
                  _startTime = TimeOfDay(hour: int.tryParse(parts[0]) ?? 22, minute: int.tryParse(parts[1]) ?? 0);
                  final endParts = end.split(':');
                  _endTime = TimeOfDay(hour: int.tryParse(endParts[0]) ?? 7, minute: int.tryParse(endParts[1]) ?? 0);
                  _selectedDays = daysOfWeek.toSet();
                  _showForm = true;
                });
                break;
              case 'delete':
                runDelete({'id': id});
                break;
            }
          },
          itemBuilder: (_) => [
            PopupMenuItem(value: 'toggle', child: Text(isActive ? 'Pause' : 'Activate')),
            const PopupMenuItem(value: 'edit', child: Text('Edit')),
            const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: AppColors.accentRed))),
          ],
        ),
      ),
    );
  }
}

class _TimePicker extends StatelessWidget {
  final String label;
  final TimeOfDay time;
  final VoidCallback onTap;

  const _TimePicker({required this.label, required this.time, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.bgInput,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.borderPrimary),
            ),
            child: Text(
              '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}

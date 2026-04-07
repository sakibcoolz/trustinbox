import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../graphql/settings.dart';
import '../../config/theme.dart';

// ─── Privacy Settings Screen ────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/settings/privacy/page.tsx

class PrivacyScreen extends StatefulWidget {
  const PrivacyScreen({super.key});

  @override
  State<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends State<PrivacyScreen> {
  late Map<String, bool> _prefs;
  bool _initialized = false;
  bool _saved = false;

  static const _defaults = {
    'allowPersonalNotifications': true,
    'allowSPNotifications': true,
    'allowAdvertisements': false,
    'allowCallbackRequests': true,
    'allowChat': true,
    'allowDocumentShares': true,
    'requireCallApproval': true,
  };

  static const _toggles = [
    {'key': 'allowPersonalNotifications', 'label': 'Allow Personal Notifications', 'desc': 'Receive direct messages and personal alerts from contacts.'},
    {'key': 'allowSPNotifications', 'label': 'Allow Service Provider Notifications', 'desc': 'Receive transactional and business notifications from verified providers.'},
    {'key': 'allowAdvertisements', 'label': 'Allow Advertisements', 'desc': 'Receive promotional content from verified service providers.'},
    {'key': 'allowCallbackRequests', 'label': 'Allow Callback Requests', 'desc': 'Let service providers request phone callbacks with you.'},
    {'key': 'allowChat', 'label': 'Allow Chat Messages', 'desc': 'Let service providers initiate chat conversations with you.'},
    {'key': 'allowDocumentShares', 'label': 'Allow Document Shares', 'desc': 'Receive documents shared by service providers.'},
    {'key': 'requireCallApproval', 'label': 'Require Callback Approval', 'desc': 'Providers must get your approval before calling you.'},
  ];

  @override
  void initState() {
    super.initState();
    _prefs = Map.from(_defaults);
  }

  void _initFromServer(Map<String, dynamic>? data) {
    if (data == null || _initialized) return;
    for (final key in _defaults.keys) {
      if (data.containsKey(key) && data[key] is bool) {
        _prefs[key] = data[key] as bool;
      }
    }
    _initialized = true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy'),
      ),
      body: Query(
        options: QueryOptions(
          document: gql(myPrivacyPreferencesQuery),
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading && result.data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final data = result.data?['myPrivacyPreferences'] as Map<String, dynamic>?;
          _initFromServer(data);

          return Mutation(
            options: MutationOptions(document: gql(updatePrivacyMutation)),
            builder: (runMutation, mutResult) {
              return Column(
                children: [
                  // Phone number notice
                  Container(
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.accentRed.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.accentRed.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.visibility_off, color: AppColors.accentRed, size: 18),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Your phone number is always hidden from service providers.',
                            style: TextStyle(fontSize: 12, color: AppColors.accentRed),
                          ),
                        ),
                      ],
                    ),
                  ),

                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _toggles.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final t = _toggles[index];
                        final key = t['key']!;
                        return SwitchListTile(
                          title: Text(t['label']!, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                          subtitle: Text(t['desc']!, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 12)),
                          value: _prefs[key] ?? _defaults[key]!,
                          activeColor: AppColors.accentBlue,
                          onChanged: (val) {
                            setState(() {
                              _prefs[key] = val;
                              _saved = false;
                            });
                          },
                        );
                      },
                    ),
                  ),

                  // Save button
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _saved ? AppColors.statusSuccess : AppColors.accentBlue,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: mutResult?.isLoading == true
                            ? null
                            : () {
                                runMutation({'input': _prefs});
                                setState(() => _saved = true);
                                Future.delayed(const Duration(seconds: 2), () {
                                  if (mounted) setState(() => _saved = false);
                                });
                              },
                        child: Text(
                          mutResult?.isLoading == true
                              ? 'Saving…'
                              : _saved
                                  ? '✓ Saved'
                                  : 'Save Changes',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }
}

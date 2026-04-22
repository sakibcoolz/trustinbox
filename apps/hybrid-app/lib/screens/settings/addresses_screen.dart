import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../graphql/addresses.dart';
import '../../config/theme.dart';

// ─── Addresses Settings Screen ──────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/settings/addresses/page.tsx

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  bool _showForm = false;
  String? _editingId;
  final _formKey = GlobalKey<FormState>();
  String _label = 'Home';
  String _addressLine1 = '';
  String _addressLine2 = '';
  String _city = '';
  String _state = '';
  String _postalCode = '';
  String _country = '';
  bool _isCurrent = false;

  void _resetForm() {
    setState(() {
      _showForm = false;
      _editingId = null;
      _label = 'Home';
      _addressLine1 = '';
      _addressLine2 = '';
      _city = '';
      _state = '';
      _postalCode = '';
      _country = '';
      _isCurrent = false;
    });
  }

  void _startEdit(Map<String, dynamic> addr) {
    setState(() {
      _editingId = addr['id'] as String;
      _label = addr['label'] as String? ?? 'Home';
      _addressLine1 = addr['addressLine1'] as String? ?? '';
      _addressLine2 = addr['addressLine2'] as String? ?? '';
      _city = addr['city'] as String? ?? '';
      _state = addr['state'] as String? ?? '';
      _postalCode = addr['postalCode'] as String? ?? '';
      _country = addr['country'] as String? ?? '';
      _isCurrent = addr['isCurrent'] as bool? ?? false;
      _showForm = true;
    });
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
        title: const Text('My Addresses'),
      ),
      body: Query(
        options: QueryOptions(
          document: gql(myAddressesQuery),
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading && result.data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final addresses = (result.data?['myAddresses'] as List<dynamic>?) ?? [];

          return Mutation(
            options: MutationOptions(
              document: gql(createAddressMutation),
              onCompleted: (_) {
                refetch?.call();
                _resetForm();
              },
            ),
            builder: (runCreate, createResult) {
              return Mutation(
                options: MutationOptions(
                  document: gql(updateAddressMutation),
                  onCompleted: (_) {
                    refetch?.call();
                    _resetForm();
                  },
                ),
                builder: (runUpdate, _) {
                  return Mutation(
                    options: MutationOptions(
                      document: gql(deleteAddressMutation),
                      onCompleted: (_) => refetch?.call(),
                    ),
                    builder: (runDelete, _) {
                      return Mutation(
                        options: MutationOptions(
                          document: gql(setCurrentAddressMutation),
                          onCompleted: (_) => refetch?.call(),
                        ),
                        builder: (runSetCurrent, _) {
                          return ListView(
                            padding: const EdgeInsets.all(16),
                            children: [
                              // Address list
                              ...addresses.map((a) {
                                final addr = a as Map<String, dynamic>;
                                final id = addr['id'] as String;
                                final isCurrent = addr['isCurrent'] as bool? ?? false;
                                final label = addr['label'] as String? ?? 'Address';
                                final parts = [
                                  addr['addressLine1'],
                                  addr['addressLine2'],
                                  addr['city'],
                                  addr['state'],
                                  addr['postalCode'],
                                  addr['country'],
                                ].where((p) => p != null && (p as String).isNotEmpty).join(', ');

                                return Card(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: isCurrent
                                        ? BorderSide(color: AppColors.accentBlue.withValues(alpha: 0.5))
                                        : BorderSide.none,
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                            if (isCurrent) ...[
                                              const SizedBox(width: 8),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: AppColors.accentBlue.withValues(alpha: 0.1),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: const Text('Current',
                                                    style: TextStyle(fontSize: 10, color: AppColors.accentBlue, fontWeight: FontWeight.w500)),
                                              ),
                                            ],
                                            const Spacer(),
                                            PopupMenuButton<String>(
                                              onSelected: (val) {
                                                switch (val) {
                                                  case 'current':
                                                    runSetCurrent({'id': id});
                                                    break;
                                                  case 'edit':
                                                    _startEdit(addr);
                                                    break;
                                                  case 'delete':
                                                    runDelete({'id': id});
                                                    break;
                                                }
                                              },
                                              itemBuilder: (_) => [
                                                if (!isCurrent)
                                                  const PopupMenuItem(value: 'current', child: Text('Set Current')),
                                                const PopupMenuItem(value: 'edit', child: Text('Edit')),
                                                const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: AppColors.accentRed))),
                                              ],
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(parts, style: Theme.of(context).textTheme.bodySmall),
                                      ],
                                    ),
                                  ),
                                );
                              }),

                              if (addresses.isEmpty && !_showForm)
                                Center(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 48),
                                    child: Column(
                                      children: [
                                        Text('No addresses saved yet.',
                                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted)),
                                        const SizedBox(height: 4),
                                        Text('Add an address to enable nearby provider discovery.',
                                            style: Theme.of(context).textTheme.bodySmall),
                                      ],
                                    ),
                                  ),
                                ),

                              // Form
                              if (_showForm) _buildForm(runCreate, runUpdate) else _buildAddButton(),
                            ],
                          );
                        },
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

  Widget _buildAddButton() {
    return Card(
      child: InkWell(
        onTap: () => setState(() => _showForm = true),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Center(
            child: Text('+ Add New Address',
                style: TextStyle(color: AppColors.accentBlue, fontWeight: FontWeight.w600, fontSize: 14)),
          ),
        ),
      ),
    );
  }

  Widget _buildForm(RunMutation runCreate, RunMutation runUpdate) {
    return Card(
      margin: const EdgeInsets.only(top: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_editingId != null ? 'Edit Address' : 'Add New Address',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(height: 16),

              // Label
              DropdownButtonFormField<String>(
                value: _label,
                decoration: const InputDecoration(labelText: 'Label', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                items: ['Home', 'Work', 'Other']
                    .map((l) => DropdownMenuItem(value: l, child: Text(l)))
                    .toList(),
                onChanged: (v) => setState(() => _label = v ?? 'Home'),
              ),
              const SizedBox(height: 12),

              TextFormField(
                initialValue: _addressLine1,
                decoration: const InputDecoration(labelText: 'Address Line 1', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                onChanged: (v) => _addressLine1 = v,
              ),
              const SizedBox(height: 12),

              TextFormField(
                initialValue: _addressLine2,
                decoration: const InputDecoration(labelText: 'Address Line 2 (optional)', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                onChanged: (v) => _addressLine2 = v,
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      initialValue: _city,
                      decoration: const InputDecoration(labelText: 'City', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                      onChanged: (v) => _city = v,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      initialValue: _state,
                      decoration: const InputDecoration(labelText: 'State', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                      onChanged: (v) => _state = v,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      initialValue: _postalCode,
                      decoration: const InputDecoration(labelText: 'Postal Code', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                      onChanged: (v) => _postalCode = v,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      initialValue: _country,
                      decoration: const InputDecoration(labelText: 'Country', isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                      onChanged: (v) => _country = v,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              CheckboxListTile(
                value: _isCurrent,
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                title: const Text('Set as current address', style: TextStyle(fontSize: 13)),
                onChanged: (v) => setState(() => _isCurrent = v ?? false),
              ),
              const SizedBox(height: 12),

              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(onPressed: _resetForm, child: const Text('Cancel')),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentBlue),
                    onPressed: () {
                      final input = {
                        'label': _label,
                        'addressLine1': _addressLine1,
                        'city': _city,
                        'country': _country,
                        'isCurrent': _isCurrent,
                        if (_addressLine2.isNotEmpty) 'addressLine2': _addressLine2,
                        if (_state.isNotEmpty) 'state': _state,
                        if (_postalCode.isNotEmpty) 'postalCode': _postalCode,
                      };
                      if (_editingId != null) {
                        runUpdate({'id': _editingId, 'input': input});
                      } else {
                        runCreate({'input': input});
                      }
                    },
                    child: Text(
                      _editingId != null ? 'Update' : 'Add Address',
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

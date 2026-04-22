import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import '../../graphql/friends.dart';
import '../../models/settings.dart';
import '../../widgets/empty_state.dart';
import '../../config/theme.dart';

// ─── Friends Screen ─────────────────────────────────────
// Mirrors: apps/web/src/app/(dashboard)/friends/page.tsx

class FriendsScreen extends StatefulWidget {
  const FriendsScreen({super.key});

  @override
  State<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends State<FriendsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) { context.pop(); } else { context.go('/'); }
          },
        ),
        title: const Text('Friends'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Friends'),
            Tab(text: 'Requests'),
            Tab(text: 'Search'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _FriendsList(),
          _FriendRequests(),
          _SearchUsers(),
        ],
      ),
    );
  }
}

class _FriendsList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Query(
      options: QueryOptions(
        document: gql(myFriendsQuery),
        variables: const {'limit': 20, 'offset': 0},
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (result, {fetchMore, refetch}) {
        if (result.isLoading && result.data == null) {
          return const Center(child: CircularProgressIndicator());
        }

        final nodes = result.data?['myFriends']?['nodes'] as List<dynamic>? ?? [];
        final friends = nodes.map((f) => Friend.fromJson(f as Map<String, dynamic>)).toList();

        if (friends.isEmpty) {
          return EmptyState(
            icon: Icons.people_outlined,
            title: 'No friends yet',
            subtitle: 'Search for users to add friends',
          );
        }

        return RefreshIndicator(
          onRefresh: () async => refetch?.call(),
          child: ListView.builder(
            itemCount: friends.length,
            itemBuilder: (context, index) {
              final friend = friends[index];
              return ListTile(
                leading: CircleAvatar(
                  child: Text((friend.user.fullName ?? 'U').substring(0, 1).toUpperCase()),
                ),
                title: Text(friend.user.fullName ?? friend.user.username ?? ''),
                subtitle: Text('@${friend.user.username ?? ''}'),
              );
            },
          ),
        );
      },
    );
  }
}

class _FriendRequests extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Query(
      options: QueryOptions(
        document: gql(myFriendRequestsQuery),
        variables: const {'direction': 'incoming', 'limit': 20, 'offset': 0},
        fetchPolicy: FetchPolicy.cacheAndNetwork,
      ),
      builder: (result, {fetchMore, refetch}) {
        if (result.isLoading && result.data == null) {
          return const Center(child: CircularProgressIndicator());
        }

        final nodes = result.data?['myFriendRequests']?['nodes'] as List<dynamic>? ?? [];
        final requests = nodes.map((r) => FriendRequest.fromJson(r as Map<String, dynamic>)).toList();

        if (requests.isEmpty) {
          return EmptyState(
            icon: Icons.person_add_outlined,
            title: 'No pending requests',
            subtitle: 'Friend requests will appear here',
          );
        }

        return RefreshIndicator(
          onRefresh: () async => refetch?.call(),
          child: ListView.builder(
            itemCount: requests.length,
            itemBuilder: (context, index) {
              final req = requests[index];
              return ListTile(
                leading: CircleAvatar(
                  child: Text((req.user.fullName ?? 'U').substring(0, 1).toUpperCase()),
                ),
                title: Text(req.user.fullName ?? req.user.username ?? ''),
                subtitle: Text(req.message ?? 'Wants to connect'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Mutation(
                      options: MutationOptions(document: gql(acceptFriendRequestMutation)),
                      builder: (runMutation, _) => IconButton(
                        icon: const Icon(Icons.check_circle_outline, color: AppColors.statusSuccess),
                        onPressed: () => runMutation({'requestId': req.id}),
                      ),
                    ),
                    Mutation(
                      options: MutationOptions(document: gql(declineFriendRequestMutation)),
                      builder: (runMutation, _) => IconButton(
                        icon: const Icon(Icons.cancel_outlined, color: AppColors.statusError),
                        onPressed: () => runMutation({'requestId': req.id}),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _SearchUsers extends StatefulWidget {
  @override
  State<_SearchUsers> createState() => _SearchUsersState();
}

class _SearchUsersState extends State<_SearchUsers> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchController,
            decoration: const InputDecoration(
              hintText: 'Search users...',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: (v) {
              setState(() => _query = v.trim());
            },
          ),
        ),
        if (_query.length >= 2)
          Expanded(
            child: Query(
              options: QueryOptions(
                document: gql(searchUsersQuery),
                variables: {'query': _query, 'limit': 20},
              ),
              builder: (result, {fetchMore, refetch}) {
                if (result.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                final nodes = result.data?['searchUsers']?['nodes'] as List<dynamic>? ?? [];

                if (nodes.isEmpty) {
                  return const Center(child: Text('No users found'));
                }

                return ListView.builder(
                  itemCount: nodes.length,
                  itemBuilder: (context, index) {
                    final user = FriendUser.fromJson(nodes[index] as Map<String, dynamic>);
                    return ListTile(
                      leading: CircleAvatar(
                        child: Text((user.fullName ?? 'U').substring(0, 1).toUpperCase()),
                      ),
                      title: Text(user.fullName ?? user.username ?? ''),
                      subtitle: Text('@${user.username ?? ''}'),
                      trailing: Mutation(
                        options: MutationOptions(document: gql(sendFriendRequestMutation)),
                        builder: (runMutation, result) => IconButton(
                          icon: const Icon(Icons.person_add_outlined, color: AppColors.accentBlue),
                          onPressed: () => runMutation({'userId': user.id}),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          )
        else
          Expanded(
            child: EmptyState(
              icon: Icons.search,
              title: 'Search for friends',
              subtitle: 'Type at least 2 characters to search',
            ),
          ),
      ],
    );
  }
}

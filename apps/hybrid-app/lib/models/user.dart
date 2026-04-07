// ─── User Model ─────────────────────────────────────────
// Mirrors the User type from web app auth-context.tsx

class User {
  final String id;
  final String email;
  final String fullName;
  final String username;
  final String? virtualPublicId;
  final String? avatarUrl;
  final String? mobileNumber;

  const User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.username,
    this.virtualPublicId,
    this.avatarUrl,
    this.mobileNumber,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      fullName: json['fullName'] as String? ?? '',
      username: json['username'] as String? ?? '',
      virtualPublicId: json['virtualPublicId'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      mobileNumber: json['mobileNumber'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'fullName': fullName,
        'username': username,
        'virtualPublicId': virtualPublicId,
        'avatarUrl': avatarUrl,
        'mobileNumber': mobileNumber,
      };

  User copyWith({String? avatarUrl}) {
    return User(
      id: id,
      email: email,
      fullName: fullName,
      username: username,
      virtualPublicId: virtualPublicId,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      mobileNumber: mobileNumber,
    );
  }
}

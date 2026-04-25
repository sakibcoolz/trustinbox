// ─── Service Provider Model ─────────────────────────────

class ServiceProvider {
  final String id;
  final String? slug;
  final String name;
  final String? legalName;
  final String? industry;
  final String? description;
  final String? verificationStatus;
  final String? status;
  final String? website;
  final String? address;
  final String? city;
  final String? state;
  final String? country;
  final String? postalCode;
  final double? latitude;
  final double? longitude;
  final num? trustScore;

  const ServiceProvider({
    required this.id,
    this.slug,
    required this.name,
    this.legalName,
    this.industry,
    this.description,
    this.verificationStatus,
    this.status,
    this.website,
    this.address,
    this.city,
    this.state,
    this.country,
    this.postalCode,
    this.latitude,
    this.longitude,
    this.trustScore,
  });

  factory ServiceProvider.fromJson(Map<String, dynamic> json) {
    return ServiceProvider(
      id: json['id'] as String,
      slug: json['slug'] as String?,
      name: json['name'] as String? ?? '',
      legalName: json['legalName'] as String?,
      industry: json['industry'] as String?,
      description: json['description'] as String?,
      verificationStatus: json['verificationStatus'] as String?,
      status: json['status'] as String?,
      website: json['website'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      country: json['country'] as String?,
      postalCode: json['postalCode'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      trustScore: json['trustScore'] as num?,
    );
  }
}

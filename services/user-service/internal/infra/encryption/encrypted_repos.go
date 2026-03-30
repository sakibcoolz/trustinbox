package encryption

import (
	"context"

	"github.com/trustinbox/cornerstone/crypto"
	"github.com/trustinbox/user-service/internal/domain/entity"
	"github.com/trustinbox/user-service/internal/domain/repository"
)

// EncryptedUserProfileRepository wraps a UserProfileRepository and transparently
// encrypts/decrypts PII fields (full_name) using AES-256-GCM.
type EncryptedUserProfileRepository struct {
	inner     repository.UserProfileRepository
	encryptor *crypto.Encryptor
}

// NewEncryptedUserProfileRepository creates a PII-encrypting wrapper.
func NewEncryptedUserProfileRepository(inner repository.UserProfileRepository, enc *crypto.Encryptor) *EncryptedUserProfileRepository {
	return &EncryptedUserProfileRepository{inner: inner, encryptor: enc}
}

func (r *EncryptedUserProfileRepository) GetByID(ctx context.Context, userID string) (*entity.UserProfile, error) {
	profile, err := r.inner.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if profile.FullName != "" {
		decrypted, err := r.encryptor.Decrypt(profile.FullName)
		if err == nil {
			profile.FullName = decrypted
		}
	}
	return profile, nil
}

func (r *EncryptedUserProfileRepository) Update(ctx context.Context, profile *entity.UserProfile) error {
	encrypted := *profile
	if encrypted.FullName != "" {
		enc, err := r.encryptor.Encrypt(encrypted.FullName)
		if err != nil {
			return err
		}
		encrypted.FullName = enc
	}
	return r.inner.Update(ctx, &encrypted)
}

// EncryptedUserIdentityRepository wraps a UserIdentityRepository and encrypts
// the masked_phone field.
type EncryptedUserIdentityRepository struct {
	inner     repository.UserIdentityRepository
	encryptor *crypto.Encryptor
}

// NewEncryptedUserIdentityRepository creates a PII-encrypting wrapper.
func NewEncryptedUserIdentityRepository(inner repository.UserIdentityRepository, enc *crypto.Encryptor) *EncryptedUserIdentityRepository {
	return &EncryptedUserIdentityRepository{inner: inner, encryptor: enc}
}

func (r *EncryptedUserIdentityRepository) GetByUserID(ctx context.Context, userID string) (*entity.UserIdentity, error) {
	identity, err := r.inner.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if identity.MaskedPhone != "" {
		decrypted, err := r.encryptor.Decrypt(identity.MaskedPhone)
		if err == nil {
			identity.MaskedPhone = decrypted
		}
	}
	return identity, nil
}

func (r *EncryptedUserIdentityRepository) GetByVirtualID(ctx context.Context, virtualID string) (*entity.UserIdentity, error) {
	identity, err := r.inner.GetByVirtualID(ctx, virtualID)
	if err != nil {
		return nil, err
	}
	if identity.MaskedPhone != "" {
		decrypted, err := r.encryptor.Decrypt(identity.MaskedPhone)
		if err == nil {
			identity.MaskedPhone = decrypted
		}
	}
	return identity, nil
}

func (r *EncryptedUserIdentityRepository) Create(ctx context.Context, identity *entity.UserIdentity) error {
	encrypted := *identity
	if encrypted.MaskedPhone != "" {
		enc, err := r.encryptor.Encrypt(encrypted.MaskedPhone)
		if err != nil {
			return err
		}
		encrypted.MaskedPhone = enc
	}
	return r.inner.Create(ctx, &encrypted)
}

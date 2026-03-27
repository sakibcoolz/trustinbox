package jwt

import (
	"fmt"
	"time"

	gojwt "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID         string `json:"user_id"`
	Role           string `json:"role"`
	OrganizationID string `json:"organization_id,omitempty"`
	gojwt.RegisteredClaims
}

type TokenService struct {
	signingKey    []byte
	accessExpiry  time.Duration
	refreshExpiry time.Duration
	issuer        string
}

func NewTokenService(signingKey string, accessExpiry, refreshExpiry time.Duration) *TokenService {
	return &TokenService{
		signingKey:    []byte(signingKey),
		accessExpiry:  accessExpiry,
		refreshExpiry: refreshExpiry,
		issuer:        "trustinbox",
	}
}

func (s *TokenService) GenerateAccessToken(userID, role, orgID string) (string, error) {
	claims := Claims{
		UserID:         userID,
		Role:           role,
		OrganizationID: orgID,
		RegisteredClaims: gojwt.RegisteredClaims{
			Issuer:    s.issuer,
			Subject:   userID,
			ExpiresAt: gojwt.NewNumericDate(time.Now().Add(s.accessExpiry)),
			IssuedAt:  gojwt.NewNumericDate(time.Now()),
		},
	}

	token := gojwt.NewWithClaims(gojwt.SigningMethodHS256, claims)
	return token.SignedString(s.signingKey)
}

func (s *TokenService) GenerateRefreshToken(userID string) (string, error) {
	claims := gojwt.RegisteredClaims{
		Issuer:    s.issuer,
		Subject:   userID,
		ExpiresAt: gojwt.NewNumericDate(time.Now().Add(s.refreshExpiry)),
		IssuedAt:  gojwt.NewNumericDate(time.Now()),
	}

	token := gojwt.NewWithClaims(gojwt.SigningMethodHS256, claims)
	return token.SignedString(s.signingKey)
}

func (s *TokenService) ValidateAccessToken(tokenString string) (*Claims, error) {
	token, err := gojwt.ParseWithClaims(tokenString, &Claims{}, func(token *gojwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*gojwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.signingKey, nil
	})
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

func (s *TokenService) ValidateRefreshToken(tokenString string) (string, error) {
	token, err := gojwt.ParseWithClaims(tokenString, &gojwt.RegisteredClaims{}, func(token *gojwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*gojwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.signingKey, nil
	})
	if err != nil {
		return "", fmt.Errorf("invalid refresh token: %w", err)
	}

	claims, ok := token.Claims.(*gojwt.RegisteredClaims)
	if !ok || !token.Valid {
		return "", fmt.Errorf("invalid refresh token claims")
	}

	return claims.Subject, nil
}

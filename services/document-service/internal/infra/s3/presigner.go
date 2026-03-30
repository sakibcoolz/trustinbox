package s3

import (
	"context"
	"time"
)

// Presigner generates presigned URLs for S3 objects.
type Presigner interface {
	GeneratePresignedURL(ctx context.Context, s3Key string, expiry time.Duration) (string, time.Time, error)
}

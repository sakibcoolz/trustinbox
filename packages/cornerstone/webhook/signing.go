package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"time"
)

// SignPayload signs a webhook payload using HMAC-SHA256.
// Returns the signature in format: t=<timestamp>,v1=<signature>
func SignPayload(payload []byte, secret string) string {
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	signedPayload := fmt.Sprintf("%s.%s", timestamp, string(payload))

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signedPayload))
	signature := hex.EncodeToString(mac.Sum(nil))

	return fmt.Sprintf("t=%s,v1=%s", timestamp, signature)
}

// VerifySignature verifies a webhook signature.
// tolerance is the maximum age of the timestamp in seconds (0 = no check).
func VerifySignature(payload []byte, signature, secret string, tolerance time.Duration) bool {
	ts, sig := parseSignature(signature)
	if ts == "" || sig == "" {
		return false
	}

	// Check timestamp tolerance.
	if tolerance > 0 {
		tsInt, err := strconv.ParseInt(ts, 10, 64)
		if err != nil {
			return false
		}
		eventTime := time.Unix(tsInt, 0)
		if time.Since(eventTime) > tolerance {
			return false
		}
	}

	signedPayload := fmt.Sprintf("%s.%s", ts, string(payload))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signedPayload))
	expected := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(sig), []byte(expected))
}

func parseSignature(sig string) (timestamp, hash string) {
	// Format: t=<timestamp>,v1=<signature>
	var ts, v1 string
	for i := 0; i < len(sig); {
		if sig[i:] == "" {
			break
		}
		var key, val string
		eqIdx := -1
		commaIdx := len(sig)
		for j := i; j < len(sig); j++ {
			if sig[j] == '=' && eqIdx == -1 {
				eqIdx = j
			}
			if sig[j] == ',' {
				commaIdx = j
				break
			}
		}
		if eqIdx == -1 {
			break
		}
		key = sig[i:eqIdx]
		val = sig[eqIdx+1 : commaIdx]
		switch key {
		case "t":
			ts = val
		case "v1":
			v1 = val
		}
		i = commaIdx + 1
	}
	return ts, v1
}

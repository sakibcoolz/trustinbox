package postgres

import (
	"encoding/json"
)

// mapToJSON serializes a string map to a JSON string for storage.
// Returns "{}" for nil or empty maps.
func mapToJSON(m map[string]string) string {
	if len(m) == 0 {
		return "{}"
	}
	data, err := json.Marshal(m)
	if err != nil {
		return "{}"
	}
	return string(data)
}

// jsonToMap deserializes a JSON string into a string map.
// Returns nil for empty or invalid JSON.
func jsonToMap(s string) map[string]string {
	if s == "" || s == "{}" {
		return nil
	}
	var m map[string]string
	if err := json.Unmarshal([]byte(s), &m); err != nil {
		return nil
	}
	return m
}

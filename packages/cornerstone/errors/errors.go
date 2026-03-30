package errors

import "fmt"

// Code represents a business error code.
type Code string

const (
	CodeNotFound         Code = "NOT_FOUND"
	CodeAlreadyExists    Code = "ALREADY_EXISTS"
	CodeInvalidInput     Code = "INVALID_INPUT"
	CodeUnauthorized     Code = "UNAUTHORIZED"
	CodeForbidden        Code = "FORBIDDEN"
	CodeInternal         Code = "INTERNAL"
	CodePolicyDenied     Code = "POLICY_DENIED"
	CodeRateLimited      Code = "RATE_LIMITED"
	CodeSPNotVerified    Code = "SP_NOT_VERIFIED"
	CodeSPSuspended      Code = "SP_SUSPENDED"
	CodeUserBlocked      Code = "USER_BLOCKED"
	CodeDNDActive        Code = "DND_ACTIVE"
	CodeAdCapExceeded    Code = "AD_CAP_EXCEEDED"
	CodeCallbackRequired Code = "CALLBACK_REQUIRED"
)

// BusinessError is a typed application error.
type BusinessError struct {
	Code    Code   `json:"code"`
	Message string `json:"message"`
	Err     error  `json:"-"`
}

func (e *BusinessError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *BusinessError) Unwrap() error {
	return e.Err
}

func New(code Code, message string) *BusinessError {
	return &BusinessError{Code: code, Message: message}
}

func Wrap(code Code, message string, err error) *BusinessError {
	return &BusinessError{Code: code, Message: message, Err: err}
}

func NotFound(entity, id string) *BusinessError {
	return New(CodeNotFound, fmt.Sprintf("%s not found: %s", entity, id))
}

func InvalidInput(message string) *BusinessError {
	return New(CodeInvalidInput, message)
}

func Unauthorized(message string) *BusinessError {
	return New(CodeUnauthorized, message)
}

func Forbidden(message string) *BusinessError {
	return New(CodeForbidden, message)
}

func Internal(message string, err error) *BusinessError {
	return Wrap(CodeInternal, message, err)
}

func PolicyDenied(reason string) *BusinessError {
	return New(CodePolicyDenied, reason)
}

// IsCode checks if an error is a BusinessError with a specific code.
func IsCode(err error, code Code) bool {
	if be, ok := err.(*BusinessError); ok {
		return be.Code == code
	}
	return false
}

func IsNotFound(err error) bool     { return IsCode(err, CodeNotFound) }
func IsInvalidInput(err error) bool { return IsCode(err, CodeInvalidInput) }
func IsUnauthorized(err error) bool { return IsCode(err, CodeUnauthorized) }
func IsForbidden(err error) bool    { return IsCode(err, CodeForbidden) }
func IsPolicyDenied(err error) bool { return IsCode(err, CodePolicyDenied) }

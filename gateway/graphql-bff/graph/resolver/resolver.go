package resolver

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require
// here.

import (
	"database/sql"

	"github.com/trustinbox/graphql-bff/internal/clients"
	"go.uber.org/zap"
)

type Resolver struct {
	Clients *clients.ServiceClients
	Log     *zap.Logger
	DB      *sql.DB
}

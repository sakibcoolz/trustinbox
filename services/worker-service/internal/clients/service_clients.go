package clients

import (
	"os"

	commpb "github.com/trustinbox/proto/gen/communication/v1"
	notifpb "github.com/trustinbox/proto/gen/notification/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// ServiceClients holds gRPC client connections the worker needs.
type ServiceClients struct {
	Notification  notifpb.NotificationServiceClient
	Communication commpb.CommunicationServiceClient

	conns []*grpc.ClientConn
}

func NewServiceClients(log *zap.Logger) (*ServiceClients, error) {
	dial := func(envKey, fallback string) (*grpc.ClientConn, error) {
		addr := os.Getenv(envKey)
		if addr == "" {
			addr = fallback
		}
		log.Info("dialing service", zap.String("env", envKey), zap.String("addr", addr))
		return grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	}

	notifConn, err := dial("NOTIFICATION_SERVICE_ADDR", "localhost:50055")
	if err != nil {
		return nil, err
	}
	commConn, err := dial("COMMUNICATION_SERVICE_ADDR", "localhost:50056")
	if err != nil {
		return nil, err
	}

	return &ServiceClients{
		Notification:  notifpb.NewNotificationServiceClient(notifConn),
		Communication: commpb.NewCommunicationServiceClient(commConn),
		conns:         []*grpc.ClientConn{notifConn, commConn},
	}, nil
}

func (sc *ServiceClients) Close() {
	for _, c := range sc.conns {
		c.Close()
	}
}

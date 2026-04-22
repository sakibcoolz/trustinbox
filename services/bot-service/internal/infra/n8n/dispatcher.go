package n8n

import (
	"context"

	"github.com/trustinbox/bot-service/internal/usecase"
)

// dispatcherAdapter implements usecase.WorkflowDispatcher backed by the n8n Client.
type dispatcherAdapter struct {
	client *Client
}

// NewDispatcher returns a usecase.WorkflowDispatcher backed by the n8n webhook client.
func NewDispatcher(client *Client) usecase.WorkflowDispatcher {
	return &dispatcherAdapter{client: client}
}

func (d *dispatcherAdapter) Trigger(
	ctx context.Context,
	webhookPath string,
	in *usecase.WorkflowTriggerInput,
) (*usecase.WorkflowTriggerOutput, error) {
	resp, err := d.client.Trigger(ctx, webhookPath, &TriggerRequest{
		WorkflowID:        in.WorkflowID,
		BotID:             in.BotID,
		ServiceProvidedID: in.ServiceProviderID,
		ConversationID:    in.ConversationID,
		UserID:            in.UserID,
		ResumeCallbackURL: in.ResumeCallbackURL,
		InputData:         in.InputDataJSON,
	})
	if err != nil {
		return nil, err
	}
	return &usecase.WorkflowTriggerOutput{
		Success: resp.Success,
		Data:    resp.Data,
		Error:   resp.Error,
	}, nil
}

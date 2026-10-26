package handlers

import (
	"context"
	"github.com/horovats/backend/database"
	"github.com/horovats/backend/internal/telegram"
)

var orderNotifier *telegram.Service

func StartOrderNotifications(ctx context.Context) {
	orderNotifier = telegram.FromEnv(database.DB)
	if orderNotifier != nil {
		go orderNotifier.Run(ctx)
	}
}

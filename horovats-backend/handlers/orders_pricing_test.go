package handlers

import "testing"

func TestFinalizeOrderTotal(t *testing.T) {
	tests := []struct {
		name           string
		subtotal       float64
		wantFinal      float64
		wantDelivery   float64
	}{
		{"below_discount", 1000, 1000 + 399, 399},
		{"ten_percent", 3000, 3000*0.9 + 399, 399},
		{"fifteen_percent", 5000, 5000*0.85 + 399, 399},
		{"twenty_free_delivery", 10000, 10000 * 0.8, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			final, delivery := finalizeOrderTotal(tt.subtotal)
			if final != tt.wantFinal || delivery != tt.wantDelivery {
				t.Fatalf("finalizeOrderTotal(%v) = final %v delivery %v; want final %v delivery %v",
					tt.subtotal, final, delivery, tt.wantFinal, tt.wantDelivery)
			}
		})
	}
}

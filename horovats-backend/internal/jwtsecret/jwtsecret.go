package jwtsecret

import (
	"log"
	"os"
	"sync"

	"github.com/gin-gonic/gin"
)

const devFallback = "super_secret_dev_key"

var once sync.Once
var cached []byte

// Key returns the HMAC key for JWT. In release mode JWT_SECRET is required.
// Call after gin.SetMode in main so gin.Mode() matches the environment.
func Key() []byte {
	once.Do(func() {
		s := os.Getenv("JWT_SECRET")
		if s != "" {
			cached = []byte(s)
			return
		}
		if gin.Mode() == gin.ReleaseMode {
			log.Fatal("JWT_SECRET must be set when GIN_MODE=release")
		}
		log.Println("WARNING: JWT_SECRET not set; using development fallback (never use in production)")
		cached = []byte(devFallback)
	})
	return cached
}

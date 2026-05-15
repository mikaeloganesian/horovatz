package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/horovats/backend/internal/jwtsecret"
	"github.com/horovats/backend/models"
)

func AuthMiddleware(db models.User) gin.HandlerFunc {
	// Not strictly needed to pass DB if we just verify token, but good for future.
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtsecret.Key(), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		uid, ok := claimsUserID(claims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}
		role, ok := claimsRole(claims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}
		c.Set("userID", uid)
		c.Set("userRole", role)

		c.Next()
	}
}

func claimsUserID(claims jwt.MapClaims) (uint, bool) {
	raw, ok := claims["user_id"]
	if !ok {
		return 0, false
	}
	switch v := raw.(type) {
	case float64:
		return uint(v), true
	default:
		return 0, false
	}
}

func claimsRole(claims jwt.MapClaims) (string, bool) {
	raw, ok := claims["role"]
	if !ok || raw == nil {
		return "", false
	}
	switch v := raw.(type) {
	case string:
		if v == "" {
			return "", false
		}
		return v, true
	default:
		s := fmt.Sprint(v)
		if s == "" || s == "<nil>" {
			return "", false
		}
		return s, true
	}
}

// BearerUserID возвращает id пользователя из валидного Bearer JWT, иначе nil (без ответа клиенту).
func BearerUserID(c *gin.Context) *uint {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return nil
	}
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return nil
	}
	token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtsecret.Key(), nil
	})
	if err != nil || !token.Valid {
		return nil
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil
	}
	uid, ok := claimsUserID(claims)
	if !ok {
		return nil
	}
	return &uid
}

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		role, ok := roleVal.(string)
		if !ok || role != string(models.RoleAdmin) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

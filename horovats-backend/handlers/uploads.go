package handlers

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const maxUploadBytes = 10 << 20 // 10 MiB

func isValidImageSignature(header []byte) bool {
	if len(header) < 3 {
		return false
	}
	// JPEG
	if header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF {
		return true
	}
	// PNG
	if len(header) >= 8 && bytes.Equal(header[:8], []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}) {
		return true
	}
	// WebP: RIFF....WEBP
	if len(header) >= 12 && bytes.Equal(header[:4], []byte("RIFF")) && bytes.Equal(header[8:12], []byte("WEBP")) {
		return true
	}
	return false
}

func UploadImage(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadBytes)

	file, err := c.FormFile("image")
	if err != nil {
		var maxBytes *http.MaxBytesError
		if errors.As(err, &maxBytes) {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "File too large"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image provided"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only PNG, JPG, JPEG, and WEBP are allowed."})
		return
	}

	newFilename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	uploadPath := filepath.Join("uploads", newFilename)

	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		var maxBytes *http.MaxBytesError
		if errors.As(err, &maxBytes) {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "File too large"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	f, err := os.Open(uploadPath)
	if err != nil {
		_ = os.Remove(uploadPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify file"})
		return
	}
	defer f.Close()

	header := make([]byte, 12)
	n, err := io.ReadFull(f, header)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		_ = os.Remove(uploadPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify file"})
		return
	}
	if n == 0 || !isValidImageSignature(header[:n]) {
		_ = os.Remove(uploadPath)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image file content"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url": fmt.Sprintf("/uploads/%s", newFilename),
	})
}

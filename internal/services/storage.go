package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"kasirku/internal/config"
)

// InitStorage ensures required Supabase buckets exist
func InitStorage() {
	if config.AppConfig.SupabaseURL == "" || config.AppConfig.SupabaseServiceKey == "" {
		log.Println("⚠️ Supabase credentials missing, skipping storage initialization")
		return
	}

	buckets := []string{"products", "avatars", "logos"}

	for _, bucket := range buckets {
		if err := ensureBucket(bucket); err != nil {
			log.Printf("❌ Failed to ensure bucket %s: %v", bucket, err)
		} else {
			log.Printf("✅ Bucket %s is ready", bucket)
		}
	}
}

func ensureBucket(name string) error {
	url := fmt.Sprintf("%s/storage/v1/bucket", config.AppConfig.SupabaseURL)

	// First check if bucket exists
	req, _ := http.NewRequest("GET", url+"/"+name, nil)
	req.Header.Set("Authorization", "Bearer "+config.AppConfig.SupabaseServiceKey)
	req.Header.Set("apikey", config.AppConfig.SupabaseAnonKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err == nil && resp.StatusCode == http.StatusOK {
		resp.Body.Close()
		return nil // Bucket already exists
	}
	if resp != nil {
		resp.Body.Close()
	}

	// Create bucket if not exists
	body := map[string]interface{}{
		"id":     name,
		"name":   name,
		"public": true,
	}
	jsonBody, _ := json.Marshal(body)

	req, _ = http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Authorization", "Bearer "+config.AppConfig.SupabaseServiceKey)
	req.Header.Set("apikey", config.AppConfig.SupabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err = client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusConflict {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	return nil
}

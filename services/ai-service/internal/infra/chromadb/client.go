package chromadb

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"
)

const (
	embeddingModel      = "text-embedding-3-small"
	openAIEmbeddingURL  = "https://api.openai.com/v1/embeddings"
	chromaAPIBase       = "/api/v1"
	maxResponseBodySize = 2 << 20 // 2 MB
)

// Client wraps the ChromaDB v1 REST API and the OpenAI embeddings API.
// Collections are scoped per-bot: "trustinbox_bot_{botID}".
type Client struct {
	chromaURL  string
	openaiKey  string
	httpClient *http.Client
	log        *zap.Logger
}

// NewClient creates a Client targeting a ChromaDB instance.
// chromaURL — e.g. "http://chromadb:8000" (no trailing slash).
// openaiKey — OpenAI API key used to generate text-embedding-3-small vectors.
func NewClient(chromaURL, openaiKey string, log *zap.Logger) *Client {
	return &Client{
		chromaURL: strings.TrimRight(chromaURL, "/"),
		openaiKey: openaiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		log: log,
	}
}

// ─── Collection Management ────────────────────────────────────────────────────

type chromaCollection struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type createCollectionReq struct {
	Name        string            `json:"name"`
	GetOrCreate bool              `json:"get_or_create"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// collectionName derives a ChromaDB collection name from a bot UUID.
// Hyphens in UUIDs are replaced with underscores for safe naming.
func collectionName(botID string) string {
	return "trustinbox_bot_" + strings.ReplaceAll(botID, "-", "_")
}

// getOrCreateCollection returns the ChromaDB collection UUID for a given botID,
// creating the collection with cosine distance metric if it does not exist.
func (c *Client) getOrCreateCollection(ctx context.Context, botID string) (string, error) {
	body, err := json.Marshal(createCollectionReq{
		Name:        collectionName(botID),
		GetOrCreate: true,
		Metadata:    map[string]string{"bot_id": botID, "hnsw:space": "cosine"},
	})
	if err != nil {
		return "", fmt.Errorf("marshal collection request: %w", err)
	}

	resp, err := c.doChromaRequest(ctx, http.MethodPost, "/collections", body)
	if err != nil {
		return "", fmt.Errorf("get or create collection: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", fmt.Errorf("chromadb create collection HTTP %d: %s", resp.StatusCode, msg)
	}

	var col chromaCollection
	if err := json.NewDecoder(resp.Body).Decode(&col); err != nil {
		return "", fmt.Errorf("decode collection response: %w", err)
	}
	return col.ID, nil
}

// ─── Add Document ─────────────────────────────────────────────────────────────

type addRequest struct {
	IDs        []string            `json:"ids"`
	Embeddings [][]float32         `json:"embeddings"`
	Documents  []string            `json:"documents"`
	Metadatas  []map[string]string `json:"metadatas"`
}

// Add generates an embedding for content and upserts it into the bot's collection.
func (c *Client) Add(
	ctx context.Context,
	botID, chunkID, sourceID, sourceName, content string,
	extra map[string]string,
) error {
	embedding, err := c.embed(ctx, content)
	if err != nil {
		return fmt.Errorf("embed chunk %s: %w", chunkID, err)
	}

	colID, err := c.getOrCreateCollection(ctx, botID)
	if err != nil {
		return err
	}

	// Merge caller metadata with required system fields.
	md := make(map[string]string, len(extra)+3)
	for k, v := range extra {
		md[k] = v
	}
	md["bot_id"] = botID
	md["source_id"] = sourceID
	md["source_name"] = sourceName

	body, _ := json.Marshal(addRequest{
		IDs:        []string{chunkID},
		Embeddings: [][]float32{embedding},
		Documents:  []string{content},
		Metadatas:  []map[string]string{md},
	})

	resp, err := c.doChromaRequest(ctx, http.MethodPost, "/collections/"+colID+"/add", body)
	if err != nil {
		return fmt.Errorf("chromadb add: %w", err)
	}
	defer resp.Body.Close()

	// 200 OK and 201 Created are both success for add.
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("chromadb add HTTP %d: %s", resp.StatusCode, msg)
	}
	return nil
}

// ─── Query ────────────────────────────────────────────────────────────────────

type queryRequest struct {
	QueryEmbeddings [][]float32 `json:"query_embeddings"`
	NResults        int         `json:"n_results"`
	Include         []string    `json:"include"`
}

type queryResponse struct {
	IDs       [][]string            `json:"ids"`
	Documents [][]string            `json:"documents"`
	Distances [][]float64           `json:"distances"`
	Metadatas [][]map[string]string `json:"metadatas"`
}

// QueryResult holds a single ranked result from a ChromaDB query.
type QueryResult struct {
	ChunkID    string
	Content    string
	Score      float64 // cosine similarity [0, 1]
	SourceID   string
	SourceName string
	Metadata   map[string]string
}

// Query performs a vector similarity search against the bot's ChromaDB collection.
// Results are ordered by descending similarity score (closest first).
func (c *Client) Query(ctx context.Context, botID, queryText string, nResults int) ([]QueryResult, error) {
	embedding, err := c.embed(ctx, queryText)
	if err != nil {
		return nil, fmt.Errorf("embed query: %w", err)
	}

	colID, err := c.getOrCreateCollection(ctx, botID)
	if err != nil {
		return nil, err
	}

	body, _ := json.Marshal(queryRequest{
		QueryEmbeddings: [][]float32{embedding},
		NResults:        nResults,
		Include:         []string{"documents", "distances", "metadatas"},
	})

	resp, err := c.doChromaRequest(ctx, http.MethodPost, "/collections/"+colID+"/query", body)
	if err != nil {
		return nil, fmt.Errorf("chromadb query request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		// Empty collection returns 400 — treat as zero results.
		if resp.StatusCode == http.StatusBadRequest && isEmptyCollectionError(string(msg)) {
			c.log.Debug("chromadb query on empty collection — returning no results",
				zap.String("bot_id", botID),
			)
			return nil, nil
		}
		return nil, fmt.Errorf("chromadb query HTTP %d: %s", resp.StatusCode, msg)
	}

	var qr queryResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseBodySize)).Decode(&qr); err != nil {
		return nil, fmt.Errorf("decode chromadb query response: %w", err)
	}

	if len(qr.IDs) == 0 || len(qr.IDs[0]) == 0 {
		return nil, nil
	}

	ids := qr.IDs[0]
	docs := qr.Documents[0]
	dists := qr.Distances[0]
	metas := qr.Metadatas[0]

	results := make([]QueryResult, len(ids))
	for i, id := range ids {
		// ChromaDB cosine distance: 0 = identical, 2 = opposite.
		// Similarity score = 1 - distance (range [0, 1] for well-formed embeddings).
		score := 1.0 - dists[i]
		md := metas[i]
		results[i] = QueryResult{
			ChunkID:    id,
			Content:    docs[i],
			Score:      score,
			SourceID:   md["source_id"],
			SourceName: md["source_name"],
			Metadata:   md,
		}
	}
	return results, nil
}

// isEmptyCollectionError detects the ChromaDB "no embeddings" error body.
func isEmptyCollectionError(msg string) bool {
	lower := strings.ToLower(msg)
	return strings.Contains(lower, "no embeddings") ||
		strings.Contains(lower, "collection is empty") ||
		strings.Contains(lower, "number of requested results")
}

// ─── OpenAI Embeddings ────────────────────────────────────────────────────────

type embeddingRequest struct {
	Model string `json:"model"`
	Input string `json:"input"`
}

type embeddingResponse struct {
	Data []struct {
		Embedding []float32 `json:"embedding"`
	} `json:"data"`
}

// embed calls the OpenAI embeddings API and returns a text-embedding-3-small vector.
func (c *Client) embed(ctx context.Context, text string) ([]float32, error) {
	body, _ := json.Marshal(embeddingRequest{Model: embeddingModel, Input: text})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openAIEmbeddingURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build embedding request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.openaiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("openai embeddings: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("openai embeddings HTTP %d: %s", resp.StatusCode, msg)
	}

	var er embeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&er); err != nil {
		return nil, fmt.Errorf("decode embedding response: %w", err)
	}
	if len(er.Data) == 0 {
		return nil, fmt.Errorf("openai returned no embedding vectors")
	}
	return er.Data[0].Embedding, nil
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

// doChromaRequest sends a JSON request to the ChromaDB v1 REST API.
func (c *Client) doChromaRequest(ctx context.Context, method, path string, body []byte) (*http.Response, error) {
	url := c.chromaURL + chromaAPIBase + path
	req, err := http.NewRequestWithContext(ctx, method, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build chromadb request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	return c.httpClient.Do(req)
}

package grpc

import (
	"context"

	"github.com/trustinbox/document-service/internal/domain/entity"
	"github.com/trustinbox/document-service/internal/usecase"
	bizerr "github.com/trustinbox/cornerstone/errors"
	pb "github.com/trustinbox/proto/gen/document/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// DocumentHandler implements the DocumentServiceServer gRPC interface.
type DocumentHandler struct {
	pb.UnimplementedDocumentServiceServer
	uc *usecase.DocumentUseCase
}

// NewDocumentHandler creates a new DocumentHandler.
func NewDocumentHandler(uc *usecase.DocumentUseCase) *DocumentHandler {
	return &DocumentHandler{uc: uc}
}

func (h *DocumentHandler) CreateDocument(ctx context.Context, req *pb.CreateDocumentRequest) (*pb.Document, error) {
	doc, err := h.uc.CreateDocument(ctx,
		req.GetServiceProviderId(), req.GetUploadedBySpUserId(),
		req.GetFileName(), req.GetFileType(), req.GetS3Key(),
		req.GetFileSize(), req.GetClassification(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return documentToProto(doc), nil
}

func (h *DocumentHandler) GetDocument(ctx context.Context, req *pb.GetDocumentRequest) (*pb.Document, error) {
	doc, err := h.uc.GetDocument(ctx, req.GetDocumentId(), req.GetServiceProviderId())
	if err != nil {
		return nil, mapError(err)
	}
	return documentToProto(doc), nil
}

func (h *DocumentHandler) UpdateDocument(ctx context.Context, req *pb.UpdateDocumentRequest) (*pb.Document, error) {
	doc, err := h.uc.UpdateDocument(ctx,
		req.GetDocumentId(), req.GetServiceProviderId(),
		req.GetFileName(), req.GetClassification(), req.GetStatus(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return documentToProto(doc), nil
}

func (h *DocumentHandler) ListDocuments(ctx context.Context, req *pb.ListDocumentsRequest) (*pb.ListDocumentsResponse, error) {
	docs, total, err := h.uc.ListDocuments(ctx,
		req.GetServiceProviderId(), req.GetStatus(), req.GetClassification(),
		int(req.GetLimit()), int(req.GetOffset()),
	)
	if err != nil {
		return nil, mapError(err)
	}
	pbDocs := make([]*pb.Document, len(docs))
	for i, d := range docs {
		pbDocs[i] = documentToProto(d)
	}
	return &pb.ListDocumentsResponse{Documents: pbDocs, Total: int32(total)}, nil
}

func (h *DocumentHandler) DeleteDocument(ctx context.Context, req *pb.DeleteDocumentRequest) (*pb.DeleteDocumentResponse, error) {
	if err := h.uc.DeleteDocument(ctx, req.GetDocumentId(), req.GetServiceProviderId()); err != nil {
		return nil, mapError(err)
	}
	return &pb.DeleteDocumentResponse{Success: true}, nil
}

func (h *DocumentHandler) GeneratePresignedURL(ctx context.Context, req *pb.GeneratePresignedURLRequest) (*pb.PresignedURLResponse, error) {
	url, expiresAt, err := h.uc.GeneratePresignedURL(ctx,
		req.GetDocumentId(), req.GetServiceProviderId(),
		int(req.GetExpiryMinutes()),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.PresignedURLResponse{
		Url:       url,
		ExpiresAt: timestamppb.New(expiresAt),
	}, nil
}

func (h *DocumentHandler) ClassifyDocument(ctx context.Context, req *pb.ClassifyDocumentRequest) (*pb.DocumentClassification, error) {
	classification, err := h.uc.ClassifyDocument(ctx,
		req.GetDocumentId(), req.GetServiceProviderId(),
		req.GetLabel(), req.GetConfidenceScore(), req.GetClassifiedBy(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return classificationToProto(classification), nil
}

func (h *DocumentHandler) GetDocumentClassifications(ctx context.Context, req *pb.GetDocumentClassificationsRequest) (*pb.GetDocumentClassificationsResponse, error) {
	classifications, err := h.uc.GetDocumentClassifications(ctx,
		req.GetDocumentId(), req.GetServiceProviderId(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	pbClassifications := make([]*pb.DocumentClassification, len(classifications))
	for i, c := range classifications {
		pbClassifications[i] = classificationToProto(c)
	}
	return &pb.GetDocumentClassificationsResponse{Classifications: pbClassifications}, nil
}

func (h *DocumentHandler) CreateDocumentVersion(ctx context.Context, req *pb.CreateDocumentVersionRequest) (*pb.DocumentVersion, error) {
	version, err := h.uc.CreateDocumentVersion(ctx,
		req.GetDocumentId(), req.GetServiceProviderId(),
		req.GetS3Key(), req.GetFileSize(),
		req.GetUploadedBySpUserId(), req.GetChangeSummary(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return versionToProto(version), nil
}

func (h *DocumentHandler) ListDocumentVersions(ctx context.Context, req *pb.ListDocumentVersionsRequest) (*pb.ListDocumentVersionsResponse, error) {
	versions, total, err := h.uc.ListDocumentVersions(ctx,
		req.GetDocumentId(), req.GetServiceProviderId(),
		int(req.GetLimit()), int(req.GetOffset()),
	)
	if err != nil {
		return nil, mapError(err)
	}
	pbVersions := make([]*pb.DocumentVersion, len(versions))
	for i, v := range versions {
		pbVersions[i] = versionToProto(v)
	}
	return &pb.ListDocumentVersionsResponse{Versions: pbVersions, Total: int32(total)}, nil
}

func (h *DocumentHandler) GetDocumentVersion(ctx context.Context, req *pb.GetDocumentVersionRequest) (*pb.DocumentVersion, error) {
	version, err := h.uc.GetDocumentVersion(ctx,
		req.GetDocumentId(), req.GetServiceProviderId(),
		int(req.GetVersionNumber()),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return versionToProto(version), nil
}

func (h *DocumentHandler) TrackDownload(ctx context.Context, req *pb.TrackDownloadRequest) (*pb.DownloadRecord, error) {
	record, err := h.uc.TrackDownload(ctx,
		req.GetDocumentId(), req.GetServiceProviderId(),
		req.GetDownloadedByUserId(), int(req.GetVersionNumber()),
		req.GetIpAddress(), req.GetUserAgent(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return downloadRecordToProto(record), nil
}

// --- Proto mapping helpers ---

func documentToProto(d *entity.Document) *pb.Document {
	return &pb.Document{
		Id:                d.ID,
		ServiceProviderId: d.ServiceProviderID,
		UploadedBySpUserId: d.UploadedBySPUser,
		FileName:          d.FileName,
		FileType:          d.FileType,
		S3Key:             d.S3Key,
		FileSize:          d.FileSize,
		Classification:    d.Classification,
		Status:            string(d.Status),
		CurrentVersion:    int32(d.CurrentVersion),
		CreatedAt:         timestamppb.New(d.CreatedAt),
		UpdatedAt:         timestamppb.New(d.UpdatedAt),
	}
}

func versionToProto(v *entity.DocumentVersion) *pb.DocumentVersion {
	return &pb.DocumentVersion{
		Id:                v.ID,
		DocumentId:        v.DocumentID,
		VersionNumber:     int32(v.VersionNumber),
		S3Key:             v.S3Key,
		FileSize:          v.FileSize,
		UploadedBySpUserId: v.UploadedBySPUser,
		ChangeSummary:     v.ChangeSummary,
		CreatedAt:         timestamppb.New(v.CreatedAt),
	}
}

func classificationToProto(c *entity.DocumentClassification) *pb.DocumentClassification {
	return &pb.DocumentClassification{
		Id:              c.ID,
		DocumentId:      c.DocumentID,
		Label:           c.Label,
		ConfidenceScore: c.ConfidenceScore,
		ClassifiedBy:    string(c.ClassifiedBy),
		CreatedAt:       timestamppb.New(c.CreatedAt),
	}
}

func downloadRecordToProto(r *entity.DownloadRecord) *pb.DownloadRecord {
	return &pb.DownloadRecord{
		Id:                r.ID,
		DocumentId:        r.DocumentID,
		DownloadedByUserId: r.DownloadedByUser,
		VersionNumber:     int32(r.VersionNumber),
		IpAddress:         r.IPAddress,
		UserAgent:         r.UserAgent,
		CreatedAt:         timestamppb.New(r.CreatedAt),
	}
}

// --- Error mapping ---

func mapError(err error) error {
	if err == nil {
		return nil
	}
	switch {
	case bizerr.IsNotFound(err):
		return status.Error(codes.NotFound, err.Error())
	case bizerr.IsInvalidInput(err):
		return status.Error(codes.InvalidArgument, err.Error())
	case bizerr.IsForbidden(err):
		return status.Error(codes.PermissionDenied, err.Error())
	case bizerr.IsPolicyDenied(err):
		return status.Error(codes.PermissionDenied, err.Error())
	default:
		return status.Error(codes.Internal, err.Error())
	}
}

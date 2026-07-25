# Document Embedding Pipeline

Status: ready-for-agent

## Problem Statement

Users need a way to upload documents and convert them into vector embeddings for semantic search and retrieval. The current process requires manual handling of file uploads, text extraction, embedding generation, and vector storage. Users want a streamlined solution that provides real-time visibility into the processing progress and handles the entire pipeline automatically.

## Solution

A full-stack web application that allows authenticated users to upload documents (starting with PDFs, extensible to other formats), processes them through an embedding pipeline, and stores the resulting vectors. The application provides real-time progress updates via WebSocket, showing the status of each document through stages: uploaded, processing (with percentage progress), completed, or error (with retry option). The system is designed for low-cost cloud deployment on AWS with multi-user support.

## User Stories

1. As an unauthenticated user, I want to sign in with Google, so that I can access the application and manage my documents.
2. As an authenticated user, I want to upload PDF files, so that I can convert them into vector embeddings.
3. As an authenticated user, I want to upload up to 10 files at once (max 5MB each), so that I can process multiple documents efficiently.
4. As an authenticated user, I want to see real-time progress for each uploaded file, so that I know the current status of the processing pipeline.
5. As an authenticated user, I want to see percentage progress during embedding, so that I can estimate completion time.
6. As an authenticated user, I want to receive error notifications if processing fails, so that I can take corrective action.
7. As an authenticated user, I want to retry failed files with a single click, so that I can recover from transient errors without re-uploading.
8. As an authenticated user, I want to see the final status (complete/error) for each file, so that I can verify successful processing.
9. As a system administrator, I want files to automatically move to cold storage after 30 days, so that storage costs are minimized.
10. As a system administrator, I want the system to handle concurrent uploads from multiple users, so that the application scales to multi-user scenarios.
11. As a system administrator, I want the embedding pipeline to process up to 10 documents concurrently, so that resources are utilized efficiently without overwhelming the system.
12. As a developer, I want the system to be extensible to support additional file formats beyond PDF, so that future requirements can be accommodated without major rewrites.
13. As a developer, I want the embedding model to be swappable, so that I can switch between different providers (OpenAI, AWS Bedrock, etc.) based on cost or performance needs.
14. As a developer, I want the vector database to be replaceable, so that I can switch between different vector storage solutions as requirements evolve.
15. As a developer, I want the progress tracking mechanism to be configurable, so that I can adjust the granularity of progress updates based on testing and user feedback.

## Implementation Decisions

### Architecture
- **Monolithic architecture** using Next.js full-stack framework (React frontend + TypeScript backend in single codebase)
- **Multi-user system** with Google OAuth authentication using NextAuth.js
- **Queue-based processing** using AWS SQS with Lambda workers for embedding jobs
- **Max concurrency** of 10 documents for processing
- **WebSocket communication** using Socket.io for real-time progress updates

### Technology Stack
- **Frontend**: React via Next.js, shadcn/ui for UI components, TailwindCSS for styling
- **Backend**: Next.js API routes with TypeScript
- **Authentication**: NextAuth.js (v5) with Google OAuth provider
- **Cloud Platform**: AWS (primary choice for cost optimization)
- **Compute**: AWS Lambda (serverless, pay-per-use with free tier)
- **Storage**: AWS S3 (standard tier for active files, lifecycle rule to transition to Glacier after 30 days)
- **Database**: PostgreSQL with pgvector extension on AWS RDS (free tier eligible, vector search built-in)
- **Queue**: AWS SQS (free tier available)
- **Embedding**: OpenAI text-embedding-3-small API ($0.02/1M tokens) called from Lambda; alternative is AWS Bedrock
- **Vector Database**: OpenSearch on AWS (as requested); alternative considered was pgvector on RDS for cost savings
- **Real-time Communication**: Socket.io library for WebSocket functionality

### Data Model
- **Users table**: stores Google auth identity (email, name, photo) and application user mapping
- **Documents table**: tracks file metadata, processing state, progress percentage, error messages, timestamps
- **Embeddings table**: stores vector embeddings with document references
- **Processing queue**: SQS messages with document IDs for job distribution

### Processing Pipeline
1. **File Upload**: User uploads PDF via frontend, file stored in S3, database record created with status "uploaded"
2. **Queue Job**: Document ID sent to SQS queue
3. **Text Extraction**: Lambda worker extracts text from PDF (extensible to other formats)
4. **Chunking**: Text split into chunks for embedding (progress tracking by chunks processed)
5. **Embedding Generation**: Each chunk sent to embedding API (OpenAI or Bedrock)
6. **Vector Storage**: Embeddings stored in vector database (OpenSearch)
7. **Progress Updates**: WebSocket pushes status updates (uploaded → processing → complete/error)
8. **Cold Storage**: S3 lifecycle rule moves original files to Glacier after 30 days

### State Management
- **Database fields per document**: file_id, user_id, status, progress_percentage, error_message, created_at, updated_at, file_url, s3_key
- **Status values**: uploaded, processing, complete, error
- **Progress tracking**: Percentage based on chunks processed (extensible to pages/tokens based on testing)
- **Error handling**: Error message stored in database, UI displays error with retry button

### Progress Tracking Mechanism
- **Primary implementation**: Chunk-based progress (number of chunks processed / total chunks)
- **Extensibility**: Architecture supports switching to page-based or token-based tracking through configuration
- **WebSocket events**: Progress updates pushed as percentage changes occur
- **Fallback**: Server-Sent Events as secondary option, polling as tertiary (not implemented initially)

### Concurrency and Scaling
- **Queue system**: SQS manages job distribution across Lambda workers
- **Concurrency limit**: 10 documents processed simultaneously per user
- **Multi-user support**: Queue handles concurrent uploads from multiple users
- **Rate limiting**: Per-user limits to prevent abuse (10 files, 5MB each per session)

### Cost Optimization
- **Serverless compute**: Lambda pay-per-use model with free tier
- **Storage tiering**: S3 standard for active files, automatic transition to Glacier after 30 days
- **Database**: RDS PostgreSQL free tier with pgvector extension
- **Embedding**: OpenAI text-embedding-3-small for cost efficiency ($0.02/1M tokens)
- **Per-document processing**: No batching to keep implementation simple, cost acceptable for scale

### Security
- **Authentication**: Google OAuth via NextAuth.js
- **Authorization**: Users can only access their own documents
- **File validation**: Size limits (5MB), type validation (PDF initially)
- **API security**: Next.js API routes with proper authentication middleware
- **Data encryption**: S3 encryption at rest, TLS in transit

## Testing Decisions

### Testing Strategy
- **Unit tests**: Service layer functions (file processing, embedding orchestration, progress tracking, user management)
- **Integration tests**: Next.js API routes with test database
- **E2E tests**: Critical user flows (auth → upload → progress → complete)
- **External service mocking**: AWS services (S3, SQS, Lambda) mocked for unit tests, integration tests with real AWS
- **API mocking**: OpenAI API mocked for unit tests, integration tests with real API

### Test Seams
- **Primary seam**: Service layer - business logic extracted from Next.js API routes into testable service functions
- **Secondary seam**: Data access layer - repository pattern abstracting database operations
- **External boundaries**: AWS services and OpenAI API mocked at service layer boundaries
- **Integration seam**: API routes tested end-to-end with test database

### Test Quality
- **External behavior focus**: Tests verify observable behavior, not implementation details
- **State isolation**: Each test runs with clean database state
- **Deterministic results**: Mocked external services ensure consistent test outcomes
- **Fast feedback**: Unit tests run quickly without external dependencies

## Out of Scope

- Querying/searching the embeddings (this is an ingestion pipeline only)
- Document preview or viewing after upload
- Batch processing of multiple documents together (per-document processing only)
- Advanced file parsing (tables, images, formatting preservation - text extraction only initially)
- Vector similarity search or retrieval functionality
- Document versioning or history tracking
- Sharing documents between users
- Advanced analytics or usage metrics
- Multi-cloud deployment (AWS only)
- Custom embedding model hosting (using managed APIs only)

## Further Notes

- **Extensibility priorities**: File format support, embedding model swapping, vector database replacement, progress tracking granularity
- **Cost monitoring**: AWS cost alerts recommended for Lambda and S3 usage
- **Error recovery**: Retry mechanism should handle transient errors (network issues, API rate limits)
- **Progress granularity**: Initial implementation uses chunk-based progress; can switch to page/token-based based on user testing
- **WebSocket reliability**: Socket.io handles reconnection and fallbacks automatically
- **Database migrations**: Schema changes should be managed via migration system
- **Environment configuration**: Separate configs for development, staging, production
- **Logging**: Structured logging for debugging and monitoring
- **Monitoring**: CloudWatch for AWS services, application-level metrics for API routes and WebSocket connections

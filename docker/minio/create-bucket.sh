#!/bin/sh
# One-shot job (service "minio-init"): creates the private video bucket in MinIO (S3 API, via the AWS CLI).
set -e

ENDPOINT="${S3_ENDPOINT:-http://minio:9000}"
BUCKET="${AWS_BUCKET_NAME:-netflix-streaming-videos}"

echo "Waiting for the object store at ${ENDPOINT}..."
until aws --endpoint-url "$ENDPOINT" s3api list-buckets >/dev/null 2>&1; do
  sleep 2
done

if aws --endpoint-url "$ENDPOINT" s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  echo "Bucket ${BUCKET} already exists"
else
  aws --endpoint-url "$ENDPOINT" s3api create-bucket --bucket "$BUCKET"
  echo "Bucket ${BUCKET} created (private: objects are only reachable through pre-signed URLs)"
fi

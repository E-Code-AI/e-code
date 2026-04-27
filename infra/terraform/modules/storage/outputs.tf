output "bucket_names" {
  description = "Logical bucket keys mapped to physical GCS bucket names."
  value       = { for key, bucket in google_storage_bucket.ecode : key => bucket.name }
}

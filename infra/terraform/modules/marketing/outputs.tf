output "marketing_bucket" {
  value = google_storage_bucket.marketing.name
}

output "docs_bucket" {
  value = google_storage_bucket.docs.name
}

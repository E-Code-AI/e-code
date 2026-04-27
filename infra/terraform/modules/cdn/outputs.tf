output "ip_address" {
  value = google_compute_global_address.site.address
}

output "backend_bucket" {
  value = google_compute_backend_bucket.site.name
}

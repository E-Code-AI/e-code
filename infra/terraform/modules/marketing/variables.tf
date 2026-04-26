variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "marketing_bucket_name" {
  type    = string
  default = "ecode-marketing"
}

variable "docs_bucket_name" {
  type    = string
  default = "ecode-docs"
}

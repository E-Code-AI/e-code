variable "project_id" {
  type = string
}

variable "name" {
  type = string
}

variable "bucket_name" {
  type = string
}

variable "domains" {
  type = list(string)
}

variable "enable_cdn" {
  type    = bool
  default = true
}

# SUBB SURFERS — terraform variables.

variable "aws_region" {
  description = "AWS region to deploy the SUBB SURFERS stack into."
  type        = string
  default     = "us-east-1"
}

variable "image_tag" {
  description = "Tag of the ghcr.io/faisukhan01/subb-leaderboard-go image to run."
  type        = string
  default     = "latest"
}

variable "app_count" {
  description = "Number of leaderboard service replicas behind the ALB."
  type        = number
  default     = 2
}

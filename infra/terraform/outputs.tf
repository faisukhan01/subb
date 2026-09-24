# SUBB SURFERS — terraform outputs.

output "alb_dns_name" {
  description = "Public DNS name of the ALB fronting the leaderboard service."
  value       = aws_alb.main.dns_name
}

output "target_group_arn" {
  description = "ARN of the leaderboard target group (for other services to join)."
  value       = aws_alb_target_group.go.arn
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster hosting the game services."
  value       = aws_ecs_cluster.main.name
}

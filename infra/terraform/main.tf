# SUBB SURFERS — ECS Fargate deployment for the leaderboard (go) service.
#
# Provisions: an ECS cluster, a Fargate task definition running the go image
# from GHCR, an ALB (port 80) with a target group wired to the task, and the
# supporting security groups. Region / image tag / replica count are variables
# (see variables.tf); copy terraform.tfvars.example to terraform.tfvars.

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "SubbSurfers"
      ManagedBy = "terraform"
    }
  }
}

# ----------------------------------------------------------------- networking
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ----------------------------------------------------------------- ecs cluster
resource "aws_ecs_cluster" "main" {
  name = "subb-surfers"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ------------------------------------------------------------------- security
resource "aws_security_group" "alb" {
  name        = "subb-surfers-alb"
  description = "ALB ingress for the SUBB SURFERS leaderboard service"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all egress"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "service" {
  name        = "subb-surfers-service"
  description = "Leaderboard service ingress from the ALB only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "HTTP from the ALB"
    from_port       = 4001
    to_port         = 4001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow all egress"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# -------------------------------------------------------------- load balancer
resource "aws_alb" "main" {
  name            = "subb-surfers"
  internal        = false
  load_balancer_type = "application"
  security_groups = [aws_security_group.alb.id]
  subnets         = data.aws_subnets.default.ids
}

resource "aws_alb_target_group" "go" {
  name        = "subb-leaderboard-go"
  port        = 4001
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/healthz"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  deregistration_delay = 30
}

resource "aws_alb_listener" "http" {
  load_balancer_arn = aws_alb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.go.arn
  }
}

# ------------------------------------------------------ fargate task + service
resource "aws_ecs_task_definition" "leaderboard_go" {
  family                   = "subb-leaderboard-go"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.execution.arn

  container_definitions = jsonencode([
    {
      name      = "leaderboard-go"
      image     = "ghcr.io/faisukhan01/subb-leaderboard-go:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 4001
          hostPort      = 4001
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]

      environment = [
        { name = "PORT", value = "4001" },
        { name = "APP_ENV", value = "production" },
        { name = "GIN_MODE", value = "release" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/subb-leaderboard-go"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q -O - http://127.0.0.1:4001/healthz || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 10
      }
    }
  ])

  depends_on = [aws_cloudwatch_log_group.leaderboard_go]
}

resource "aws_cloudwatch_log_group" "leaderboard_go" {
  name              = "/ecs/subb-leaderboard-go"
  retention_in_days = 14
}

resource "aws_iam_role" "execution" {
  name = "subb-surfers-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "ecs-tasks.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_service" "leaderboard_go" {
  name            = "subb-leaderboard-go"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.leaderboard_go.arn
  desired_count   = var.app_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = data.aws_subnets.default.ids
    security_groups = [aws_security_group.service.id]
    assign_public_ip = true # required with public subnets + no NAT gateway
  }

  load_balancer {
    target_group_arn = aws_alb_target_group.go.arn
    container_name   = "leaderboard-go"
    container_port   = 4001
  }

  depends_on = [aws_alb_listener.http]
}

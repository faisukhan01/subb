# syntax=docker/dockerfile:1
# anticheat-csharp — SUBB SURFERS anti-cheat service (.NET 8 minimal API)

# Stage 1: restore, test, publish.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Anticheat.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet test -c Release --no-restore --logger "console;verbosity=minimal" \
 && dotnet publish -c Release --no-restore -o /app

# Stage 2: ASP.NET runtime, non-root.
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
# curl is only here so the HEALTHCHECK can poke /healthz.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
USER app
EXPOSE 4004
ENV PORT=4004 \
    ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:4004
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4004/healthz || exit 1
ENTRYPOINT ["dotnet", "Anticheat.dll"]

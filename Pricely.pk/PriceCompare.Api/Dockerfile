# PriceCompare.Api — the customer-facing endpoints (/api/browse,
# /api/search, /api/product) plus the Telemart and Mega.pk scrapers.
#
# Self-contained: no project references, so the build context is this folder.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY PriceCompare.Api.csproj ./
RUN dotnet restore PriceCompare.Api.csproj

COPY . .
RUN dotnet publish PriceCompare.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_ENVIRONMENT=Production

# ASP.NET watches appsettings.json for changes, which costs one inotify
# instance per config file. Render's containers allow 128 in total, and a
# crash-looping service exhausts them — after which the app dies inside
# WebApplication.CreateBuilder, before any of our own code runs, with an
# IOException that says nothing about configuration. Polling has no such
# limit, and nothing here edits its own config at runtime anyway.
ENV DOTNET_USE_POLLING_FILE_WATCHER=1

EXPOSE 8080

# See backend/Dockerfile — the port comes from the host at runtime.
ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} exec dotnet PriceCompare.Api.dll"]

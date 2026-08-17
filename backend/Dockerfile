# Pricely.Api — auth (/api/auth) and the admin back office (/api/v1/admin).
#
# Build context is backend/, not this project's folder, because Pricely.Api
# references Pricely.Core and Pricely.Infrastructure as sibling projects.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore against the project files alone first. A code-only change then
# reuses this layer instead of re-downloading every NuGet package.
COPY Pricely.Api/Pricely.Api.csproj                        Pricely.Api/
COPY Pricely.Core/Pricely.Core.csproj                      Pricely.Core/
COPY Pricely.Infrastructure/Pricely.Infrastructure.csproj  Pricely.Infrastructure/
RUN dotnet restore Pricely.Api/Pricely.Api.csproj

COPY . .
RUN dotnet publish Pricely.Api/Pricely.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_ENVIRONMENT=Production

# See the note in Pricely.pk/PriceCompare.Api/Dockerfile — inotify instances
# are a scarce, container-wide resource, and running out of them kills the
# app before it can report anything useful.
ENV DOTNET_USE_POLLING_FILE_WATCHER=1

EXPOSE 8080

# The host assigns the port at runtime, so it has to be read when the
# container starts rather than baked in at build time. Shell form is what
# makes ${PORT} expand; 8080 keeps a plain `docker run` working.
ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} exec dotnet Pricely.Api.dll"]

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "Pricely.Api/Pricely.Api.csproj"
RUN dotnet publish "Pricely.Api/Pricely.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
# Npgsql probes for GSSAPI when it connects; without these libraries the
# probe fails noisily in the container.
RUN apt-get update && apt-get install -y libkrb5-3 libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production

# ASP.NET watches appsettings.json with inotify, and a container has few
# instances to give. A crash-looping service used them up on Render and then
# died inside WebApplication.CreateBuilder, before any of our own code ran.
# Polling has no such limit, and nothing here rewrites its own config.
ENV DOTNET_USE_POLLING_FILE_WATCHER=1

EXPOSE 8080

# The host assigns the port at runtime, so it has to be read when the
# container starts rather than baked in at build time. Shell form is what
# makes ${PORT} expand; 8080 keeps a plain `docker run` working.
ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} exec dotnet Pricely.Api.dll"]

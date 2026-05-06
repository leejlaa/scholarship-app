FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ScholarshipPortal.Api/ScholarshipPortal.Api.csproj ScholarshipPortal.Api/
COPY ScholarshipPortal.Application/ScholarshipPortal.Application.csproj ScholarshipPortal.Application/
COPY ScholarshipPortal.Domain/ScholarshipPortal.Domain.csproj ScholarshipPortal.Domain/
COPY ScholarshipPortal.Infrastructure/ScholarshipPortal.Infrastructure.csproj ScholarshipPortal.Infrastructure/

RUN dotnet restore ScholarshipPortal.Api/ScholarshipPortal.Api.csproj

COPY . .

RUN dotnet publish ScholarshipPortal.Api/ScholarshipPortal.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

RUN mkdir -p /app/data /app/uploads

ENV ASPNETCORE_URLS=http://+:8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "ScholarshipPortal.Api.dll"]

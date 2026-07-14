#!/bin/bash
set -e

cd /opt/servicopro/backend

echo "Creating solution..."
dotnet new sln -n ServicoPro

echo "Creating class libraries..."
dotnet new classlib -n ServicoPro.Domain
dotnet new classlib -n ServicoPro.Application
dotnet new classlib -n ServicoPro.Infrastructure

echo "Setting up ServicoPro.Api..."
mkdir -p ServicoPro.Api
mv ServicoPro.Api.csproj ServicoPro.Api/
mv Program.cs ServicoPro.Api/
mv appsettings.* ServicoPro.Api/ || true
if [ -d "API" ]; then
    mv API ServicoPro.Api/Controllers
fi

echo "Moving Domain..."
rm -f ServicoPro.Domain/Class1.cs
if [ -d "Domain" ]; then
    # Move all contents of Domain to ServicoPro.Domain
    # Use find and mv to handle hidden files if any, but cp is safer
    cp -r Domain/* ServicoPro.Domain/ 2>/dev/null || true
    rm -rf Domain
fi

echo "Moving Application..."
rm -f ServicoPro.Application/Class1.cs
if [ -d "Application" ]; then
    cp -r Application/* ServicoPro.Application/ 2>/dev/null || true
    rm -rf Application
fi

echo "Moving Infrastructure..."
rm -f ServicoPro.Infrastructure/Class1.cs
if [ -d "Infrastructure" ]; then
    cp -r Infrastructure/* ServicoPro.Infrastructure/ 2>/dev/null || true
    rm -rf Infrastructure
fi
if [ -d "Migrations" ]; then
    mv Migrations ServicoPro.Infrastructure/
fi

echo "Adding projects to solution..."
dotnet sln add ServicoPro.Api/ServicoPro.Api.csproj
dotnet sln add ServicoPro.Domain/ServicoPro.Domain.csproj
dotnet sln add ServicoPro.Application/ServicoPro.Application.csproj
dotnet sln add ServicoPro.Infrastructure/ServicoPro.Infrastructure.csproj

echo "Adding project references..."
dotnet add ServicoPro.Application/ServicoPro.Application.csproj reference ServicoPro.Domain/ServicoPro.Domain.csproj
dotnet add ServicoPro.Infrastructure/ServicoPro.Infrastructure.csproj reference ServicoPro.Application/ServicoPro.Application.csproj
dotnet add ServicoPro.Api/ServicoPro.Api.csproj reference ServicoPro.Infrastructure/ServicoPro.Infrastructure.csproj ServicoPro.Application/ServicoPro.Application.csproj

echo "Migrating NuGet packages..."
dotnet add ServicoPro.Infrastructure/ServicoPro.Infrastructure.csproj package Microsoft.EntityFrameworkCore.SqlServer -v 9.0.0
dotnet add ServicoPro.Infrastructure/ServicoPro.Infrastructure.csproj package Microsoft.EntityFrameworkCore.Design -v 9.0.0
dotnet add ServicoPro.Infrastructure/ServicoPro.Infrastructure.csproj package Microsoft.Data.SqlClient -v 6.0.2
dotnet add ServicoPro.Infrastructure/ServicoPro.Infrastructure.csproj package Dapper -v 2.1.79

dotnet remove ServicoPro.Api/ServicoPro.Api.csproj package Microsoft.EntityFrameworkCore.SqlServer || true
dotnet remove ServicoPro.Api/ServicoPro.Api.csproj package Microsoft.Data.SqlClient || true
dotnet remove ServicoPro.Api/ServicoPro.Api.csproj package Dapper || true

echo "Done restructuring."

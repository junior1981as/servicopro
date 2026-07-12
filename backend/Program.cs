using System;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using ServicoPro.Api.Application.Interfaces;
using ServicoPro.Api.Infrastructure.Security;
using ServicoPro.Api.API.Middlewares;
using ServicoPro.Api.API.Endpoints;

using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using ServicoPro.Api.Domain.Entities;
using ServicoPro.Api.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// DbContext Configuration
var masterConn = builder.Configuration.GetConnectionString("MasterConnection");
builder.Services.AddDbContext<MasterDbContext>(options => 
    options.UseSqlServer(masterConn));

builder.Services.AddDbContext<ServicoProDbContext>();

// Identity Configuration
builder.Services.AddIdentityCore<ApplicationUser>(options => {
    options.User.RequireUniqueEmail = false;
    options.Password.RequireDigit = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequiredLength = 6;
})
.AddEntityFrameworkStores<ServicoProDbContext>()
.AddDefaultTokenProviders();

// DI Configuration
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddSingleton<IJwtService, JwtService>();
builder.Services.AddScoped<ServicoPro.Api.Application.Services.OperacaoService>();
builder.Services.AddScoped<ServicoPro.Api.Application.Services.OperacaoItensService>();
builder.Services.AddScoped<ServicoPro.Api.Application.Services.EstoqueService>();
builder.Services.AddScoped<ServicoPro.Api.Application.Services.OrcamentoItensService>();
builder.Services.AddScoped<ServicoPro.Api.Application.Services.AprovacoesService>();
builder.Services.AddScoped<ServicoPro.Api.Application.Services.ConfiguracoesService>();

// JWT Authentication Configuration
var jwtSecret = builder.Configuration["JwtSettings:Secret"] 
                ?? Environment.GetEnvironmentVariable("SERVICOPRO_JWT_SECRET")
                ?? throw new InvalidOperationException("JWT Secret not configured.");
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "ServicoPro";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "ServicoProApp";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.SerializerOptions.WriteIndented = false;
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost", "http://127.0.0.1")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Seed Database (Somente para o MVP)
try 
{
    ServicoPro.Api.Infrastructure.Data.DatabaseSeeder.SeedAsync(app).Wait();
}
catch (Exception ex)
{
    Console.WriteLine($"Erro ao inicializar o banco: {ex.Message}");
}

app.UseCors();
app.UseAuthentication();
app.UseMiddleware<TenantResolutionMiddleware>();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ok",
    app = "ServicoPro.Api",
    fase = "Refatoracao Clean Architecture + Dapper",
    utc = DateTimeOffset.UtcNow
}));

app.MapAuthEndpoints();
app.MapTenantEndpoints();
app.MapAdminEndpoints();

// Mapeamentos da API (Refatorados para Clean Architecture + Dapper / EF Core)
app.MapCadastrosBaseEndpoints();
app.MapOperacaoEndpoints();
app.MapAgendamentoEndpoints();
app.MapOrcamentoEndpoints();
app.MapComprasEndpoints();
app.MapFinanceiroEndpoints();

app.Run();

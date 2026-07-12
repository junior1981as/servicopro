using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;
using ServicoPro.Api.Application.Interfaces;

namespace ServicoPro.Api.API.Middlewares;

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var tenantContext = context.RequestServices.GetRequiredService<ITenantContext>();
        var user = context.User;

        string? tenantValor = null;

        if (user.Identity?.IsAuthenticated == true)
        {
            tenantValor = user.FindFirst("tenant_id")?.Value
                          ?? user.FindFirst("tenantId")?.Value
                          ?? user.FindFirst("tenant")?.Value;
        }

        if (string.IsNullOrWhiteSpace(tenantValor))
        {
            tenantValor = context.Request.Headers["X-Tenant-Id"].FirstOrDefault();
        }

        if (!string.IsNullOrWhiteSpace(tenantValor))
        {
            var tenantInfo = await ResolverTenantAsync(tenantValor, context);
            if (tenantInfo != null)
            {
                tenantContext.SetarTenant(tenantInfo);
            }
        }

        await _next(context);
    }

    private static async Task<TenantInfo?> ResolverTenantAsync(string valor, HttpContext context)
    {
        var masterDb = context.RequestServices.GetRequiredService<ServicoPro.Api.Infrastructure.Data.MasterDbContext>();
        
        var tenantEntity = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
            masterDb.Tenants,
            t => t.Ativo && (t.Id.ToLower() == valor.ToLower() || 
                             t.Nome.ToLower() == valor.ToLower() || 
                             t.BancoDados.ToLower() == valor.ToLower())
        );

        if (tenantEntity == null) return null;

        var configuration = context.RequestServices.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
        var baseConnString = configuration.GetConnectionString("MasterConnection") 
            ?? System.Environment.GetEnvironmentVariable("SERVICOPRO_MSSQL_CONNECTION_STRING") 
            ?? "";
            
        var tenantConnString = baseConnString.Replace("Database=db_servicopro_mssql", $"Database={tenantEntity.BancoDados}");

        return new TenantInfo(
            tenantEntity.Id, 
            tenantEntity.Nome, 
            tenantEntity.BancoDados, 
            tenantEntity.Ativo, 
            tenantEntity.Id, 
            tenantConnString
        );
    }
}

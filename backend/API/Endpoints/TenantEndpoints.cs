using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ServicoPro.Api.Application.Interfaces;
using ServicoPro.Api.Infrastructure.Data;

namespace ServicoPro.Api.API.Endpoints;

public static class TenantEndpoints
{
    public static void MapTenantEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tenant");

        group.MapGet("/teste", async (ITenantContext tenantContext, ServicoProDbContext dbContext) =>
        {
            var tenant = tenantContext.TenantAtual;
            
            if (tenant == null)
            {
                return Results.BadRequest(new { erro = "Tenant não resolvido." });
            }

            // Apenas para provar que o DbContext foi configurado corretamente para o Tenant atual
            var canConnect = await dbContext.Database.CanConnectAsync();

            return Results.Ok(new
            {
                tenant_id = tenant.Id,
                tenant_nome = tenant.Nome,
                banco_alvo = tenant.Banco,
                db_context_conectado = canConnect
            });
        }).RequireAuthorization();
    }
}

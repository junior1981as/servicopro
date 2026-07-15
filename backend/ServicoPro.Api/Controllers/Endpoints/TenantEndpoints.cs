using System;
using System.Threading.Tasks;
using Dapper;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
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

            var canConnect = await dbContext.Database.CanConnectAsync();

            return Results.Ok(new
            {
                tenant_id = tenant.Id,
                tenant_nome = tenant.Nome,
                banco_alvo = tenant.Banco,
                db_context_conectado = canConnect
            });
        }).RequireAuthorization();

        group.MapGet("/usuarios", async (ITenantContext tenantContext, IConfiguration configuration) =>
        {
            var tenant = tenantContext.TenantAtual;
            if (tenant == null) return Results.Unauthorized();

            var connectionString = GetAdminConnectionString(configuration);
            await using var con = new SqlConnection(connectionString);
            
            var sql = @"
                SELECT u.id as Id, u.nome as Nome, u.email as Email, u.ativo as Ativo, p.nome as Perfil
                FROM usuarios u
                INNER JOIN usuarios_tenants ut ON ut.usuario_id = u.id
                LEFT JOIN usuarios_perfis up ON up.usuario_id = u.id
                LEFT JOIN perfis p ON p.id = up.perfil_id
                WHERE ut.tenant_id = @TenantId
                ORDER BY u.nome";
                
            var lista = await con.QueryAsync(sql, new { TenantId = tenant.Id });
            return Results.Ok(lista);
        }).RequireAuthorization();

        group.MapPost("/usuarios", async ([FromBody] CriarUsuarioRequest req, ITenantContext tenantContext, IConfiguration configuration) =>
        {
            var tenant = tenantContext.TenantAtual;
            if (tenant == null) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Senha))
                return Results.BadRequest(new { erro = "E-mail e senha são obrigatórios." });

            var connectionString = GetAdminConnectionString(configuration);
            await using var con = new SqlConnection(connectionString);
            await con.OpenAsync();
            
            var emailJaExiste = await con.ExecuteScalarAsync<bool>("SELECT CASE WHEN COUNT(1) > 0 THEN 1 ELSE 0 END FROM usuarios WHERE email = @Email", new { Email = req.Email });
            if (emailJaExiste)
                return Results.BadRequest(new { erro = "Já existe um usuário cadastrado com este e-mail no sistema." });

            var userId = "u-" + Guid.NewGuid().ToString("N")[..8];
            var passwordHasher = new PasswordHasher<object>();
            var senhaHash = passwordHasher.HashPassword(null!, req.Senha);

            using var tx = con.BeginTransaction();
            try
            {
                await con.ExecuteAsync(
                    "INSERT INTO usuarios (id, nome, email, senha_hash, ativo) VALUES (@Id, @Nome, @Email, @SenhaHash, 1)",
                    new { Id = userId, Nome = req.Nome, Email = req.Email, SenhaHash = senhaHash }, transaction: tx);

                await con.ExecuteAsync(
                    "INSERT INTO usuarios_tenants (usuario_id, tenant_id, ativo) VALUES (@UserId, @TenantId, 1)",
                    new { UserId = userId, TenantId = tenant.Id }, transaction: tx);

                var perfilId = string.IsNullOrWhiteSpace(req.Perfil) ? "mecanico" : req.Perfil;
                
                await con.ExecuteAsync(
                    "IF NOT EXISTS (SELECT 1 FROM perfis WHERE id = @PerfilId) INSERT INTO perfis (id, nome, ativo) VALUES (@PerfilId, @PerfilId, 1)",
                    new { PerfilId = perfilId }, transaction: tx);
                    
                await con.ExecuteAsync(
                    "INSERT INTO usuarios_perfis (usuario_id, perfil_id, ativo) VALUES (@UserId, @PerfilId, 1)",
                    new { UserId = userId, PerfilId = perfilId }, transaction: tx);

                await tx.CommitAsync();
                
                return Results.Ok(new { mensagem = "Usuário criado com sucesso!" });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return Results.BadRequest(new { erro = "Falha ao criar o usuário", detalhe = ex.Message });
            }
        }).RequireAuthorization();
    }

    public class CriarUsuarioRequest
    {
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Senha { get; set; } = string.Empty;
        public string Perfil { get; set; } = string.Empty;
    }

    private static string GetAdminConnectionString(IConfiguration configuration)
    {
        var env = System.Environment.GetEnvironmentVariable("SERVICOPRO_MSSQL_CONNECTION_STRING");
        if (!string.IsNullOrWhiteSpace(env))
            return env;
        const string caminho = "/opt/servicopro/segredos/servicopro_mssql.env";
        if (System.IO.File.Exists(caminho))
        {
            foreach (var linha in System.IO.File.ReadAllLines(caminho))
            {
                if (linha.StartsWith("SERVICOPRO_MSSQL_CONNECTION_STRING=", StringComparison.Ordinal))
                    return linha["SERVICOPRO_MSSQL_CONNECTION_STRING=".Length..].Trim();
            }
        }
        return configuration.GetConnectionString("MasterConnection") ?? "";
    }
}

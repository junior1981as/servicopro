using System.Threading.Tasks;
using Dapper;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace ServicoPro.Api.API.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/admin");

        group.MapGet("/tenancy/check", CheckTenancyAsync);
        group.MapGet("/auditoria-login", AuditoriaLoginAsync);
        app.MapGet("/api/tenants", TenantsAsync);
    }

    private static async Task<IResult> CheckTenancyAsync(IConfiguration configuration)
    {
        var adminDbPath = "db_servicopro_mssql";
        var connectionString = GetAdminConnectionString(configuration);
        
        await using var con = new SqlConnection(connectionString);
        await con.OpenAsync();

        var qtdEmpresas = await con.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM empresas");
        var qtdTenants = await con.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM tenants");
        var qtdUsuarios = await con.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM usuarios");
        var qtdAuditoria = await con.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM auditoria_login");

        return Results.Ok(new
        {
            status = "ok",
            regra = "tenant resolvido antes de acessar dados",
            isolamento = "um banco por cliente",
            adminDb = adminDbPath,
            tabelas = new
            {
                empresas = qtdEmpresas,
                tenants = qtdTenants,
                usuarios = qtdUsuarios,
                auditoriaLogin = qtdAuditoria
            },
            observacao = "Catálogo administrativo persistente refatorado."
        });
    }

    private static async Task<IResult> AuditoriaLoginAsync(IConfiguration configuration)
    {
        var connectionString = GetAdminConnectionString(configuration);
        await using var con = new SqlConnection(connectionString);
        
        var lista = await con.QueryAsync(@"
            SELECT
                id as Id,
                usuario_id as UsuarioId,
                tenant_id as TenantId,
                email_informado as EmailInformado,
                sucesso as Sucesso,
                motivo as Motivo,
                ip as Ip,
                user_agent as UserAgent,
                criado_em_utc as CriadoEmUtc
            FROM auditoria_login
            ORDER BY criado_em_utc DESC");

        return Results.Ok(lista);
    }

    private static async Task<IResult> TenantsAsync(IConfiguration configuration)
    {
        var connectionString = GetAdminConnectionString(configuration);
        await using var con = new SqlConnection(connectionString);
        
        var lista = await con.QueryAsync(@"
            SELECT
                t.id as Id,
                e.nome_fantasia AS EmpresaNome,
                t.nome as Nome,
                t.banco_dados as Banco,
                t.ativo as Ativo
            FROM tenants t
            INNER JOIN empresas e ON e.id = t.empresa_id
            WHERE t.ativo = 1
            ORDER BY t.nome");

        return Results.Ok(lista);
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
                if (linha.StartsWith("SERVICOPRO_MSSQL_CONNECTION_STRING=", System.StringComparison.Ordinal))
                    return linha["SERVICOPRO_MSSQL_CONNECTION_STRING=".Length..].Trim();
            }
        }

        return configuration.GetConnectionString("DefaultConnection") ?? "";
    }
}

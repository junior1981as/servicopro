using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Dapper;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using ServicoPro.Api.Application.Interfaces;
using ServicoPro.Api.Infrastructure.Security;

namespace ServicoPro.Api.API.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/login", LoginAsync);
        group.MapGet("/me", MeAsync).RequireAuthorization();
    }

    private static async Task<IResult> LoginAsync(
        [FromBody] LoginRequest request, 
        HttpContext http,
        IJwtService jwtService,
        IConfiguration configuration)
    {
        var email = (request.Usuario ?? request.Email ?? string.Empty).Trim().ToLowerInvariant();
        var senha = request.Senha ?? string.Empty;
        var tenantId = (request.TenantId ?? request.Tenant ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(senha))
            return Results.BadRequest(new ApiErro("LOGIN_INVALIDO", "Informe usuário e senha."));

        if (string.IsNullOrWhiteSpace(tenantId))
            return Results.BadRequest(new ApiErro("TENANT_OBRIGATORIO", "Informe a empresa/tenant para acessar."));

        var adminConnectionString = GetAdminConnectionString(configuration);
        await using var con = new SqlConnection(adminConnectionString);
        await con.OpenAsync();

        var usuario = await con.QuerySingleOrDefaultAsync<UsuarioInfo>(
            "SELECT id, nome, email, senha_hash as SenhaHash, ativo FROM usuarios WHERE lower(email) = @email",
            new { email });

        if (usuario is null || !usuario.Ativo)
        {
            await RegistrarAuditoriaLogin(con, null, tenantId, email, false, "USUARIO_INVALIDO", http);
            return Results.Unauthorized();
        }

        var tenant = await con.QuerySingleOrDefaultAsync<TenantInfo>(@"
            SELECT t.id, t.nome, t.banco_dados as Banco, t.ativo, t.id as Chave, '' as CaminhoBanco
            FROM tenants t
            INNER JOIN usuarios_tenants ut ON ut.tenant_id = t.id
            WHERE ut.usuario_id = @UsuarioId AND t.id = @TenantId AND ut.ativo = 1",
            new { UsuarioId = usuario.Id, TenantId = tenantId });

        if (tenant is null || !tenant.Ativo)
        {
            await RegistrarAuditoriaLogin(con, usuario.Id, tenantId, email, false, "TENANT_INVALIDO", http);
            return Results.Forbid();
        }

        if (!VerificarSenha(senha, usuario.SenhaHash))
        {
            await RegistrarAuditoriaLogin(con, usuario.Id, tenant.Id, email, false, "SENHA_INVALIDA", http);
            return Results.Unauthorized();
        }

        var perfis = await con.QueryAsync<string>(@"
            SELECT p.nome
            FROM perfis p
            INNER JOIN usuarios_perfis up ON up.perfil_id = p.id
            WHERE up.usuario_id = @UsuarioId AND up.ativo = 1 AND p.ativo = 1",
            new { UsuarioId = usuario.Id });

        var expiraEm = DateTimeOffset.UtcNow.AddHours(8);
        var token = jwtService.CriarToken(usuario.Id, usuario.Nome, usuario.Email, tenant.Id, tenant.Nome, tenant.Banco, perfis.AsList().ToArray(), expiraEm);

        await RegistrarAuditoriaLogin(con, usuario.Id, tenant.Id, email, true, "OK", http);

        return Results.Ok(new LoginResponse(
            Status: "ok",
            AccessToken: token,
            TokenType: "Bearer",
            ExpiresAtUtc: expiraEm,
            Usuario: new UsuarioSessao(usuario.Id, usuario.Nome, usuario.Email, perfis.AsList().ToArray()),
            Tenant: tenant
        ));
    }

    private static IResult MeAsync(HttpContext http)
    {
        var user = http.User;
        return Results.Ok(new
        {
            sub = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
            nome = user.FindFirst("nome")?.Value,
            email = user.FindFirst("email")?.Value,
            tenant_id = user.FindFirst("tenant_id")?.Value,
            tenant_nome = user.FindFirst("tenant_nome")?.Value,
            roles = user.FindAll(System.Security.Claims.ClaimTypes.Role).Select(c => c.Value)
        });
    }

    private static async Task RegistrarAuditoriaLogin(SqlConnection con, string? usuarioId, string? tenantId, string email, bool sucesso, string motivo, HttpContext http)
    {
        var ip = http.Connection.RemoteIpAddress?.ToString();
        var userAgent = http.Request.Headers.UserAgent.ToString();

        await con.ExecuteAsync(@"
            INSERT INTO auditoria_login (id, usuario_id, tenant_id, email_informado, sucesso, motivo, ip, user_agent, criado_em_utc)
            VALUES (@Id, @UsuarioId, @TenantId, @Email, @Sucesso, @Motivo, @Ip, @UserAgent, @CriadoEm)",
            new
            {
                Id = Guid.NewGuid().ToString("N"),
                UsuarioId = usuarioId,
                TenantId = tenantId,
                Email = email,
                Sucesso = sucesso ? 1 : 0,
                Motivo = motivo,
                Ip = ip,
                UserAgent = userAgent,
                CriadoEm = DateTimeOffset.UtcNow.ToString("O")
            });
    }

    private static readonly Microsoft.AspNetCore.Identity.PasswordHasher<object> _passwordHasher = new();

    private static string HashPassword(string senha)
    {
        return _passwordHasher.HashPassword(null!, senha);
    }

    private static bool VerificarSenha(string senha, string hash)
    {
        // Se a senha estiver armazenada no formato antigo (SHA-256 hex longo sem salt),
        // precisaríamos verificar e re-hashear, mas para simplificar vamos apenas usar o verificador.
        // O PasswordHasher do Identity entende versões V2 (PBKDF2) e V3 (PBKDF2 SHA512).
        // Se a hash não contiver as características do Identity (começa com AQAAAA...), vai falhar.
        // Como o seeder vai ser atualizado, assumimos que as senhas virão do PasswordHasher.
        
        var result = _passwordHasher.VerifyHashedPassword(null!, hash, senha);
        if (result == Microsoft.AspNetCore.Identity.PasswordVerificationResult.Success || 
            result == Microsoft.AspNetCore.Identity.PasswordVerificationResult.SuccessRehashNeeded)
        {
            return true;
        }
        
        // Fallback for MVP original users that might still use SHA256 without salt (for transition only)
        var shaBytes = SHA256.HashData(Encoding.UTF8.GetBytes(senha));
        var shaHex = Convert.ToHexString(shaBytes);
        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(shaHex), Encoding.UTF8.GetBytes(hash));
    }

    private static string GetAdminConnectionString(IConfiguration configuration)
    {
        var env = Environment.GetEnvironmentVariable("SERVICOPRO_MSSQL_CONNECTION_STRING");
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

public record LoginRequest(string? Usuario, string? Email, string? Senha, string? TenantId, string? Tenant);
public record LoginResponse(string Status, string AccessToken, string TokenType, DateTimeOffset ExpiresAtUtc, UsuarioSessao Usuario, TenantInfo Tenant);
public record UsuarioSessao(string Id, string Nome, string Email, string[] Papeis);
public record ApiErro(string Codigo, string Mensagem);
public record UsuarioInfo(string Id, string Nome, string Email, string SenhaHash, bool Ativo);

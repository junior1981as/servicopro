using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace ServicoPro.Api.Infrastructure.Security;

public interface IJwtService
{
    string CriarToken(string usuarioId, string nome, string email, string tenantId, string tenantNome, string tenantBanco, string[] perfis, DateTimeOffset expiraEm);
}

public class JwtService : IJwtService
{
    private readonly string _secret;
    private readonly string _issuer;
    private readonly string _audience;

    public JwtService(IConfiguration configuration)
    {
        _secret = configuration["JwtSettings:Secret"] ?? "servicopro-dev-secret-altere-em-producao-2026";
        _issuer = configuration["JwtSettings:Issuer"] ?? "ServicoPro";
        _audience = configuration["JwtSettings:Audience"] ?? "ServicoProApp";
    }

    public string CriarToken(string usuarioId, string nome, string email, string tenantId, string tenantNome, string tenantBanco, string[] perfis, DateTimeOffset expiraEm)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, usuarioId),
            new Claim("nome", nome),
            new Claim("email", email),
            new Claim("tenant_id", tenantId),
            new Claim("tenant_nome", tenantNome),
            new Claim("tenant_banco", tenantBanco),
        };

        foreach (var perfil in perfis)
        {
            claims.Add(new Claim(ClaimTypes.Role, perfil));
            claims.Add(new Claim("roles", perfil));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: expiraEm.UtcDateTime,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

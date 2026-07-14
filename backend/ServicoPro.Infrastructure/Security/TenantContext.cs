using System;
using System.IO;
using Microsoft.Extensions.Configuration;
using ServicoPro.Api.Application.Interfaces;

namespace ServicoPro.Api.Infrastructure.Security;

public class TenantContext : ITenantContext
{
    private readonly IConfiguration _configuration;
    private TenantInfo? _tenantAtual;

    public TenantContext(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public TenantInfo? TenantAtual => _tenantAtual;

    public void SetarTenant(TenantInfo tenant)
    {
        _tenantAtual = tenant;
    }

    public string ObterConnectionString()
    {
        if (_tenantAtual != null && !string.IsNullOrWhiteSpace(_tenantAtual.CaminhoBanco))
        {
            return _tenantAtual.CaminhoBanco;
        }

        // Fallback para master db (usado apenas na inicialização/login)
        var env = Environment.GetEnvironmentVariable("SERVICOPRO_MSSQL_CONNECTION_STRING");
        if (!string.IsNullOrWhiteSpace(env))
            return env;

        const string caminho = "/opt/servicopro/segredos/servicopro_mssql.env";
        if (File.Exists(caminho))
        {
            foreach (var linha in File.ReadAllLines(caminho))
            {
                if (linha.StartsWith("SERVICOPRO_MSSQL_CONNECTION_STRING=", StringComparison.Ordinal))
                    return linha["SERVICOPRO_MSSQL_CONNECTION_STRING=".Length..].Trim();
            }
        }

        return _configuration.GetConnectionString("MasterConnection") 
               ?? throw new InvalidOperationException("Connection string não configurada.");
    }
}

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Data.SqlClient;
using ServicoPro.Api.Application.Interfaces;

namespace ServicoPro.Api.Application.Services;

public class ConfiguracoesService
{
    private readonly ITenantContext _tenantContext;

    public ConfiguracoesService(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    private SqlConnection GetConnection() => new(_tenantContext.ObterConnectionString());

    public async Task<dynamic?> ObterEmpresaAsync()
    {
        await using var conexao = GetConnection();
        return await conexao.QuerySingleOrDefaultAsync<dynamic>("SELECT TOP 1 * FROM configuracoes_empresa;");
    }

    public async Task<bool> SalvarEmpresaAsync(Dictionary<string, object?> dict)
    {
        await using var conexao = GetConnection();
        await conexao.OpenAsync();
        using var transacao = await conexao.BeginTransactionAsync();

        var agora = DateTimeOffset.UtcNow.ToString("O");
        dict["atualizado_em"] = agora;

        var idAtual = await conexao.ExecuteScalarAsync<long?>("SELECT TOP 1 id FROM configuracoes_empresa;", null, transacao);

        if (idAtual.HasValue)
        {
            var atribuicoes = new List<string>();
            foreach (var k in dict.Keys) if (k != "id") atribuicoes.Add($"{k} = @{k}");
            
            var param = new DynamicParameters(dict);
            param.Add("idAtual", idAtual.Value);

            await conexao.ExecuteAsync(
                $"UPDATE configuracoes_empresa SET {string.Join(", ", atribuicoes)} WHERE id = @idAtual;",
                param, transacao);
        }
        else
        {
            dict["criado_em"] = agora;
            var campos = new List<string>(dict.Keys);
            var parametros = new List<string>(campos.Count);
            foreach (var c in campos) parametros.Add("@" + c);
            
            await conexao.ExecuteAsync(
                $"INSERT INTO configuracoes_empresa ({string.Join(", ", campos)}) VALUES ({string.Join(", ", parametros)});",
                new DynamicParameters(dict), transacao);
        }

        await transacao.CommitAsync();
        return true;
    }
}

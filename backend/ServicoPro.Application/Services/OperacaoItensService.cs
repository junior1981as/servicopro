using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Data.SqlClient;
using ServicoPro.Api.Application.Interfaces;

namespace ServicoPro.Api.Application.Services;

public class OperacaoItensService
{
    private readonly ITenantContext _tenantContext;

    public OperacaoItensService(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    private SqlConnection GetConnection()
    {
        return new SqlConnection(_tenantContext.ObterConnectionString());
    }

    private static readonly HashSet<string> TabelasPermitidas = new(StringComparer.OrdinalIgnoreCase)
    {
        "ordens_servico_itens_servicos",
        "ordens_servico_itens_produtos",
        "orcamentos_itens"
    };

    private void ValidarTabela(string tabela)
    {
        if (!TabelasPermitidas.Contains(tabela))
            throw new ArgumentException($"Tabela não permitida: {tabela}");
    }

    public async Task<IEnumerable<dynamic>> ListarAsync(string tabela)
    {
        ValidarTabela(tabela);
        await using var conexao = GetConnection();
        var sql = $"SELECT * FROM {tabela} ORDER BY id DESC;";
        return await conexao.QueryAsync<dynamic>(sql);
    }

    public async Task<long> InserirGenericoAsync(string tabela, Dictionary<string, object?> dicionario)
    {
        ValidarTabela(tabela);
        var agora = DateTimeOffset.UtcNow.ToString("O");
        dicionario["criado_em"] = agora;
        dicionario["atualizado_em"] = agora;

        await using var conexao = GetConnection();
        await conexao.OpenAsync();

        var isIdentity = await conexao.ExecuteScalarAsync<bool>(@"
            SELECT c.is_identity
            FROM sys.columns c
            JOIN sys.tables t ON t.object_id = c.object_id
            WHERE t.name = @tabela AND c.name = 'id';", new { tabela });

        if (!isIdentity && !dicionario.ContainsKey("id"))
        {
            var proximoId = await conexao.ExecuteScalarAsync<long>($"SELECT ISNULL(MAX(id), 0) + 1 FROM {tabela} WITH (UPDLOCK, HOLDLOCK);");
            dicionario["id"] = proximoId;
        }

        var campos = dicionario.Keys.ToList();
        var parametrosNomes = campos.Select(c => "@" + c).ToList();

        var sql = $@"
INSERT INTO {tabela} ({string.Join(", ", campos)})
OUTPUT INSERTED.id
VALUES ({string.Join(", ", parametrosNomes)});";

        var idInserido = await conexao.ExecuteScalarAsync<long>(sql, new DynamicParameters(dicionario));

        if (dicionario.TryGetValue("ordem_servico_id", out var osIdObj) && osIdObj != null)
        {
            var osId = Convert.ToInt64(osIdObj);
            if (osId > 0)
                await RecalcularTotaisOrdemServicoAsync(conexao, null, osId);
        }

        return idInserido;
    }

    public async Task<bool> ExcluirItemAsync(string tabela, long id)
    {
        ValidarTabela(tabela);
        await using var conexao = GetConnection();
        await conexao.OpenAsync();
        using var transacao = await conexao.BeginTransactionAsync();

        var item = await conexao.QuerySingleOrDefaultAsync<dynamic>($"SELECT * FROM {tabela} WHERE id = @id AND ativo = 1;", new { id }, transacao);
        if (item == null) return false;

        var osId = (long)item.ordem_servico_id;
        var os = await conexao.QuerySingleOrDefaultAsync<dynamic>("SELECT status FROM ordens_servico WHERE id = @osId AND ativo = 1", new { osId }, transacao);
        
        if (os == null || !string.Equals((os.status ?? "").Trim(), "Aberta", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("OS_NAO_ABERTA");

        var linhas = await conexao.ExecuteAsync($"UPDATE {tabela} SET ativo = 0, atualizado_em = @agora WHERE id = @id;", new { agora = DateTimeOffset.UtcNow.ToString("O"), id }, transacao);
        
        if (linhas > 0)
        {
            await RecalcularTotaisOrdemServicoAsync(conexao, transacao, osId);
            await transacao.CommitAsync();
            return true;
        }

        await transacao.RollbackAsync();
        return false;
    }

    private async Task RecalcularTotaisOrdemServicoAsync(SqlConnection conexao, System.Data.Common.DbTransaction? transacao, long ordemServicoId)
    {
        var valServicos = await conexao.ExecuteScalarAsync<decimal>(@"
            SELECT COALESCE(SUM(valor_liquido), 0)
            FROM ordens_servico_itens_servicos
            WHERE ordem_servico_id = @id AND ativo = 1;", new { id = ordemServicoId }, (SqlTransaction?)transacao);

        var valProdutos = await conexao.ExecuteScalarAsync<decimal>(@"
            SELECT COALESCE(SUM(valor_liquido), 0)
            FROM ordens_servico_itens_produtos
            WHERE ordem_servico_id = @id AND ativo = 1;", new { id = ordemServicoId }, (SqlTransaction?)transacao);

        var osExistente = await conexao.QuerySingleOrDefaultAsync<dynamic>(@"
            SELECT valor_desconto
            FROM ordens_servico
            WHERE id = @id AND ativo = 1;", new { id = ordemServicoId }, (SqlTransaction?)transacao);

        if (osExistente != null)
        {
            decimal descontoAnterior = osExistente.valor_desconto ?? 0m;
            decimal totalLiquido = (valServicos + valProdutos) - descontoAnterior;
            if (totalLiquido < 0) totalLiquido = 0;

            await conexao.ExecuteAsync(@"
                UPDATE ordens_servico
                   SET valor_servicos = @valServicos,
                       valor_produtos = @valProdutos,
                       valor_total = @totalLiquido,
                       atualizado_em = @agora
                 WHERE id = @id;",
                 new { valServicos, valProdutos, totalLiquido, agora = DateTimeOffset.UtcNow.ToString("O"), id = ordemServicoId }, (SqlTransaction?)transacao);
        }
    }
}

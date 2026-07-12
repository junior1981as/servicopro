using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Data.SqlClient;
using ServicoPro.Api.Application.Interfaces;

namespace ServicoPro.Api.Application.Services;

public class OrcamentoItensService
{
    private readonly ITenantContext _tenantContext;

    public OrcamentoItensService(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    private SqlConnection GetConnection() => new(_tenantContext.ObterConnectionString());

    public async Task<IEnumerable<dynamic>> ListarAsync(string tabela)
    {
        await using var conexao = GetConnection();
        return await conexao.QueryAsync<dynamic>($"SELECT * FROM {tabela} WHERE ativo = 1 ORDER BY id DESC;");
    }

    public async Task<long> InserirItemAsync(string tabela, Dictionary<string, object?> dict)
    {
        CalcularValoresDesconto(dict);

        var agora = DateTimeOffset.UtcNow.ToString("O");
        dict["ativo"] = 1;
        dict["criado_em"] = agora;
        dict["atualizado_em"] = agora;

        await using var conexao = GetConnection();
        await conexao.OpenAsync();
        using var transacao = await conexao.BeginTransactionAsync();

        var orcamentoId = Convert.ToInt64(dict.GetValueOrDefault("orcamento_id") ?? 0);
        var existeOrcamento = await conexao.ExecuteScalarAsync<bool>(
            "SELECT CAST(CASE WHEN COUNT(1) > 0 THEN 1 ELSE 0 END AS BIT) FROM orcamentos WHERE id = @id AND ativo = 1;",
            new { id = orcamentoId }, transacao);

        if (!existeOrcamento) throw new InvalidOperationException("ORCAMENTO_NAO_ENCONTRADO");

        var isIdentity = await conexao.ExecuteScalarAsync<bool>(@"
            SELECT c.is_identity
            FROM sys.columns c
            JOIN sys.tables t ON t.object_id = c.object_id
            WHERE t.name = @tabela AND c.name = 'id';", new { tabela }, transacao);

        if (!isIdentity && !dict.ContainsKey("id"))
        {
            var proximoId = await conexao.ExecuteScalarAsync<long>($"SELECT ISNULL(MAX(id), 0) + 1 FROM {tabela} WITH (UPDLOCK, HOLDLOCK);", null, transacao);
            dict["id"] = proximoId;
        }

        var campos = dict.Keys.ToList();
        var parametrosNomes = campos.Select(c => "@" + c).ToList();

        var sql = $@"
INSERT INTO {tabela} ({string.Join(", ", campos)})
OUTPUT INSERTED.id
VALUES ({string.Join(", ", parametrosNomes)});";

        var idInserido = await conexao.ExecuteScalarAsync<long>(sql, new DynamicParameters(dict), transacao);

        await RecalcularOrcamentoInternoAsync(conexao, (SqlTransaction)transacao, orcamentoId);

        await transacao.CommitAsync();

        return idInserido;
    }

    public async Task<bool> ExcluirItemAsync(string tabela, long id)
    {
        await using var conexao = GetConnection();
        await conexao.OpenAsync();
        using var transacao = await conexao.BeginTransactionAsync();

        var item = await conexao.QuerySingleOrDefaultAsync<dynamic>($"SELECT orcamento_id FROM {tabela} WHERE id = @id AND ativo = 1;", new { id }, transacao);
        if (item == null) return false;

        var orcamentoId = (long)item.orcamento_id;
        
        var linhas = await conexao.ExecuteAsync($"UPDATE {tabela} SET ativo = 0, atualizado_em = @agora WHERE id = @id;", new { agora = DateTimeOffset.UtcNow.ToString("O"), id }, transacao);
        
        if (linhas > 0)
        {
            await RecalcularOrcamentoInternoAsync(conexao, (SqlTransaction)transacao, orcamentoId);
            await transacao.CommitAsync();
            return true;
        }

        await transacao.RollbackAsync();
        return false;
    }

    public async Task RecalcularOrcamentoAsync(long orcamentoId)
    {
        await using var conexao = GetConnection();
        await conexao.OpenAsync();
        using var transacao = await conexao.BeginTransactionAsync();

        var orcamento = await conexao.QuerySingleOrDefaultAsync<dynamic>("SELECT status FROM orcamentos WHERE id = @id AND ativo = 1;", new { id = orcamentoId }, transacao);
        if (orcamento == null) throw new InvalidOperationException("ORCAMENTO_NAO_ENCONTRADO");

        string status = (orcamento.status ?? "").Trim();
        if (status.Contains("Aprovado", StringComparison.OrdinalIgnoreCase) || status.Contains("Cancelado", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("ORCAMENTO_FINALIZADO");

        await RecalcularOrcamentoInternoAsync(conexao, (SqlTransaction)transacao, orcamentoId);
        await transacao.CommitAsync();
    }

    private async Task RecalcularOrcamentoInternoAsync(SqlConnection conexao, SqlTransaction transacao, long orcamentoId)
    {
        var servicos = await conexao.QuerySingleOrDefaultAsync<dynamic>(@"
            SELECT COALESCE(SUM(valor_total), 0) as vTotal, COALESCE(SUM(desconto_valor), 0) as vDesc
            FROM orcamentos_itens_servicos WHERE orcamento_id = @id AND ativo = 1;", new { id = orcamentoId }, transacao);
        
        var produtos = await conexao.QuerySingleOrDefaultAsync<dynamic>(@"
            SELECT COALESCE(SUM(valor_total), 0) as vTotal, COALESCE(SUM(desconto_valor), 0) as vDesc
            FROM orcamentos_itens_produtos WHERE orcamento_id = @id AND ativo = 1;", new { id = orcamentoId }, transacao);

        decimal valServicos = servicos?.vTotal ?? 0m;
        decimal descServicos = servicos?.vDesc ?? 0m;
        
        decimal valProdutos = produtos?.vTotal ?? 0m;
        decimal descProdutos = produtos?.vDesc ?? 0m;

        decimal valorTotalBruto = valServicos + valProdutos;
        decimal descontoTotal = descServicos + descProdutos;
        decimal valorLiquido = valorTotalBruto - descontoTotal;
        if (valorLiquido < 0) valorLiquido = 0;

        await conexao.ExecuteAsync(@"
            UPDATE orcamentos
               SET valor_servicos = @valServicos,
                   valor_produtos = @valProdutos,
                   valor_desconto = @descontoTotal,
                   valor_total = @valorLiquido,
                   atualizado_em = @agora
             WHERE id = @id;",
             new { valServicos, valProdutos, descontoTotal, valorLiquido, agora = DateTimeOffset.UtcNow.ToString("O"), id = orcamentoId }, transacao);
    }

    private void CalcularValoresDesconto(Dictionary<string, object?> dict)
    {
        var quantidade = Convert.ToDecimal(dict.GetValueOrDefault("quantidade") ?? 1m);
        var valorUnitario = Convert.ToDecimal(dict.GetValueOrDefault("valor_unitario") ?? 0m);
        var valorTotal = Convert.ToDecimal(dict.GetValueOrDefault("valor_total") ?? 0m);
        var descontoPercentual = Convert.ToDecimal(dict.GetValueOrDefault("desconto_percentual") ?? 0m);
        var descontoValor = Convert.ToDecimal(dict.GetValueOrDefault("desconto_valor") ?? 0m);

        if (quantidade <= 0) quantidade = 1;
        if (valorTotal <= 0 && valorUnitario > 0) valorTotal = quantidade * valorUnitario;
        if (valorTotal < 0) valorTotal = 0;

        if (descontoPercentual < 0) descontoPercentual = 0;
        if (descontoPercentual > 100) descontoPercentual = 100;
        if (descontoValor < 0) descontoValor = 0;

        if (descontoPercentual > 0 && descontoValor <= 0)
            descontoValor = Math.Round(valorTotal * (descontoPercentual / 100m), 4);
        
        if (descontoValor > valorTotal) descontoValor = valorTotal;

        if (descontoValor > 0 && descontoPercentual <= 0 && valorTotal > 0)
            descontoPercentual = Math.Round((descontoValor / valorTotal) * 100m, 4);

        var valorLiquido = valorTotal - descontoValor;
        if (valorLiquido < 0) valorLiquido = 0;

        dict["quantidade"] = quantidade;
        dict["valor_unitario"] = valorUnitario;
        dict["valor_total"] = valorTotal;
        dict["desconto_percentual"] = descontoPercentual;
        dict["desconto_valor"] = descontoValor;
        dict["valor_liquido"] = valorLiquido;
    }
}

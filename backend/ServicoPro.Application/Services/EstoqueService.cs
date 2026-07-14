using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Data.SqlClient;
using ServicoPro.Api.Application.Interfaces;

namespace ServicoPro.Api.Application.Services;

public class EstoqueService
{
    private readonly ITenantContext _tenantContext;

    public EstoqueService(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    private SqlConnection GetConnection() => new(_tenantContext.ObterConnectionString());

    public async Task<IEnumerable<dynamic>> ListarRequisicoesAsync()
    {
        await using var conexao = GetConnection();
        return await conexao.QueryAsync<dynamic>("SELECT * FROM requisicoes_estoque ORDER BY id DESC;");
    }

    public async Task<IEnumerable<dynamic>> ListarMovimentacoesAsync()
    {
        await using var conexao = GetConnection();
        return await conexao.QueryAsync<dynamic>("SELECT * FROM movimentacoes_estoque ORDER BY id DESC;");
    }

    public async Task<object> InserirRequisicaoComBaixaAsync(Dictionary<string, object?> dict)
    {
        var ordemServicoId = Convert.ToInt64(dict.GetValueOrDefault("ordem_servico_id") ?? 0);
        var produtoId = Convert.ToInt64(dict.GetValueOrDefault("produto_id") ?? 0);
        var quantidadeSolicitada = Convert.ToDecimal(dict.GetValueOrDefault("quantidade_solicitada") ?? 0m);
        var observacao = dict.GetValueOrDefault("observacao")?.ToString() ?? "Baixa imediata por requisicao de estoque da OS.";

        if (ordemServicoId <= 0) throw new ArgumentException("ORDEM_SERVICO_OBRIGATORIA");
        if (produtoId <= 0) throw new ArgumentException("PRODUTO_OBRIGATORIO");
        if (quantidadeSolicitada <= 0) throw new ArgumentException("QUANTIDADE_INVALIDA");

        await using var conexao = GetConnection();
        await conexao.OpenAsync();
        using var transacao = await conexao.BeginTransactionAsync();

        var produto = await conexao.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT id, nome, estoque_atual FROM produtos WITH (UPDLOCK, HOLDLOCK) WHERE id = @produtoId AND ativo = 1;",
            new { produtoId }, transacao);

        if (produto == null)
            throw new InvalidOperationException("PRODUTO_NAO_ENCONTRADO");

        decimal estoqueAnterior = produto.estoque_atual ?? 0m;
        if (estoqueAnterior < quantidadeSolicitada)
            throw new InvalidOperationException("ESTOQUE_INSUFICIENTE");

        decimal estoqueNovo = estoqueAnterior - quantidadeSolicitada;
        var agora = DateTimeOffset.UtcNow.ToString("O");

        var requisicaoId = await conexao.ExecuteScalarAsync<long>(@"
            INSERT INTO requisicoes_estoque (ordem_servico_id, produto_id, quantidade_solicitada, quantidade_baixada, status, observacao, ativo, criado_em, atualizado_em)
            OUTPUT INSERTED.id
            VALUES (@ordemServicoId, @produtoId, @quantidadeSolicitada, @quantidadeSolicitada, 'Baixada', @observacao, 1, @agora, @agora);",
            new { ordemServicoId, produtoId, quantidadeSolicitada, observacao, agora }, transacao);

        await conexao.ExecuteAsync(@"
            UPDATE produtos SET estoque_atual = @estoqueNovo, atualizado_em = @agora WHERE id = @produtoId;",
            new { estoqueNovo, agora, produtoId }, transacao);

        await conexao.ExecuteAsync(@"
            INSERT INTO movimentacoes_estoque (produto_id, ordem_servico_id, requisicao_estoque_id, tipo, quantidade, estoque_anterior, estoque_posterior, origem, observacao, criado_em)
            VALUES (@produtoId, @ordemServicoId, @requisicaoId, 'SAIDA_OS', @quantidadeSolicitada, @estoqueAnterior, @estoqueNovo, 'REQUISICAO_OS', @observacao, @agora);",
            new { produtoId, ordemServicoId, requisicaoId, quantidadeSolicitada, estoqueAnterior, estoqueNovo, observacao, agora }, transacao);

        await transacao.CommitAsync();

        return new
        {
            id = requisicaoId,
            produtoId,
            produto = produto.nome,
            quantidadeBaixada = quantidadeSolicitada,
            estoqueAnterior,
            estoquePosterior = estoqueNovo
        };
    }
}

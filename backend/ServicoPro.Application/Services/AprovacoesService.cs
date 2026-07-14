using System;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Data.SqlClient;
using ServicoPro.Api.Application.Interfaces;

namespace ServicoPro.Api.Application.Services;

public class AprovacoesService
{
    private readonly ITenantContext _tenantContext;

    public AprovacoesService(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    private SqlConnection GetConnection() => new(_tenantContext.ObterConnectionString());

    public async Task<bool> AlterarStatusOrcamentoAsync(long id, string novoStatus)
    {
        await using var conexao = GetConnection();
        await conexao.OpenAsync();
        using var transacao = await conexao.BeginTransactionAsync();

        var orcamento = await conexao.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT status FROM orcamentos WITH (UPDLOCK, HOLDLOCK) WHERE id = @id AND ativo = 1;",
            new { id }, transacao);

        if (orcamento == null) throw new InvalidOperationException("ORCAMENTO_NAO_ENCONTRADO");

        string statusAtual = (orcamento.status ?? "").Trim();
        if (string.Equals(statusAtual, novoStatus, StringComparison.OrdinalIgnoreCase))
            return true;

        if (novoStatus == "Aprovado" && (statusAtual == "Aprovado" || statusAtual == "Cancelado"))
            throw new InvalidOperationException("ORCAMENTO_FINALIZADO");

        var linhas = await conexao.ExecuteAsync(
            "UPDATE orcamentos SET status = @novoStatus, data_aprovacao = @agora, atualizado_em = @agora WHERE id = @id;",
            new { novoStatus, agora = DateTimeOffset.UtcNow.ToString("O"), id }, transacao);

        if (linhas > 0)
        {
            await transacao.CommitAsync();
            return true;
        }

        await transacao.RollbackAsync();
        return false;
    }

    public async Task<bool> AprovarOrdemServicoAsync(long id)
    {
        await using var conexao = GetConnection();
        await conexao.OpenAsync();
        using var transacao = await conexao.BeginTransactionAsync();

        var os = await conexao.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT status FROM ordens_servico WITH (UPDLOCK, HOLDLOCK) WHERE id = @id AND ativo = 1;",
            new { id }, transacao);

        if (os == null) throw new InvalidOperationException("OS_NAO_ENCONTRADA");

        string statusAtual = (os.status ?? "").Trim();
        if (statusAtual != "Aberta")
            throw new InvalidOperationException("OS_NAO_ABERTA");

        var linhas = await conexao.ExecuteAsync(
            "UPDATE ordens_servico SET status = 'Aprovada', atualizado_em = @agora WHERE id = @id;",
            new { agora = DateTimeOffset.UtcNow.ToString("O"), id }, transacao);

        if (linhas > 0)
        {
            await transacao.CommitAsync();
            return true;
        }

        await transacao.RollbackAsync();
        return false;
    }
}

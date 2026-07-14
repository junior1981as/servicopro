using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Data.SqlClient;
using ServicoPro.Api.Application.Interfaces;

namespace ServicoPro.Api.Application.Services;

public class OperacaoService
{
    private readonly ITenantContext _tenantContext;

    public OperacaoService(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    private SqlConnection GetConnection()
    {
        return new SqlConnection(_tenantContext.ObterConnectionString());
    }

    public async Task GarantirSchemaAsync()
    {
        await using var conexao = GetConnection();
        await conexao.OpenAsync();

        await conexao.ExecuteAsync(@"
IF COL_LENGTH('orcamentos', 'data_aprovacao') IS NULL
BEGIN
    ALTER TABLE orcamentos ADD data_aprovacao NVARCHAR(40) NULL;
END;
IF COL_LENGTH('ordens_servico', 'km_abertura') IS NULL
BEGIN
    ALTER TABLE ordens_servico ADD km_abertura DECIMAL(18,2) NULL;
END;
IF COL_LENGTH('ordens_servico', 'data_abertura') IS NULL
BEGIN
    ALTER TABLE ordens_servico ADD data_abertura NVARCHAR(40) NULL;
END;
IF COL_LENGTH('ordens_servico', 'data_encerramento') IS NULL
BEGIN
    ALTER TABLE ordens_servico ADD data_encerramento NVARCHAR(40) NULL;
END;
IF COL_LENGTH('ordens_servico', 'data_abertura') IS NOT NULL
BEGIN
    EXEC sp_executesql N'UPDATE ordens_servico
                            SET data_abertura = COALESCE(NULLIF(data_abertura, ''''), CONVERT(NVARCHAR(40), criado_em, 126))
                          WHERE data_abertura IS NULL
                             OR data_abertura = ''''';
END;
");
    }

    public async Task<IEnumerable<dynamic>> ListarAsync(string tabela)
    {
        await GarantirSchemaAsync();
        await using var conexao = GetConnection();
        // Permite listagem limpa de tabelas pré-definidas
        var sql = $"SELECT * FROM {tabela} ORDER BY id DESC;";
        return await conexao.QueryAsync<dynamic>(sql);
    }

    public async Task<long> InserirAsync(string tabela, Dictionary<string, object?> dicionario)
    {
        var agora = DateTimeOffset.UtcNow.ToString("O");
        dicionario["criado_em"] = agora;
        dicionario["atualizado_em"] = agora;

        await using var conexao = GetConnection();
        await conexao.OpenAsync();
        
        if (tabela == "orcamentos" && (!dicionario.TryGetValue("numero", out var numeroAtual) || string.IsNullOrWhiteSpace(numeroAtual?.ToString())))
        {
            var numeroGerado = await conexao.ExecuteScalarAsync<long>(@"
                SELECT ISNULL(MAX(TRY_CONVERT(INT, REPLACE(numero, 'ORC-', ''))), 0) + 1
                FROM orcamentos WITH (UPDLOCK, HOLDLOCK)
                WHERE numero LIKE 'ORC-%';");
            dicionario["numero"] = $"ORC-{numeroGerado:0000}";
        }

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

        return await conexao.ExecuteScalarAsync<long>(sql, new DynamicParameters(dicionario));
    }

    public async Task<bool> AtualizarAsync(string tabela, long id, Dictionary<string, object?> dicionario)
    {
        var agora = DateTimeOffset.UtcNow.ToString("O");
        dicionario["atualizado_em"] = agora;
        dicionario["id"] = id;

        await GarantirSchemaAsync();
        await using var conexao = GetConnection();
        
        var atribuicoes = dicionario.Keys.Where(k => k != "id").Select(k => $"{k} = @{k}").ToList();

        var sql = $@"
UPDATE {tabela}
   SET {string.Join(", ", atribuicoes)}
OUTPUT INSERTED.id
 WHERE id = @id;";

        var idAtualizado = await conexao.ExecuteScalarAsync<long?>(sql, new DynamicParameters(dicionario));
        return idAtualizado.HasValue;
    }

    public async Task<object> GerarOrdemServicoDoOrcamentoAsync(long orcamentoId)
    {
        await GarantirSchemaAsync();
        await using var conexao = GetConnection();
        await conexao.OpenAsync();
        using var transacao = await conexao.BeginTransactionAsync();

        var orc = await conexao.QuerySingleOrDefaultAsync<dynamic>(@"
            SELECT TOP 1 *
            FROM orcamentos WITH (UPDLOCK, HOLDLOCK)
            WHERE id = @id AND ativo = 1;", new { id = orcamentoId }, transacao);

        if (orc == null)
            throw new InvalidOperationException("ORCAMENTO_NAO_ENCONTRADO");

        string statusOrcamento = orc.status ?? "";
        string statusNormalizado = statusOrcamento.Trim().ToLowerInvariant();

        if (!statusNormalizado.Contains("aprov"))
            throw new InvalidOperationException("ORCAMENTO_NAO_APROVADO");

        if (statusNormalizado.Contains("reprov") || statusNormalizado.Contains("cancel"))
            throw new InvalidOperationException("ORCAMENTO_FINALIZADO_INVALIDO");

        if ((decimal)(orc.valor_total ?? 0m) <= 0)
            throw new InvalidOperationException("ORCAMENTO_TOTAL_ZERO");

        var osExistente = await conexao.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT TOP 1 id, numero, status
            FROM ordens_servico
            WHERE orcamento_id = @id AND ativo = 1 ORDER BY id DESC;", new { id = orcamentoId }, transacao);

        if (osExistente != null)
        {
            await transacao.CommitAsync();
            return new { id = osExistente.id, numero = osExistente.numero, status = osExistente.status, orcamentoId };
        }

        long proximoNumero = await conexao.ExecuteScalarAsync<long>(@"
            SELECT ISNULL(MAX(TRY_CONVERT(INT, REPLACE(numero, 'OS-', ''))), 0) + 1
            FROM ordens_servico WITH (UPDLOCK, HOLDLOCK) WHERE numero LIKE 'OS-%';", null, transacao);

        var numeroOs = $"OS-{proximoNumero:0000}";
        var agora = DateTimeOffset.UtcNow.ToString("O");
        var hoje = DateTime.Today.ToString("yyyy-MM-dd");

        string descOrc = orc.descricao?.ToString() ?? "";
        var descricaoOs = string.IsNullOrWhiteSpace(descOrc) ? $"OS gerada a partir do orcamento {orc.numero}" : $"OS referente ao orcamento {orc.numero}: {descOrc}".Trim();

        var dict = new Dictionary<string, object?>
        {
            {"cliente_id", orc.cliente_id},
            {"ativo_id", orc.ativo_id},
            {"agendamento_id", orc.agendamento_id},
            {"orcamento_id", orcamentoId},
            {"numero", numeroOs},
            {"descricao", descricaoOs},
            {"problema_relatado", descOrc},
            {"data_abertura", hoje},
            {"valor_servicos", orc.valor_servicos},
            {"valor_produtos", orc.valor_produtos},
            {"valor_desconto", orc.valor_desconto},
            {"valor_total", orc.valor_total},
            {"observacao", string.IsNullOrWhiteSpace(orc.observacao?.ToString()) ? null : orc.observacao},
            {"status", "Aberta"},
            {"ativo", 1},
            {"criado_em", agora},
            {"atualizado_em", agora}
        };

        var isIdentity = await conexao.ExecuteScalarAsync<bool>(@"SELECT c.is_identity FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id WHERE t.name = 'ordens_servico' AND c.name = 'id';", null, transacao);

        if (!isIdentity)
        {
            var proximoId = await conexao.ExecuteScalarAsync<long>("SELECT ISNULL(MAX(id), 0) + 1 FROM ordens_servico WITH (UPDLOCK, HOLDLOCK);", null, transacao);
            dict["id"] = proximoId;
        }

        var campos = dict.Keys.ToList();
        var param = campos.Select(c => "@" + c).ToList();

        var sqlInsere = $@"
INSERT INTO ordens_servico ({string.Join(", ", campos)})
OUTPUT INSERTED.id
VALUES ({string.Join(", ", param)});";

        var osId = await conexao.ExecuteScalarAsync<long>(sqlInsere, new DynamicParameters(dict), transacao);

        await transacao.CommitAsync();

        return new { id = osId, numero = numeroOs, status = "Aberta", orcamentoId };
    }

    public async Task<object> GerarOrdemServicoDaAgendaAsync(long agendamentoId)
    {
        await GarantirSchemaAsync();
        await using var conexao = GetConnection();
        await conexao.OpenAsync();

        var agenda = await conexao.QuerySingleOrDefaultAsync<dynamic>(@"
            SELECT TOP 1 * FROM agendamentos WHERE id = @id AND ativo = 1;", new { id = agendamentoId });

        if (agenda == null)
            throw new InvalidOperationException("AGENDAMENTO_NAO_ENCONTRADO");

        string statusAgenda = agenda.status?.ToString() ?? "";
        if (statusAgenda.ToLowerInvariant().Contains("cancel"))
            throw new InvalidOperationException("AGENDAMENTO_CANCELADO");

        var osExistente = await conexao.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT TOP 1 id, numero, status
            FROM ordens_servico WHERE agendamento_id = @id AND ativo = 1 ORDER BY id DESC;", new { id = agendamentoId });

        if (osExistente != null)
            return new { id = osExistente.id, numero = osExistente.numero, status = osExistente.status, agendamentoId };

        long proximoNumero = await conexao.ExecuteScalarAsync<long>(@"
            SELECT ISNULL(MAX(TRY_CONVERT(INT, REPLACE(numero, 'OS-', ''))), 0) + 1
            FROM ordens_servico WITH (UPDLOCK, HOLDLOCK) WHERE numero LIKE 'OS-%';");

        var numeroOs = $"OS-{proximoNumero:0000}";
        var agora = DateTimeOffset.UtcNow.ToString("O");
        string descAgenda = agenda.descricao?.ToString() ?? "";
        var descricaoOs = string.IsNullOrWhiteSpace(descAgenda) ? $"OS gerada a partir do agendamento {agendamentoId}" : descAgenda.Trim();

        var dict = new Dictionary<string, object?>
        {
            {"cliente_id", agenda.cliente_id},
            {"ativo_id", agenda.ativo_id},
            {"agendamento_id", agendamentoId},
            {"numero", numeroOs},
            {"descricao", descricaoOs},
            {"problema_relatado", descricaoOs},
            {"data_abertura", agora},
            {"valor_servicos", 0},
            {"valor_produtos", 0},
            {"valor_desconto", 0},
            {"valor_total", 0},
            {"observacao", string.IsNullOrWhiteSpace(agenda.observacao?.ToString()) ? null : agenda.observacao},
            {"status", "Aberta"},
            {"ativo", 1},
            {"criado_em", agora},
            {"atualizado_em", agora}
        };

        var isIdentity = await conexao.ExecuteScalarAsync<bool>(@"SELECT c.is_identity FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id WHERE t.name = 'ordens_servico' AND c.name = 'id';");
        if (!isIdentity)
        {
            var proximoId = await conexao.ExecuteScalarAsync<long>("SELECT ISNULL(MAX(id), 0) + 1 FROM ordens_servico WITH (UPDLOCK, HOLDLOCK);");
            dict["id"] = proximoId;
        }

        var campos = dict.Keys.ToList();
        var param = campos.Select(c => "@" + c).ToList();

        var sqlInsere = $@"
INSERT INTO ordens_servico ({string.Join(", ", campos)})
OUTPUT INSERTED.id
VALUES ({string.Join(", ", param)});";

        var osId = await conexao.ExecuteScalarAsync<long>(sqlInsere, new DynamicParameters(dict));

        return new { id = osId, numero = numeroOs, status = "Aberta", agendamentoId };
    }
}

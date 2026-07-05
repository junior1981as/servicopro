using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;

public static class OperacaoEndpoints
{
    private const string DiretorioDados = "/opt/servicopro/dados";
    private const string BancoAdministrativo = "/opt/servicopro/dados/servicopro_admin.db";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    public static WebApplication MapOperacaoEndpoints(this WebApplication app)
    {
        var grupo = app.MapGroup("/api");

        grupo.MapGet("/agendamentos", async (HttpContext http) =>
            await ListarAsync(http, "agendamentos"));

        grupo.MapPost("/agendamentos/{id:long}/gerar-os", async (HttpContext http, long id) =>
            await GerarOrdemServicoDaAgendaAsync(http, id));

        grupo.MapPost("/orcamentos/{id:long}/gerar-os", async (HttpContext http, long id) =>
            await GerarOrdemServicoDoOrcamentoAsync(http, id));

        grupo.MapPost("/agendamentos", async (HttpContext http) =>
            await InserirAsync(http, "agendamentos", new[]
            {
                "cliente_id",
                "ativo_id",
                "data_agendamento",
                "hora_agendamento",
                "tipo",
                "descricao",
                "responsavel",
                "status",
                "observacao",
                "ativo"
            }, obrigatorio: "cliente_id"));

        grupo.MapGet("/orcamentos", async (HttpContext http) =>
            await ListarAsync(http, "orcamentos"));

        grupo.MapPost("/orcamentos", async (HttpContext http) =>
            await InserirAsync(http, "orcamentos", new[]
            {
                "cliente_id",
                "ativo_id",
                "agendamento_id",
                "numero",
                "descricao",
                "valor_servicos",
                "valor_produtos",
                "valor_desconto",
                "valor_total",
                "status",
                "observacao",
                "ativo"
            }, obrigatorio: "cliente_id"));

        grupo.MapGet("/ordens-servico", async (HttpContext http) =>
            await ListarAsync(http, "ordens_servico"));

        grupo.MapPost("/ordens-servico", async (HttpContext http) =>
            await InserirAsync(http, "ordens_servico", new[]
            {
                "cliente_id",
                "ativo_id",
                "agendamento_id",
                "orcamento_id",
                "numero",
                "descricao",
                "problema_relatado",
                "diagnostico",
                "km_abertura",
                "data_abertura",
                "data_encerramento",
                "valor_servicos",
                "valor_produtos",
                "valor_desconto",
                "valor_total",
                "status",
                "observacao",
                "ativo"
            }, obrigatorio: "descricao"));

        grupo.MapPut("/ordens-servico/{id:long}", async (HttpContext http, long id) =>
            await AtualizarAsync(http, "ordens_servico", id, new[]
            {
                "cliente_id",
                "ativo_id",
                "descricao",
                "problema_relatado",
                "diagnostico",
                "km_abertura",
                "data_abertura",
                "observacao"
            }));

        return app;
    }




    private static async Task GarantirCamposOrcamentoAsync(SqlConnection conexao)
    {
        static async Task ExecutarAsync(SqlConnection conexaoInterna, string sql)
        {
            await using var cmd = conexaoInterna.CreateCommand();
            cmd.CommandText = sql;
            await cmd.ExecuteNonQueryAsync();
        }

        await ExecutarAsync(conexao, @"
IF COL_LENGTH('orcamentos', 'data_aprovacao') IS NULL
BEGIN
    ALTER TABLE orcamentos ADD data_aprovacao NVARCHAR(40) NULL;
END;
");
    }


    private static async Task GarantirCamposOrdemServicoAsync(SqlConnection conexao)
    {
        static async Task ExecutarAsync(SqlConnection conexaoInterna, string sql)
        {
            await using var cmd = conexaoInterna.CreateCommand();
            cmd.CommandText = sql;
            await cmd.ExecuteNonQueryAsync();
        }

        await ExecutarAsync(conexao, @"
IF COL_LENGTH('ordens_servico', 'km_abertura') IS NULL
BEGIN
    ALTER TABLE ordens_servico ADD km_abertura DECIMAL(18,2) NULL;
END;
");

        await ExecutarAsync(conexao, @"
IF COL_LENGTH('ordens_servico', 'data_abertura') IS NULL
BEGIN
    ALTER TABLE ordens_servico ADD data_abertura NVARCHAR(40) NULL;
END;
");

        await ExecutarAsync(conexao, @"
IF COL_LENGTH('ordens_servico', 'data_encerramento') IS NULL
BEGIN
    ALTER TABLE ordens_servico ADD data_encerramento NVARCHAR(40) NULL;
END;
");

        await ExecutarAsync(conexao, @"
IF COL_LENGTH('ordens_servico', 'data_abertura') IS NOT NULL
BEGIN
    EXEC sp_executesql N'UPDATE ordens_servico
                            SET data_abertura = COALESCE(NULLIF(data_abertura, ''''), CONVERT(NVARCHAR(40), criado_em, 126))
                          WHERE data_abertura IS NULL
                             OR data_abertura = ''''';
END;
");
    }



    private static async Task GerarOrdemServicoDoOrcamentoAsync(HttpContext http, long id)
    {
        var sessao = await ResolverSessaoAsync(http);
        if (sessao is null)
        {
            await EscreverJsonAsync(http, StatusCodes.Status401Unauthorized, new
            {
                erro = "NAO_AUTORIZADO",
                mensagem = "Token ausente, invalido ou tenant nao resolvido."
            });
            return;
        }

        if (id <= 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "ORCAMENTO_INVALIDO",
                mensagem = "Informe um orcamento valido."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);

        await GarantirCamposOrcamentoAsync(conexao);
        await GarantirCamposOrdemServicoAsync(conexao);

        using var transacao = (SqlTransaction)await conexao.BeginTransactionAsync();

        try
        {
            long? clienteId = null;
            long? ativoId = null;
            long? agendamentoId = null;
            string numeroOrcamento = "";
            string descricaoOrcamento = "";
            string statusOrcamento = "";
            string observacaoOrcamento = "";
            decimal valorServicos = 0;
            decimal valorProdutos = 0;
            decimal valorDesconto = 0;
            decimal valorTotal = 0;

            await using (var cmdOrcamento = conexao.CreateCommand())
            {
                cmdOrcamento.Transaction = transacao;
                cmdOrcamento.CommandText = @"
SELECT TOP 1
       id,
       cliente_id,
       ativo_id,
       agendamento_id,
       COALESCE(numero, '') AS numero,
       COALESCE(descricao, '') AS descricao,
       COALESCE(status, '') AS status,
       COALESCE(observacao, '') AS observacao,
       COALESCE(valor_servicos, 0) AS valor_servicos,
       COALESCE(valor_produtos, 0) AS valor_produtos,
       COALESCE(valor_desconto, 0) AS valor_desconto,
       COALESCE(valor_total, 0) AS valor_total
  FROM orcamentos WITH (UPDLOCK, HOLDLOCK)
 WHERE id = @id
   AND ativo = 1;";
                cmdOrcamento.Parameters.AddWithValue("@id", id);

                await using var reader = await cmdOrcamento.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                {
                    await transacao.RollbackAsync();
                    await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                    {
                        erro = "ORCAMENTO_NAO_ENCONTRADO",
                        mensagem = "Orcamento nao encontrado."
                    });
                    return;
                }

                clienteId = reader["cliente_id"] is DBNull ? null : Convert.ToInt64(reader["cliente_id"]);
                ativoId = reader["ativo_id"] is DBNull ? null : Convert.ToInt64(reader["ativo_id"]);
                agendamentoId = reader["agendamento_id"] is DBNull ? null : Convert.ToInt64(reader["agendamento_id"]);
                numeroOrcamento = Convert.ToString(reader["numero"]) ?? "";
                descricaoOrcamento = Convert.ToString(reader["descricao"]) ?? "";
                statusOrcamento = Convert.ToString(reader["status"]) ?? "";
                observacaoOrcamento = Convert.ToString(reader["observacao"]) ?? "";
                valorServicos = Convert.ToDecimal(reader["valor_servicos"]);
                valorProdutos = Convert.ToDecimal(reader["valor_produtos"]);
                valorDesconto = Convert.ToDecimal(reader["valor_desconto"]);
                valorTotal = Convert.ToDecimal(reader["valor_total"]);
            }

            var statusNormalizado = statusOrcamento.Trim().ToLowerInvariant();

            if (!statusNormalizado.Contains("aprov"))
            {
                await transacao.RollbackAsync();
                await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
                {
                    erro = "ORCAMENTO_NAO_APROVADO",
                    mensagem = "Somente orcamento aprovado pode gerar OS."
                });
                return;
            }

            if (statusNormalizado.Contains("reprov") || statusNormalizado.Contains("cancel"))
            {
                await transacao.RollbackAsync();
                await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
                {
                    erro = "ORCAMENTO_FINALIZADO_INVALIDO",
                    mensagem = "Orcamento reprovado ou cancelado nao pode gerar OS."
                });
                return;
            }

            if (valorTotal <= 0)
            {
                await transacao.RollbackAsync();
                await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
                {
                    erro = "ORCAMENTO_TOTAL_ZERO",
                    mensagem = "Orcamento com valor total zero nao pode gerar OS."
                });
                return;
            }

            await using (var cmdOsExistente = conexao.CreateCommand())
            {
                cmdOsExistente.Transaction = transacao;
                cmdOsExistente.CommandText = @"
SELECT TOP 1 id, numero, status
  FROM ordens_servico
 WHERE orcamento_id = @orcamento_id
   AND ativo = 1
 ORDER BY id DESC;";
                cmdOsExistente.Parameters.AddWithValue("@orcamento_id", id);

                await using var readerOs = await cmdOsExistente.ExecuteReaderAsync();
                if (await readerOs.ReadAsync())
                {
                    var osIdExistente = Convert.ToInt64(readerOs["id"]);
                    var numeroExistente = Convert.ToString(readerOs["numero"]) ?? $"OS-{osIdExistente:0000}";
                    var statusExistente = Convert.ToString(readerOs["status"]) ?? "Aberta";

                    await transacao.CommitAsync();

                    await EscreverJsonAsync(http, StatusCodes.Status200OK, new
                    {
                        status = "ok",
                        mensagem = "Este orcamento ja possui OS vinculada.",
                        ordemServico = new
                        {
                            id = osIdExistente,
                            numero = numeroExistente,
                            status = statusExistente,
                            orcamentoId = id
                        }
                    });
                    return;
                }
            }

            long proximoNumero = 1;

            await using (var cmdNumero = conexao.CreateCommand())
            {
                cmdNumero.Transaction = transacao;
                cmdNumero.CommandText = @"
SELECT ISNULL(MAX(TRY_CONVERT(INT, REPLACE(numero, 'OS-', ''))), 0) + 1
  FROM ordens_servico WITH (UPDLOCK, HOLDLOCK)
 WHERE numero LIKE 'OS-%';";

                proximoNumero = Convert.ToInt64(await cmdNumero.ExecuteScalarAsync());
            }

            var numeroOs = $"OS-{proximoNumero:0000}";
            var agora = DateTimeOffset.UtcNow.ToString("O");
            var hoje = DateTime.Today.ToString("yyyy-MM-dd");

            var descricaoOs = string.IsNullOrWhiteSpace(descricaoOrcamento)
                ? $"OS gerada a partir do orcamento {numeroOrcamento}"
                : $"OS referente ao orcamento {numeroOrcamento}: {descricaoOrcamento}".Trim();

            long osId;
            long? proximoId = null;

            await using (var cmdProximoIdOs = conexao.CreateCommand())
            {
                cmdProximoIdOs.Transaction = transacao;
                cmdProximoIdOs.CommandText = @"
IF COLUMNPROPERTY(OBJECT_ID('dbo.ordens_servico'), 'id', 'IsIdentity') = 1
BEGIN
    SELECT CAST(NULL AS BIGINT);
END
ELSE
BEGIN
    SELECT CAST(COALESCE(MAX(id), 0) + 1 AS BIGINT)
      FROM ordens_servico WITH (UPDLOCK, HOLDLOCK);
END;";
                var valorProximoId = await cmdProximoIdOs.ExecuteScalarAsync();
                if (valorProximoId is not null && valorProximoId is not DBNull)
                {
                    proximoId = Convert.ToInt64(valorProximoId);
                }
            }

            if (proximoId.HasValue)
            {
                osId = proximoId.Value;

                await using var cmdInsere = conexao.CreateCommand();
                cmdInsere.Transaction = transacao;
                cmdInsere.CommandText = @"
INSERT INTO ordens_servico
    (id, cliente_id, ativo_id, agendamento_id, orcamento_id, numero, descricao, problema_relatado, diagnostico,
     km_abertura, data_abertura, data_encerramento,
     valor_servicos, valor_produtos, valor_desconto, valor_total, status, observacao, ativo, criado_em, atualizado_em)
VALUES
    (@id, @cliente_id, @ativo_id, @agendamento_id, @orcamento_id, @numero, @descricao, @problema_relatado, NULL,
     NULL, @data_abertura, NULL,
     @valor_servicos, @valor_produtos, @valor_desconto, @valor_total, 'Aberta', @observacao, 1, @agora, @agora);";

                cmdInsere.Parameters.AddWithValue("@id", osId);
                cmdInsere.Parameters.AddWithValue("@cliente_id", clienteId.HasValue ? (object)clienteId.Value : DBNull.Value);
                cmdInsere.Parameters.AddWithValue("@ativo_id", ativoId.HasValue ? (object)ativoId.Value : DBNull.Value);
                cmdInsere.Parameters.AddWithValue("@agendamento_id", agendamentoId.HasValue ? (object)agendamentoId.Value : DBNull.Value);
                cmdInsere.Parameters.AddWithValue("@orcamento_id", id);
                cmdInsere.Parameters.AddWithValue("@numero", numeroOs);
                cmdInsere.Parameters.AddWithValue("@descricao", descricaoOs);
                cmdInsere.Parameters.AddWithValue("@problema_relatado", descricaoOrcamento);
                cmdInsere.Parameters.AddWithValue("@data_abertura", hoje);
                cmdInsere.Parameters.AddWithValue("@valor_servicos", valorServicos);
                cmdInsere.Parameters.AddWithValue("@valor_produtos", valorProdutos);
                cmdInsere.Parameters.AddWithValue("@valor_desconto", valorDesconto);
                cmdInsere.Parameters.AddWithValue("@valor_total", valorTotal);
                cmdInsere.Parameters.AddWithValue("@observacao", string.IsNullOrWhiteSpace(observacaoOrcamento) ? DBNull.Value : (object)observacaoOrcamento.Trim());
                cmdInsere.Parameters.AddWithValue("@agora", agora);

                await cmdInsere.ExecuteNonQueryAsync();
            }
            else
            {
                await using var cmdInsere = conexao.CreateCommand();
                cmdInsere.Transaction = transacao;
                cmdInsere.CommandText = @"
INSERT INTO ordens_servico
    (cliente_id, ativo_id, agendamento_id, orcamento_id, numero, descricao, problema_relatado, diagnostico,
     km_abertura, data_abertura, data_encerramento,
     valor_servicos, valor_produtos, valor_desconto, valor_total, status, observacao, ativo, criado_em, atualizado_em)
OUTPUT INSERTED.id
VALUES
    (@cliente_id, @ativo_id, @agendamento_id, @orcamento_id, @numero, @descricao, @problema_relatado, NULL,
     NULL, @data_abertura, NULL,
     @valor_servicos, @valor_produtos, @valor_desconto, @valor_total, 'Aberta', @observacao, 1, @agora, @agora);";

                cmdInsere.Parameters.AddWithValue("@cliente_id", clienteId.HasValue ? (object)clienteId.Value : DBNull.Value);
                cmdInsere.Parameters.AddWithValue("@ativo_id", ativoId.HasValue ? (object)ativoId.Value : DBNull.Value);
                cmdInsere.Parameters.AddWithValue("@agendamento_id", agendamentoId.HasValue ? (object)agendamentoId.Value : DBNull.Value);
                cmdInsere.Parameters.AddWithValue("@orcamento_id", id);
                cmdInsere.Parameters.AddWithValue("@numero", numeroOs);
                cmdInsere.Parameters.AddWithValue("@descricao", descricaoOs);
                cmdInsere.Parameters.AddWithValue("@problema_relatado", descricaoOrcamento);
                cmdInsere.Parameters.AddWithValue("@data_abertura", hoje);
                cmdInsere.Parameters.AddWithValue("@valor_servicos", valorServicos);
                cmdInsere.Parameters.AddWithValue("@valor_produtos", valorProdutos);
                cmdInsere.Parameters.AddWithValue("@valor_desconto", valorDesconto);
                cmdInsere.Parameters.AddWithValue("@valor_total", valorTotal);
                cmdInsere.Parameters.AddWithValue("@observacao", string.IsNullOrWhiteSpace(observacaoOrcamento) ? DBNull.Value : (object)observacaoOrcamento.Trim());
                cmdInsere.Parameters.AddWithValue("@agora", agora);

                osId = Convert.ToInt64(await cmdInsere.ExecuteScalarAsync());
            }

            // Fase 1.8C-3 final:
            // A OS sera gerada vinculada ao orcamento, com cliente, ativo, agendamento,
            // descricao, observacao e valores copiados.
            // A copia automatica dos itens foi removida desta etapa porque as tabelas
            // de itens da OS ainda precisam de saneamento/auditoria de schema.
            // Depois da limpeza tecnica, a copia de itens deve voltar com contrato testado.

            await transacao.CommitAsync();

            await EscreverJsonAsync(http, StatusCodes.Status201Created, new
            {
                status = "criado",
                mensagem = "OS gerada com sucesso a partir do orcamento.",
                ordemServico = new
                {
                    id = osId,
                    numero = numeroOs,
                    status = "Aberta",
                    orcamentoId = id
                }
            });
        }
        catch (Exception ex)
        {
            try
            {
                await transacao.RollbackAsync();
            }
            catch
            {
                // rollback defensivo
            }

            await EscreverJsonAsync(http, StatusCodes.Status500InternalServerError, new
            {
                erro = "FALHA_GERAR_OS_ORCAMENTO",
                mensagem = "Falha ao gerar OS a partir do orcamento.",
                detalhe = ex.Message
            });
        }
    }


    private static async Task GerarOrdemServicoDaAgendaAsync(HttpContext http, long id)
    {
        var sessao = await ResolverSessaoAsync(http);
        if (sessao is null)
        {
            await EscreverJsonAsync(http, StatusCodes.Status401Unauthorized, new
            {
                erro = "NAO_AUTORIZADO",
                mensagem = "Token ausente, invalido ou tenant nao resolvido."
            });
            return;
        }

        if (id <= 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "AGENDAMENTO_INVALIDO",
                mensagem = "Informe um agendamento valido."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);
        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        await GarantirCamposOrdemServicoAsync(conexao);

        long? clienteId = null;
        long? ativoId = null;
        string descricaoAgenda = "";
        string observacaoAgenda = "";
        string statusAgenda = "";

        await using (var cmdAgenda = conexao.CreateCommand())
        {
            cmdAgenda.CommandText = @"
SELECT TOP 1
       cliente_id,
       ativo_id,
       COALESCE(descricao, '') AS descricao,
       COALESCE(observacao, '') AS observacao,
       COALESCE(status, '') AS status
  FROM agendamentos
 WHERE id = @id
   AND ativo = 1;";
            cmdAgenda.Parameters.AddWithValue("@id", id);

            await using var reader = await cmdAgenda.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                {
                    erro = "AGENDAMENTO_NAO_ENCONTRADO",
                    mensagem = "Agendamento nao encontrado."
                });
                return;
            }

            clienteId = reader["cliente_id"] is DBNull ? null : Convert.ToInt64(reader["cliente_id"]);
            ativoId = reader["ativo_id"] is DBNull ? null : Convert.ToInt64(reader["ativo_id"]);
            descricaoAgenda = Convert.ToString(reader["descricao"]) ?? "";
            observacaoAgenda = Convert.ToString(reader["observacao"]) ?? "";
            statusAgenda = Convert.ToString(reader["status"]) ?? "";
        }

        if (statusAgenda.ToLowerInvariant().Contains("cancel"))
        {
            await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
            {
                erro = "AGENDAMENTO_CANCELADO",
                mensagem = "Nao e permitido gerar OS a partir de agendamento cancelado."
            });
            return;
        }

        await using (var cmdOsExistente = conexao.CreateCommand())
        {
            cmdOsExistente.CommandText = @"
SELECT TOP 1 id, numero, status
  FROM ordens_servico
 WHERE agendamento_id = @agendamento_id
   AND ativo = 1
 ORDER BY id DESC;";
            cmdOsExistente.Parameters.AddWithValue("@agendamento_id", id);

            await using var readerOs = await cmdOsExistente.ExecuteReaderAsync();
            if (await readerOs.ReadAsync())
            {
                var osIdExistente = Convert.ToInt64(readerOs["id"]);
                var numeroExistente = Convert.ToString(readerOs["numero"]) ?? $"OS-{osIdExistente:0000}";
                var statusExistente = Convert.ToString(readerOs["status"]) ?? "";

                await EscreverJsonAsync(http, StatusCodes.Status200OK, new
                {
                    status = "ok",
                    mensagem = "Este agendamento ja possui OS vinculada.",
                    ordemServico = new
                    {
                        id = osIdExistente,
                        numero = numeroExistente,
                        status = statusExistente,
                        agendamentoId = id
                    }
                });
                return;
            }
        }

        long proximoNumero = 1;

        await using (var cmdNumero = conexao.CreateCommand())
        {
            cmdNumero.CommandText = @"
SELECT ISNULL(MAX(TRY_CONVERT(INT, REPLACE(numero, 'OS-', ''))), 0) + 1
  FROM ordens_servico WITH (UPDLOCK, HOLDLOCK)
 WHERE numero LIKE 'OS-%';";

            var valorNumero = await cmdNumero.ExecuteScalarAsync();
            proximoNumero = Convert.ToInt64(valorNumero);
        }

        var numeroOs = $"OS-{proximoNumero:0000}";
        var agora = DateTimeOffset.UtcNow.ToString("O");
        var descricaoOs = string.IsNullOrWhiteSpace(descricaoAgenda)
            ? $"OS gerada a partir do agendamento {id}"
            : descricaoAgenda.Trim();

        long osId;

        await using (var cmdProximoId = conexao.CreateCommand())
        {
            cmdProximoId.CommandText = @"
SELECT ISNULL(MAX(id), 0) + 1
  FROM ordens_servico WITH (UPDLOCK, HOLDLOCK);";

            osId = Convert.ToInt64(await cmdProximoId.ExecuteScalarAsync());
        }

        await using (var cmdInsere = conexao.CreateCommand())
        {
            cmdInsere.CommandText = @"
INSERT INTO ordens_servico
    (id, cliente_id, ativo_id, agendamento_id, orcamento_id, numero, descricao, problema_relatado, diagnostico,
     km_abertura, data_abertura, data_encerramento,
     valor_servicos, valor_produtos, valor_desconto, valor_total, status, observacao, ativo, criado_em, atualizado_em)
VALUES
    (@id, @cliente_id, @ativo_id, @agendamento_id, NULL, @numero, @descricao, @problema_relatado, NULL,
     NULL, @agora, NULL,
     0, 0, 0, 0, 'Aberta', @observacao, 1, @agora, @agora);";

            cmdInsere.Parameters.AddWithValue("@id", osId);
            cmdInsere.Parameters.AddWithValue("@cliente_id", clienteId.HasValue ? (object)clienteId.Value : DBNull.Value);
            cmdInsere.Parameters.AddWithValue("@ativo_id", ativoId.HasValue ? (object)ativoId.Value : DBNull.Value);
            cmdInsere.Parameters.AddWithValue("@agendamento_id", id);
            cmdInsere.Parameters.AddWithValue("@numero", numeroOs);
            cmdInsere.Parameters.AddWithValue("@descricao", descricaoOs);
            cmdInsere.Parameters.AddWithValue("@problema_relatado", descricaoOs);
            cmdInsere.Parameters.AddWithValue("@observacao", string.IsNullOrWhiteSpace(observacaoAgenda) ? DBNull.Value : (object)observacaoAgenda.Trim());
            cmdInsere.Parameters.AddWithValue("@agora", agora);

            await cmdInsere.ExecuteNonQueryAsync();
        }

        await EscreverJsonAsync(http, StatusCodes.Status201Created, new
        {
            status = "criado",
            mensagem = "OS gerada com sucesso a partir do agendamento.",
            ordemServico = new
            {
                id = osId,
                numero = numeroOs,
                status = "Aberta",
                agendamentoId = id
            }
        });
    }

    private static async Task ListarAsync(HttpContext http, string tabela)
    {
        var sessao = await ResolverSessaoAsync(http);
        if (sessao is null)
        {
            await EscreverJsonAsync(http, StatusCodes.Status401Unauthorized, new
            {
                erro = "NAO_AUTORIZADO",
                mensagem = "Token ausente, invalido ou tenant nao resolvido."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        if (tabela == "orcamentos")
            await GarantirCamposOrcamentoAsync(conexao);


        if (tabela == "ordens_servico")
            await GarantirCamposOrdemServicoAsync(conexao);

        await using var cmd = conexao.CreateCommand();

        cmd.CommandText = $"SELECT * FROM {tabela} ORDER BY id DESC;";

        var lista = new List<Dictionary<string, object?>>();

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            lista.Add(LerLinha(reader));

        await EscreverJsonAsync(http, StatusCodes.Status200OK, new
        {
            status = "ok",
            tabela,
            total = lista.Count,
            tenant = new
            {
                id = sessao.Tenant.Id,
                nome = sessao.Tenant.Nome,
                banco = sessao.Tenant.Banco,
                caminhoBanco = sessao.Tenant.CaminhoBanco
            },
            dados = lista
        });
    }


    private static async Task AtualizarAsync(
        HttpContext http,
        string tabela,
        long id,
        IReadOnlyList<string> camposPermitidos)
    {
        if (id <= 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "ID_INVALIDO",
                mensagem = "Informe um id valido."
            });
            return;
        }

        var sessao = await ResolverSessaoAsync(http);
        if (sessao is null)
        {
            await EscreverJsonAsync(http, StatusCodes.Status401Unauthorized, new
            {
                erro = "NAO_AUTORIZADO",
                mensagem = "Token ausente, invalido ou tenant nao resolvido."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);

        JsonObject? payload;

        try
        {
            payload = await JsonSerializer.DeserializeAsync<JsonObject>(http.Request.Body, JsonOptions);
        }
        catch
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "JSON_INVALIDO",
                mensagem = "JSON invalido."
            });
            return;
        }

        if (payload is null)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "PAYLOAD_OBRIGATORIO",
                mensagem = "Informe os dados."
            });
            return;
        }

        if (payload.TryGetPropertyValue("descricao", out var descricao) &&
            string.IsNullOrWhiteSpace(descricao?.ToString()))
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "DESCRICAO_OBRIGATORIA",
                mensagem = "Informe a descricao da OS."
            });
            return;
        }

        var atribuicoes = new List<string>();
        var valores = new Dictionary<string, object?>();

        foreach (var campo in camposPermitidos)
        {
            if (!payload.TryGetPropertyValue(campo, out var valor))
                continue;

            atribuicoes.Add($"{campo} = @{campo}");
            valores[campo] = ConverterJsonNode(valor);
        }

        if (atribuicoes.Count == 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "SEM_CAMPOS_ATUALIZACAO",
                mensagem = "Informe ao menos um campo para atualizar."
            });
            return;
        }

        var agora = DateTimeOffset.UtcNow.ToString("O");
        atribuicoes.Add("atualizado_em = @atualizado_em");
        valores["atualizado_em"] = agora;

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        if (tabela == "orcamentos")
            await GarantirCamposOrcamentoAsync(conexao);


        if (tabela == "ordens_servico")
            await GarantirCamposOrdemServicoAsync(conexao);

        await using var cmd = conexao.CreateCommand();

        cmd.CommandText = $@"
UPDATE {tabela}
   SET {string.Join(", ", atribuicoes)}
OUTPUT INSERTED.id
 WHERE id = @id;
";

        cmd.Parameters.AddWithValue("@id", id);

        foreach (var item in valores)
            cmd.Parameters.AddWithValue("@" + item.Key, item.Value ?? DBNull.Value);

        var idAtualizadoObj = await cmd.ExecuteScalarAsync();

        if (idAtualizadoObj is null || idAtualizadoObj == DBNull.Value)
        {
            await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
            {
                erro = "REGISTRO_NAO_ENCONTRADO",
                mensagem = "Ordem de servico nao encontrada."
            });
            return;
        }

        var rota = tabela == "ordens_servico"
            ? "ordens-servico"
            : tabela.Replace("_", "-");

        http.Response.Headers.Location = $"/api/{rota}/{id}";

        await EscreverJsonAsync(http, StatusCodes.Status200OK, new
        {
            status = "atualizado",
            id,
            tabela,
            mensagem = "Registro atualizado com sucesso."
        });
    }

    private static async Task InserirAsync(
        HttpContext http,
        string tabela,
        IReadOnlyList<string> camposPermitidos,
        string obrigatorio)
    {
        var sessao = await ResolverSessaoAsync(http);
        if (sessao is null)
        {
            await EscreverJsonAsync(http, StatusCodes.Status401Unauthorized, new
            {
                erro = "NAO_AUTORIZADO",
                mensagem = "Token ausente, invalido ou tenant nao resolvido."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);

        JsonObject? payload;

        try
        {
            payload = await JsonSerializer.DeserializeAsync<JsonObject>(http.Request.Body, JsonOptions);
        }
        catch
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "JSON_INVALIDO",
                mensagem = "JSON invalido."
            });
            return;
        }

        if (payload is null)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "PAYLOAD_OBRIGATORIO",
                mensagem = "Informe os dados."
            });
            return;
        }

        if (!payload.TryGetPropertyValue(obrigatorio, out var valorObrigatorio) ||
            string.IsNullOrWhiteSpace(valorObrigatorio?.ToString()))
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "CAMPO_OBRIGATORIO",
                mensagem = $"Campo obrigatorio nao informado: {obrigatorio}."
            });
            return;
        }

        var campos = new List<string>();
        var parametros = new List<string>();
        var valores = new Dictionary<string, object?>();

        foreach (var campo in camposPermitidos)
        {
            if (!payload.TryGetPropertyValue(campo, out var valor))
                continue;

            campos.Add(campo);
            parametros.Add("@" + campo);
            valores[campo] = ConverterJsonNode(valor);
        }

        var agora = DateTimeOffset.UtcNow.ToString("O");

        campos.Add("criado_em");
        parametros.Add("@criado_em");
        valores["criado_em"] = agora;

        campos.Add("atualizado_em");
        parametros.Add("@atualizado_em");
        valores["atualizado_em"] = agora;

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);

        if (tabela == "orcamentos" &&
            (!valores.TryGetValue("numero", out var numeroAtual) ||
             numeroAtual is null ||
             numeroAtual == DBNull.Value ||
             string.IsNullOrWhiteSpace(numeroAtual.ToString())))
        {
            var numeroGerado = await GerarNumeroOrcamentoAsync(conexao);

            if (!campos.Contains("numero", StringComparer.OrdinalIgnoreCase))
            {
                campos.Insert(0, "numero");
                parametros.Insert(0, "@numero");
            }

            valores["numero"] = numeroGerado;
        }

        if (!campos.Contains("id", StringComparer.OrdinalIgnoreCase))
        {
            var proximoId = await ObterProximoIdSeNecessarioAsync(conexao, tabela);
            if (proximoId.HasValue)
            {
                campos.Insert(0, "id");
                parametros.Insert(0, "@id");
                valores["id"] = proximoId.Value;
            }
        }

        await using var cmd = conexao.CreateCommand();

        cmd.CommandText = $@"
INSERT INTO {tabela}
    ({string.Join(", ", campos)})
OUTPUT INSERTED.id
VALUES
    ({string.Join(", ", parametros)});
";

        foreach (var item in valores)
            cmd.Parameters.AddWithValue("@" + item.Key, item.Value ?? DBNull.Value);

        var id = Convert.ToInt64(await cmd.ExecuteScalarAsync());

        var rota = tabela == "ordens_servico"
            ? "ordens-servico"
            : tabela.Replace("_", "-");

        http.Response.Headers.Location = $"/api/{rota}/{id}";

        await EscreverJsonAsync(http, StatusCodes.Status201Created, new
        {
            status = "criado",
            id,
            tabela,
            mensagem = "Registro criado com sucesso."
        });
    }

    private static async Task<string> GerarNumeroOrcamentoAsync(SqlConnection conexao)
    {
        await using var cmd = conexao.CreateCommand();
        cmd.CommandText = @"
SELECT ISNULL(MAX(TRY_CONVERT(INT, REPLACE(numero, 'ORC-', ''))), 0) + 1
  FROM orcamentos WITH (UPDLOCK, HOLDLOCK)
 WHERE numero LIKE 'ORC-%';";

        var proximo = Convert.ToInt64(await cmd.ExecuteScalarAsync());
        return $"ORC-{proximo:0000}";
    }

    private static async Task<long?> ObterProximoIdSeNecessarioAsync(SqlConnection conexao, string tabela)
    {
        await using var cmdInfo = conexao.CreateCommand();
        cmdInfo.CommandText = @"
SELECT
    c.is_identity
FROM sys.columns c
JOIN sys.tables t ON t.object_id = c.object_id
WHERE t.name = @tabela
  AND c.name = 'id';";
        cmdInfo.Parameters.AddWithValue("@tabela", tabela);

        var isIdentityObj = await cmdInfo.ExecuteScalarAsync();

        if (isIdentityObj is null || isIdentityObj == DBNull.Value)
            return null;

        var isIdentity = Convert.ToBoolean(isIdentityObj);
        if (isIdentity)
            return null;

        await using var cmdId = conexao.CreateCommand();
        cmdId.CommandText = $"SELECT ISNULL(MAX(id), 0) + 1 FROM {tabela} WITH (UPDLOCK, HOLDLOCK);";

        return Convert.ToInt64(await cmdId.ExecuteScalarAsync());
    }

    private static Task GarantirBancoTenantAsync(TenantResolvido tenant)
    {
        return Task.CompletedTask;
    }

    private static async Task InserirSeedsAsync(SqlConnection conexao)
    {
        var agora = DateTimeOffset.UtcNow.ToString("O");
        var hoje = DateTime.Today.ToString("yyyy-MM-dd");

        await ExecutarAsync(conexao, """
INSERT INTO agendamentos
    (cliente_id, ativo_id, data_agendamento, hora_agendamento, tipo, descricao, responsavel, status, observacao, ativo, criado_em, atualizado_em)
SELECT c.id, a.id, @hoje, '08:30', 'Revisao', 'Revisao preventiva', 'Administrador', 'Agendado', 'Seed inicial Fase 4.0', 1, @agora, @agora
FROM clientes c
LEFT JOIN ativos a ON a.cliente_id = c.id
WHERE c.nome = 'Maria Oliveira'
  AND NOT EXISTS (SELECT 1 FROM agendamentos WHERE descricao = 'Revisao preventiva' AND data_agendamento = @hoje);
""", new Dictionary<string, object?> { ["@hoje"] = hoje, ["@agora"] = agora });

        await ExecutarAsync(conexao, """
INSERT INTO orcamentos
    (cliente_id, ativo_id, agendamento_id, numero, descricao, valor_servicos, valor_produtos, valor_desconto, valor_total, status, observacao, ativo, criado_em, atualizado_em)
SELECT c.id, a.id, ag.id, 'ORC-0001', 'Orcamento inicial de revisao', 450, 285, 0, 735, 'Aprovado', 'Seed inicial Fase 4.0', 1, @agora, @agora
FROM clientes c
LEFT JOIN ativos a ON a.cliente_id = c.id
LEFT JOIN agendamentos ag ON ag.cliente_id = c.id
WHERE c.nome = 'Maria Oliveira'
  AND NOT EXISTS (SELECT 1 FROM orcamentos WHERE numero = 'ORC-0001');
""", new Dictionary<string, object?> { ["@agora"] = agora });

        await ExecutarAsync(conexao, """
INSERT INTO ordens_servico
    (cliente_id, ativo_id, agendamento_id, orcamento_id, numero, descricao, problema_relatado, diagnostico, valor_servicos, valor_produtos, valor_desconto, valor_total, status, observacao, ativo, criado_em, atualizado_em)
SELECT c.id, a.id, ag.id, o.id, 'OS-0001', 'Revisao preventiva com troca de itens', 'Cliente relata barulho no freio.', 'Aguardando execucao completa.', 450, 285, 0, 735, 'Aberta', 'Seed inicial Fase 4.0', 1, @agora, @agora
FROM clientes c
LEFT JOIN ativos a ON a.cliente_id = c.id
LEFT JOIN agendamentos ag ON ag.cliente_id = c.id
LEFT JOIN orcamentos o ON o.cliente_id = c.id
WHERE c.nome = 'Maria Oliveira'
  AND NOT EXISTS (SELECT 1 FROM ordens_servico WHERE numero = 'OS-0001');
""", new Dictionary<string, object?> { ["@agora"] = agora });
    }

    private static async Task<SessaoResolvida?> ResolverSessaoAsync(HttpContext http)
    {
        var auth = http.Request.Headers.Authorization.ToString();

        if (string.IsNullOrWhiteSpace(auth) ||
            !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;

        var token = auth["Bearer ".Length..].Trim();
        var payload = LerPayloadTokenSemAlterarAssinatura(token);

        if (payload is null)
            return null;

        var tenantValor =
            ObterValor(payload, "tenant_id") ??
            ObterValor(payload, "tenantId") ??
            ObterValor(payload, "tenant") ??
            ObterValor(payload, "banco") ??
            ObterValor(payload, "banco_dados") ??
            http.Request.Headers["X-Tenant-Id"].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(tenantValor))
            return null;

        var tenant = await ResolverTenantAsync(tenantValor);
        if (tenant is null)
            return null;

        return new SessaoResolvida(
            UsuarioId: ObterValor(payload, "usuarioId") ??
                       ObterValor(payload, "usuario_id") ??
                       ObterValor(payload, "sub") ??
                       "",
            Email: ObterValor(payload, "email") ?? "",
            Tenant: tenant);
    }

    private static JsonObject? LerPayloadTokenSemAlterarAssinatura(string token)
    {
        try
        {
            var partes = token.Split('.', StringSplitOptions.RemoveEmptyEntries);
            if (partes.Length < 2)
                return null;

            var payloadBase64 = partes[1];
            var bytes = ConverterBase64Url(payloadBase64);
            var json = Encoding.UTF8.GetString(bytes);

            if (string.IsNullOrWhiteSpace(json) || !json.TrimStart().StartsWith("{"))
                return null;

            return JsonNode.Parse(json)?.AsObject();
        }
        catch
        {
            return null;
        }
    }

    private static byte[] ConverterBase64Url(string valor)
    {
        var texto = valor.Replace('-', '+').Replace('_', '/');
        texto += new string('=', (4 - texto.Length % 4) % 4);
        return Convert.FromBase64String(texto);
    }

    private static string? ObterValor(JsonObject payload, string nome)
    {
        foreach (var item in payload)
        {
            if (string.Equals(item.Key, nome, StringComparison.OrdinalIgnoreCase))
                return item.Value?.ToString();
        }

        return null;
    }

    private static async Task<TenantResolvido?> ResolverTenantAsync(string valor)
    {
        await using var admin = new SqlConnection(ObterConnectionStringMssql());
        await admin.OpenAsync();

        await using var cmd = admin.CreateCommand();
        cmd.CommandText = """
SELECT TOP 1
    t.id,
    t.nome,
    t.banco_dados
FROM tenants t
WHERE t.ativo = 1
  AND (
       LOWER(t.id) = LOWER(@valor)
    OR LOWER(t.nome) = LOWER(@valor)
    OR LOWER(t.banco_dados) = LOWER(@valor)
    OR LOWER(REPLACE(t.banco_dados, '.db', '')) = LOWER(REPLACE(@valor, '.db', ''))
  )

""";
        cmd.Parameters.AddWithValue("@valor", valor);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return null;

        var id = reader.GetString(0);
        var nome = reader.GetString(1);
        var banco = reader.GetString(2);

        return new TenantResolvido(
            Id: id,
            Nome: nome,
            Chave: id,
            Banco: banco,
            CaminhoBanco: ResolverCaminhoBancoTenant(banco));
    }

    private static async Task EscreverJsonAsync(HttpContext http, int statusCode, object conteudo)
    {
        http.Response.StatusCode = statusCode;
        http.Response.ContentType = "application/json; charset=utf-8";

        var json = JsonSerializer.Serialize(conteudo, JsonOptions);
        await http.Response.WriteAsync(json, Encoding.UTF8);
    }

    private static async Task ExecutarAsync(
        SqlConnection conexao,
        string sql,
        Dictionary<string, object?> parametros)
    {
        await using var cmd = conexao.CreateCommand();
        cmd.CommandText = sql;

        foreach (var parametro in parametros)
            cmd.Parameters.AddWithValue(parametro.Key, parametro.Value ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
    }


    private static string ObterConnectionStringMssql()
    {
        var env = Environment.GetEnvironmentVariable("SERVICOPRO_MSSQL_CONNECTION_STRING");
        if (!string.IsNullOrWhiteSpace(env))
            return env;

        const string caminho = "/opt/servicopro/segredos/servicopro_mssql.env";

        if (!File.Exists(caminho))
            throw new InvalidOperationException("Arquivo de conexão MSSQL não encontrado: " + caminho);

        foreach (var linha in File.ReadAllLines(caminho))
        {
            if (linha.StartsWith("SERVICOPRO_MSSQL_CONNECTION_STRING=", StringComparison.Ordinal))
                return linha["SERVICOPRO_MSSQL_CONNECTION_STRING=".Length..].Trim();
        }

        throw new InvalidOperationException("SERVICOPRO_MSSQL_CONNECTION_STRING não encontrada em " + caminho);
    }

    private static SqlConnection AbrirConexaoTenant(TenantResolvido tenant)
    {
        var conexao = new SqlConnection(ObterConnectionStringMssql());
        conexao.Open();
        return conexao;
    }

    private static string ResolverCaminhoBancoTenant(string banco)
    {
        if (string.IsNullOrWhiteSpace(banco))
            banco = "erp_cliente_0001";

        if (banco.Contains('/') || banco.Contains('\\'))
            return banco;

        var nomeArquivo = banco.EndsWith(".db", StringComparison.OrdinalIgnoreCase)
            ? banco
            : banco + ".db";

        return Path.Combine(DiretorioDados, nomeArquivo);
    }

    private static Dictionary<string, object?> LerLinha(SqlDataReader reader)
    {
        var item = new Dictionary<string, object?>();

        for (var i = 0; i < reader.FieldCount; i++)
        {
            var nome = reader.GetName(i);
            item[nome] = reader.IsDBNull(i) ? null : reader.GetValue(i);
        }

        return item;
    }

    private static object? ConverterJsonNode(JsonNode? node)
    {
        if (node is null)
            return null;

        if (node is JsonValue value)
        {
            if (value.TryGetValue<int>(out var inteiro))
                return inteiro;

            if (value.TryGetValue<long>(out var longo))
                return longo;

            if (value.TryGetValue<decimal>(out var dec))
                return dec;

            if (value.TryGetValue<double>(out var dbl))
                return dbl;

            if (value.TryGetValue<bool>(out var booleano))
                return booleano ? 1 : 0;

            if (value.TryGetValue<string>(out var texto))
                return texto;
        }

        return node.ToJsonString();
    }

    private sealed record SessaoResolvida(string UsuarioId, string Email, TenantResolvido Tenant);

    private sealed record TenantResolvido(
        string Id,
        string Nome,
        string Chave,
        string Banco,
        string CaminhoBanco);
}

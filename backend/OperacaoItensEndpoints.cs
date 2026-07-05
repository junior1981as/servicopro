using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;

public static class OperacaoItensEndpoints
{
    private const string DiretorioDados = "/opt/servicopro/dados";
    private const string BancoAdministrativo = "/opt/servicopro/dados/servicopro_admin.db";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    public static WebApplication MapOperacaoItensEndpoints(this WebApplication app)
    {
        var grupo = app.MapGroup("/api");

        grupo.MapGet("/ordens-servico-itens-servicos", async (HttpContext http) =>
            await ListarAsync(http, "ordens_servico_itens_servicos"));

        grupo.MapPost("/ordens-servico-itens-servicos", async (HttpContext http) =>
            await InserirGenericoAsync(http, "ordens_servico_itens_servicos", new[]
            {
                "ordem_servico_id",
                "servico_id",
                "descricao",
                "quantidade",
                "valor_unitario",
                "valor_total",
                "status",
                "observacao",
                "ativo"
            }, obrigatorio: "descricao"));

        grupo.MapPut("/ordens-servico-itens-servicos/{id:long}", async (HttpContext http, long id) =>
            await AtualizarItemOrdemServicoAsync(http, "ordens_servico_itens_servicos", id));

        grupo.MapDelete("/ordens-servico-itens-servicos/{id:long}", async (HttpContext http, long id) =>
            await ExcluirItemOrdemServicoAsync(http, "ordens_servico_itens_servicos", id));

        grupo.MapGet("/ordens-servico-itens-produtos", async (HttpContext http) =>
            await ListarAsync(http, "ordens_servico_itens_produtos"));

        grupo.MapPost("/ordens-servico-itens-produtos", async (HttpContext http) =>
            await InserirGenericoAsync(http, "ordens_servico_itens_produtos", new[]
            {
                "ordem_servico_id",
                "produto_id",
                "descricao",
                "quantidade",
                "valor_unitario",
                "valor_total",
                "status",
                "observacao",
                "ativo"
            }, obrigatorio: "descricao"));

        grupo.MapPut("/ordens-servico-itens-produtos/{id:long}", async (HttpContext http, long id) =>
            await AtualizarItemOrdemServicoAsync(http, "ordens_servico_itens_produtos", id));

        grupo.MapDelete("/ordens-servico-itens-produtos/{id:long}", async (HttpContext http, long id) =>
            await ExcluirItemOrdemServicoAsync(http, "ordens_servico_itens_produtos", id));

        grupo.MapGet("/requisicoes-estoque", async (HttpContext http) =>
            await ListarAsync(http, "requisicoes_estoque"));

        grupo.MapPost("/requisicoes-estoque", async (HttpContext http) =>
            await InserirRequisicaoEstoqueComBaixaAsync(http));

        grupo.MapGet("/movimentacoes-estoque", async (HttpContext http) =>
            await ListarAsync(http, "movimentacoes_estoque"));

        return app;
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

    private static async Task InserirGenericoAsync(
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

        var payload = await LerPayloadAsync(http);
        if (payload is null)
            return;

        if (!CampoPreenchido(payload, obrigatorio))
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "CAMPO_OBRIGATORIO",
                mensagem = $"Campo obrigatorio nao informado: {obrigatorio}."
            });
            return;
        }

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        var id = await InserirRegistroAsync(conexao, tabela, camposPermitidos, payload);

        if (tabela == "ordens_servico_itens_servicos" || tabela == "ordens_servico_itens_produtos")
        {
            var ordemServicoId = ObterLong(payload, "ordem_servico_id");
            if (ordemServicoId > 0)
            {
                var totais = await RecalcularTotaisOrdemServicoAsync(conexao, ordemServicoId);

                await EscreverJsonAsync(http, StatusCodes.Status201Created, new
                {
                    status = "criado",
                    id,
                    tabela,
                    mensagem = "Item lançado e OS recalculada com sucesso.",
                    ordemServico = new
                    {
                        id = ordemServicoId,
                        totais.valorServicos,
                        totais.valorProdutos,
                        totais.valorTotal
                    }
                });
                return;
            }
        }

        await EscreverJsonAsync(http, StatusCodes.Status201Created, new
        {
            status = "criado",
            id,
            tabela,
            mensagem = "Registro criado com sucesso."
        });
    }


    private static async Task AtualizarItemOrdemServicoAsync(HttpContext http, string tabela, long id)
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

        if (!TabelaItensOsExigeIdManual(tabela))
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "TABELA_INVALIDA",
                mensagem = "Tabela de item da OS invalida."
            });
            return;
        }

        var payload = await LerPayloadAsync(http);
        if (payload is null)
            return;

        var descricao = ObterTexto(payload, "descricao");
        if (string.IsNullOrWhiteSpace(descricao))
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "DESCRICAO_OBRIGATORIA",
                mensagem = "Informe a descricao do item."
            });
            return;
        }

        var quantidade = ObterDecimal(payload, "quantidade");
        var valorUnitario = ObterDecimal(payload, "valor_unitario");
        var valorTotal = ObterDecimal(payload, "valor_total");
        var observacao = ObterTexto(payload, "observacao");

        if (quantidade <= 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "QUANTIDADE_INVALIDA",
                mensagem = "A quantidade deve ser maior que zero."
            });
            return;
        }

        if (valorUnitario < 0 || valorTotal < 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "VALOR_INVALIDO",
                mensagem = "Valores nao podem ser negativos."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        await GarantirTabelaLogsItensOsAsync(conexao);

        await using var transacao = await conexao.BeginTransactionAsync();

        try
        {
            var itemAntes = await ObterItemOsAsync(conexao, transacao, tabela, id);
            if (itemAntes is null)
            {
                await transacao.RollbackAsync();
                await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                {
                    erro = "ITEM_NAO_ENCONTRADO",
                    mensagem = "Item da OS nao encontrado ou ja excluido."
                });
                return;
            }

            var ordemServicoId = Convert.ToInt64(itemAntes["ordem_servico_id"] ?? 0);
            var statusOs = await ObterStatusOrdemServicoAsync(conexao, transacao, ordemServicoId);

            if (!StatusOsAberta(statusOs))
            {
                await transacao.RollbackAsync();
                await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
                {
                    erro = "OS_NAO_ABERTA",
                    mensagem = $"Nao e permitido alterar item: a OS esta com status {statusOs}."
                });
                return;
            }

            await using (var cmd = conexao.CreateCommand())
            {
                cmd.Transaction = (SqlTransaction)transacao;

                if (tabela == "ordens_servico_itens_servicos")
                {
                    cmd.CommandText = $@"
UPDATE {tabela}
   SET servico_id = @cadastro_id,
       descricao = @descricao,
       quantidade = @quantidade,
       valor_unitario = @valor_unitario,
       valor_total = @valor_total,
       observacao = @observacao,
       atualizado_em = @atualizado_em
 WHERE id = @id
   AND ativo = 1;";
                    cmd.Parameters.AddWithValue("@cadastro_id", (object?)ObterLongNullable(payload, "servico_id") ?? DBNull.Value);
                }
                else
                {
                    cmd.CommandText = $@"
UPDATE {tabela}
   SET produto_id = @cadastro_id,
       descricao = @descricao,
       quantidade = @quantidade,
       valor_unitario = @valor_unitario,
       valor_total = @valor_total,
       observacao = @observacao,
       atualizado_em = @atualizado_em
 WHERE id = @id
   AND ativo = 1;";
                    cmd.Parameters.AddWithValue("@cadastro_id", (object?)ObterLongNullable(payload, "produto_id") ?? DBNull.Value);
                }

                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@descricao", descricao);
                cmd.Parameters.AddWithValue("@quantidade", quantidade);
                cmd.Parameters.AddWithValue("@valor_unitario", valorUnitario);
                cmd.Parameters.AddWithValue("@valor_total", valorTotal);
                cmd.Parameters.AddWithValue("@observacao", (object?)observacao ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@atualizado_em", DateTimeOffset.UtcNow.ToString("O"));

                var linhas = await cmd.ExecuteNonQueryAsync();
                if (linhas == 0)
                {
                    await transacao.RollbackAsync();
                    await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                    {
                        erro = "ITEM_NAO_ENCONTRADO",
                        mensagem = "Item da OS nao encontrado ou ja excluido."
                    });
                    return;
                }
            }

            var itemDepois = await ObterItemOsAsync(conexao, transacao, tabela, id);
            var totais = await RecalcularTotaisOrdemServicoAsync(conexao, ordemServicoId, transacao);

            await RegistrarLogItemOsAsync(
                conexao,
                transacao,
                ordemServicoId,
                tabela,
                id,
                "ALTERAR",
                sessao,
                itemAntes,
                itemDepois);

            await transacao.CommitAsync();

            await EscreverJsonAsync(http, StatusCodes.Status200OK, new
            {
                status = "ok",
                mensagem = "Item alterado e OS recalculada com sucesso.",
                tabela,
                id,
                ordemServico = new
                {
                    id = ordemServicoId,
                    totais.valorServicos,
                    totais.valorProdutos,
                    totais.valorTotal
                }
            });
        }
        catch (Exception ex)
        {
            await transacao.RollbackAsync();

            await EscreverJsonAsync(http, StatusCodes.Status500InternalServerError, new
            {
                erro = "ERRO_ATUALIZACAO_ITEM_OS",
                mensagem = "Falha ao alterar item da OS.",
                detalhe = ex.Message
            });
        }
    }

    private static async Task ExcluirItemOrdemServicoAsync(HttpContext http, string tabela, long id)
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

        if (!TabelaItensOsExigeIdManual(tabela))
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "TABELA_INVALIDA",
                mensagem = "Tabela de item da OS invalida."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        await GarantirTabelaLogsItensOsAsync(conexao);

        await using var transacao = await conexao.BeginTransactionAsync();

        try
        {
            var itemAntes = await ObterItemOsAsync(conexao, transacao, tabela, id);
            if (itemAntes is null)
            {
                await transacao.RollbackAsync();
                await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                {
                    erro = "ITEM_NAO_ENCONTRADO",
                    mensagem = "Item da OS nao encontrado ou ja excluido."
                });
                return;
            }

            var ordemServicoId = Convert.ToInt64(itemAntes["ordem_servico_id"] ?? 0);
            var statusOs = await ObterStatusOrdemServicoAsync(conexao, transacao, ordemServicoId);

            if (!StatusOsAberta(statusOs))
            {
                await transacao.RollbackAsync();
                await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
                {
                    erro = "OS_NAO_ABERTA",
                    mensagem = $"Nao e permitido excluir item: a OS esta com status {statusOs}."
                });
                return;
            }

            await using (var cmd = conexao.CreateCommand())
            {
                cmd.Transaction = (SqlTransaction)transacao;
                cmd.CommandText = $@"
UPDATE {tabela}
   SET ativo = 0,
       atualizado_em = @atualizado_em
 WHERE id = @id
   AND ativo = 1;";

                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@atualizado_em", DateTimeOffset.UtcNow.ToString("O"));

                var linhas = await cmd.ExecuteNonQueryAsync();
                if (linhas == 0)
                {
                    await transacao.RollbackAsync();
                    await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                    {
                        erro = "ITEM_NAO_ENCONTRADO",
                        mensagem = "Item da OS nao encontrado ou ja excluido."
                    });
                    return;
                }
            }

            var itemDepois = await ObterItemOsAsync(conexao, transacao, tabela, id, incluirInativo: true);
            var totais = await RecalcularTotaisOrdemServicoAsync(conexao, ordemServicoId, transacao);

            await RegistrarLogItemOsAsync(
                conexao,
                transacao,
                ordemServicoId,
                tabela,
                id,
                "EXCLUIR",
                sessao,
                itemAntes,
                itemDepois);

            await transacao.CommitAsync();

            await EscreverJsonAsync(http, StatusCodes.Status200OK, new
            {
                status = "ok",
                mensagem = "Item excluido e OS recalculada com sucesso.",
                tabela,
                id,
                ordemServico = new
                {
                    id = ordemServicoId,
                    totais.valorServicos,
                    totais.valorProdutos,
                    totais.valorTotal
                }
            });
        }
        catch (Exception ex)
        {
            await transacao.RollbackAsync();

            await EscreverJsonAsync(http, StatusCodes.Status500InternalServerError, new
            {
                erro = "ERRO_EXCLUSAO_ITEM_OS",
                mensagem = "Falha ao excluir item da OS.",
                detalhe = ex.Message
            });
        }
    }

    private static bool StatusOsAberta(string status)
    {
        return string.Equals((status ?? "").Trim(), "Aberta", StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<string> ObterStatusOrdemServicoAsync(
        SqlConnection conexao,
        System.Data.Common.DbTransaction transacao,
        long ordemServicoId)
    {
        await using var cmd = conexao.CreateCommand();
        cmd.Transaction = (SqlTransaction)transacao;
        cmd.CommandText = @"
SELECT TOP 1 COALESCE(status, '')
  FROM ordens_servico
 WHERE id = @id
   AND ativo = 1;";
        cmd.Parameters.AddWithValue("@id", ordemServicoId);

        var valor = await cmd.ExecuteScalarAsync();
        return valor is null || valor == DBNull.Value ? "" : Convert.ToString(valor) ?? "";
    }

    private static async Task<Dictionary<string, object?>?> ObterItemOsAsync(
        SqlConnection conexao,
        System.Data.Common.DbTransaction transacao,
        string tabela,
        long id,
        bool incluirInativo = false)
    {
        await using var cmd = conexao.CreateCommand();
        cmd.Transaction = (SqlTransaction)transacao;

        cmd.CommandText = $@"
SELECT *
  FROM {tabela}
 WHERE id = @id
   {(incluirInativo ? "" : "AND ativo = 1")};";

        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return null;

        return LerLinha(reader);
    }

    private static async Task GarantirTabelaLogsItensOsAsync(SqlConnection conexao)
    {
        await using var cmd = conexao.CreateCommand();
        cmd.CommandText = @"
IF OBJECT_ID('dbo.logs_ordens_servico_itens', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.logs_ordens_servico_itens
    (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ordem_servico_id BIGINT NOT NULL,
        tabela_item NVARCHAR(120) NOT NULL,
        item_id BIGINT NOT NULL,
        acao NVARCHAR(30) NOT NULL,
        usuario_id NVARCHAR(120) NULL,
        usuario_email NVARCHAR(255) NULL,
        dados_antes NVARCHAR(MAX) NULL,
        dados_depois NVARCHAR(MAX) NULL,
        criado_em NVARCHAR(40) NOT NULL
    );
END;
";
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task RegistrarLogItemOsAsync(
        SqlConnection conexao,
        System.Data.Common.DbTransaction transacao,
        long ordemServicoId,
        string tabela,
        long itemId,
        string acao,
        SessaoResolvida sessao,
        Dictionary<string, object?>? antes,
        Dictionary<string, object?>? depois)
    {
        await using var cmd = conexao.CreateCommand();
        cmd.Transaction = (SqlTransaction)transacao;

        cmd.CommandText = @"
INSERT INTO logs_ordens_servico_itens
    (ordem_servico_id, tabela_item, item_id, acao, usuario_id, usuario_email, dados_antes, dados_depois, criado_em)
VALUES
    (@ordem_servico_id, @tabela_item, @item_id, @acao, @usuario_id, @usuario_email, @dados_antes, @dados_depois, @criado_em);";

        cmd.Parameters.AddWithValue("@ordem_servico_id", ordemServicoId);
        cmd.Parameters.AddWithValue("@tabela_item", tabela);
        cmd.Parameters.AddWithValue("@item_id", itemId);
        cmd.Parameters.AddWithValue("@acao", acao);
        cmd.Parameters.AddWithValue("@usuario_id", (object?)sessao.UsuarioId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@usuario_email", (object?)sessao.Email ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@dados_antes", antes is null ? DBNull.Value : JsonSerializer.Serialize(antes, JsonOptions));
        cmd.Parameters.AddWithValue("@dados_depois", depois is null ? DBNull.Value : JsonSerializer.Serialize(depois, JsonOptions));
        cmd.Parameters.AddWithValue("@criado_em", DateTimeOffset.UtcNow.ToString("O"));

        await cmd.ExecuteNonQueryAsync();
    }

    private static long? ObterLongNullable(JsonObject payload, string nome)
    {
        var texto = ObterTexto(payload, nome);
        if (string.IsNullOrWhiteSpace(texto))
            return null;

        return long.TryParse(texto, out var valor) && valor > 0 ? valor : null;
    }

    private static async Task InserirRequisicaoEstoqueComBaixaAsync(HttpContext http)
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

        var payload = await LerPayloadAsync(http);
        if (payload is null)
            return;

        var ordemServicoId = ObterLong(payload, "ordem_servico_id");
        var produtoId = ObterLong(payload, "produto_id");
        var quantidadeSolicitada = ObterDecimal(payload, "quantidade_solicitada");

        if (ordemServicoId <= 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "ORDEM_SERVICO_OBRIGATORIA",
                mensagem = "Informe a ordem_servico_id."
            });
            return;
        }

        if (produtoId <= 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "PRODUTO_OBRIGATORIO",
                mensagem = "Informe o produto_id."
            });
            return;
        }

        if (quantidadeSolicitada <= 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "QUANTIDADE_INVALIDA",
                mensagem = "A quantidade_solicitada deve ser maior que zero."
            });
            return;
        }

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        await using var transacao = await conexao.BeginTransactionAsync();

        try
        {
            var produto = await ObterProdutoParaBaixaAsync(conexao, produtoId, transacao);
            if (produto is null)
            {
                await transacao.RollbackAsync();
                await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                {
                    erro = "PRODUTO_NAO_ENCONTRADO",
                    mensagem = "Produto nao encontrado para baixa de estoque."
                });
                return;
            }

            if (produto.EstoqueAtual < quantidadeSolicitada)
            {
                await transacao.RollbackAsync();
                await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
                {
                    erro = "ESTOQUE_INSUFICIENTE",
                    mensagem = "Estoque insuficiente para atender a requisicao.",
                    produto = produto.Nome,
                    estoqueAtual = produto.EstoqueAtual,
                    quantidadeSolicitada
                });
                return;
            }

            var agora = DateTimeOffset.UtcNow.ToString("O");
            var estoqueAnterior = produto.EstoqueAtual;
            var estoqueNovo = estoqueAnterior - quantidadeSolicitada;

            payload["quantidade_baixada"] = JsonValue.Create(quantidadeSolicitada);
            payload["status"] = JsonValue.Create("Baixada");

            var requisicaoId = await InserirRegistroAsync(
                conexao,
                "requisicoes_estoque",
                new[]
                {
                    "ordem_servico_id",
                    "produto_id",
                    "quantidade_solicitada",
                    "quantidade_baixada",
                    "status",
                    "observacao",
                    "ativo"
                },
                payload,
                transacao);

            await ExecutarAsync(conexao, """
UPDATE produtos
   SET estoque_atual = @estoque_novo,
       atualizado_em = @agora
 WHERE id = @produto_id;
""", new Dictionary<string, object?>
            {
                ["@estoque_novo"] = estoqueNovo,
                ["@agora"] = agora,
                ["@produto_id"] = produtoId
            }, transacao);

            await ExecutarAsync(conexao, """
INSERT INTO movimentacoes_estoque
    (produto_id, ordem_servico_id, requisicao_estoque_id, tipo, quantidade, estoque_anterior, estoque_posterior, origem, observacao, criado_em)
VALUES
    (@produto_id, @ordem_servico_id, @requisicao_id, 'SAIDA_OS', @quantidade, @estoque_anterior, @estoque_posterior, 'REQUISICAO_OS', @observacao, @agora);
""", new Dictionary<string, object?>
            {
                ["@produto_id"] = produtoId,
                ["@ordem_servico_id"] = ordemServicoId,
                ["@requisicao_id"] = requisicaoId,
                ["@quantidade"] = quantidadeSolicitada,
                ["@estoque_anterior"] = estoqueAnterior,
                ["@estoque_posterior"] = estoqueNovo,
                ["@observacao"] = ObterTexto(payload, "observacao") ?? "Baixa imediata por requisicao de estoque da OS.",
                ["@agora"] = agora
            }, transacao);

            await transacao.CommitAsync();

            await EscreverJsonAsync(http, StatusCodes.Status201Created, new
            {
                status = "criado",
                id = requisicaoId,
                tabela = "requisicoes_estoque",
                mensagem = "Requisicao criada e estoque baixado com sucesso.",
                baixa = new
                {
                    produtoId,
                    produto = produto.Nome,
                    quantidadeBaixada = quantidadeSolicitada,
                    estoqueAnterior,
                    estoquePosterior = estoqueNovo
                }
            });
        }
        catch (Exception ex)
        {
            await transacao.RollbackAsync();

            await EscreverJsonAsync(http, StatusCodes.Status500InternalServerError, new
            {
                erro = "ERRO_BAIXA_ESTOQUE",
                mensagem = "Falha ao criar requisicao e baixar estoque.",
                detalhe = ex.Message
            });
        }
    }


    private static async Task<(decimal valorServicos, decimal valorProdutos, decimal valorTotal)> RecalcularTotaisOrdemServicoAsync(
        SqlConnection conexao,
        long ordemServicoId,
        System.Data.Common.DbTransaction? transacao = null)
    {
        var valorServicos = await SomarItensAtivosAsync(conexao, transacao, "ordens_servico_itens_servicos", "ordem_servico_id", ordemServicoId);
        var valorProdutos = await SomarItensAtivosAsync(conexao, transacao, "ordens_servico_itens_produtos", "ordem_servico_id", ordemServicoId);
        var valorTotal = valorServicos + valorProdutos;

        await ExecutarAsync(conexao, """
UPDATE ordens_servico
   SET valor_servicos = @valor_servicos,
       valor_produtos = @valor_produtos,
       valor_total = @valor_total,
       atualizado_em = @atualizado_em
 WHERE id = @ordem_servico_id
   AND ativo = 1;
""", new Dictionary<string, object?>
        {
            ["@valor_servicos"] = valorServicos,
            ["@valor_produtos"] = valorProdutos,
            ["@valor_total"] = valorTotal,
            ["@atualizado_em"] = DateTimeOffset.UtcNow.ToString("O"),
            ["@ordem_servico_id"] = ordemServicoId
        }, transacao);

        return (valorServicos, valorProdutos, valorTotal);
    }

    private static async Task<decimal> SomarItensAtivosAsync(
        SqlConnection conexao,
        System.Data.Common.DbTransaction? transacao,
        string tabela,
        string campoVinculo,
        long idVinculo)
    {
        await using var cmd = conexao.CreateCommand();

        if (transacao is not null)
            cmd.Transaction = (SqlTransaction)transacao;

        cmd.CommandText = $@"
SELECT COALESCE(SUM(COALESCE(valor_total, 0)), 0)
  FROM {tabela}
 WHERE {campoVinculo} = @id_vinculo
   AND COALESCE(ativo, 1) <> 0;
";

        cmd.Parameters.AddWithValue("@id_vinculo", idVinculo);

        var valor = await cmd.ExecuteScalarAsync();
        return valor is null || valor == DBNull.Value ? 0m : Convert.ToDecimal(valor);
    }

    private static async Task<JsonObject?> LerPayloadAsync(HttpContext http)
    {
        try
        {
            var payload = await JsonSerializer.DeserializeAsync<JsonObject>(http.Request.Body, JsonOptions);

            if (payload is null)
            {
                await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
                {
                    erro = "PAYLOAD_OBRIGATORIO",
                    mensagem = "Informe os dados."
                });
                return null;
            }

            return payload;
        }
        catch
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "JSON_INVALIDO",
                mensagem = "JSON invalido."
            });
            return null;
        }
    }

    private static bool CampoPreenchido(JsonObject payload, string campo)
    {
        return payload.TryGetPropertyValue(campo, out var valor) &&
               !string.IsNullOrWhiteSpace(valor?.ToString());
    }

    private static async Task<long> InserirRegistroAsync(
        SqlConnection conexao,
        string tabela,
        IReadOnlyList<string> camposPermitidos,
        JsonObject payload,
        System.Data.Common.DbTransaction? transacao = null)
    {
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

        if (TabelaItensOsExigeIdManual(tabela) &&
            !campos.Any(campo => string.Equals(campo, "id", StringComparison.OrdinalIgnoreCase)))
        {
            var proximoId = await ObterProximoIdTabelaAsync(conexao, tabela, transacao);
            campos.Insert(0, "id");
            parametros.Insert(0, "@id");
            valores["id"] = proximoId;
        }

        var agora = DateTimeOffset.UtcNow.ToString("O");

        campos.Add("criado_em");
        parametros.Add("@criado_em");
        valores["criado_em"] = agora;

        campos.Add("atualizado_em");
        parametros.Add("@atualizado_em");
        valores["atualizado_em"] = agora;

        await using var cmd = conexao.CreateCommand();
        if (transacao is not null)
            cmd.Transaction = (SqlTransaction)transacao;

        cmd.CommandText = $@"
INSERT INTO {tabela}
    ({string.Join(", ", campos)})
OUTPUT INSERTED.id
VALUES
    ({string.Join(", ", parametros)});
";

        foreach (var item in valores)
            cmd.Parameters.AddWithValue("@" + item.Key, item.Value ?? DBNull.Value);

        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }


    private static bool TabelaItensOsExigeIdManual(string tabela)
    {
        return string.Equals(tabela, "ordens_servico_itens_servicos", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(tabela, "ordens_servico_itens_produtos", StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<long> ObterProximoIdTabelaAsync(
        SqlConnection conexao,
        string tabela,
        System.Data.Common.DbTransaction? transacao = null)
    {
        await using var cmd = conexao.CreateCommand();

        if (transacao is not null)
            cmd.Transaction = (SqlTransaction)transacao;

        cmd.CommandText = $@"
SELECT COALESCE(MAX(id), 0) + 1
  FROM {tabela} WITH (UPDLOCK, HOLDLOCK);
";

        var valor = await cmd.ExecuteScalarAsync();
        return valor is null || valor == DBNull.Value ? 1L : Convert.ToInt64(valor);
    }

    private static async Task<ProdutoEstoque?> ObterProdutoParaBaixaAsync(
        SqlConnection conexao,
        long produtoId,
        System.Data.Common.DbTransaction transacao)
    {
        await using var cmd = conexao.CreateCommand();
        cmd.Transaction = (SqlTransaction)transacao;

        cmd.CommandText = """
SELECT id, nome, estoque_atual
FROM produtos
WHERE id = @produto_id
  AND ativo = 1

""";
        cmd.Parameters.AddWithValue("@produto_id", produtoId);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return null;

        return new ProdutoEstoque(
            Id: reader.GetInt64(0),
            Nome: reader.GetString(1),
            EstoqueAtual: Convert.ToDecimal(reader.GetValue(2)));
    }

    private static Task GarantirBancoTenantAsync(TenantResolvido tenant)
    {
        return Task.CompletedTask;
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

    private static long ObterLong(JsonObject payload, string nome)
    {
        var texto = ObterValor(payload, nome);
        return long.TryParse(texto, out var valor) ? valor : 0;
    }

    private static decimal ObterDecimal(JsonObject payload, string nome)
    {
        var texto = ObterValor(payload, nome);
        if (string.IsNullOrWhiteSpace(texto))
            return 0;

        texto = texto.Replace(".", "").Replace(",", ".");

        return decimal.TryParse(
            texto,
            System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture,
            out var valor)
            ? valor
            : 0;
    }

    private static string? ObterTexto(JsonObject payload, string nome)
    {
        return ObterValor(payload, nome);
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
        Dictionary<string, object?> parametros,
        System.Data.Common.DbTransaction? transacao = null)
    {
        await using var cmd = conexao.CreateCommand();
        if (transacao is not null)
            cmd.Transaction = (SqlTransaction)transacao;

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

    private sealed record ProdutoEstoque(long Id, string Nome, decimal EstoqueAtual);

    private sealed record SessaoResolvida(string UsuarioId, string Email, TenantResolvido Tenant);

    private sealed record TenantResolvido(
        string Id,
        string Nome,
        string Chave,
        string Banco,
        string CaminhoBanco);
}

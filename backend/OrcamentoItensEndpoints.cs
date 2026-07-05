using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;

public static class OrcamentoItensEndpoints
{
    private const string DiretorioDados = "/opt/servicopro/dados";
    private const string BancoAdministrativo = "/opt/servicopro/dados/servicopro_admin.db";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    public static WebApplication MapOrcamentoItensEndpoints(this WebApplication app)
    {
        var grupo = app.MapGroup("/api");

        grupo.MapGet("/orcamentos-itens-servicos", async (HttpContext http) =>
            await ListarAsync(http, "orcamentos_itens_servicos"));

        grupo.MapPost("/orcamentos-itens-servicos", async (HttpContext http) =>
            await InserirItemOrcamentoAsync(http, "orcamentos_itens_servicos", new[]
            {
                "orcamento_id",
                "servico_id",
                "descricao",
                "quantidade",
                "valor_unitario",
                "valor_total",
                "desconto_percentual",
                "desconto_valor",
                "valor_liquido",
                "observacao",
                "ativo",
                "criado_em",
                "atualizado_em"
            }));

        grupo.MapGet("/orcamentos-itens-produtos", async (HttpContext http) =>
            await ListarAsync(http, "orcamentos_itens_produtos"));

        grupo.MapPost("/orcamentos-itens-produtos", async (HttpContext http) =>
            await InserirItemOrcamentoAsync(http, "orcamentos_itens_produtos", new[]
            {
                "orcamento_id",
                "produto_id",
                "descricao",
                "quantidade",
                "valor_unitario",
                "valor_total",
                "desconto_percentual",
                "desconto_valor",
                "valor_liquido",
                "observacao",
                "ativo",
                "criado_em",
                "atualizado_em"
            }));

        grupo.MapPut("/orcamentos-itens-servicos/{id:long}", async (HttpContext http, long id) =>
            await AtualizarItemOrcamentoAsync(http, "orcamentos_itens_servicos", id));

        grupo.MapPut("/orcamentos-itens-produtos/{id:long}", async (HttpContext http, long id) =>
            await AtualizarItemOrcamentoAsync(http, "orcamentos_itens_produtos", id));

        grupo.MapDelete("/orcamentos-itens-servicos/{id:long}", async (HttpContext http, long id) =>
            await ExcluirItemOrcamentoAsync(http, "orcamentos_itens_servicos", id));

        grupo.MapDelete("/orcamentos-itens-produtos/{id:long}", async (HttpContext http, long id) =>
            await ExcluirItemOrcamentoAsync(http, "orcamentos_itens_produtos", id));

        grupo.MapPost("/orcamentos/{id:long}/recalcular", async (HttpContext http, long id) =>
            await RecalcularOrcamentoAsync(http, id));

        grupo.MapPost("/orcamentos/{id:long}/aprovar", async (HttpContext http, long id) =>
            await AprovarOrcamentoAsync(http, id));

        grupo.MapPost("/orcamentos/{id:long}/reprovar", async (HttpContext http, long id) =>
            await ReprovarOrcamentoAsync(http, id));

        grupo.MapPost("/orcamentos/{id:long}/cancelar", async (HttpContext http, long id) =>
            await CancelarOrcamentoAsync(http, id));

        grupo.MapPost("/ordens-servico/{id:long}/aprovar", async (HttpContext http, long id) =>
            await AprovarOrdemServicoAsync(http, id));

        grupo.MapGet("/configuracoes/empresa", async (HttpContext http) =>
            await ObterEmpresaEmissoraAsync(http));

        grupo.MapPut("/configuracoes/empresa", async (HttpContext http) =>
            await SalvarEmpresaEmissoraAsync(http));

        grupo.MapPost("/configuracoes/empresa", async (HttpContext http) =>
            await SalvarEmpresaEmissoraAsync(http));

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

        if (tabela == "orcamentos_itens_servicos" || tabela == "orcamentos_itens_produtos")
            cmd.CommandText = $"SELECT * FROM {tabela} WHERE ativo = 1 ORDER BY id DESC;";
        else
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

    private static async Task InserirItemOrcamentoAsync(
        HttpContext http,
        string tabela,
        IReadOnlyList<string> camposPermitidos)
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

        var orcamentoId = ObterLong(payload, "orcamento_id");
        if (orcamentoId <= 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "ORCAMENTO_OBRIGATORIO",
                mensagem = "Informe o orcamento_id."
            });
            return;
        }

        if (!CampoPreenchido(payload, "descricao"))
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
        var descontoPercentual = ObterDecimal(payload, "desconto_percentual");
        var descontoValor = ObterDecimal(payload, "desconto_valor");

        if (quantidade <= 0)
            quantidade = 1;

        if (valorTotal <= 0 && valorUnitario > 0)
            valorTotal = quantidade * valorUnitario;

        if (valorTotal < 0)
            valorTotal = 0;

        if (descontoPercentual < 0)
            descontoPercentual = 0;

        if (descontoPercentual > 100)
            descontoPercentual = 100;

        if (descontoValor < 0)
            descontoValor = 0;

        if (descontoPercentual > 0 && descontoValor <= 0)
            descontoValor = Math.Round(valorTotal * descontoPercentual / 100m, 4);

        if (descontoValor > valorTotal)
            descontoValor = valorTotal;

        if (descontoValor > 0 && descontoPercentual <= 0 && valorTotal > 0)
            descontoPercentual = Math.Round(descontoValor / valorTotal * 100m, 4);

        var valorLiquido = valorTotal - descontoValor;
        if (valorLiquido < 0)
            valorLiquido = 0;

        var agora = DateTimeOffset.UtcNow.ToString("O");

        payload["quantidade"] = JsonValue.Create(quantidade);
        payload["valor_unitario"] = JsonValue.Create(valorUnitario);
        payload["valor_total"] = JsonValue.Create(valorTotal);
        payload["desconto_percentual"] = JsonValue.Create(descontoPercentual);
        payload["desconto_valor"] = JsonValue.Create(descontoValor);
        payload["valor_liquido"] = JsonValue.Create(valorLiquido);
        payload["ativo"] = JsonValue.Create(true);
        payload["criado_em"] = JsonValue.Create(agora);
        payload["atualizado_em"] = JsonValue.Create(agora);

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        await using var transacao = await conexao.BeginTransactionAsync();

        try
        {
            var existeOrcamento = await ExisteRegistroAsync(conexao, transacao, "orcamentos", orcamentoId);
            if (!existeOrcamento)
            {
                await transacao.RollbackAsync();
                await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                {
                    erro = "ORCAMENTO_NAO_ENCONTRADO",
                    mensagem = "Orcamento nao encontrado."
                });
                return;
            }

            await using (var cmdStatusOrcamento = conexao.CreateCommand())
            {
                cmdStatusOrcamento.Transaction = (SqlTransaction)transacao;
                cmdStatusOrcamento.CommandText = @"
SELECT TOP 1 status
  FROM orcamentos
 WHERE id = @orcamento_id;";
                cmdStatusOrcamento.Parameters.AddWithValue("@orcamento_id", orcamentoId);

                var statusOrcamentoObj = await cmdStatusOrcamento.ExecuteScalarAsync();
                var statusOrcamento = statusOrcamentoObj is null || statusOrcamentoObj == DBNull.Value
                    ? ""
                    : Convert.ToString(statusOrcamentoObj) ?? "";
                var statusOrcamentoNormalizado = statusOrcamento.ToLowerInvariant();

                if (statusOrcamentoNormalizado.Contains("aprov") || statusOrcamentoNormalizado.Contains("reprov") || statusOrcamentoNormalizado.Contains("cancel"))
                {
                    await transacao.RollbackAsync();
                    await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
                    {
                        erro = "ORCAMENTO_FINALIZADO_BLOQUEIA_ITEM",
                        mensagem = $"Nao e permitido incluir itens em orcamento com status {statusOrcamento}."
                    });
                    return;
                }
            }

            var id = await InserirRegistroAsync(conexao, tabela, camposPermitidos, payload, transacao);

            var totais = await RecalcularOrcamentoInternoAsync(conexao, transacao, orcamentoId);

            await transacao.CommitAsync();

            await EscreverJsonAsync(http, StatusCodes.Status201Created, new
            {
                status = "criado",
                id,
                tabela,
                mensagem = "Item de orcamento criado e total recalculado com sucesso.",
                orcamento = new
                {
                    id = orcamentoId,
                    totais.valorServicos,
                    totais.valorProdutos,
                    totais.valorDesconto,
                    totais.valorTotal
                }
            });
        }
        catch (Exception ex)
        {
            await transacao.RollbackAsync();

            await EscreverJsonAsync(http, StatusCodes.Status500InternalServerError, new
            {
                erro = "ERRO_ITEM_ORCAMENTO",
                mensagem = "Falha ao criar item do orcamento.",
                detalhe = ex.Message
            });
        }
    }


    private static async Task AtualizarItemOrcamentoAsync(HttpContext http, string tabela, long id)
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

        if (tabela != "orcamentos_itens_servicos" && tabela != "orcamentos_itens_produtos")
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "TABELA_INVALIDA",
                mensagem = "Tabela de item de orcamento invalida."
            });
            return;
        }

        var payload = await LerPayloadAsync(http);
        if (payload is null)
            return;

        static string? LerTexto(JsonObject payload, string campo)
        {
            if (!payload.TryGetPropertyValue(campo, out var node) || node is null)
                return null;

            var valor = node.ToString()?.Trim();
            return string.IsNullOrWhiteSpace(valor) ? null : valor;
        }

        static long? LerLongOpcional(JsonObject payload, string campo)
        {
            var texto = LerTexto(payload, campo);
            if (string.IsNullOrWhiteSpace(texto))
                return null;

            return long.TryParse(texto, out var valor) && valor > 0 ? valor : null;
        }

        static decimal LerDecimal(JsonObject payload, string campo)
        {
            var texto = LerTexto(payload, campo);
            if (string.IsNullOrWhiteSpace(texto))
                return 0m;

            texto = texto.Replace("R$", "", StringComparison.OrdinalIgnoreCase).Trim();

            if (texto.Contains(',') && texto.Contains('.'))
                texto = texto.Replace(".", "").Replace(",", ".");
            else if (texto.Contains(','))
                texto = texto.Replace(",", ".");

            return decimal.TryParse(
                texto,
                System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture,
                out var valor
            )
                ? valor
                : 0m;
        }

        var descricao = LerTexto(payload, "descricao");
        if (string.IsNullOrWhiteSpace(descricao))
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "DESCRICAO_OBRIGATORIA",
                mensagem = "Informe a descricao do item."
            });
            return;
        }

        var quantidade = LerDecimal(payload, "quantidade");
        var valorUnitario = LerDecimal(payload, "valor_unitario");
        var valorTotal = LerDecimal(payload, "valor_total");
        var descontoPercentual = LerDecimal(payload, "desconto_percentual");
        var descontoValor = LerDecimal(payload, "desconto_valor");
        var valorLiquido = LerDecimal(payload, "valor_liquido");
        var observacao = LerTexto(payload, "observacao");

        if (quantidade <= 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "QUANTIDADE_INVALIDA",
                mensagem = "A quantidade deve ser maior que zero."
            });
            return;
        }

        if (valorUnitario < 0 || valorTotal < 0 || descontoPercentual < 0 || descontoValor < 0 || valorLiquido < 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "VALOR_INVALIDO",
                mensagem = "Valores e descontos nao podem ser negativos."
            });
            return;
        }

        if (descontoPercentual > 100)
            descontoPercentual = 100;

        if (descontoValor > valorTotal)
            descontoValor = valorTotal;

        if (valorLiquido == 0 && valorTotal > 0)
            valorLiquido = Math.Max(0, valorTotal - descontoValor);

        await GarantirBancoTenantAsync(sessao.Tenant);

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        await using var transacao = await conexao.BeginTransactionAsync();

        try
        {
            long orcamentoId;

            await using (var cmdBusca = conexao.CreateCommand())
            {
                cmdBusca.Transaction = (SqlTransaction)transacao;
                cmdBusca.CommandText = $@"
SELECT orcamento_id
  FROM {tabela}
 WHERE id = @id
   AND ativo = 1;";

                cmdBusca.Parameters.AddWithValue("@id", id);

                var valor = await cmdBusca.ExecuteScalarAsync();
                if (valor is null || valor == DBNull.Value)
                {
                    await transacao.RollbackAsync();
                    await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                    {
                        erro = "ITEM_NAO_ENCONTRADO",
                        mensagem = "Item de orcamento nao encontrado ou ja excluido."
                    });
                    return;
                }

                orcamentoId = Convert.ToInt64(valor);
            }

            await using (var cmdBloqueio = conexao.CreateCommand())
            {
                cmdBloqueio.Transaction = (SqlTransaction)transacao;
                cmdBloqueio.CommandText = @"
SELECT TOP 1 status
  FROM ordens_servico
 WHERE orcamento_id = @orcamento_id
   AND ativo = 1
   AND (
        LOWER(COALESCE(status, '')) LIKE '%encerr%'
        OR LOWER(COALESCE(status, '')) LIKE '%cancel%'
        OR LOWER(COALESCE(status, '')) LIKE '%fechad%'
   );";
                cmdBloqueio.Parameters.AddWithValue("@orcamento_id", orcamentoId);

                var statusBloqueio = await cmdBloqueio.ExecuteScalarAsync();
                if (statusBloqueio is not null && statusBloqueio != DBNull.Value)
                {
                    await transacao.RollbackAsync();
                    await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
                    {
                        erro = "OS_BLOQUEIA_ALTERACAO",
                        mensagem = $"Nao e permitido alterar itens: existe OS vinculada com status {statusBloqueio}."
                    });
                    return;
                }
            }

            await using (var cmdStatusOrcamento = conexao.CreateCommand())
            {
                cmdStatusOrcamento.Transaction = (SqlTransaction)transacao;
                cmdStatusOrcamento.CommandText = @"
SELECT TOP 1 status
  FROM orcamentos
 WHERE id = @orcamento_id;";
                cmdStatusOrcamento.Parameters.AddWithValue("@orcamento_id", orcamentoId);

                var statusOrcamentoObj = await cmdStatusOrcamento.ExecuteScalarAsync();
                var statusOrcamento = statusOrcamentoObj is null || statusOrcamentoObj == DBNull.Value
                    ? ""
                    : Convert.ToString(statusOrcamentoObj) ?? "";
                var statusOrcamentoNormalizado = statusOrcamento.ToLowerInvariant();

                if (statusOrcamentoNormalizado.Contains("aprov") || statusOrcamentoNormalizado.Contains("reprov") || statusOrcamentoNormalizado.Contains("cancel"))
                {
                    await transacao.RollbackAsync();
                    await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
                    {
                        erro = "ORCAMENTO_FINALIZADO_BLOQUEIA_ALTERACAO",
                        mensagem = $"Nao e permitido alterar itens em orcamento com status {statusOrcamento}."
                    });
                    return;
                }
            }

            await using (var cmdAtualiza = conexao.CreateCommand())
            {
                cmdAtualiza.Transaction = (SqlTransaction)transacao;

                if (tabela == "orcamentos_itens_servicos")
                {
                    cmdAtualiza.CommandText = $@"
UPDATE {tabela}
   SET servico_id = @cadastro_id,
       descricao = @descricao,
       quantidade = @quantidade,
       valor_unitario = @valor_unitario,
       valor_total = @valor_total,
       desconto_percentual = @desconto_percentual,
       desconto_valor = @desconto_valor,
       valor_liquido = @valor_liquido,
       observacao = @observacao,
       atualizado_em = @atualizado_em
 WHERE id = @id
   AND ativo = 1;";
                    cmdAtualiza.Parameters.AddWithValue("@cadastro_id", (object?)LerLongOpcional(payload, "servico_id") ?? DBNull.Value);
                }
                else
                {
                    cmdAtualiza.CommandText = $@"
UPDATE {tabela}
   SET produto_id = @cadastro_id,
       descricao = @descricao,
       quantidade = @quantidade,
       valor_unitario = @valor_unitario,
       valor_total = @valor_total,
       desconto_percentual = @desconto_percentual,
       desconto_valor = @desconto_valor,
       valor_liquido = @valor_liquido,
       observacao = @observacao,
       atualizado_em = @atualizado_em
 WHERE id = @id
   AND ativo = 1;";
                    cmdAtualiza.Parameters.AddWithValue("@cadastro_id", (object?)LerLongOpcional(payload, "produto_id") ?? DBNull.Value);
                }

                cmdAtualiza.Parameters.AddWithValue("@id", id);
                cmdAtualiza.Parameters.AddWithValue("@descricao", descricao);
                cmdAtualiza.Parameters.AddWithValue("@quantidade", quantidade);
                cmdAtualiza.Parameters.AddWithValue("@valor_unitario", valorUnitario);
                cmdAtualiza.Parameters.AddWithValue("@valor_total", valorTotal);
                cmdAtualiza.Parameters.AddWithValue("@desconto_percentual", descontoPercentual);
                cmdAtualiza.Parameters.AddWithValue("@desconto_valor", descontoValor);
                cmdAtualiza.Parameters.AddWithValue("@valor_liquido", valorLiquido);
                cmdAtualiza.Parameters.AddWithValue("@observacao", (object?)observacao ?? DBNull.Value);
                cmdAtualiza.Parameters.AddWithValue("@atualizado_em", DateTimeOffset.UtcNow.ToString("O"));

                var linhas = await cmdAtualiza.ExecuteNonQueryAsync();
                if (linhas == 0)
                {
                    await transacao.RollbackAsync();
                    await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                    {
                        erro = "ITEM_NAO_ENCONTRADO",
                        mensagem = "Item de orcamento nao encontrado ou ja excluido."
                    });
                    return;
                }
            }

            var totais = await RecalcularOrcamentoInternoAsync(conexao, transacao, orcamentoId);
            await transacao.CommitAsync();

            await EscreverJsonAsync(http, StatusCodes.Status200OK, new
            {
                status = "ok",
                mensagem = "Item alterado e orcamento recalculado com sucesso.",
                tabela,
                id,
                orcamento = new
                {
                    id = orcamentoId,
                    totais.valorServicos,
                    totais.valorProdutos,
                    totais.valorDesconto,
                    totais.valorTotal
                }
            });
        }
        catch (Exception ex)
        {
            await transacao.RollbackAsync();

            await EscreverJsonAsync(http, StatusCodes.Status500InternalServerError, new
            {
                erro = "ERRO_ATUALIZACAO_ITEM_ORCAMENTO",
                mensagem = "Falha ao alterar item do orcamento.",
                detalhe = ex.Message
            });
        }
    }


    private static async Task ExcluirItemOrcamentoAsync(HttpContext http, string tabela, long id)
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
                erro = "ITEM_INVALIDO",
                mensagem = "Informe um item valido para exclusao."
            });
            return;
        }

        if (tabela != "orcamentos_itens_servicos" && tabela != "orcamentos_itens_produtos")
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "TABELA_INVALIDA",
                mensagem = "Tabela de item de orcamento invalida."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        await using var transacao = await conexao.BeginTransactionAsync();

        try
        {
            long orcamentoId;

            await using (var cmdBusca = conexao.CreateCommand())
            {
                cmdBusca.Transaction = (SqlTransaction)transacao;
                cmdBusca.CommandText = $@"
SELECT orcamento_id
  FROM {tabela}
 WHERE id = @id
   AND ativo = 1
 ";

                cmdBusca.Parameters.AddWithValue("@id", id);

                var valor = await cmdBusca.ExecuteScalarAsync();
                if (valor is null || valor == DBNull.Value)
                {
                    await transacao.RollbackAsync();
                    await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                    {
                        erro = "ITEM_NAO_ENCONTRADO",
                        mensagem = "Item de orcamento nao encontrado ou ja excluido."
                    });
                    return;
                }

                orcamentoId = Convert.ToInt64(valor);
            }

            await using (var cmdStatusOrcamento = conexao.CreateCommand())
            {
                cmdStatusOrcamento.Transaction = (SqlTransaction)transacao;
                cmdStatusOrcamento.CommandText = @"
SELECT TOP 1 status
  FROM orcamentos
 WHERE id = @orcamento_id;";
                cmdStatusOrcamento.Parameters.AddWithValue("@orcamento_id", orcamentoId);

                var statusOrcamentoObj = await cmdStatusOrcamento.ExecuteScalarAsync();
                var statusOrcamento = statusOrcamentoObj is null || statusOrcamentoObj == DBNull.Value
                    ? ""
                    : Convert.ToString(statusOrcamentoObj) ?? "";
                var statusOrcamentoNormalizado = statusOrcamento.ToLowerInvariant();

                if (statusOrcamentoNormalizado.Contains("aprov") || statusOrcamentoNormalizado.Contains("reprov") || statusOrcamentoNormalizado.Contains("cancel"))
                {
                    await transacao.RollbackAsync();
                    await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
                    {
                        erro = "ORCAMENTO_FINALIZADO_BLOQUEIA_EXCLUSAO",
                        mensagem = $"Nao e permitido excluir itens em orcamento com status {statusOrcamento}."
                    });
                    return;
                }
            }

            await using (var cmdAtualiza = conexao.CreateCommand())
            {
                cmdAtualiza.Transaction = (SqlTransaction)transacao;
                cmdAtualiza.CommandText = $@"
UPDATE {tabela}
   SET ativo = 0,
       atualizado_em = @atualizado_em
 WHERE id = @id
   AND ativo = 1;";

                cmdAtualiza.Parameters.AddWithValue("@id", id);
                cmdAtualiza.Parameters.AddWithValue("@atualizado_em", DateTimeOffset.UtcNow.ToString("O"));

                var linhas = await cmdAtualiza.ExecuteNonQueryAsync();
                if (linhas == 0)
                {
                    await transacao.RollbackAsync();
                    await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                    {
                        erro = "ITEM_NAO_ENCONTRADO",
                        mensagem = "Item de orcamento nao encontrado ou ja excluido."
                    });
                    return;
                }
            }

            var totais = await RecalcularOrcamentoInternoAsync(conexao, transacao, orcamentoId);

            await transacao.CommitAsync();

            await EscreverJsonAsync(http, StatusCodes.Status200OK, new
            {
                status = "ok",
                mensagem = "Item excluido logicamente e orcamento recalculado com sucesso.",
                tabela,
                id,
                orcamento = new
                {
                    id = orcamentoId,
                    totais.valorServicos,
                    totais.valorProdutos,
                    totais.valorDesconto,
                    totais.valorTotal
                }
            });
        }
        catch (Exception ex)
        {
            await transacao.RollbackAsync();

            await EscreverJsonAsync(http, StatusCodes.Status500InternalServerError, new
            {
                erro = "ERRO_EXCLUSAO_ITEM_ORCAMENTO",
                mensagem = "Falha ao excluir item do orcamento.",
                detalhe = ex.Message
            });
        }
    }



    private static async Task ReprovarOrcamentoAsync(HttpContext http, long id)
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
                mensagem = "Informe um orçamento válido."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);

        string? statusAtual = null;

        await using (var cmdStatus = conexao.CreateCommand())
        {
            cmdStatus.CommandText = @"
SELECT TOP 1 status
  FROM orcamentos
 WHERE id = @id
   AND ativo = 1;";
            cmdStatus.Parameters.AddWithValue("@id", id);

            var valor = await cmdStatus.ExecuteScalarAsync();
            statusAtual = valor is null || valor == DBNull.Value ? null : Convert.ToString(valor);
        }

        if (string.IsNullOrWhiteSpace(statusAtual))
        {
            await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
            {
                erro = "ORCAMENTO_NAO_ENCONTRADO",
                mensagem = "Orçamento não encontrado."
            });
            return;
        }

        var statusNormalizado = statusAtual.ToLowerInvariant();

        if (statusNormalizado.Contains("aprov"))
        {
            await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
            {
                erro = "ORCAMENTO_JA_APROVADO",
                mensagem = "Orçamento aprovado não pode ser reprovado. Para nova negociação, replique ou crie outro orçamento."
            });
            return;
        }

        if (statusNormalizado.Contains("reprov"))
        {
            await EscreverJsonAsync(http, StatusCodes.Status200OK, new
            {
                status = "ok",
                mensagem = "Orçamento já estava reprovado.",
                orcamento = new
                {
                    id,
                    status = "Reprovado"
                }
            });
            return;
        }

        if (statusNormalizado.Contains("cancel"))
        {
            await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
            {
                erro = "ORCAMENTO_JA_CANCELADO",
                mensagem = "Orçamento cancelado não pode ser reprovado."
            });
            return;
        }

        await using (var cmdOs = conexao.CreateCommand())
        {
            cmdOs.CommandText = @"
SELECT COUNT(1)
  FROM ordens_servico
 WHERE orcamento_id = @id
   AND ativo = 1
   AND LOWER(COALESCE(status, '')) NOT LIKE '%cancel%';";
            cmdOs.Parameters.AddWithValue("@id", id);

            var totalOs = Convert.ToInt64(await cmdOs.ExecuteScalarAsync());
            if (totalOs > 0)
            {
                await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
                {
                    erro = "ORCAMENTO_COM_OS",
                    mensagem = "Não é permitido reprovar orçamento que já possui OS vinculada."
                });
                return;
            }
        }

        await ExecutarAsync(conexao, """
UPDATE orcamentos
   SET status = 'Reprovado',
       atualizado_em = @agora
 WHERE id = @id
   AND ativo = 1;
""", new Dictionary<string, object?>
        {
            ["@id"] = id,
            ["@agora"] = DateTimeOffset.UtcNow.ToString("O")
        });

        await EscreverJsonAsync(http, StatusCodes.Status200OK, new
        {
            status = "ok",
            mensagem = "Orçamento reprovado com sucesso.",
            orcamento = new
            {
                id,
                status = "Reprovado"
            }
        });
    }


    private static async Task CancelarOrcamentoAsync(HttpContext http, long id)
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
                mensagem = "Informe um orçamento válido."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);

        string? statusAtual = null;

        await using (var cmdStatus = conexao.CreateCommand())
        {
            cmdStatus.CommandText = @"
SELECT TOP 1 status
  FROM orcamentos
 WHERE id = @id
   AND ativo = 1;";
            cmdStatus.Parameters.AddWithValue("@id", id);

            var valor = await cmdStatus.ExecuteScalarAsync();
            statusAtual = valor is null || valor == DBNull.Value ? null : Convert.ToString(valor);
        }

        if (string.IsNullOrWhiteSpace(statusAtual))
        {
            await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
            {
                erro = "ORCAMENTO_NAO_ENCONTRADO",
                mensagem = "Orçamento não encontrado."
            });
            return;
        }

        var statusNormalizado = statusAtual.ToLowerInvariant();

        if (statusNormalizado.Contains("cancel"))
        {
            await EscreverJsonAsync(http, StatusCodes.Status200OK, new
            {
                status = "ok",
                mensagem = "Orçamento já estava cancelado.",
                orcamento = new
                {
                    id,
                    status = "Cancelado"
                }
            });
            return;
        }

        await using (var cmdOs = conexao.CreateCommand())
        {
            cmdOs.CommandText = @"
SELECT COUNT(1)
  FROM ordens_servico
 WHERE orcamento_id = @id
   AND ativo = 1
   AND LOWER(COALESCE(status, '')) NOT LIKE '%cancel%';";
            cmdOs.Parameters.AddWithValue("@id", id);

            var totalOs = Convert.ToInt64(await cmdOs.ExecuteScalarAsync());
            if (totalOs > 0)
            {
                await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
                {
                    erro = "ORCAMENTO_COM_OS",
                    mensagem = "Não é permitido cancelar orçamento que já possui OS ativa vinculada."
                });
                return;
            }
        }

        await ExecutarAsync(conexao, """
UPDATE orcamentos
   SET status = 'Cancelado',
       atualizado_em = @agora
 WHERE id = @id
   AND ativo = 1;
""", new Dictionary<string, object?>
        {
            ["@id"] = id,
            ["@agora"] = DateTimeOffset.UtcNow.ToString("O")
        });

        await EscreverJsonAsync(http, StatusCodes.Status200OK, new
        {
            status = "ok",
            mensagem = "Orçamento cancelado com sucesso.",
            orcamento = new
            {
                id,
                status = "Cancelado"
            }
        });
    }


    private static async Task AprovarOrdemServicoAsync(HttpContext http, long id)
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

        string? statusAtual = null;
        await using (var cmdBusca = conexao.CreateCommand())
        {
            cmdBusca.CommandText = @"
SELECT status
  FROM ordens_servico
 WHERE id = @id
   AND ativo = 1;";
            cmdBusca.Parameters.AddWithValue("@id", id);

            var valor = await cmdBusca.ExecuteScalarAsync();
            if (valor is null || valor == DBNull.Value)
            {
                await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                {
                    erro = "OS_NAO_ENCONTRADA",
                    mensagem = "Ordem de servico nao encontrada."
                });
                return;
            }

            statusAtual = Convert.ToString(valor);
        }

        var statusNormalizado = (statusAtual ?? "").ToLowerInvariant();
        if (statusNormalizado.Contains("encerr") || statusNormalizado.Contains("cancel") || statusNormalizado.Contains("fechad"))
        {
            await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
            {
                erro = "OS_BLOQUEADA",
                mensagem = $"Nao e permitido aprovar OS com status {statusAtual}."
            });
            return;
        }

        if (statusNormalizado.Contains("aprov"))
        {
            await EscreverJsonAsync(http, StatusCodes.Status200OK, new
            {
                status = "ok",
                mensagem = "OS ja estava aprovada.",
                id,
                statusOs = statusAtual
            });
            return;
        }

        await using (var cmd = conexao.CreateCommand())
        {
            cmd.CommandText = @"
UPDATE ordens_servico
   SET status = @status,
       atualizado_em = @atualizado_em
 WHERE id = @id
   AND ativo = 1;";
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@status", "Aprovada");
            cmd.Parameters.AddWithValue("@atualizado_em", DateTimeOffset.UtcNow.ToString("O"));

            await cmd.ExecuteNonQueryAsync();
        }

        await EscreverJsonAsync(http, StatusCodes.Status200OK, new
        {
            status = "ok",
            mensagem = "OS aprovada com sucesso.",
            id,
            statusOs = "Aprovada"
        });
    }


    private static async Task ObterEmpresaEmissoraAsync(HttpContext http)
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
        await GarantirTabelaEmpresaEmissoraAsync(conexao);

        await using var cmd = conexao.CreateCommand();
        cmd.CommandText = @"
SELECT id,
       razao_social,
       nome_fantasia,
       cnpj,
       inscricao_estadual,
       inscricao_municipal,
       telefone,
       whatsapp,
       email,
       site,
       cep,
       endereco,
       numero,
       complemento,
       bairro,
       cidade,
       uf,
       observacao,
       validade_orcamento_dias,
       texto_rodape_orcamento,
       logo_url,
       atualizado_em
  FROM empresa_emissora
 WHERE id = 1
 ";

        Dictionary<string, object?>? empresa = null;

        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            if (await reader.ReadAsync())
                empresa = LerLinha(reader);
        }

        if (empresa is null)
        {
            empresa = new Dictionary<string, object?>
            {
                ["id"] = 1,
                ["razao_social"] = "",
                ["nome_fantasia"] = sessao.Tenant.Nome,
                ["cnpj"] = "",
                ["inscricao_estadual"] = "",
                ["inscricao_municipal"] = "",
                ["telefone"] = "",
                ["whatsapp"] = "",
                ["email"] = "",
                ["site"] = "",
                ["cep"] = "",
                ["endereco"] = "",
                ["numero"] = "",
                ["complemento"] = "",
                ["bairro"] = "",
                ["cidade"] = "",
                ["uf"] = "",
                ["observacao"] = "",
                ["validade_orcamento_dias"] = 7,
                ["texto_rodape_orcamento"] = "Orçamento sujeito à aprovação do cliente. Produtos no orçamento não representam baixa de estoque.",
                ["logo_url"] = "",
                ["atualizado_em"] = null
            };
        }

        await EscreverJsonAsync(http, StatusCodes.Status200OK, new
        {
            status = "ok",
            tenant = new
            {
                id = sessao.Tenant.Id,
                nome = sessao.Tenant.Nome,
                banco = sessao.Tenant.Banco,
                caminhoBanco = sessao.Tenant.CaminhoBanco
            },
            dados = empresa
        });
    }

    private static async Task SalvarEmpresaEmissoraAsync(HttpContext http)
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

        var agora = DateTimeOffset.UtcNow.ToString("O");

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        await GarantirTabelaEmpresaEmissoraAsync(conexao);

        await using var transacao = await conexao.BeginTransactionAsync();

        try
        {
            await using var cmd = conexao.CreateCommand();
            cmd.Transaction = (SqlTransaction)transacao;
            cmd.CommandText = @"
INSERT INTO empresa_emissora (
    id,
    razao_social,
    nome_fantasia,
    cnpj,
    inscricao_estadual,
    inscricao_municipal,
    telefone,
    whatsapp,
    email,
    site,
    cep,
    endereco,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    observacao,
    validade_orcamento_dias,
    texto_rodape_orcamento,
    logo_url,
    criado_em,
    atualizado_em
)
VALUES (
    1,
    @razao_social,
    @nome_fantasia,
    @cnpj,
    @inscricao_estadual,
    @inscricao_municipal,
    @telefone,
    @whatsapp,
    @email,
    @site,
    @cep,
    @endereco,
    @numero,
    @complemento,
    @bairro,
    @cidade,
    @uf,
    @observacao,
    @validade_orcamento_dias,
    @texto_rodape_orcamento,
    @logo_url,
    @agora,
    @agora
)
ON CONFLICT(id) DO UPDATE SET
    razao_social = excluded.razao_social,
    nome_fantasia = excluded.nome_fantasia,
    cnpj = excluded.cnpj,
    inscricao_estadual = excluded.inscricao_estadual,
    inscricao_municipal = excluded.inscricao_municipal,
    telefone = excluded.telefone,
    whatsapp = excluded.whatsapp,
    email = excluded.email,
    site = excluded.site,
    cep = excluded.cep,
    endereco = excluded.endereco,
    numero = excluded.numero,
    complemento = excluded.complemento,
    bairro = excluded.bairro,
    cidade = excluded.cidade,
    uf = excluded.uf,
    observacao = excluded.observacao,
    validade_orcamento_dias = excluded.validade_orcamento_dias,
    texto_rodape_orcamento = excluded.texto_rodape_orcamento,
    logo_url = excluded.logo_url,
    atualizado_em = excluded.atualizado_em;";

            cmd.Parameters.AddWithValue("@razao_social", ObterTexto(payload, "razao_social"));
            cmd.Parameters.AddWithValue("@nome_fantasia", ObterTexto(payload, "nome_fantasia"));
            cmd.Parameters.AddWithValue("@cnpj", ObterTexto(payload, "cnpj"));
            cmd.Parameters.AddWithValue("@inscricao_estadual", ObterTexto(payload, "inscricao_estadual"));
            cmd.Parameters.AddWithValue("@inscricao_municipal", ObterTexto(payload, "inscricao_municipal"));
            cmd.Parameters.AddWithValue("@telefone", ObterTexto(payload, "telefone"));
            cmd.Parameters.AddWithValue("@whatsapp", ObterTexto(payload, "whatsapp"));
            cmd.Parameters.AddWithValue("@email", ObterTexto(payload, "email"));
            cmd.Parameters.AddWithValue("@site", ObterTexto(payload, "site"));
            cmd.Parameters.AddWithValue("@cep", ObterTexto(payload, "cep"));
            cmd.Parameters.AddWithValue("@endereco", ObterTexto(payload, "endereco"));
            cmd.Parameters.AddWithValue("@numero", ObterTexto(payload, "numero"));
            cmd.Parameters.AddWithValue("@complemento", ObterTexto(payload, "complemento"));
            cmd.Parameters.AddWithValue("@bairro", ObterTexto(payload, "bairro"));
            cmd.Parameters.AddWithValue("@cidade", ObterTexto(payload, "cidade"));
            cmd.Parameters.AddWithValue("@uf", ObterTexto(payload, "uf").ToUpperInvariant());
            cmd.Parameters.AddWithValue("@observacao", ObterTexto(payload, "observacao"));
            cmd.Parameters.AddWithValue("@validade_orcamento_dias", Math.Max(0, ObterLong(payload, "validade_orcamento_dias")));
            cmd.Parameters.AddWithValue("@texto_rodape_orcamento", ObterTexto(payload, "texto_rodape_orcamento"));
            cmd.Parameters.AddWithValue("@logo_url", ObterTexto(payload, "logo_url"));
            cmd.Parameters.AddWithValue("@agora", agora);

            await cmd.ExecuteNonQueryAsync();

            await transacao.CommitAsync();

            await EscreverJsonAsync(http, StatusCodes.Status200OK, new
            {
                status = "ok",
                mensagem = "Dados da empresa emissora salvos com sucesso."
            });
        }
        catch (Exception ex)
        {
            await transacao.RollbackAsync();

            await EscreverJsonAsync(http, StatusCodes.Status500InternalServerError, new
            {
                erro = "ERRO_EMPRESA_EMISSORA",
                mensagem = "Falha ao salvar dados da empresa emissora.",
                detalhe = ex.Message
            });
        }
    }

    private static Task GarantirTabelaEmpresaEmissoraAsync(SqlConnection conexao)
    {
        return Task.CompletedTask;
    }

    private static string ObterTexto(JsonObject payload, string nome)
    {
        if (!payload.TryGetPropertyValue(nome, out var valor) || valor is null)
            return "";

        return valor.ToString()?.Trim() ?? "";
    }


    private static async Task GarantirCamposOrcamentoAsync(SqlConnection conexao)
    {
        await using var cmd = conexao.CreateCommand();
        cmd.CommandText = @"
IF COL_LENGTH('orcamentos', 'data_aprovacao') IS NULL
BEGIN
    ALTER TABLE orcamentos ADD data_aprovacao NVARCHAR(40) NULL;
END;
";
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task AprovarOrcamentoAsync(HttpContext http, long id)
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
                mensagem = "Informe um orçamento válido."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        await GarantirCamposOrcamentoAsync(conexao);

        decimal valorTotalOrcamento = 0;
        long totalItensOrcamento = 0;
        string? statusAntesAprovacao = null;

        await using (var cmdValidacaoAprovacao = conexao.CreateCommand())
        {
            cmdValidacaoAprovacao.CommandText = @"
SELECT
    COALESCE(o.valor_total, 0) AS valor_total,
    COALESCE(o.status, '') AS status,
    (
        SELECT COUNT(1)
          FROM orcamentos_itens_servicos s
         WHERE s.orcamento_id = o.id
           AND s.ativo = 1
    ) +
    (
        SELECT COUNT(1)
          FROM orcamentos_itens_produtos p
         WHERE p.orcamento_id = o.id
           AND p.ativo = 1
    ) AS total_itens
FROM orcamentos o
WHERE o.id = @id
  AND o.ativo = 1;";
            cmdValidacaoAprovacao.Parameters.AddWithValue("@id", id);

            await using var readerValidacao = await cmdValidacaoAprovacao.ExecuteReaderAsync();
            if (!await readerValidacao.ReadAsync())
            {
                await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                {
                    erro = "ORCAMENTO_NAO_ENCONTRADO",
                    mensagem = "Orçamento não encontrado."
                });
                return;
            }

            valorTotalOrcamento = Convert.ToDecimal(readerValidacao["valor_total"]);
            totalItensOrcamento = Convert.ToInt64(readerValidacao["total_itens"]);
            statusAntesAprovacao = Convert.ToString(readerValidacao["status"]);
        }

        var statusAntesAprovacaoNormalizado = (statusAntesAprovacao ?? "").ToLowerInvariant();

        if (statusAntesAprovacaoNormalizado.Contains("reprov"))
        {
            await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
            {
                erro = "ORCAMENTO_REPROVADO",
                mensagem = "Orçamento reprovado não pode ser aprovado. Para nova negociação, replique ou crie outro orçamento."
            });
            return;
        }

        if (statusAntesAprovacaoNormalizado.Contains("cancel"))
        {
            await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
            {
                erro = "ORCAMENTO_CANCELADO",
                mensagem = "Orçamento cancelado não pode ser aprovado. Para nova negociação, replique ou crie outro orçamento."
            });
            return;
        }

        if (statusAntesAprovacaoNormalizado.Contains("aprov"))
        {
            await EscreverJsonAsync(http, StatusCodes.Status200OK, new
            {
                status = "ok",
                mensagem = "Orçamento já estava aprovado.",
                orcamento = new
                {
                    id,
                    status = "Aprovado"
                }
            });
            return;
        }

        if (valorTotalOrcamento <= 0 || totalItensOrcamento <= 0)
        {
            await EscreverJsonAsync(http, StatusCodes.Status409Conflict, new
            {
                erro = "ORCAMENTO_SEM_VALOR_PARA_APROVAR",
                mensagem = "Não é permitido aprovar orçamento sem itens ou com valor total zerado."
            });
            return;
        }

        await using var transacao = await conexao.BeginTransactionAsync();

        try
        {
            var existeOrcamento = await ExisteRegistroAsync(conexao, transacao, "orcamentos", id);
            if (!existeOrcamento)
            {
                await transacao.RollbackAsync();
                await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                {
                    erro = "ORCAMENTO_NAO_ENCONTRADO",
                    mensagem = "Orçamento não encontrado."
                });
                return;
            }

            var totais = await RecalcularOrcamentoInternoAsync(conexao, transacao, id);

            await using (var cmd = conexao.CreateCommand())
            {
                cmd.Transaction = (SqlTransaction)transacao;
                cmd.CommandText = @"
UPDATE orcamentos
   SET status = @status,
       data_aprovacao = @atualizado_em,
       atualizado_em = @atualizado_em
 WHERE id = @id
   AND ativo = 1;";

                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@status", "Aprovado");
                cmd.Parameters.AddWithValue("@atualizado_em", DateTimeOffset.UtcNow.ToString("O"));

                await cmd.ExecuteNonQueryAsync();
            }

            await transacao.CommitAsync();

            await EscreverJsonAsync(http, StatusCodes.Status200OK, new
            {
                status = "ok",
                mensagem = "Orçamento aprovado com sucesso.",
                orcamento = new
                {
                    id,
                    status = "Aprovado",
                    totais.valorServicos,
                    totais.valorProdutos,
                    totais.valorDesconto,
                    totais.valorTotal
                }
            });
        }
        catch (Exception ex)
        {
            await transacao.RollbackAsync();

            await EscreverJsonAsync(http, StatusCodes.Status500InternalServerError, new
            {
                erro = "ERRO_APROVAR_ORCAMENTO",
                mensagem = "Falha ao aprovar orçamento.",
                detalhe = ex.Message
            });
        }
    }

    private static async Task RecalcularOrcamentoAsync(HttpContext http, long id)
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
        await using var transacao = await conexao.BeginTransactionAsync();

        try
        {
            var existeOrcamento = await ExisteRegistroAsync(conexao, transacao, "orcamentos", id);
            if (!existeOrcamento)
            {
                await transacao.RollbackAsync();
                await EscreverJsonAsync(http, StatusCodes.Status404NotFound, new
                {
                    erro = "ORCAMENTO_NAO_ENCONTRADO",
                    mensagem = "Orcamento nao encontrado."
                });
                return;
            }

            var totais = await RecalcularOrcamentoInternoAsync(conexao, transacao, id);

            await transacao.CommitAsync();

            await EscreverJsonAsync(http, StatusCodes.Status200OK, new
            {
                status = "ok",
                mensagem = "Orcamento recalculado com sucesso.",
                orcamento = new
                {
                    id,
                    totais.valorServicos,
                    totais.valorProdutos,
                    totais.valorDesconto,
                    totais.valorTotal
                }
            });
        }
        catch (Exception ex)
        {
            await transacao.RollbackAsync();

            await EscreverJsonAsync(http, StatusCodes.Status500InternalServerError, new
            {
                erro = "ERRO_RECALCULO_ORCAMENTO",
                mensagem = "Falha ao recalcular orcamento.",
                detalhe = ex.Message
            });
        }
    }

    private static async Task<TotaisOrcamento> RecalcularOrcamentoInternoAsync(
        SqlConnection conexao,
        System.Data.Common.DbTransaction transacao,
        long orcamentoId)
    {
        var valorServicos = await ObterSomaAsync(
            conexao,
            transacao,
            "SELECT COALESCE(SUM(valor_total), 0) FROM orcamentos_itens_servicos WHERE orcamento_id = @orcamento_id AND ativo = 1;",
            orcamentoId);

        var valorProdutos = await ObterSomaAsync(
            conexao,
            transacao,
            "SELECT COALESCE(SUM(valor_total), 0) FROM orcamentos_itens_produtos WHERE orcamento_id = @orcamento_id AND ativo = 1;",
            orcamentoId);

        var descontoServicos = await ObterSomaAsync(
            conexao,
            transacao,
            "SELECT COALESCE(SUM(COALESCE(desconto_valor, CASE WHEN valor_liquido IS NULL THEN 0 ELSE valor_total - valor_liquido END, 0)), 0) FROM orcamentos_itens_servicos WHERE orcamento_id = @orcamento_id AND ativo = 1;",
            orcamentoId);

        var descontoProdutos = await ObterSomaAsync(
            conexao,
            transacao,
            "SELECT COALESCE(SUM(COALESCE(desconto_valor, CASE WHEN valor_liquido IS NULL THEN 0 ELSE valor_total - valor_liquido END, 0)), 0) FROM orcamentos_itens_produtos WHERE orcamento_id = @orcamento_id AND ativo = 1;",
            orcamentoId);

        var valorDesconto = descontoServicos + descontoProdutos;
        var valorTotal = valorServicos + valorProdutos - valorDesconto;

        if (valorTotal < 0)
            valorTotal = 0;

        await ExecutarAsync(conexao, """
UPDATE orcamentos
   SET valor_servicos = @valor_servicos,
       valor_produtos = @valor_produtos,
       valor_desconto = @valor_desconto,
       valor_total = @valor_total,
       atualizado_em = @agora
 WHERE id = @orcamento_id;
""", new Dictionary<string, object?>
        {
            ["@valor_servicos"] = valorServicos,
            ["@valor_produtos"] = valorProdutos,
            ["@valor_desconto"] = valorDesconto,
            ["@valor_total"] = valorTotal,
            ["@agora"] = DateTimeOffset.UtcNow.ToString("O"),
            ["@orcamento_id"] = orcamentoId
        }, transacao);

        return new TotaisOrcamento(valorServicos, valorProdutos, valorDesconto, valorTotal);
    }

    private static async Task<decimal> ObterSomaAsync(
        SqlConnection conexao,
        System.Data.Common.DbTransaction transacao,
        string sql,
        long orcamentoId)
    {
        await using var cmd = conexao.CreateCommand();
        cmd.Transaction = (SqlTransaction)transacao;
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("@orcamento_id", orcamentoId);

        var valor = await cmd.ExecuteScalarAsync();
        if (valor is null || valor == DBNull.Value)
            return 0;

        return Convert.ToDecimal(valor);
    }

    private static async Task<bool> ExisteRegistroAsync(
        SqlConnection conexao,
        System.Data.Common.DbTransaction transacao,
        string tabela,
        long id)
    {
        await using var cmd = conexao.CreateCommand();
        cmd.Transaction = (SqlTransaction)transacao;
        cmd.CommandText = $"SELECT COUNT(1) FROM {tabela} WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", id);

        var total = Convert.ToInt64(await cmd.ExecuteScalarAsync());
        return total > 0;
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
        var agora = DateTimeOffset.UtcNow.ToString("O");

        if (tabela == "orcamentos_itens_servicos" || tabela == "orcamentos_itens_produtos")
        {
            payload["ativo"] = JsonValue.Create(true);

            if (!payload.ContainsKey("criado_em"))
                payload["criado_em"] = JsonValue.Create(agora);

            payload["atualizado_em"] = JsonValue.Create(agora);
        }

        var permitidos = camposPermitidos
            .Concat(new[] { "ativo", "criado_em", "atualizado_em" })
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var campos = permitidos
            .Where(c => payload.ContainsKey(c))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (campos.Count == 0)
            throw new InvalidOperationException("Nenhum campo permitido informado para inserção.");

        var colunas = string.Join(", ", campos);
        var parametros = string.Join(", ", campos.Select(c => "@" + c));

        await using var cmd = conexao.CreateCommand();

        if (transacao is not null)
            cmd.Transaction = (SqlTransaction)transacao;

        cmd.CommandText = $@"
INSERT INTO {tabela}
    ({colunas})
OUTPUT INSERTED.id
VALUES
    ({parametros});
";

        foreach (var campo in campos)
            cmd.Parameters.AddWithValue("@" + campo, ValorSql(payload[campo]) ?? DBNull.Value);

        var id = await cmd.ExecuteScalarAsync();
        return Convert.ToInt64(id);

        static object? ValorSql(JsonNode? node)
        {
            if (node is null)
                return null;

            if (node is JsonValue valor)
            {
                if (valor.TryGetValue<bool>(out var b))
                    return b;

                if (valor.TryGetValue<int>(out var i))
                    return i;

                if (valor.TryGetValue<long>(out var l))
                    return l;

                if (valor.TryGetValue<decimal>(out var d))
                    return d;

                if (valor.TryGetValue<double>(out var db))
                    return Convert.ToDecimal(db);

                if (valor.TryGetValue<string>(out var s))
                    return string.IsNullOrWhiteSpace(s) ? DBNull.Value : s;
            }

            return node.ToString();
        }
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
        if (!payload.TryGetPropertyValue(nome, out var node) || node is null)
            return 0;

        if (node is JsonValue value)
        {
            if (value.TryGetValue<decimal>(out var decimalDireto))
                return decimalDireto;

            if (value.TryGetValue<double>(out var doubleDireto))
                return Convert.ToDecimal(doubleDireto);

            if (value.TryGetValue<int>(out var inteiroDireto))
                return inteiroDireto;

            if (value.TryGetValue<long>(out var longoDireto))
                return longoDireto;

            if (value.TryGetValue<string>(out var texto))
                return ConverterTextoDecimal(texto);
        }

        return ConverterTextoDecimal(node.ToString());
    }

    private static decimal ConverterTextoDecimal(string? texto)
    {
        if (string.IsNullOrWhiteSpace(texto))
            return 0;

        texto = texto.Trim();

        if (texto.Contains(','))
            texto = texto.Replace(".", "").Replace(",", ".");

        return decimal.TryParse(
            texto,
            System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture,
            out var valor)
            ? valor
            : 0;
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

    private sealed record TotaisOrcamento(decimal valorServicos, decimal valorProdutos, decimal valorDesconto, decimal valorTotal);

    private sealed record SessaoResolvida(string UsuarioId, string Email, TenantResolvido Tenant);

    private sealed record TenantResolvido(
        string Id,
        string Nome,
        string Chave,
        string Banco,
        string CaminhoBanco);
}

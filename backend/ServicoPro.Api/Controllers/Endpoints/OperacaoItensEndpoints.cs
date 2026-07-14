using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ServicoPro.Api.Application.Services;

namespace ServicoPro.Api.API.Endpoints;

public static class OperacaoItensEndpoints
{
    public static WebApplication MapOperacaoItensEndpoints(this WebApplication app)
    {
        var grupo = app.MapGroup("/api").RequireAuthorization();

        grupo.MapGet("/ordens-servico-itens-servicos", async (OperacaoItensService servico) =>
            Results.Ok(await servico.ListarAsync("ordens_servico_itens_servicos")));

        grupo.MapGet("/ordens-servico-itens-produtos", async (OperacaoItensService servico) =>
            Results.Ok(await servico.ListarAsync("ordens_servico_itens_produtos")));

        grupo.MapGet("/requisicoes-estoque", async (EstoqueService servico) =>
            Results.Ok(await servico.ListarRequisicoesAsync()));

        grupo.MapGet("/movimentacoes-estoque", async (EstoqueService servico) =>
            Results.Ok(await servico.ListarMovimentacoesAsync()));

        grupo.MapPost("/ordens-servico-itens-servicos", async (HttpContext http, OperacaoItensService servico) =>
            await InserirItemHandlerAsync(http, servico, "ordens_servico_itens_servicos"));

        grupo.MapPost("/ordens-servico-itens-produtos", async (HttpContext http, OperacaoItensService servico) =>
            await InserirItemHandlerAsync(http, servico, "ordens_servico_itens_produtos"));

        grupo.MapDelete("/ordens-servico-itens-servicos/{id:long}", async (long id, OperacaoItensService servico) =>
            await ExcluirItemHandlerAsync(servico, "ordens_servico_itens_servicos", id));

        grupo.MapDelete("/ordens-servico-itens-produtos/{id:long}", async (long id, OperacaoItensService servico) =>
            await ExcluirItemHandlerAsync(servico, "ordens_servico_itens_produtos", id));

        grupo.MapPost("/requisicoes-estoque", async (HttpContext http, EstoqueService servico) =>
        {
            try
            {
                var dict = await LerPayloadGenericoAsync(http);
                if (dict == null) return Results.BadRequest("Dados inválidos");

                var resultado = await servico.InserirRequisicaoComBaixaAsync(dict);
                return Results.Created("", new { status = "criado", baixa = resultado });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { erro = "FALHA_ESTOQUE", mensagem = ex.Message });
            }
        });

        return app;
    }

    private static async Task<IResult> InserirItemHandlerAsync(HttpContext http, OperacaoItensService servico, string tabela)
    {
        try
        {
            var dict = await LerPayloadGenericoAsync(http);
            if (dict == null) return Results.BadRequest("JSON inválido.");

            if (!dict.TryGetValue("descricao", out var desc) || string.IsNullOrWhiteSpace(desc?.ToString()))
                return Results.BadRequest(new { erro = "DESCRICAO_OBRIGATORIA", mensagem = "Informe a descrição." });

            var id = await servico.InserirGenericoAsync(tabela, dict);
            return Results.Created($"/api/{tabela}/{id}", new { status = "criado", id, tabela });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { erro = "FALHA", mensagem = ex.Message });
        }
    }

    private static async Task<IResult> ExcluirItemHandlerAsync(OperacaoItensService servico, string tabela, long id)
    {
        try
        {
            var excluiu = await servico.ExcluirItemAsync(tabela, id);
            if (!excluiu) return Results.NotFound(new { erro = "NAO_ENCONTRADO" });

            return Results.Ok(new { status = "ok", id, tabela, mensagem = "Item excluído e OS recalculada." });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { erro = "FALHA", mensagem = ex.Message });
        }
    }

    private static async Task<Dictionary<string, object?>?> LerPayloadGenericoAsync(HttpContext http)
    {
        var json = await JsonSerializer.DeserializeAsync<JsonElement>(http.Request.Body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (json.ValueKind != JsonValueKind.Object) return null;

        var dict = new Dictionary<string, object?>();
        foreach (var prop in json.EnumerateObject())
        {
            dict[prop.Name] = prop.Value.ValueKind switch
            {
                JsonValueKind.Number => prop.Value.GetDecimal(),
                JsonValueKind.String => prop.Value.GetString(),
                JsonValueKind.True => 1,
                JsonValueKind.False => 0,
                _ => prop.Value.ToString()
            };
        }
        return dict;
    }
}

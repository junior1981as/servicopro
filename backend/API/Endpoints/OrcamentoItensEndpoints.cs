using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ServicoPro.Api.Application.Services;

namespace ServicoPro.Api.API.Endpoints;

public static class OrcamentoItensEndpoints
{
    public static WebApplication MapOrcamentoItensEndpoints(this WebApplication app)
    {
        var grupo = app.MapGroup("/api").RequireAuthorization();

        // 1. Itens de Orçamento
        grupo.MapGet("/orcamentos-itens-servicos", async (OrcamentoItensService servico) =>
            Results.Ok(await servico.ListarAsync("orcamentos_itens_servicos")));

        grupo.MapGet("/orcamentos-itens-produtos", async (OrcamentoItensService servico) =>
            Results.Ok(await servico.ListarAsync("orcamentos_itens_produtos")));

        grupo.MapPost("/orcamentos-itens-servicos", async (HttpContext http, OrcamentoItensService servico) =>
            await InserirItemHandlerAsync(http, servico, "orcamentos_itens_servicos"));

        grupo.MapPost("/orcamentos-itens-produtos", async (HttpContext http, OrcamentoItensService servico) =>
            await InserirItemHandlerAsync(http, servico, "orcamentos_itens_produtos"));

        grupo.MapDelete("/orcamentos-itens-servicos/{id:long}", async (long id, OrcamentoItensService servico) =>
            await ExcluirItemHandlerAsync(servico, "orcamentos_itens_servicos", id));

        grupo.MapDelete("/orcamentos-itens-produtos/{id:long}", async (long id, OrcamentoItensService servico) =>
            await ExcluirItemHandlerAsync(servico, "orcamentos_itens_produtos", id));

        grupo.MapPost("/orcamentos/{id:long}/recalcular", async (long id, OrcamentoItensService servico) =>
        {
            try { await servico.RecalcularOrcamentoAsync(id); return Results.Ok(new { status = "ok", mensagem = "Orçamento recalculado." }); }
            catch (Exception ex) { return Results.BadRequest(new { erro = "FALHA", mensagem = ex.Message }); }
        });

        // 2. Aprovações
        grupo.MapPost("/orcamentos/{id:long}/aprovar", async (long id, AprovacoesService servico) =>
            await AlterarStatusHandlerAsync(servico, id, "Aprovado"));

        grupo.MapPost("/orcamentos/{id:long}/reprovar", async (long id, AprovacoesService servico) =>
            await AlterarStatusHandlerAsync(servico, id, "Reprovado"));

        grupo.MapPost("/orcamentos/{id:long}/cancelar", async (long id, AprovacoesService servico) =>
            await AlterarStatusHandlerAsync(servico, id, "Cancelado"));

        grupo.MapPost("/ordens-servico/{id:long}/aprovar", async (long id, AprovacoesService servico) =>
        {
            try { var ok = await servico.AprovarOrdemServicoAsync(id); return ok ? Results.Ok(new { status = "ok" }) : Results.BadRequest(); }
            catch (Exception ex) { return Results.BadRequest(new { erro = "FALHA", mensagem = ex.Message }); }
        });

        // 3. Configurações
        grupo.MapGet("/configuracoes/empresa", async (ConfiguracoesService servico) =>
        {
            var emp = await servico.ObterEmpresaAsync();
            return emp != null ? Results.Ok(new { status = "ok", dados = emp }) : Results.NotFound();
        });

        grupo.MapPut("/configuracoes/empresa", async (HttpContext http, ConfiguracoesService servico) =>
            await SalvarEmpresaHandlerAsync(http, servico));

        grupo.MapPost("/configuracoes/empresa", async (HttpContext http, ConfiguracoesService servico) =>
            await SalvarEmpresaHandlerAsync(http, servico));

        return app;
    }

    private static async Task<IResult> InserirItemHandlerAsync(HttpContext http, OrcamentoItensService servico, string tabela)
    {
        try
        {
            var dict = await LerPayloadGenericoAsync(http);
            if (dict == null) return Results.BadRequest("JSON inválido.");

            if (!dict.TryGetValue("descricao", out var desc) || string.IsNullOrWhiteSpace(desc?.ToString()))
                return Results.BadRequest(new { erro = "DESCRICAO_OBRIGATORIA", mensagem = "Informe a descrição." });

            var id = await servico.InserirItemAsync(tabela, dict);
            return Results.Created($"/api/{tabela}/{id}", new { status = "criado", id, tabela });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { erro = "FALHA", mensagem = ex.Message });
        }
    }

    private static async Task<IResult> ExcluirItemHandlerAsync(OrcamentoItensService servico, string tabela, long id)
    {
        try
        {
            var excluiu = await servico.ExcluirItemAsync(tabela, id);
            if (!excluiu) return Results.NotFound(new { erro = "NAO_ENCONTRADO" });

            return Results.Ok(new { status = "ok", id, tabela, mensagem = "Item excluído." });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { erro = "FALHA", mensagem = ex.Message });
        }
    }

    private static async Task<IResult> AlterarStatusHandlerAsync(AprovacoesService servico, long id, string status)
    {
        try
        {
            var ok = await servico.AlterarStatusOrcamentoAsync(id, status);
            return ok ? Results.Ok(new { status = "ok", mensagem = $"Orçamento alterado para {status}." }) : Results.BadRequest();
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { erro = "FALHA", mensagem = ex.Message });
        }
    }

    private static async Task<IResult> SalvarEmpresaHandlerAsync(HttpContext http, ConfiguracoesService servico)
    {
        try
        {
            var dict = await LerPayloadGenericoAsync(http);
            if (dict == null) return Results.BadRequest("JSON inválido.");

            await servico.SalvarEmpresaAsync(dict);
            return Results.Ok(new { status = "ok", mensagem = "Configurações salvas com sucesso." });
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
                JsonValueKind.Null => null,
                _ => prop.Value.ToString()
            };
        }
        return dict;
    }
}

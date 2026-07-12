using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServicoPro.Api.Domain.Entities;
using ServicoPro.Api.Infrastructure.Data;

namespace ServicoPro.Api.API.Endpoints;

public static class OrcamentoEndpoints
{
    public static void MapOrcamentoEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/orcamentos").RequireAuthorization();

        group.MapGet("/", async (ServicoProDbContext db) =>
        {
            var orcamentos = await db.Orcamentos
                .Include(o => o.Cliente)
                .Include(o => o.Ativo)
                .Include(o => o.Itens)
                .OrderByDescending(o => o.CriadoEm)
                .Select(o => new
                {
                    id = o.Id,
                    codigo = o.Codigo,
                    clientId = o.ClienteId,
                    clientName = o.Cliente.Nome,
                    assetId = o.AtivoId,
                    assetName = o.Ativo.Descricao,
                    status = o.Status.ToString(),
                    totalCost = o.CustoTotal,
                    totalPrice = o.ValorTotal,
                    marginPercent = o.PercentualMargem,
                    notes = o.Observacoes,
                    technicianId = o.TecnicoId,
                    technicianName = o.Tecnico != null ? o.Tecnico.Nome : null,
                    workOrderId = o.OrdemServicoId,
                    createdAt = o.CriadoEm,
                    items = o.Itens.Select(i => new
                    {
                        id = i.Id,
                        type = i.ProdutoId != null ? "product" : "service",
                        itemId = i.ProdutoId ?? i.ServicoId,
                        name = i.Nome,
                        quantity = i.Quantidade,
                        unitCost = i.CustoUnitario,
                        unitPrice = i.PrecoUnitario,
                        totalCost = i.CustoTotal,
                        totalPrice = i.ValorTotal
                    })
                })
                .ToListAsync();

            return Results.Ok(orcamentos);
        });

        group.MapPost("/", async (OrcamentoDto dto, ServicoProDbContext db) =>
        {
            var orcamento = new Orcamento
            {
                ClienteId = dto.ClientId,
                AtivoId = dto.AssetId,
                Status = Enum.TryParse<OrcamentoStatus>(dto.Status, out var s) ? s : OrcamentoStatus.Rascunho,
                CustoTotal = dto.TotalCost,
                ValorTotal = dto.TotalPrice,
                PercentualMargem = dto.MarginPercent,
                Observacoes = dto.Notes,
                TecnicoId = dto.TechnicianId,
                OrdemServicoId = dto.WorkOrderId
            };

            if (dto.Items != null)
            {
                foreach (var item in dto.Items)
                {
                    orcamento.Itens.Add(new OrcamentoItem
                    {
                        ProdutoId = item.Type == "product" ? item.ItemId : null,
                        ServicoId = item.Type == "service" ? item.ItemId : null,
                        Nome = item.Name,
                        Quantidade = item.Quantity,
                        CustoUnitario = item.UnitCost,
                        PrecoUnitario = item.UnitPrice
                    });
                }
            }

            db.Orcamentos.Add(orcamento);
            await db.SaveChangesAsync();

            return Results.Created($"/api/orcamentos/{orcamento.Id}", new { id = orcamento.Id });
        });

        group.MapPut("/{id:guid}/status", async (Guid id, UpdateOrcamentoStatusDto dto, ServicoProDbContext db) =>
        {
            var orcamento = await db.Orcamentos.FindAsync(id);
            if (orcamento == null) return Results.NotFound();

            if (Enum.TryParse<OrcamentoStatus>(dto.Status, out var s))
            {
                orcamento.Status = s;
                orcamento.OrdemServicoId = dto.WorkOrderId;
                await db.SaveChangesAsync();
                return Results.NoContent();
            }
            return Results.BadRequest(new { error = "Status inválido." });
        });
    }
}

public class OrcamentoDto
{
    public Guid ClientId { get; set; }
    public Guid AssetId { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal TotalCost { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal MarginPercent { get; set; }
    public string Notes { get; set; } = string.Empty;
    public Guid? TechnicianId { get; set; }
    public Guid? WorkOrderId { get; set; }
    public OrcamentoItemDto[] Items { get; set; } = Array.Empty<OrcamentoItemDto>();
}

public class OrcamentoItemDto
{
    public string Type { get; set; } = string.Empty;
    public Guid ItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal UnitPrice { get; set; }
}

public class UpdateOrcamentoStatusDto
{
    public string Status { get; set; } = string.Empty;
    public Guid? WorkOrderId { get; set; }
}

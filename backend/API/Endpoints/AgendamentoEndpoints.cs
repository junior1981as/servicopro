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

public static class AgendamentoEndpoints
{
    public static void MapAgendamentoEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/agendamentos").RequireAuthorization();

        group.MapGet("/", async (ServicoProDbContext db) =>
        {
            var agendamentos = await db.Agendamentos
                .Include(a => a.Cliente)
                .Include(a => a.Ativo)
                .OrderBy(a => a.DataHora)
                .Select(a => new
                {
                    id = a.Id,
                    codigo = a.Codigo,
                    clientId = a.ClienteId,
                    clientName = a.Cliente.Nome,
                    assetId = a.AtivoId,
                    assetName = a.Ativo.Descricao,
                    dateTime = a.DataHora,
                    description = a.Descricao,
                    status = a.Status == AgendamentoStatus.EmOS ? "Em OS" : a.Status.ToString(),
                    workOrderId = a.OrdemServicoId,
                    createdAt = a.CriadoEm
                })
                .ToListAsync();

            return Results.Ok(agendamentos);
        });

        group.MapPost("/", async (AgendamentoDto dto, ServicoProDbContext db) =>
        {
            var agendamento = new Agendamento
            {
                ClienteId = dto.ClientId,
                AtivoId = dto.AssetId,
                DataHora = dto.DateTime,
                Descricao = dto.Description,
                Status = Enum.TryParse<AgendamentoStatus>(dto.Status.Replace(" ", ""), out var s) ? s : AgendamentoStatus.Agendado,
                OrdemServicoId = dto.WorkOrderId
            };

            db.Agendamentos.Add(agendamento);
            await db.SaveChangesAsync();

            return Results.Created($"/api/agendamentos/{agendamento.Id}", new { id = agendamento.Id });
        });

        group.MapPut("/{id:guid}", async (Guid id, AgendamentoDto dto, ServicoProDbContext db) =>
        {
            var agendamento = await db.Agendamentos.FindAsync(id);
            if (agendamento == null) return Results.NotFound();

            agendamento.ClienteId = dto.ClientId;
            agendamento.AtivoId = dto.AssetId;
            agendamento.DataHora = dto.DateTime;
            agendamento.Descricao = dto.Description;
            agendamento.Status = Enum.TryParse<AgendamentoStatus>(dto.Status.Replace(" ", ""), out var s) ? s : agendamento.Status;
            agendamento.OrdemServicoId = dto.WorkOrderId;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapDelete("/{id:guid}", async (Guid id, ServicoProDbContext db) =>
        {
            var agendamento = await db.Agendamentos.FindAsync(id);
            if (agendamento == null) return Results.NotFound();

            db.Agendamentos.Remove(agendamento);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

public class AgendamentoDto
{
    public Guid ClientId { get; set; }
    public Guid AssetId { get; set; }
    public DateTimeOffset DateTime { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Guid? WorkOrderId { get; set; }
}

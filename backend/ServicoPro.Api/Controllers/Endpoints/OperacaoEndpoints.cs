using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dapper;
using ServicoPro.Api.Domain.Entities;
using ServicoPro.Api.Infrastructure.Data;

namespace ServicoPro.Api.API.Endpoints;

public static class OperacaoEndpoints
{
    public static void MapOperacaoEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/os").RequireAuthorization();

        app.MapGet("/api/os/debug-triggers", async (ServicoProDbContext db) =>
        {
            var triggers = await db.Database.GetDbConnection().QueryAsync<dynamic>("SELECT * FROM sys.triggers");
            return Results.Ok(triggers);
        }).AllowAnonymous();

        // Listar Ordens de Serviço
        group.MapGet("/", async (ServicoProDbContext db) =>
        {
            var ordens = await db.OrdensServico
                .Include(o => o.Cliente)
                .Include(o => o.Ativo)
                .Include(o => o.Servicos)
                .Include(o => o.Produtos)
                .Include(o => o.Tecnico)
                .OrderByDescending(o => o.DataAbertura)
                .ToListAsync();

            var ordensMapeadas = ordens.Select(o => new 
            {
                id = o.Id,
                codigo = o.Codigo,
                numero = o.Numero,
                clientId = o.ClienteId,
                clientName = o.Cliente?.Nome,
                assetId = o.AtivoId,
                assetName = o.Ativo?.Descricao,
                descricao = o.Descricao,
                diagnosis = o.Diagnostico,
                openingKm = string.IsNullOrWhiteSpace(o.KmAbertura) ? (int?)null : int.TryParse(o.KmAbertura, out var km) ? km : null,
                openedAt = o.DataAbertura,
                startedAt = o.DataInicioExecucao,
                estimatedCompletionAt = o.DataPrevistaConclusao,
                completedAt = o.DataConclusaoServico,
                closedAt = o.DataFechamento,
                technicianId = o.TecnicoId,
                technicianName = o.Tecnico?.Nome,
                technicianNotes = o.AnotacoesTecnico,
                totalPrice = o.Produtos.Sum(p => p.Quantidade * p.ValorUnitario) + o.Servicos.Sum(s => s.Quantidade * s.ValorUnitario),
                totalCost = o.Produtos.Sum(p => p.Quantidade * p.CustoUnitario) + o.Servicos.Sum(s => s.Quantidade * s.CustoUnitario),
                status = o.Status.ToString(),
                items = o.Produtos.Select(p => new {
                    id = p.Id,
                    type = "product",
                    itemId = p.ProdutoId,
                    name = p.Descricao,
                    quantity = p.Quantidade,
                    unitCost = p.CustoUnitario,
                    unitPrice = p.ValorUnitario,
                    totalCost = p.Quantidade * p.CustoUnitario,
                    totalPrice = p.Quantidade * p.ValorUnitario
                }).Concat(o.Servicos.Select(s => new {
                    id = s.Id,
                    type = "service",
                    itemId = s.ServicoId,
                    name = s.Descricao,
                    quantity = s.Quantidade,
                    unitCost = s.CustoUnitario,
                    unitPrice = s.ValorUnitario,
                    totalCost = s.Quantidade * s.CustoUnitario,
                    totalPrice = s.Quantidade * s.ValorUnitario
                }))
            });

            return Results.Ok(ordensMapeadas);
        });

        // POST - Criar OS
        group.MapPost("/", async (CreateOsDto dto, ServicoProDbContext db) =>
        {
            var os = new OrdemServico
            {
                Numero = $"OS-{DateTime.Now.Ticks.ToString().Substring(8)}",
                ClienteId = dto.ClientId,
                AtivoId = dto.AssetId,
                Descricao = dto.Description ?? string.Empty,
                Diagnostico = dto.Diagnosis ?? string.Empty,
                KmAbertura = dto.OpeningKm?.ToString() ?? string.Empty,
                ValorTotal = dto.TotalPrice,
                CustoTotal = dto.TotalCost
            };

            if (dto.Items != null)
            {
                foreach (var item in dto.Items)
                {
                    if (item.Type == "product")
                    {
                        os.Produtos.Add(new OSItemProduto
                        {
                            ProdutoId = item.ItemId,
                            Descricao = item.Name,
                            Quantidade = item.Quantity,
                            CustoUnitario = item.UnitCost,
                            ValorUnitario = item.UnitPrice
                        });
                    }
                    else if (item.Type == "service")
                    {
                        os.Servicos.Add(new OSItemServico
                        {
                            ServicoId = item.ItemId,
                            Descricao = item.Name,
                            Quantidade = item.Quantity,
                            CustoUnitario = item.UnitCost,
                            ValorUnitario = item.UnitPrice
                        });
                    }
                }
            }

            db.OrdensServico.Add(os);
            await db.SaveChangesAsync();

            return Results.Created($"/api/os/{os.Id}", new { id = os.Id });
        });

        // POST - Fechar OS
        group.MapPost("/{id:guid}/fechar", async (Guid id, FecharOsDto dto, ServicoProDbContext db) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                var os = await db.OrdensServico
                    .Include(o => o.Produtos)
                    .Include(o => o.Cliente)
                    .FirstOrDefaultAsync(o => o.Id == id);
                    
                if (os == null) return Results.NotFound();

                if (os.Status == OrdemStatus.Faturada || os.Status == OrdemStatus.Cancelada)
                    return Results.BadRequest(new { error = "A OS já está fechada." });

                if (string.IsNullOrWhiteSpace(os.Diagnostico) && string.IsNullOrWhiteSpace(dto.Diagnosis))
                    return Results.BadRequest(new { error = "Preenchimento do Diagnóstico Técnico é obrigatório para fechar a OS." });

                if (!string.IsNullOrWhiteSpace(dto.Diagnosis))
                {
                    os.Diagnostico = dto.Diagnosis;
                }
                
                os.Desconto = dto.Discount;

                // 1. Atualizar Status
                os.AlterarStatus(OrdemStatus.Faturada);
                os.DataFechamento = DateTimeOffset.UtcNow;

                // 2. Dar baixa no Estoque de Produtos
                foreach (var item in os.Produtos)
                {
                    var produto = await db.Produtos.FindAsync(item.ProdutoId);
                    if (produto != null)
                    {
                        produto.EstoqueAtual = Math.Max(0, produto.EstoqueAtual - (int)item.Quantidade);
                    }
                }

                // 3. Gerar Transação Financeira (Contas a Receber)
                var osNumber = os.Codigo > 0 ? $"OS-{os.Codigo.ToString().PadLeft(4, '0')}" : $"#{os.Id.ToString().Substring(0,6).ToUpper()}";
                var transacao = new TransacaoFinanceira
                {
                    Tipo = TransacaoTipo.Receita,
                    Categoria = "Peça e Serviço",
                    OrdemServicoId = os.Id,
                    Descricao = $"Faturamento {osNumber} - {os.Cliente.Nome}",
                    Valor = os.ValorTotal,
                    Desconto = os.Desconto,
                    DataVencimento = DateTimeOffset.UtcNow.AddDays(15), // 15 dias para vencimento
                    Status = TransacaoStatus.Pendente
                };
                db.TransacoesFinanceiras.Add(transacao);

                await db.SaveChangesAsync();
                await transaction.CommitAsync();

                return Results.Ok();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest(new { error = "Erro ao fechar OS", details = ex.Message });
            }
        });
        
        // POST - Cancelar OS
        group.MapPost("/{id:guid}/cancelar", async (Guid id, ServicoProDbContext db) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                var os = await db.OrdensServico
                    .Include(o => o.Produtos)
                    .FirstOrDefaultAsync(o => o.Id == id);
                    
                if (os == null) return Results.NotFound();

                // Se já estava concluída, estornar o estoque
                if (os.Status == OrdemStatus.Concluida)
                {
                    foreach (var item in os.Produtos)
                    {
                        var produto = await db.Produtos.FindAsync(item.ProdutoId);
                        if (produto != null)
                        {
                            produto.EstoqueAtual += (int)item.Quantidade;
                        }
                    }
                    
                    // Cancelar Transações Pendentes geradas por esta OS
                    var transacoes = await db.TransacoesFinanceiras
                        .Where(t => t.OrdemServicoId == os.Id && t.Status == TransacaoStatus.Pendente)
                        .ToListAsync();
                        
                    foreach(var t in transacoes)
                    {
                        t.Status = TransacaoStatus.Cancelado;
                    }
                }

                // Usa o método de domínio seguro
                os.Cancelar();
                await db.SaveChangesAsync();
                await transaction.CommitAsync();

                return Results.Ok();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest(new { error = "Erro ao cancelar OS", details = ex.Message });
            }
        });

        // DELETE - Excluir OS
        group.MapDelete("/{id:guid}", async (Guid id, ServicoProDbContext db) =>
        {
            var os = await db.OrdensServico.FindAsync(id);
            if (os == null) return Results.NotFound();

            if (os.Status == OrdemStatus.Faturada || os.Status == OrdemStatus.Concluida)
                return Results.BadRequest(new { error = "Não é possível excluir uma OS que já foi concluída ou faturada. Utilize a opção de Cancelamento." });

            var agendamento = await db.Agendamentos.FirstOrDefaultAsync(a => a.OrdemServicoId == id);
            if (agendamento != null)
            {
                agendamento.Status = AgendamentoStatus.Agendado;
                agendamento.OrdemServicoId = null;
            }

            var orcamento = await db.Orcamentos.FirstOrDefaultAsync(o => o.OrdemServicoId == id);
            if (orcamento != null)
            {
                orcamento.Status = OrcamentoStatus.Aprovado; // Volta para Aprovado para permitir nova OS
                orcamento.OrdemServicoId = null;
            }

            db.OrdensServico.Remove(os);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Simulação simples de Atualização de OS
        group.MapPut("/{id:guid}", async (Guid id, [FromBody] UpdateOsDto dto, ServicoProDbContext db) =>
        {
            var os = await db.OrdensServico
                .Include(o => o.Produtos)
                .Include(o => o.Servicos)
                .FirstOrDefaultAsync(o => o.Id == id);
            if (os == null) return Results.NotFound();
            
            if (!string.IsNullOrWhiteSpace(dto.Description)) os.Descricao = dto.Description;
            if (dto.Diagnosis != null) os.Diagnostico = dto.Diagnosis;
            if (dto.TechnicianNotes != null) os.AnotacoesTecnico = dto.TechnicianNotes;
            if (dto.OpeningKm.HasValue) os.KmAbertura = dto.OpeningKm.Value.ToString();
            
            // Only block technician assignment if this OS is ALREADY in execution.
            // If it's transitioning to execution, the status block below will catch it.
            if (dto.TechnicianId.HasValue && dto.TechnicianId != os.TecnicoId && os.Status == OrdemStatus.EmExecucao)
            {
                var busyOs = await db.OrdensServico.FirstOrDefaultAsync(o => 
                    o.TecnicoId == dto.TechnicianId && 
                    o.Status == OrdemStatus.EmExecucao && 
                    o.Id != id);
                    
                if (busyOs != null)
                {
                    var num = busyOs.Codigo > 0 ? $"OS-{busyOs.Codigo.ToString().PadLeft(4, '0')}" : $"#{busyOs.Id.ToString().Substring(0, 6)}";
                    return Results.BadRequest(new { error = $"O técnico selecionado já está trabalhando na {num}. Pause ou conclua a OS atual dele antes de transferir esta OS em execução para ele." });
                }
            }
            
            // Allow updating technician regardless of status change (api.ts sends full payload)
            os.TecnicoId = dto.TechnicianId;
            
            if (!string.IsNullOrWhiteSpace(dto.Status)) {
                if (dto.Status == "Em Execução") 
                {
                    // Check again in case they are starting an OS they were already assigned to but became busy in the meantime
                    if (dto.TechnicianId.HasValue)
                    {
                        var busyOs = await db.OrdensServico.FirstOrDefaultAsync(o => 
                            o.TecnicoId == dto.TechnicianId && 
                            o.Status == OrdemStatus.EmExecucao && 
                            o.Id != id);
                            
                        if (busyOs != null)
                        {
                            var num = busyOs.Codigo > 0 ? $"OS-{busyOs.Codigo.ToString().PadLeft(4, '0')}" : $"#{busyOs.Id.ToString().Substring(0, 6)}";
                            return Results.BadRequest(new { error = $"O técnico selecionado já está trabalhando na {num}. Pause ou conclua a OS atual dele antes de iniciar esta." });
                        }
                    }

                    os.AlterarStatus(OrdemStatus.EmExecucao);
                    os.TecnicoId = dto.TechnicianId;
                    
                    if (os.DataInicioExecucao == null)
                    {
                        os.DataInicioExecucao = DateTimeOffset.UtcNow;
                        var serviceIds = dto.Items?.Where(i => i.Type == "service").Select(i => i.ItemId).ToList() ?? new List<Guid>();
                        var estimatedHours = await db.Servicos.Where(s => serviceIds.Contains(s.Id)).SumAsync(s => s.DuracaoEstimadaHoras);
                        os.DataPrevistaConclusao = os.DataInicioExecucao.Value.AddHours((double)Math.Max(0.5m, estimatedHours));
                    }
                }
                else if (dto.Status == "Pausada")
                {
                    os.AlterarStatus(OrdemStatus.Pausada);
                }
                else if (dto.Status == "Concluída")
                {
                    os.AlterarStatus(OrdemStatus.Concluida);
                    os.DataConclusaoServico = DateTimeOffset.UtcNow;
                }
                else if (dto.Status == "Fechada" || dto.Status == "Faturada") 
                {
                    os.AlterarStatus(OrdemStatus.Faturada);
                    os.DataFechamento = DateTimeOffset.UtcNow;
                }
                else if (dto.Status == "Cancelada") os.AlterarStatus(OrdemStatus.Cancelada);
                else if (dto.Status == "Aberta") 
                {
                    if (os.Status == OrdemStatus.Faturada)
                    {
                        var temTransacaoPaga = await db.TransacoesFinanceiras
                            .AnyAsync(t => t.OrdemServicoId == os.Id && t.Status == TransacaoStatus.Pago);
                        
                        if (temTransacaoPaga)
                        {
                            return Results.BadRequest(new { message = "Não é possível reabrir uma OS que já possui lançamento financeiro pago. Estorne o recebimento primeiro." });
                        }

                        os.Estornar();
                        
                        // 1. Reverter estoque
                        foreach (var item in os.Produtos)
                        {
                            var produto = await db.Produtos.FindAsync(item.ProdutoId);
                            if (produto != null)
                            {
                                produto.EstoqueAtual += (int)item.Quantidade;
                            }
                        }
                        
                        // 2. Cancelar transacao financeira pendente associada a esta OS
                        var transacoes = await db.TransacoesFinanceiras
                            .Where(t => t.OrdemServicoId == os.Id && t.Status == TransacaoStatus.Pendente)
                            .ToListAsync();
                        foreach (var t in transacoes)
                        {
                            t.Status = TransacaoStatus.Cancelado;
                        }
                    }
                    else
                    {
                        os.AlterarStatus(OrdemStatus.Aberta);
                    }
                }
            }

            if (dto.TotalPrice > 0) os.ValorTotal = dto.TotalPrice;
            if (dto.TotalCost >= 0) os.CustoTotal = dto.TotalCost;

            if (dto.Items != null)
            {
                var incomingProdutos = dto.Items.Where(i => i.Type == "product").ToList();
                var incomingProdutosGuids = incomingProdutos.Where(i => Guid.TryParse(i.Id, out _)).Select(i => Guid.Parse(i.Id)).ToList();
                
                // Delete products that are no longer in the payload
                await db.OSItensProduto
                    .Where(p => p.OrdemServicoId == id && !incomingProdutosGuids.Contains(p.Id))
                    .ExecuteDeleteAsync();
                
                foreach(var inc in incomingProdutos)
                {
                    if (Guid.TryParse(inc.Id, out Guid parsedId))
                    {
                        // Update existing using ExecuteUpdateAsync to bypass change tracker completely
                        await db.OSItensProduto
                            .Where(p => p.Id == parsedId && p.OrdemServicoId == id)
                            .ExecuteUpdateAsync(s => s
                                .SetProperty(p => p.Quantidade, inc.Quantity)
                                .SetProperty(p => p.CustoUnitario, inc.UnitCost)
                                .SetProperty(p => p.ValorUnitario, inc.UnitPrice)
                                .SetProperty(p => p.Descricao, inc.Name)
                            );
                    }
                    else
                    {
                        // Insert new directly
                        var newProd = new OSItemProduto 
                        { 
                            OrdemServicoId = id,
                            ProdutoId = inc.ItemId, 
                            Quantidade = inc.Quantity, 
                            CustoUnitario = inc.UnitCost, 
                            ValorUnitario = inc.UnitPrice, 
                            Descricao = inc.Name 
                        };
                        db.OSItensProduto.Add(newProd);
                    }
                }

                var incomingServicos = dto.Items.Where(i => i.Type == "service").ToList();
                var incomingServicosGuids = incomingServicos.Where(i => Guid.TryParse(i.Id, out _)).Select(i => Guid.Parse(i.Id)).ToList();
                
                // Delete services that are no longer in the payload
                await db.OSItensServico
                    .Where(s => s.OrdemServicoId == id && !incomingServicosGuids.Contains(s.Id))
                    .ExecuteDeleteAsync();
                
                foreach(var inc in incomingServicos)
                {
                    if (Guid.TryParse(inc.Id, out Guid parsedId))
                    {
                        // Update existing using ExecuteUpdateAsync
                        await db.OSItensServico
                            .Where(s => s.Id == parsedId && s.OrdemServicoId == id)
                            .ExecuteUpdateAsync(s => s
                                .SetProperty(p => p.Quantidade, inc.Quantity)
                                .SetProperty(p => p.CustoUnitario, inc.UnitCost)
                                .SetProperty(p => p.ValorUnitario, inc.UnitPrice)
                                .SetProperty(p => p.Descricao, inc.Name)
                            );
                    }
                    else
                    {
                        // Insert new directly
                        var newServ = new OSItemServico 
                        { 
                            OrdemServicoId = id,
                            ServicoId = inc.ItemId, 
                            Quantidade = inc.Quantity, 
                            CustoUnitario = inc.UnitCost, 
                            ValorUnitario = inc.UnitPrice, 
                            Descricao = inc.Name 
                        };
                        db.OSItensServico.Add(newServ);
                    }
                }
                
                // Now that we have handled items explicitly, we must ensure we don't try to save them via tracker
                // However, we still need to save OrdemServico changes.
            }
            
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Results.Problem("Conflito de concorrência. Outro usuário atualizou os mesmos itens simultaneamente.");
            }
            
            return Results.Ok();
        });
    }
}

public class CreateOsDto
{
    public Guid ClientId { get; set; }
    public Guid AssetId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Diagnosis { get; set; } = string.Empty;
    public int? OpeningKm { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal TotalCost { get; set; }
    public OsItemDto[] Items { get; set; } = Array.Empty<OsItemDto>();
}

public class OsItemDto
{
    public string Id { get; set; } = string.Empty;
    public Guid ItemId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal UnitPrice { get; set; }
}

public class FecharOsDto
{
    public string Diagnosis { get; set; } = string.Empty;
    public decimal Discount { get; set; }
}

public class UpdateOsDto
{
    public string Description { get; set; } = string.Empty;
    public string Diagnosis { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int? OpeningKm { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal TotalCost { get; set; }
    public Guid? TechnicianId { get; set; }
    public string TechnicianNotes { get; set; } = string.Empty;
    public OsItemDto[] Items { get; set; } = Array.Empty<OsItemDto>();
}

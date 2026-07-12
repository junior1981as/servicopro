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

public static class ComprasEndpoints
{
    public static void MapComprasEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/compras").RequireAuthorization();

        group.MapGet("/fix-cancelados", async (ServicoProDbContext db) =>
        {
            var compras = await db.Compras.Where(c => c.Status == CompraStatus.Cancelado).ToListAsync();
            foreach(var c in compras) {
                c.Status = CompraStatus.Pedido;
                c.NumeroNF = null;
                c.RecebidoEm = null;
            }
            await db.SaveChangesAsync();
            return Results.Ok(new { fixedCount = compras.Count });
        }).AllowAnonymous();

        group.MapGet("/", async (ServicoProDbContext db) =>
        {
            var compras = await db.Compras
                .Include(c => c.Itens)
                .Include(c => c.Fornecedor)
                .OrderByDescending(c => c.CriadoEm)
                .Select(c => new
                {
                    id = c.Id,
                    supplier = c.Fornecedor.Nome,
                    status = c.Status == CompraStatus.NFRecebida ? "NF Recebida" : c.Status.ToString(),
                    invoiceNumber = c.NumeroNF,
                    totalAmount = c.ValorTotal,
                    createdAt = c.CriadoEm,
                    receivedAt = c.RecebidoEm,
                    items = c.Itens.Select(i => new
                    {
                        id = i.Id,
                        productId = i.ProdutoId,
                        name = i.Nome,
                        quantity = i.Quantidade,
                        unitCost = i.PrecoCusto,
                        totalPrice = i.ValorTotal
                    })
                })
                .ToListAsync();

            return Results.Ok(compras);
        });

        group.MapPost("/", async (CompraDto dto, ServicoProDbContext db) =>
        {
            var fornecedor = await db.Clientes.FindAsync(dto.SupplierId);
            if (fornecedor == null) return Results.BadRequest(new { error = "Fornecedor inválido." });

            var compra = new Compra
            {
                Status = Enum.TryParse<CompraStatus>(dto.Status.Replace(" ", ""), out var s) ? s : CompraStatus.Necessidade,
                FornecedorId = dto.SupplierId,
                NumeroNF = dto.InvoiceNumber,
                ValorTotal = dto.TotalAmount
            };

            if (dto.Items != null)
            {
                foreach (var item in dto.Items)
                {
                    compra.Itens.Add(new CompraItem
                    {
                        ProdutoId = item.ProductId,
                        Nome = item.Name,
                        Quantidade = item.Quantity,
                        PrecoCusto = item.UnitCost > 0 ? item.UnitCost : (item.CostPrice ?? 0)
                    });
                }
            }

            db.Compras.Add(compra);
            await db.SaveChangesAsync();

            return Results.Created($"/api/compras/{compra.Id}", new { id = compra.Id });
        });

        group.MapPut("/{id:guid}", async (Guid id, CompraDto dto, ServicoProDbContext db) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                var compra = await db.Compras.Include(c => c.Itens).FirstOrDefaultAsync(c => c.Id == id);
                if (compra == null) return Results.NotFound();

                if (compra.Status != CompraStatus.Pedido)
                    return Results.BadRequest(new { error = "Apenas pedidos não recebidos e não cancelados podem ser editados." });

                var fornecedor = await db.Clientes.FindAsync(dto.SupplierId);
                if (fornecedor == null) return Results.BadRequest(new { error = "Fornecedor inválido." });

                compra.FornecedorId = dto.SupplierId;
                compra.ValorTotal = dto.TotalAmount;

                // Remover itens antigos e adicionar novos
                var oldItems = compra.Itens.ToList();
                db.CompraItens.RemoveRange(oldItems);
                compra.Itens.Clear();
                
                if (dto.Items != null)
                {
                    foreach (var item in dto.Items)
                    {
                        compra.Itens.Add(new CompraItem
                        {
                            ProdutoId = item.ProductId,
                            Nome = item.Name,
                            Quantidade = item.Quantity,
                            PrecoCusto = item.UnitCost > 0 ? item.UnitCost : (item.CostPrice ?? 0)
                        });
                    }
                }

                await db.SaveChangesAsync();
                await transaction.CommitAsync();
                
                return Results.Ok();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest(new { error = "Erro ao editar compra", details = ex.Message });
            }
        });

        group.MapPost("/{id:guid}/receber", async (Guid id, ReceiveInvoiceDto dto, ServicoProDbContext db) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                var compra = await db.Compras.Include(c => c.Itens).FirstOrDefaultAsync(c => c.Id == id);
                if (compra == null) return Results.NotFound();

                if (compra.Status == CompraStatus.NFRecebida)
                    return Results.BadRequest(new { error = "Nota Fiscal já recebida para este pedido." });
                if (compra.Status == CompraStatus.Cancelado)
                    return Results.BadRequest(new { error = "Não é possível receber NF de um pedido cancelado." });

                // 1. Atualizar Status da Compra e valores
                compra.Status = CompraStatus.NFRecebida;
                compra.NumeroNF = dto.InvoiceNumber;
                compra.RecebidoEm = DateTimeOffset.UtcNow;
                
                if (dto.Items != null && dto.Items.Length > 0)
                {
                    compra.ValorTotal = dto.TotalAmount ?? compra.ValorTotal;
                    
                    // Remover itens antigos (apenas do contexto, sem chamar Clear na navegação para evitar conflitos de Tracking do EF Core)
                    var itemsToRemove = compra.Itens.ToList();
                    db.CompraItens.RemoveRange(itemsToRemove);
                    
                    foreach (var item in dto.Items)
                    {
                        var newItem = new CompraItem
                        {
                            CompraId = compra.Id,
                            ProdutoId = item.ProductId,
                            Nome = item.Name,
                            Quantidade = item.Quantity,
                            PrecoCusto = item.UnitCost > 0 ? item.UnitCost : (item.CostPrice ?? 0)
                        };
                        db.CompraItens.Add(newItem);

                        // 2. Aumentar Estoque
                        var produto = await db.Produtos.FindAsync(item.ProductId);
                        if (produto != null)
                        {
                            produto.EstoqueAtual += (int)item.Quantity;
                        }
                    }
                }
                else
                {
                    // Se não enviou itens (apenas recebeu), atualizar estoque dos itens que já existiam
                    foreach (var item in compra.Itens)
                    {
                        var produto = await db.Produtos.FindAsync(item.ProdutoId);
                        if (produto != null)
                        {
                            produto.EstoqueAtual += (int)item.Quantidade;
                        }
                    }
                }

                // 3. Gerar Transação Financeira (Contas a Pagar)
                var dataVencimento = dto.DueDate ?? DateTimeOffset.UtcNow.AddDays(30);
                var transacao = new TransacaoFinanceira
                {
                    Tipo = TransacaoTipo.Despesa,
                    Categoria = "Compra de Estoque",
                    CompraId = compra.Id,
                    Descricao = $"Compra de Peças NF {dto.InvoiceNumber}",
                    Valor = compra.ValorTotal,
                    DataVencimento = dataVencimento,
                    Status = TransacaoStatus.Pendente
                };
                db.TransacoesFinanceiras.Add(transacao);

                try {
                    await db.SaveChangesAsync();
                    await transaction.CommitAsync();
                } catch (DbUpdateConcurrencyException ex) {
                    await transaction.RollbackAsync();
                    var entry = ex.Entries.FirstOrDefault();
                    return Results.BadRequest(new { error = $"Erro no segundo save: {entry?.Entity.GetType().Name}", details = ex.Message });
                }

                return Results.Ok();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest(new { error = "Erro ao receber compra", details = ex.Message });
            }
        });

        group.MapPost("/{id:guid}/cancelar", async (Guid id, ServicoProDbContext db) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                var compra = await db.Compras.Include(c => c.Itens).FirstOrDefaultAsync(c => c.Id == id);
                if (compra == null) return Results.NotFound();

                if (compra.Status == CompraStatus.Cancelado)
                    return Results.BadRequest(new { error = "Pedido já está cancelado." });

                if (compra.Status == CompraStatus.NFRecebida)
                {
                    // Verify if stock allows cancellation (has not been consumed)
                    foreach (var item in compra.Itens)
                    {
                        var produto = await db.Produtos.FindAsync(item.ProdutoId);
                        if (produto == null) continue;

                        if (produto.EstoqueAtual < item.Quantidade)
                        {
                            return Results.BadRequest(new { error = $"Não é possível cancelar: o produto {produto.Nome} já teve movimentação de saída (Estoque insuficiente para estorno)." });
                        }
                    }

                    // Reverse stock
                    foreach (var item in compra.Itens)
                    {
                        var produto = await db.Produtos.FindAsync(item.ProdutoId);
                        if (produto != null)
                        {
                            produto.EstoqueAtual -= (int)item.Quantidade;
                        }
                    }

                    // Reverse finance
                    var transacao = await db.TransacoesFinanceiras.FirstOrDefaultAsync(t => t.CompraId == compra.Id);
                    if (transacao != null)
                    {
                        if (transacao.Status == TransacaoStatus.Pago)
                        {
                            return Results.BadRequest(new { error = "Não é possível cancelar: O pagamento desta fatura já foi baixado no financeiro." });
                        }
                        db.TransacoesFinanceiras.Remove(transacao);
                    }
                    
                    // Revert status to Pedido instead of Cancelado
                    compra.Status = CompraStatus.Pedido;
                }
                else
                {
                    compra.Status = CompraStatus.Cancelado;
                }

                await db.SaveChangesAsync();
                await transaction.CommitAsync();
                
                return Results.Ok();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest(new { error = "Erro ao cancelar compra", details = ex.Message });
            }
        });
    }
}

public class CompraDto
{
    public Guid SupplierId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? InvoiceNumber { get; set; }
    public decimal TotalAmount { get; set; }
    public CompraItemDto[] Items { get; set; } = Array.Empty<CompraItemDto>();
}

public class CompraItemDto
{
    public Guid ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal? CostPrice { get; set; }
}

public class ReceiveInvoiceDto
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTimeOffset? DueDate { get; set; }
    public decimal? TotalAmount { get; set; }
    public CompraItemDto[]? Items { get; set; }
}

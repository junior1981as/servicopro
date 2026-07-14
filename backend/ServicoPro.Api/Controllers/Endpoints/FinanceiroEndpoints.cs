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

public static class FinanceiroEndpoints
{
    public static void MapFinanceiroEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/financeiro").RequireAuthorization();

        // Transações
        group.MapGet("/transacoes", async (ServicoProDbContext db) =>
        {
            var transacoes = await db.TransacoesFinanceiras
                .OrderByDescending(t => t.DataVencimento)
                .Select(t => new
                {
                    id = t.Id,
                    type = t.Tipo.ToString().ToLower(),
                    category = t.Categoria,
                    sourceId = t.OrdemServicoId != null ? t.OrdemServicoId.ToString() : t.CompraId.ToString(),
                    description = t.Descricao,
                    amount = t.Valor,
                    desconto = t.Desconto,
                    numeroParcela = t.NumeroParcela,
                    totalParcelas = t.TotalParcelas,
                    dueDate = t.DataVencimento,
                    paymentDate = t.DataPagamento,
                    status = t.Status.ToString(),
                    paymentMethod = t.MetodoPagamento,
                    contaBancariaId = t.ContaBancariaId,
                    createdAt = t.CriadoEm
                })
                .ToListAsync();

            return Results.Ok(transacoes);
        });

        // Contas Bancárias
        group.MapGet("/contas-bancarias", async (ServicoProDbContext db) =>
        {
            var contas = await db.ContasBancarias
                .OrderBy(c => c.Nome)
                .Select(c => new {
                    id = c.Id,
                    nome = c.Nome,
                    tipo = c.Tipo.ToString(),
                    saldoAtual = c.SaldoAtual,
                    banco = c.Banco,
                    agencia = c.Agencia,
                    numeroConta = c.NumeroConta,
                    ativo = c.Ativo
                })
                .ToListAsync();
            return Results.Ok(contas);
        });

        group.MapPost("/contas-bancarias", async ([FromBody] CreateContaDto dto, ServicoProDbContext db) =>
        {
            var conta = new ContaBancaria
            {
                Nome = dto.Nome,
                Tipo = Enum.Parse<ContaBancariaTipo>(dto.Tipo, true),
                SaldoAtual = dto.SaldoInicial,
                Banco = dto.Banco ?? string.Empty,
                Agencia = dto.Agencia ?? string.Empty,
                NumeroConta = dto.NumeroConta ?? string.Empty,
                Ativo = dto.Ativo
            };
            db.ContasBancarias.Add(conta);
            await db.SaveChangesAsync();
            return Results.Ok(new { id = conta.Id });
        });

        group.MapPut("/contas-bancarias/{id:guid}", async (Guid id, [FromBody] UpdateContaDto dto, ServicoProDbContext db) =>
        {
            var conta = await db.ContasBancarias.FindAsync(id);
            if (conta == null) return Results.NotFound();

            conta.Nome = dto.Nome;
            conta.Tipo = Enum.Parse<ContaBancariaTipo>(dto.Tipo, true);
            conta.Banco = dto.Banco ?? string.Empty;
            conta.Agencia = dto.Agencia ?? string.Empty;
            conta.NumeroConta = dto.NumeroConta ?? string.Empty;
            conta.Ativo = dto.Ativo;

            await db.SaveChangesAsync();
            return Results.Ok();
        });

        // Pagamento / Baixa
        group.MapPost("/transacoes/{id:guid}/pagar", async (Guid id, PayTransactionDto dto, ServicoProDbContext db) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                var transacao = await db.TransacoesFinanceiras.FindAsync(id);
                if (transacao == null) return Results.NotFound();

                if (transacao.Status == TransacaoStatus.Pago)
                    return Results.BadRequest(new { error = "Transação já está paga." });

                var conta = await db.ContasBancarias.FindAsync(dto.ContaBancariaId);
                if (conta == null) return Results.BadRequest(new { error = "Conta Bancária não encontrada." });

                // 1. Atualiza a transação
                transacao.Status = TransacaoStatus.Pago;
                transacao.DataPagamento = DateTimeOffset.UtcNow;
                transacao.MetodoPagamento = dto.PaymentMethod;
                transacao.ContaBancariaId = dto.ContaBancariaId;

                // Atualiza Saldo
                if (transacao.Tipo == TransacaoTipo.Receita)
                    conta.SaldoAtual += transacao.Valor;
                else
                    conta.SaldoAtual -= transacao.Valor;

                // 2. Registra no Livro Caixa
                var livroCaixa = new LivroCaixa
                {
                    Tipo = transacao.Tipo == TransacaoTipo.Receita ? LivroCaixaTipo.Entrada : LivroCaixaTipo.Saida,
                    Valor = transacao.Valor,
                    Descricao = $"{(transacao.Tipo == TransacaoTipo.Receita ? "Entrada" : "Saída")} via {dto.PaymentMethod}: {transacao.Descricao}",
                    TransacaoId = transacao.Id,
                    ContaBancariaId = dto.ContaBancariaId
                };
                db.LivroCaixa.Add(livroCaixa);

                await db.SaveChangesAsync();
                await transaction.CommitAsync();

                return Results.Ok();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest(new { error = "Erro ao pagar transação", details = ex.Message });
            }
        });

        // Estorno
        group.MapPost("/transacoes/{id:guid}/estornar", async (Guid id, ServicoProDbContext db) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                var transacao = await db.TransacoesFinanceiras.FindAsync(id);
                if (transacao == null) return Results.NotFound();

                if (transacao.Status != TransacaoStatus.Pago)
                    return Results.BadRequest(new { error = "Apenas transações pagas podem ser estornadas." });

                var metodoPagamentoAntigo = transacao.MetodoPagamento;

                // 1. Atualiza a transação de volta para pendente
                transacao.Status = TransacaoStatus.Pendente;
                transacao.DataPagamento = null;
                transacao.MetodoPagamento = null;
                var contaId = transacao.ContaBancariaId;
                transacao.ContaBancariaId = null;

                if (contaId.HasValue)
                {
                    var conta = await db.ContasBancarias.FindAsync(contaId.Value);
                    if (conta != null)
                    {
                        if (transacao.Tipo == TransacaoTipo.Receita)
                            conta.SaldoAtual -= transacao.Valor; // Estorna recebimento (tira dinheiro)
                        else
                            conta.SaldoAtual += transacao.Valor; // Estorna pagamento (devolve dinheiro)
                    }
                }

                // 2. Registra o Estorno no Livro Caixa (Sinal invertido)
                if (contaId.HasValue)
                {
                    var livroCaixa = new LivroCaixa
                    {
                        Tipo = transacao.Tipo == TransacaoTipo.Receita ? LivroCaixaTipo.Saida : LivroCaixaTipo.Entrada,
                        Valor = transacao.Valor,
                        Descricao = $"Estorno de Recebimento ({metodoPagamentoAntigo}): {transacao.Descricao}",
                        TransacaoId = transacao.Id,
                        ContaBancariaId = contaId.Value
                    };
                    db.LivroCaixa.Add(livroCaixa);
                }

                await db.SaveChangesAsync();
                await transaction.CommitAsync();

                return Results.Ok();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest(new { error = "Erro ao estornar transação", details = ex.Message });
            }
        });

        // Edição de Título
        group.MapPut("/transacoes/{id:guid}", async (Guid id, [FromBody] EditTransactionDto dto, ServicoProDbContext db) =>
        {
            var t = await db.TransacoesFinanceiras.FindAsync(id);
            if (t == null) return Results.NotFound();
            if (t.Status == TransacaoStatus.Pago) return Results.BadRequest(new { error = "Não é possível editar uma transação já paga. Realize o estorno primeiro." });

            if (dto.DueDate.HasValue) t.DataVencimento = dto.DueDate.Value;
            if (dto.Amount.HasValue) t.Valor = dto.Amount.Value;
            if (dto.Desconto.HasValue) t.Desconto = dto.Desconto.Value;
            if (!string.IsNullOrWhiteSpace(dto.Description)) t.Descricao = dto.Description;

            await db.SaveChangesAsync();
            return Results.Ok();
        });

        // Parcelamento
        group.MapPost("/transacoes/{id:guid}/parcelar", async (Guid id, [FromBody] ParcelarTransactionDto dto, ServicoProDbContext db) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                var t = await db.TransacoesFinanceiras.FindAsync(id);
                if (t == null) return Results.NotFound();
                if (t.Status == TransacaoStatus.Pago) return Results.BadRequest(new { error = "Não é possível parcelar uma transação já paga." });
                if (dto.Parcelas < 2 || dto.Parcelas > 60) return Results.BadRequest(new { error = "O número de parcelas deve ser entre 2 e 60." });

                var valorParcela = Math.Round(t.Valor / dto.Parcelas, 2);
                var diff = t.Valor - (valorParcela * dto.Parcelas);

                var baseVencimento = t.DataVencimento;

                for (int i = 1; i <= dto.Parcelas; i++)
                {
                    var p = new TransacaoFinanceira
                    {
                        Tipo = t.Tipo,
                        Categoria = t.Categoria,
                        OrdemServicoId = t.OrdemServicoId,
                        CompraId = t.CompraId,
                        Descricao = $"{t.Descricao} - Parcela {i}/{dto.Parcelas}",
                        Valor = i == dto.Parcelas ? valorParcela + diff : valorParcela,
                        Desconto = i == 1 ? t.Desconto : 0, // Aplica desconto existente na primeira parcela
                        DataVencimento = baseVencimento.AddMonths(i - 1),
                        NumeroParcela = i,
                        TotalParcelas = dto.Parcelas,
                        Status = TransacaoStatus.Pendente
                    };
                    db.TransacoesFinanceiras.Add(p);
                }

                // Cancela a original em vez de deletar para preservar histórico do Livro Caixa
                t.Status = TransacaoStatus.Cancelado;
                t.Descricao += " (Substituído por Parcelamento)";

                await db.SaveChangesAsync();
                await transaction.CommitAsync();

                return Results.Ok();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest(new { error = "Erro ao parcelar transação", details = ex.Message });
            }
        });

        // Desfazer Lançamento (Retorna à Origem)
        group.MapPost("/transacoes/{id:guid}/desfazer", async (Guid id, ServicoProDbContext db) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                var t = await db.TransacoesFinanceiras.FindAsync(id);
                if (t == null) return Results.NotFound();
                
                if (t.Status == TransacaoStatus.Pago) 
                    return Results.BadRequest(new { error = "Estorne o pagamento antes de desfazer o faturamento inteiro." });

                if (t.OrdemServicoId != null)
                {
                    // Desfazer OS
                    var os = await db.OrdensServico
                        .Include(o => o.Produtos)
                        .FirstOrDefaultAsync(o => o.Id == t.OrdemServicoId);
                        
                    if (os != null && os.Status == OrdemStatus.Faturada)
                    {
                        // Retornar estoque
                        foreach (var item in os.Produtos)
                        {
                            var produto = await db.Produtos.FindAsync(item.ProdutoId);
                            if (produto != null)
                            {
                                produto.EstoqueAtual += (int)item.Quantidade;
                            }
                        }
                        
                        // Retornar OS para Concluída (ponto antes de Faturar)
                        os.Estornar(); // Muda para Aberta
                        os.AlterarStatus(OrdemStatus.Concluida); // Passa para Concluida
                        
                        // Excluir todas transações vinculadas (incluindo parcelas)
                        var todasTransacoesOs = await db.TransacoesFinanceiras.Where(tr => tr.OrdemServicoId == os.Id).ToListAsync();
                        db.TransacoesFinanceiras.RemoveRange(todasTransacoesOs);
                    }
                }
                else if (t.CompraId != null)
                {
                    // Desfazer Compra
                    var compra = await db.Compras
                        .Include(c => c.Itens)
                        .FirstOrDefaultAsync(c => c.Id == t.CompraId);
                        
                    if (compra != null && compra.Status == CompraStatus.NFRecebida)
                    {
                        // Checar se o estoque atual permite o estorno
                        foreach (var item in compra.Itens)
                        {
                            var produto = await db.Produtos.FindAsync(item.ProdutoId);
                            if (produto != null)
                            {
                                if (produto.EstoqueAtual < item.Quantidade)
                                {
                                    return Results.BadRequest(new { error = $"Estorno bloqueado! O produto '{produto.Nome}' teve movimentação de saída após a compra. Saldo insuficiente para reverter." });
                                }
                                produto.EstoqueAtual -= (int)item.Quantidade;
                            }
                        }
                        
                        // Voltar para status anterior
                        compra.Status = CompraStatus.Pedido;
                        compra.NumeroNF = null;
                        compra.RecebidoEm = null;
                        
                        // Excluir transações
                        var todasTransacoesCompra = await db.TransacoesFinanceiras.Where(tr => tr.CompraId == compra.Id).ToListAsync();
                        db.TransacoesFinanceiras.RemoveRange(todasTransacoesCompra);
                    }
                }
                else
                {
                    // Transação avulsa, apenas cancelar
                    t.Status = TransacaoStatus.Cancelado;
                }

                await db.SaveChangesAsync();
                await transaction.CommitAsync();

                return Results.Ok();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest(new { error = "Erro ao desfazer transação", details = ex.Message });
            }
        });

        // Livro Caixa
        group.MapGet("/livro-caixa", async (ServicoProDbContext db) =>
        {
            var livroCaixa = await db.LivroCaixa
                .OrderByDescending(l => l.DataHoraRegistro)
                .Select(l => new
                {
                    id = l.Id,
                    type = l.Tipo == LivroCaixaTipo.Entrada ? "entrada" : "saida",
                    amount = l.Valor,
                    description = l.Descricao,
                    transactionId = l.TransacaoId,
                    contaBancariaId = l.ContaBancariaId,
                    dateTimeRecorded = l.DataHoraRegistro
                })
                .ToListAsync();

            return Results.Ok(livroCaixa);
        });
    }
}

public class PayTransactionDto
{
    public string PaymentMethod { get; set; } = string.Empty;
    public Guid ContaBancariaId { get; set; }
}

public class CreateContaDto
{
    public string Nome { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public decimal SaldoInicial { get; set; }
    public string Banco { get; set; } = string.Empty;
    public string Agencia { get; set; } = string.Empty;
    public string NumeroConta { get; set; } = string.Empty;
    public bool Ativo { get; set; } = true;
}

public class UpdateContaDto
{
    public string Nome { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string Banco { get; set; } = string.Empty;
    public string Agencia { get; set; } = string.Empty;
    public string NumeroConta { get; set; } = string.Empty;
    public bool Ativo { get; set; } = true;
}

public class EditTransactionDto
{
    public DateTimeOffset? DueDate { get; set; }
    public decimal? Amount { get; set; }
    public decimal? Desconto { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class ParcelarTransactionDto
{
    public int Parcelas { get; set; }
}

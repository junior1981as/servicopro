using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServicoPro.Api.Infrastructure.Data;
using ServicoPro.Api.Domain.Entities;

namespace ServicoPro.Api.API.Endpoints;

public static class CadastrosBaseEndpoints
{
    public static void MapCadastrosBaseEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/cadastros").RequireAuthorization();

        // Clientes
        group.MapGet("/clientes", async (ServicoProDbContext db) =>
            Results.Ok(await db.Clientes.ToListAsync()));
            
        group.MapPost("/clientes", async (Cliente cliente, ServicoProDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(cliente.Documento))
            {
                return Results.BadRequest(new { error = "O documento (CPF/CNPJ) é obrigatório." });
            }

            var docLimpo = new string(cliente.Documento.Where(char.IsDigit).ToArray());
            
            var existe = await db.Clientes.AnyAsync(c => c.Documento == docLimpo || c.Documento == cliente.Documento);
            if (existe)
            {
                return Results.Conflict(new { error = "Já existe um cliente cadastrado com este documento." });
            }

            db.Clientes.Add(cliente);
            await db.SaveChangesAsync();
            return Results.Created($"/api/cadastros/clientes/{cliente.Id}", cliente);
        });

        group.MapPut("/clientes/{id:guid}", async (Guid id, Cliente clienteAtualizado, ServicoProDbContext db) =>
        {
            var cliente = await db.Clientes.FindAsync(id);
            if (cliente is null) return Results.NotFound();

            cliente.Nome = clienteAtualizado.Nome;
            cliente.Documento = clienteAtualizado.Documento;
            cliente.Email = clienteAtualizado.Email;
            cliente.Telefone = clienteAtualizado.Telefone;
            cliente.Cep = clienteAtualizado.Cep;
            cliente.Rua = clienteAtualizado.Rua;
            cliente.Numero = clienteAtualizado.Numero;
            cliente.Bairro = clienteAtualizado.Bairro;
            cliente.Cidade = clienteAtualizado.Cidade;
            cliente.Estado = clienteAtualizado.Estado;
            cliente.Rg = clienteAtualizado.Rg;
            cliente.InscricaoEstadual = clienteAtualizado.InscricaoEstadual;
            cliente.TipoParceiro = clienteAtualizado.TipoParceiro;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapDelete("/clientes/{id:guid}", async (Guid id, ServicoProDbContext db) =>
        {
            var cliente = await db.Clientes.FindAsync(id);
            if (cliente is null) return Results.NotFound();

            db.Clientes.Remove(cliente);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Ativos
        group.MapGet("/ativos", async (ServicoProDbContext db) =>
            Results.Ok(await db.Ativos.Include(a => a.Cliente).ToListAsync()));

        group.MapPost("/ativos", async (Ativo ativo, ServicoProDbContext db) =>
        {
            db.Ativos.Add(ativo);
            await db.SaveChangesAsync();
            return Results.Created($"/api/cadastros/ativos/{ativo.Id}", ativo);
        });

        group.MapPut("/ativos/{id:guid}", async (Guid id, Ativo ativoAtualizado, ServicoProDbContext db) =>
        {
            var ativo = await db.Ativos.FindAsync(id);
            if (ativo is null) return Results.NotFound();

            ativo.Descricao = ativoAtualizado.Descricao;
            ativo.ClienteId = ativoAtualizado.ClienteId;
            ativo.PlacaOuIdentificador = ativoAtualizado.PlacaOuIdentificador;
            ativo.Marca = ativoAtualizado.Marca;
            ativo.Modelo = ativoAtualizado.Modelo;
            ativo.InformacoesAdicionais = ativoAtualizado.InformacoesAdicionais;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapDelete("/ativos/{id:guid}", async (Guid id, ServicoProDbContext db) =>
        {
            var ativo = await db.Ativos.FindAsync(id);
            if (ativo is null) return Results.NotFound();

            db.Ativos.Remove(ativo);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Produtos
        group.MapGet("/produtos", async (ServicoProDbContext db) =>
            Results.Ok(await db.Produtos.ToListAsync()));

        group.MapPost("/produtos", async (Produto produto, ServicoProDbContext db) =>
        {
            db.Produtos.Add(produto);
            await db.SaveChangesAsync();
            return Results.Created($"/api/cadastros/produtos/{produto.Id}", produto);
        });

        group.MapPut("/produtos/{id:guid}", async (Guid id, Produto produtoAtualizado, ServicoProDbContext db) =>
        {
            var produto = await db.Produtos.FindAsync(id);
            if (produto is null) return Results.NotFound();

            produto.Nome = produtoAtualizado.Nome;
            produto.Sku = produtoAtualizado.Sku;
            produto.PrecoCusto = produtoAtualizado.PrecoCusto;
            produto.PrecoVenda = produtoAtualizado.PrecoVenda;
            produto.EstoqueAtual = produtoAtualizado.EstoqueAtual;
            produto.EstoqueMinimo = produtoAtualizado.EstoqueMinimo;
            produto.Unidade = produtoAtualizado.Unidade;
            produto.NcmCodigo = produtoAtualizado.NcmCodigo;
            produto.Ean = produtoAtualizado.Ean;
            produto.CfopCodigo = produtoAtualizado.CfopCodigo;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapDelete("/produtos/{id:guid}", async (Guid id, ServicoProDbContext db) =>
        {
            var produto = await db.Produtos.FindAsync(id);
            if (produto is null) return Results.NotFound();

            db.Produtos.Remove(produto);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapGet("/produtos/{id:guid}/historico", async (Guid id, ServicoProDbContext db) =>
        {
            var compras = await db.CompraItens
                .Include(ci => ci.Compra)
                .Where(ci => ci.ProdutoId == id && ci.Compra.Status == CompraStatus.NFRecebida)
                .Select(ci => new
                {
                    Id = ci.Id,
                    Type = "Entrada",
                    Date = ci.Compra.RecebidoEm ?? ci.Compra.CriadoEm,
                    Quantity = ci.Quantidade,
                    UnitPrice = ci.PrecoCusto,
                    Document = $"Compra {(string.IsNullOrEmpty(ci.Compra.NumeroNF) ? "S/N" : ci.Compra.NumeroNF)}",
                    Status = "Recebida"
                })
                .ToListAsync();

            var osItensRaw = await db.OrdensServico
                .Where(os => (os.Status == OrdemStatus.Concluida || os.Status == OrdemStatus.Faturada) && os.Produtos.Any(p => p.ProdutoId == id))
                .SelectMany(os => os.Produtos.Where(p => p.ProdutoId == id).Select(p => new
                {
                    Id = p.Id,
                    Type = "Saida",
                    Date = os.DataFechamento ?? os.DataAbertura,
                    Quantity = p.Quantidade,
                    UnitPrice = p.ValorUnitario,
                    Codigo = os.Codigo,
                    Numero = os.Numero,
                    Status = os.Status == OrdemStatus.Faturada ? "Faturada" : "Concluída"
                }))
                .ToListAsync();

            var osItens = osItensRaw.Select(x => new
            {
                Id = x.Id,
                x.Type,
                Date = x.Date,
                x.Quantity,
                x.UnitPrice,
                Document = x.Codigo > 0 ? $"OS-{x.Codigo.ToString().PadLeft(4, '0')}" : $"OS {x.Numero}",
                x.Status
            }).ToList();

            var history = compras.Concat(osItens).OrderByDescending(h => h.Date).ToList();
            return Results.Ok(history);
        });

        // Serviços
        group.MapGet("/servicos", async (ServicoProDbContext db) =>
            Results.Ok(await db.Servicos.ToListAsync()));

        group.MapPost("/servicos", async (Servico servico, ServicoProDbContext db) =>
        {
            db.Servicos.Add(servico);
            await db.SaveChangesAsync();
            return Results.Created($"/api/cadastros/servicos/{servico.Id}", servico);
        });

        group.MapPut("/servicos/{id:guid}", async (Guid id, Servico servicoAtualizado, ServicoProDbContext db) =>
        {
            var servico = await db.Servicos.FindAsync(id);
            if (servico is null) return Results.NotFound();

            servico.Nome = servicoAtualizado.Nome;
            servico.ValorUnitario = servicoAtualizado.ValorUnitario;
            servico.Custo = servicoAtualizado.Custo;
            servico.DuracaoEstimadaHoras = servicoAtualizado.DuracaoEstimadaHoras;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapDelete("/servicos/{id:guid}", async (Guid id, ServicoProDbContext db) =>
        {
            var servico = await db.Servicos.FindAsync(id);
            if (servico is null) return Results.NotFound();

            db.Servicos.Remove(servico);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Funcionarios
        group.MapGet("/funcionarios", async (ServicoProDbContext db) =>
            Results.Ok(await db.Funcionarios.ToListAsync()));

        group.MapPost("/funcionarios", async (Funcionario funcionario, ServicoProDbContext db) =>
        {
            db.Funcionarios.Add(funcionario);
            await db.SaveChangesAsync();
            return Results.Created($"/api/cadastros/funcionarios/{funcionario.Id}", funcionario);
        });

        group.MapPut("/funcionarios/{id:guid}", async (Guid id, Funcionario funcionarioAtualizado, ServicoProDbContext db) =>
        {
            var funcionario = await db.Funcionarios.FindAsync(id);
            if (funcionario is null) return Results.NotFound();

            funcionario.Nome = funcionarioAtualizado.Nome;
            funcionario.Cargo = funcionarioAtualizado.Cargo;
            funcionario.Especialidade = funcionarioAtualizado.Especialidade;
            funcionario.Ativo = funcionarioAtualizado.Ativo;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapDelete("/funcionarios/{id:guid}", async (Guid id, ServicoProDbContext db) =>
        {
            var funcionario = await db.Funcionarios.FindAsync(id);
            if (funcionario is null) return Results.NotFound();

            db.Funcionarios.Remove(funcionario);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // CFOPs e NCMs
        group.MapGet("/cfops", async (ServicoProDbContext db) =>
            Results.Ok(await db.Cfops.OrderBy(c => c.Codigo).ToListAsync()));

        group.MapGet("/ncms", async (ServicoProDbContext db) =>
            Results.Ok(await db.Ncms.OrderBy(n => n.Codigo).ToListAsync()));
    }
}

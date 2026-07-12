using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using ServicoPro.Api.Infrastructure.Data;
using ServicoPro.Api.Domain.Entities;

var optionsBuilder = new DbContextOptionsBuilder<ServicoProDbContext>();
optionsBuilder.UseSqlServer("Server=127.0.0.1,51666;Database=db_servicopro_mssql;User Id=servicopro_app;Password=aqswde12#$%&;TrustServerCertificate=True;Encrypt=True;MultipleActiveResultSets=True;");

using var db = new ServicoProDbContext(optionsBuilder.Options);
using var transaction = db.Database.BeginTransaction();

var compraId = Guid.Parse("F6579945-1132-43F3-8A7E-1DAF84289A14");
var compra = db.Compras.Include(c => c.Itens).FirstOrDefault(c => c.Id == compraId);

Console.WriteLine("Found compra: " + compra?.Id);

compra.Status = CompraStatus.NFRecebida;
compra.NumeroNF = "NF-604227";
compra.RecebidoEm = DateTimeOffset.UtcNow;

var itemsToRemove = compra.Itens.ToList();
db.CompraItens.RemoveRange(itemsToRemove);
compra.Itens.Clear();

compra.Itens.Add(new CompraItem {
    ProdutoId = Guid.Parse("6E28DEC0-20A1-41BA-A4E7-0652BF318340"),
    Nome = "Filtro de óleo",
    Quantidade = 100,
    PrecoCusto = 12
});
compra.Itens.Add(new CompraItem {
    ProdutoId = Guid.Parse("525E6F37-C75A-4FF4-B953-B92335730FB5"),
    Nome = "Filtro Ar K&N",
    Quantidade = 10,
    PrecoCusto = 355.22m
});

db.SaveChanges();
Console.WriteLine("First SaveChanges successful");

foreach (var item in compra.Itens)
{
    var produto = db.Produtos.Find(item.ProdutoId);
    if (produto != null)
    {
        produto.EstoqueAtual += (int)item.Quantidade;
    }
}

var transacao = new TransacaoFinanceira
{
    Tipo = TipoTransacao.Despesa,
    Categoria = "Compra de Estoque",
    Descricao = "Teste",
    Valor = compra.ValorTotal,
    DataVencimento = DateTimeOffset.UtcNow.AddDays(30),
    Status = TransacaoStatus.Pendente,
    OrigemId = compra.Id
};
db.Transacoes.Add(transacao);

try {
    db.SaveChanges();
    transaction.Commit();
    Console.WriteLine("Second SaveChanges successful");
} catch(Exception ex) {
    Console.WriteLine(ex.ToString());
}

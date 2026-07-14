using System;
using System.Collections.Generic;

namespace ServicoPro.Api.Domain.Entities;

public enum CompraStatus
{
    Necessidade = 1,
    Pedido = 2,
    NFRecebida = 3,
    Cancelado = 4
}

public class Compra
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public CompraStatus Status { get; set; } = CompraStatus.Necessidade;
    public Guid FornecedorId { get; set; }
    public Cliente Fornecedor { get; set; } = null!;
    public string? NumeroNF { get; set; }
    
    public decimal ValorTotal { get; set; }
    
    public List<CompraItem> Itens { get; set; } = new();
    
    public DateTimeOffset CriadoEm { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RecebidoEm { get; set; }
}

public class CompraItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompraId { get; set; }
    public Compra Compra { get; set; } = null!;
    
    public Guid ProdutoId { get; set; }
    public Produto Produto { get; set; } = null!;
    
    public string Nome { get; set; } = string.Empty;
    public decimal Quantidade { get; set; }
    public decimal PrecoCusto { get; set; }
    
    public decimal ValorTotal => Quantidade * PrecoCusto;
}

using System;
using System.Collections.Generic;

namespace ServicoPro.Api.Domain.Entities;

public enum OrcamentoStatus
{
    Rascunho = 1,
    Enviado = 2,
    Aprovado = 3,
    Rejeitado = 4,
    Cancelado = 5
}

public class Orcamento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int Codigo { get; set; }
    
    public Guid ClienteId { get; set; }
    public Cliente Cliente { get; set; } = null!;
    
    public Guid AtivoId { get; set; }
    public Ativo Ativo { get; set; } = null!;
    
    public OrcamentoStatus Status { get; set; } = OrcamentoStatus.Rascunho;
    
    public decimal CustoTotal { get; set; }
    public decimal ValorTotal { get; set; }
    public decimal PercentualMargem { get; set; }
    
    public string Observacoes { get; set; } = string.Empty;
    
    public Guid? OrdemServicoId { get; set; }
    public OrdemServico? OrdemServico { get; set; }
    
    public List<OrcamentoItem> Itens { get; set; } = new();
    
    public Guid? TecnicoId { get; set; }
    public Funcionario? Tecnico { get; set; }
    
    public DateTimeOffset CriadoEm { get; set; } = DateTimeOffset.UtcNow;
}

public class OrcamentoItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrcamentoId { get; set; }
    public Orcamento Orcamento { get; set; } = null!;
    
    public Guid? ProdutoId { get; set; }
    public Produto? Produto { get; set; }
    
    public Guid? ServicoId { get; set; }
    public Servico? Servico { get; set; }
    
    public string Nome { get; set; } = string.Empty;
    public decimal Quantidade { get; set; }
    public decimal CustoUnitario { get; set; }
    public decimal PrecoUnitario { get; set; }
    
    public decimal CustoTotal => Quantidade * CustoUnitario;
    public decimal ValorTotal => Quantidade * PrecoUnitario;
}

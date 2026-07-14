using System;
using System.Collections.Generic;

namespace ServicoPro.Api.Domain.Entities;

public enum OrdemStatus
{
    Aberta = 1,
    EmExecucao = 2,
    Concluida = 3,
    Cancelada = 4,
    Faturada = 5,
    Pausada = 6
}

public class OrdemServico
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int Codigo { get; set; }
    public string Numero { get; set; } = string.Empty; // Ex: OS-0007
    
    public Guid ClienteId { get; set; }
    public Cliente Cliente { get; set; } = null!;
    
    public Guid AtivoId { get; set; }
    public Ativo Ativo { get; set; } = null!;

    public string Descricao { get; set; } = string.Empty;
    public string ProblemaRelatado { get; set; } = string.Empty;
    public DateTimeOffset DataAbertura { get; set; } = DateTimeOffset.UtcNow;
    public string KmAbertura { get; set; } = string.Empty;
    
    public OrdemStatus Status { get; private set; } = OrdemStatus.Aberta;
    
    public decimal CustoTotal { get; set; }
    public decimal ValorTotal { get; set; }
    public decimal Desconto { get; set; }
    public decimal PercentualMargem { get; set; }
    
    public string Diagnostico { get; set; } = string.Empty;
    public bool ChecklistPassou { get; set; }
    public string AnotacoesTecnico { get; set; } = string.Empty;
    
    public Guid? OrcamentoId { get; set; }
    public Orcamento? Orcamento { get; set; }
    
    public DateTimeOffset? DataFechamento { get; set; }
    
    public DateTimeOffset? DataInicioExecucao { get; set; }
    public DateTimeOffset? DataPrevistaConclusao { get; set; }
    public DateTimeOffset? DataConclusaoServico { get; set; }
    
    public Guid? TecnicoId { get; set; }
    public Funcionario? Tecnico { get; set; }
    
    public List<OSItemServico> Servicos { get; set; } = new();
    public List<OSItemProduto> Produtos { get; set; } = new();

    public void AlterarStatus(OrdemStatus novoStatus)
    {
        // Regra de Negócio Crítica (Módulo 5)
        if (Status == OrdemStatus.Faturada && novoStatus != OrdemStatus.Faturada && novoStatus != OrdemStatus.Aberta)
        {
            throw new InvalidOperationException("Não é possível alterar o status de uma OS já faturada sem estorno formal.");
        }
        Status = novoStatus;
    }

    public void Estornar()
    {
        if (Status != OrdemStatus.Faturada)
            throw new InvalidOperationException("Apenas OS faturadas podem ser estornadas.");
        Status = OrdemStatus.Aberta;
        DataFechamento = null;
    }

    public void Cancelar()
    {
        if (Status == OrdemStatus.Faturada)
            throw new InvalidOperationException("OS faturada não pode ser cancelada sem estorno prévio.");
        Status = OrdemStatus.Cancelada;
    }
}

public class OSItemServico
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrdemServicoId { get; set; }
    public Guid ServicoId { get; set; }
    public Servico Servico { get; set; } = null!;
    
    public string Descricao { get; set; } = string.Empty;
    public decimal Quantidade { get; set; }
    public decimal CustoUnitario { get; set; }
    public decimal ValorUnitario { get; set; }
    public decimal CustoTotal => Quantidade * CustoUnitario;
    public decimal ValorTotal => Quantidade * ValorUnitario;
    public bool Entregue { get; set; }
}

public class OSItemProduto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrdemServicoId { get; set; }
    public Guid ProdutoId { get; set; }
    public Produto Produto { get; set; } = null!;
    
    public string Descricao { get; set; } = string.Empty;
    public decimal Quantidade { get; set; }
    public decimal CustoUnitario { get; set; }
    public decimal ValorUnitario { get; set; }
    public decimal CustoTotal => Quantidade * CustoUnitario;
    public decimal ValorTotal => Quantidade * ValorUnitario;
    public bool Entregue { get; set; }
}

using System;

namespace ServicoPro.Api.Domain.Entities;

public enum TransacaoTipo
{
    Receita = 1,
    Despesa = 2
}

public enum TransacaoStatus
{
    Pendente = 1,
    Pago = 2,
    Atrasado = 3,
    Cancelado = 4
}

public enum ContaBancariaTipo
{
    Corrente = 1,
    Poupanca = 2,
    Caixa = 3,
    Outro = 4
}

public class ContaBancaria
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty; // ex: "Caixa Principal", "Bradesco PJ"
    public ContaBancariaTipo Tipo { get; set; }
    public decimal SaldoAtual { get; set; }
    
    public DateTimeOffset CriadoEm { get; set; } = DateTimeOffset.UtcNow;
}

public class TransacaoFinanceira
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public TransacaoTipo Tipo { get; set; } // "receita" | "despesa"
    public string Categoria { get; set; } = string.Empty;
    public Guid? OrdemServicoId { get; set; }
    public OrdemServico? OrdemServico { get; set; }
    public Guid? CompraId { get; set; }
    public Compra? Compra { get; set; }
    
    // Indica em qual conta essa transação deve ser ou foi paga/recebida
    public Guid? ContaBancariaId { get; set; }
    public ContaBancaria? ContaBancaria { get; set; }
    
    public string Descricao { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    
    public DateTimeOffset DataVencimento { get; set; }
    public DateTimeOffset? DataPagamento { get; set; }
    
    public TransacaoStatus Status { get; set; } = TransacaoStatus.Pendente;
    public string? MetodoPagamento { get; set; }
    
    public DateTimeOffset CriadoEm { get; set; } = DateTimeOffset.UtcNow;
}

public enum LivroCaixaTipo
{
    Entrada = 1,
    Saida = 2
}

public class LivroCaixa
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public LivroCaixaTipo Tipo { get; set; }
    public decimal Valor { get; set; }
    public string Descricao { get; set; } = string.Empty;
    public Guid TransacaoId { get; set; }
    public TransacaoFinanceira Transacao { get; set; } = null!;
    
    // Nullable no DB por causa do histórico legado, mas exigido via código nas novas baixas
    public Guid? ContaBancariaId { get; set; }
    public ContaBancaria? ContaBancaria { get; set; }
    
    public DateTimeOffset DataHoraRegistro { get; set; } = DateTimeOffset.UtcNow;
}

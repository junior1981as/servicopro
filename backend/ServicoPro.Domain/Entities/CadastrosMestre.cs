using System;

namespace ServicoPro.Api.Domain.Entities;

public class Cliente
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int Codigo { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Documento { get; set; } = string.Empty; // CPF ou CNPJ
    public string Email { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string Cep { get; set; } = string.Empty;
    public string Rua { get; set; } = string.Empty;
    public string Numero { get; set; } = string.Empty;
    public string Bairro { get; set; } = string.Empty;
    public string Cidade { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string? Rg { get; set; }
    public string? InscricaoEstadual { get; set; }
    public string TipoParceiro { get; set; } = "Cliente"; // Cliente, Fornecedor, Ambos
    public bool Ativo { get; set; } = true;
    public DateTimeOffset CriadoEm { get; set; } = DateTimeOffset.UtcNow;
}

public class Ativo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int Codigo { get; set; }
    public Guid ClienteId { get; set; }
    public string Descricao { get; set; } = string.Empty; // Ex: Fiat Strada
    public string PlacaOuIdentificador { get; set; } = string.Empty;
    public string? Marca { get; set; }
    public string? Modelo { get; set; }
    public string? InformacoesAdicionais { get; set; }
    public bool AtivoRegistro { get; set; } = true;
    
    public Cliente Cliente { get; set; } = null!;
}

public class Produto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int Codigo { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal PrecoCusto { get; set; }
    public decimal PrecoVenda { get; set; } // O antigo ValorUnitario
    public int EstoqueAtual { get; set; } = 0;
    public int EstoqueMinimo { get; set; } = 0;
    public string Unidade { get; set; } = "UN";
    public string? NcmCodigo { get; set; } // FK
    public string Ean { get; set; } = string.Empty; // Código de Barras
    public int? CfopCodigo { get; set; } // FK
    
    public bool Ativo { get; set; } = true;
    
    // Virtual property for FK
    public Cfop? Cfop { get; set; }
    public Ncm? Ncm { get; set; }
}

public class Servico
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int Codigo { get; set; }
    public string Nome { get; set; } = string.Empty;
    public decimal ValorUnitario { get; set; }
    public decimal Custo { get; set; } = 0;
    public decimal DuracaoEstimadaHoras { get; set; } = 1;
    public bool Ativo { get; set; } = true;
}

public class Funcionario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int Codigo { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Cargo { get; set; } = string.Empty;
    public string Especialidade { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Cep { get; set; } = string.Empty;
    public string Rua { get; set; } = string.Empty;
    public string Numero { get; set; } = string.Empty;
    public string Bairro { get; set; } = string.Empty;
    public string Cidade { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public bool Ativo { get; set; } = true;
}

public class FormaPagamento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string TenantId { get; set; } = string.Empty;
    public string Codigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    
    public List<FormaPagamentoParcela> Parcelas { get; set; } = new();
    
    public bool Ativo { get; set; } = true;
    public DateTimeOffset CriadoEm { get; set; } = DateTimeOffset.UtcNow;
}

public class FormaPagamentoParcela
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FormaPagamentoId { get; set; }
    public FormaPagamento FormaPagamento { get; set; } = null!;
    
    public int NumeroParcela { get; set; }
    public int DiasVencimento { get; set; }
    public decimal PorcentagemValor { get; set; }
    public decimal TaxaOuDesconto { get; set; }
}

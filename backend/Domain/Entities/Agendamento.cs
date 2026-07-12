using System;

namespace ServicoPro.Api.Domain.Entities;

public enum AgendamentoStatus
{
    Agendado = 1,
    Concluido = 2,
    Cancelado = 3,
    EmOS = 4
}

public class Agendamento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int Codigo { get; set; }
    
    public Guid ClienteId { get; set; }
    public Cliente Cliente { get; set; } = null!;
    
    public Guid AtivoId { get; set; }
    public Ativo Ativo { get; set; } = null!;
    
    public DateTimeOffset DataHora { get; set; }
    public string Descricao { get; set; } = string.Empty;
    public AgendamentoStatus Status { get; set; } = AgendamentoStatus.Agendado;
    
    public Guid? OrdemServicoId { get; set; }
    public OrdemServico? OrdemServico { get; set; }
    
    public DateTimeOffset CriadoEm { get; set; } = DateTimeOffset.UtcNow;
}

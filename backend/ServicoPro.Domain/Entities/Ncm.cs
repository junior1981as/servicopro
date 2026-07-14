using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ServicoPro.Api.Domain.Entities;

[Table("NCM")]
public class Ncm
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [MaxLength(10)]
    [Column("CodigoNCM")]
    public string Codigo { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Descricao { get; set; }
}

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ServicoPro.Api.Domain.Entities;

[Table("CFOP")]
public class Cfop
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [Column("CodigoCFOP")]
    public int Codigo { get; set; }
    
    [MaxLength(500)]
    public string? DescricaoResumida { get; set; }
    
    public bool IndNFe { get; set; }
    public bool IndComunica { get; set; }
    public bool IndTransp { get; set; }
    public bool IndDevol { get; set; }
}

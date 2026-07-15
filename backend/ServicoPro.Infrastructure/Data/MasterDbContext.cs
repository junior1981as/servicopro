using Microsoft.EntityFrameworkCore;

namespace ServicoPro.Api.Infrastructure.Data;

public class TenantEntity
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string BancoDados { get; set; } = string.Empty;
    public bool Ativo { get; set; }
    public string Documento { get; set; } = string.Empty;
    public string RazaoSocial { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string Cep { get; set; } = string.Empty;
    public string Rua { get; set; } = string.Empty;
    public string Numero { get; set; } = string.Empty;
    public string Bairro { get; set; } = string.Empty;
    public string Cidade { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
}

public class MasterDbContext : DbContext
{
    public MasterDbContext(DbContextOptions<MasterDbContext> options) : base(options)
    {
    }

    public DbSet<TenantEntity> Tenants { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TenantEntity>(entity =>
        {
            entity.ToTable("tenants");
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasMaxLength(50);

            entity.Property(e => e.Nome)
                .HasColumnName("nome")
                .HasMaxLength(100);

            entity.Property(e => e.BancoDados)
                .HasColumnName("banco_dados")
                .HasMaxLength(100);

            entity.Property(e => e.Ativo)
                .HasColumnName("ativo");

            entity.Property(e => e.Documento).HasColumnName("documento");
            entity.Property(e => e.RazaoSocial).HasColumnName("razao_social");
            entity.Property(e => e.Telefone).HasColumnName("telefone");
            entity.Property(e => e.Cep).HasColumnName("cep");
            entity.Property(e => e.Rua).HasColumnName("rua");
            entity.Property(e => e.Numero).HasColumnName("numero");
            entity.Property(e => e.Bairro).HasColumnName("bairro");
            entity.Property(e => e.Cidade).HasColumnName("cidade");
            entity.Property(e => e.Estado).HasColumnName("estado");
        });
    }
}

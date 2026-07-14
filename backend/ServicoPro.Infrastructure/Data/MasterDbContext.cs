using Microsoft.EntityFrameworkCore;

namespace ServicoPro.Api.Infrastructure.Data;

public class TenantEntity
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string BancoDados { get; set; } = string.Empty;
    public bool Ativo { get; set; }
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
        });
    }
}

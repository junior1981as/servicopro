using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicoPro.Api.Application.Interfaces;
using ServicoPro.Api.Domain.Entities;

namespace ServicoPro.Api.Infrastructure.Data;

public class ServicoProDbContext : IdentityDbContext<ApplicationUser>
{
    private readonly ITenantContext _tenantContext;

    public DbSet<Cliente> Clientes { get; set; } = null!;
    public DbSet<Ativo> Ativos { get; set; } = null!;
    public DbSet<Produto> Produtos { get; set; } = null!;
    public DbSet<Servico> Servicos { get; set; } = null!;
    public DbSet<Funcionario> Funcionarios { get; set; } = null!;
    public DbSet<FormaPagamento> FormasPagamento { get; set; } = null!;
    public DbSet<FormaPagamentoParcela> FormasPagamentoParcela { get; set; } = null!;

    public DbSet<OrdemServico> OrdensServico { get; set; } = null!;
    public DbSet<OSItemServico> OSItensServico { get; set; } = null!;
    public DbSet<OSItemProduto> OSItensProduto { get; set; } = null!;
    
    public DbSet<Agendamento> Agendamentos { get; set; } = null!;
    public DbSet<Orcamento> Orcamentos { get; set; } = null!;
    public DbSet<OrcamentoItem> OrcamentoItens { get; set; } = null!;
    
    public DbSet<Compra> Compras { get; set; } = null!;
    public DbSet<CompraItem> CompraItens { get; set; } = null!;
    
    public DbSet<TransacaoFinanceira> TransacoesFinanceiras { get; set; } = null!;
    public DbSet<LivroCaixa> LivroCaixa { get; set; } = null!;
    public DbSet<ContaBancaria> ContasBancarias { get; set; } = null!;
    
    public DbSet<Cfop> Cfops { get; set; } = null!;
    public DbSet<Ncm> Ncms { get; set; } = null!;

    public ServicoProDbContext(
        DbContextOptions<ServicoProDbContext> options,
        ITenantContext tenantContext) : base(options)
    {
        _tenantContext = tenantContext;
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            var connString = _tenantContext.ObterConnectionString();
            if (!string.IsNullOrEmpty(connString))
            {
                optionsBuilder.UseSqlServer(connString);
            }
        }
        
        base.OnConfiguring(optionsBuilder);
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        
        builder.Entity<Cfop>().ToTable("CFOP", t => t.ExcludeFromMigrations());
        builder.Entity<Ncm>().ToTable("NCM", t => t.ExcludeFromMigrations());
        
        // Identity Columns
        builder.Entity<Cliente>().Property(c => c.Codigo).ValueGeneratedOnAdd();
        builder.Entity<Ativo>().Property(a => a.Codigo).ValueGeneratedOnAdd();
        builder.Entity<Produto>().Property(p => p.Codigo).ValueGeneratedOnAdd();
        builder.Entity<Servico>().Property(s => s.Codigo).ValueGeneratedOnAdd();
        builder.Entity<Funcionario>().Property(f => f.Codigo).ValueGeneratedOnAdd();
        builder.Entity<OrdemServico>().Property(o => o.Codigo).ValueGeneratedOnAdd();
        builder.Entity<Orcamento>().Property(o => o.Codigo).ValueGeneratedOnAdd();
        builder.Entity<Agendamento>().Property(a => a.Codigo).ValueGeneratedOnAdd();
        
        builder.Entity<Cliente>()
            .HasIndex(c => c.Documento)
            .IsUnique();
        
        builder.Entity<OrdemServico>()
            .HasOne(o => o.Cliente)
            .WithMany()
            .HasForeignKey(o => o.ClienteId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<OrdemServico>()
            .HasOne(o => o.Ativo)
            .WithMany()
            .HasForeignKey(o => o.AtivoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<OrdemServico>()
            .HasMany(o => o.Servicos)
            .WithOne()
            .HasForeignKey(i => i.OrdemServicoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<OrdemServico>()
            .HasMany(o => o.Produtos)
            .WithOne()
            .HasForeignKey(i => i.OrdemServicoId)
            .OnDelete(DeleteBehavior.Cascade);
            
        builder.Entity<Produto>()
            .HasOne(p => p.Cfop)
            .WithMany()
            .HasForeignKey(p => p.CfopCodigo)
            .OnDelete(DeleteBehavior.SetNull); // Permite produto sem CFOP
            
        builder.Entity<Produto>()
            .HasOne(p => p.Ncm)
            .WithMany()
            .HasForeignKey(p => p.NcmCodigo)
            .OnDelete(DeleteBehavior.SetNull); // Permite produto sem NCM
            
        // Relacionamentos Agendamento
        builder.Entity<Agendamento>()
            .HasOne(a => a.Cliente)
            .WithMany()
            .HasForeignKey(a => a.ClienteId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Agendamento>()
            .HasOne(a => a.Ativo)
            .WithMany()
            .HasForeignKey(a => a.AtivoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Agendamento>()
            .HasOne(a => a.OrdemServico)
            .WithMany()
            .HasForeignKey(a => a.OrdemServicoId)
            .OnDelete(DeleteBehavior.SetNull);

        // Relacionamentos Orcamento
        builder.Entity<Orcamento>()
            .HasOne(o => o.Cliente)
            .WithMany()
            .HasForeignKey(o => o.ClienteId)
            .OnDelete(DeleteBehavior.Restrict);
            
        builder.Entity<Orcamento>()
            .HasOne(o => o.Ativo)
            .WithMany()
            .HasForeignKey(o => o.AtivoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Orcamento>()
            .HasMany(o => o.Itens)
            .WithOne(i => i.Orcamento)
            .HasForeignKey(i => i.OrcamentoId)
            .OnDelete(DeleteBehavior.Cascade);
            
        builder.Entity<OrdemServico>()
            .HasOne(o => o.Orcamento)
            .WithOne(o => o.OrdemServico)
            .HasForeignKey<OrdemServico>(o => o.OrcamentoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<OrdemServico>()
            .HasOne(o => o.Tecnico)
            .WithMany()
            .HasForeignKey(o => o.TecnicoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<Orcamento>()
            .HasOne(o => o.Tecnico)
            .WithMany()
            .HasForeignKey(o => o.TecnicoId)
            .OnDelete(DeleteBehavior.SetNull);

        // Relacionamentos Compra
        builder.Entity<Compra>()
            .HasOne(c => c.Fornecedor)
            .WithMany()
            .HasForeignKey(c => c.FornecedorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Compra>()
            .HasMany(c => c.Itens)
            .WithOne(i => i.Compra)
            .HasForeignKey(i => i.CompraId)
            .OnDelete(DeleteBehavior.Cascade);
            
        builder.Entity<CompraItem>()
            .HasOne(i => i.Produto)
            .WithMany()
            .HasForeignKey(i => i.ProdutoId)
            .OnDelete(DeleteBehavior.Restrict);

        // Relacionamentos TransacaoFinanceira
        builder.Entity<TransacaoFinanceira>()
            .HasOne(t => t.OrdemServico)
            .WithMany()
            .HasForeignKey(t => t.OrdemServicoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<TransacaoFinanceira>()
            .HasOne(t => t.Compra)
            .WithMany()
            .HasForeignKey(t => t.CompraId)
            .OnDelete(DeleteBehavior.SetNull);

        // Relacionamentos LivroCaixa
        builder.Entity<LivroCaixa>()
            .HasOne(l => l.Transacao)
            .WithMany()
            .HasForeignKey(l => l.TransacaoId)
            .OnDelete(DeleteBehavior.Restrict);

        // Relacionamentos OrcamentoItem
        builder.Entity<OrcamentoItem>()
            .HasOne(i => i.Produto)
            .WithMany()
            .HasForeignKey(i => i.ProdutoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<OrcamentoItem>()
            .HasOne(i => i.Servico)
            .WithMany()
            .HasForeignKey(i => i.ServicoId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

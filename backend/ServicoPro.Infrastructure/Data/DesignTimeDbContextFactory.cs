using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using ServicoPro.Api.Application.Interfaces;

namespace ServicoPro.Api.Infrastructure.Data
{
    public class ServicoProDbContextFactory : IDesignTimeDbContextFactory<ServicoProDbContext>
    {
        public ServicoProDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<ServicoProDbContext>();
            
            // For design-time migrations, we use a dummy connection string or the master one
            optionsBuilder.UseSqlServer("Server=127.0.0.1,51666;Database=db_servicopro_mssql;User Id=servicopro_app;Password=aqswde12#$%&;TrustServerCertificate=True;Encrypt=True;MultipleActiveResultSets=True;");

            return new ServicoProDbContext(optionsBuilder.Options, new DummyTenantContext());
        }
    }

    public class DummyTenantContext : ITenantContext
    {
        public TenantInfo? TenantAtual => new TenantInfo("t-oficina-01", "Oficina", "DB", true, "CH", "Caminho");
        
        public string ObterConnectionString()
        {
            return "Server=127.0.0.1,51666;Database=db_servicopro_mssql;User Id=servicopro_app;Password=aqswde12#$%&;TrustServerCertificate=True;Encrypt=True;MultipleActiveResultSets=True;";
        }
        
        public void SetarTenant(TenantInfo tenant) {}
    }
}

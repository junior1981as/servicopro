using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using ServicoPro.Api.Application.Interfaces;
using ServicoPro.Api.Domain.Entities;

namespace ServicoPro.Api.Infrastructure.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;

        // 1. Criar banco Master
        var masterDb = services.GetRequiredService<MasterDbContext>();
        await masterDb.Database.EnsureCreatedAsync();

        // 2. Injetar Tenant Padrão (Oficina Demo) no Master
        var tenantId = "t-oficina-01";
        var tenantDbStr = services.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>().GetConnectionString("MasterConnection");

        var tenant = await masterDb.Tenants.FindAsync(tenantId);
        if (tenant == null)
        {
            tenant = new TenantEntity
            {
                Id = tenantId,
                Nome = "Oficina Demo",
                BancoDados = "db_servicopro_mssql",
                Ativo = true
            };
            masterDb.Tenants.Add(tenant);
            await masterDb.SaveChangesAsync();
        }
        else if (tenant.BancoDados != "db_servicopro_mssql")
        {
            tenant.BancoDados = "db_servicopro_mssql";
            masterDb.Tenants.Update(tenant);
            await masterDb.SaveChangesAsync();
        }

        var tenantContext = services.GetRequiredService<ITenantContext>();
        tenantContext.SetarTenant(new TenantInfo(tenant.Id, tenant.Nome, tenant.BancoDados, tenant.Ativo, tenant.Id, tenantDbStr));

        // 3.5 Criar schema de autenticação no MasterDB para o Dapper do AuthEndpoints
        using (var con = new Microsoft.Data.SqlClient.SqlConnection(services.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>().GetConnectionString("MasterConnection")))
        {
            con.Open();
            using var cmd = con.CreateCommand();
            cmd.CommandText = @"
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='usuarios' and xtype='U')
                    CREATE TABLE usuarios (id VARCHAR(50) PRIMARY KEY, nome VARCHAR(100), email VARCHAR(100), senha_hash VARCHAR(255), ativo BIT);
                
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='usuarios_tenants' and xtype='U')
                    CREATE TABLE usuarios_tenants (usuario_id VARCHAR(50), tenant_id VARCHAR(50), ativo BIT, PRIMARY KEY(usuario_id, tenant_id));
                
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='perfis' and xtype='U')
                    CREATE TABLE perfis (id VARCHAR(50) PRIMARY KEY, nome VARCHAR(50), ativo BIT);
                
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='usuarios_perfis' and xtype='U')
                    CREATE TABLE usuarios_perfis (usuario_id VARCHAR(50), perfil_id VARCHAR(50), ativo BIT, PRIMARY KEY(usuario_id, perfil_id));
                
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='auditoria_login' and xtype='U')
                    CREATE TABLE auditoria_login (id VARCHAR(50) PRIMARY KEY, usuario_id VARCHAR(50), tenant_id VARCHAR(50), email_informado VARCHAR(100), sucesso BIT, motivo VARCHAR(255), ip VARCHAR(50), user_agent VARCHAR(500), criado_em_utc VARCHAR(50));
            ";
            cmd.ExecuteNonQuery();

            // Inserir Admin no MasterDB
            var adminId = "admin-123";
            var emailAdmin = "admin@servicopro.local";
            // Senha "123456" hasheada via PBKDF2 (Identity PasswordHasher)
            var passwordHasher = new Microsoft.AspNetCore.Identity.PasswordHasher<object>();
            var senhaHash = passwordHasher.HashPassword(null!, "123456");
            
            // Rehash para todos os usuários se estiverem com a hash SHA-256 antiga, ou insere se não existir
            cmd.CommandText = $@"
                IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = '{emailAdmin}')
                    INSERT INTO usuarios (id, nome, email, senha_hash, ativo) VALUES ('{adminId}', 'Administrador', '{emailAdmin}', '{senhaHash}', 1);
                ELSE
                    UPDATE usuarios SET senha_hash = '{senhaHash}' WHERE email = '{emailAdmin}' AND LEN(senha_hash) = 64; -- Atualiza se estiver no formato SHA-256 (64 chars)
            ";
            cmd.ExecuteNonQuery();

            cmd.CommandText = $"IF NOT EXISTS (SELECT 1 FROM usuarios_tenants WHERE usuario_id = '{adminId}' AND tenant_id = '{tenantId}') INSERT INTO usuarios_tenants (usuario_id, tenant_id, ativo) VALUES ('{adminId}', '{tenantId}', 1);";
            cmd.ExecuteNonQuery();

            cmd.CommandText = $"IF NOT EXISTS (SELECT 1 FROM perfis WHERE id = 'admin') INSERT INTO perfis (id, nome, ativo) VALUES ('admin', 'Administrador', 1);";
            cmd.ExecuteNonQuery();

            cmd.CommandText = $"IF NOT EXISTS (SELECT 1 FROM usuarios_perfis WHERE usuario_id = '{adminId}') INSERT INTO usuarios_perfis (usuario_id, perfil_id, ativo) VALUES ('{adminId}', 'admin', 1);";
            cmd.ExecuteNonQuery();
        }

        // 4. Criar banco do Tenant
        var tenantDb = services.GetRequiredService<ServicoProDbContext>();
        try {
            var creator = tenantDb.Database.GetService<IRelationalDatabaseCreator>();
            if (!creator.HasTables()) {
                creator.CreateTables();
            } else {
                // If tables exist but we need to drop them to recreate (for schema sync):
                // Removido EnsureDeleted para não apagar o banco em produção
                // tenantDb.Database.EnsureDeleted();
                // tenantDb.Database.EnsureCreated();
            }
        } catch (Exception ex) {
            Console.WriteLine("ERRO AO CRIAR TABELAS DO TENANT: " + ex.Message);
        }

        // 5. Injetar Usuário Admin removido pois estamos usando Dapper e tabelas 'usuarios' no MasterDB.

        // 6. Injetar Dados Mestre
        if (!tenantDb.Clientes.Any())
        {
            var cliente = new Cliente { Nome = "Auto Peças Rio Pardo", Email = "contato@riopardo.com", Telefone = "11999999999" };
            tenantDb.Clientes.Add(cliente);
            tenantDb.Ativos.Add(new Ativo { Cliente = cliente, Descricao = "Fiat Strada", PlacaOuIdentificador = "ABC-1234" });
            
            tenantDb.Produtos.Add(new Produto { Nome = "Filtro de óleo", PrecoVenda = 22.00m });
            tenantDb.Produtos.Add(new Produto { Nome = "Filtro Ar K&N", PrecoVenda = 669.89m });
            
            tenantDb.Servicos.Add(new Servico { Nome = "Troca de pastilha de freio", ValorUnitario = 270.00m });
            tenantDb.Servicos.Add(new Servico { Nome = "Alinhamento", ValorUnitario = 150.00m });
            
            tenantDb.Funcionarios.Add(new Funcionario { Nome = "João Mecânico", Cargo = "Mecânico Sênior" });
            
            await tenantDb.SaveChangesAsync();
            
            // Injetar uma OS de exemplo
            var os = new OrdemServico
            {
                Numero = "OS-0007",
                ClienteId = cliente.Id,
                AtivoId = tenantDb.Ativos.First().Id,
                Descricao = "Revisão Geral e Suspensão",
                ProblemaRelatado = "Barulho na suspensão dianteira ao passar em lombadas.",
                KmAbertura = "14.500",
                ValorTotal = 1177.89m
            };
            
            os.Servicos.Add(new OSItemServico { 
                ServicoId = tenantDb.Servicos.First(s => s.Nome.Contains("pastilha")).Id, 
                Descricao = "Troca de pastilha de freio", Quantidade = 1, ValorUnitario = 270.00m 
            });
            
            os.Produtos.Add(new OSItemProduto { 
                ProdutoId = tenantDb.Produtos.First(p => p.Nome.Contains("Filtro Ar")).Id, 
                Descricao = "Filtro Ar K&N Fiat Toro", Quantidade = 1, ValorUnitario = 669.89m 
            });
            
            tenantDb.OrdensServico.Add(os);
            await tenantDb.SaveChangesAsync();
        }
    }
}

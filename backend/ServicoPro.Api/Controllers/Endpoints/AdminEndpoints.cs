using System;
using System.Threading.Tasks;
using Dapper;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ServicoPro.Api.Application.Interfaces;
using ServicoPro.Api.Infrastructure.Data;

namespace ServicoPro.Api.API.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/admin");

        group.MapGet("/tenancy/check", CheckTenancyAsync);
        group.MapGet("/auditoria-login", AuditoriaLoginAsync);
        group.MapGet("/tenants", TenantsAsync);
        group.MapPost("/tenants/provisionar", ProvisionarTenantAsync);
        group.MapPut("/tenants/{id}", UpdateTenantAsync);
        group.MapDelete("/tenants/{id}", ExcluirTenantAsync);
    }

    private static async Task<IResult> CheckTenancyAsync(IConfiguration configuration)
    {
        var adminDbPath = "db_servicopro_mssql";
        var connectionString = GetAdminConnectionString(configuration);
        
        await using var con = new SqlConnection(connectionString);
        await con.OpenAsync();

        var qtdTenants = await con.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM tenants");
        var qtdUsuarios = await con.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM usuarios");
        var qtdAuditoria = await con.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM auditoria_login");

        return Results.Ok(new
        {
            status = "ok",
            regra = "tenant resolvido antes de acessar dados",
            isolamento = "um banco por cliente",
            adminDb = adminDbPath,
            tabelas = new
            {
                tenants = qtdTenants,
                usuarios = qtdUsuarios,
                auditoriaLogin = qtdAuditoria
            },
            observacao = "Catálogo administrativo persistente refatorado."
        });
    }

    private static async Task<IResult> AuditoriaLoginAsync(IConfiguration configuration)
    {
        var connectionString = GetAdminConnectionString(configuration);
        await using var con = new SqlConnection(connectionString);
        
        var lista = await con.QueryAsync(@"
            SELECT
                id as id,
                usuario_id as usuarioId,
                tenant_id as tenantId,
                email_informado as emailInformado,
                sucesso as sucesso,
                motivo as motivo,
                ip as ip,
                user_agent as userAgent,
                criado_em_utc as criadoEmUtc
            FROM auditoria_login
            ORDER BY criado_em_utc DESC");

        return Results.Ok(lista);
    }

    private static async Task<IResult> TenantsAsync(IConfiguration configuration)
    {
        var connectionString = GetAdminConnectionString(configuration);
        await using var con = new SqlConnection(connectionString);
        
        var lista = await con.QueryAsync(@"
            SELECT
                id as id,
                nome as nome,
                banco_dados as banco,
                ativo as ativo,
                documento as documento,
                razao_social as razaoSocial,
                telefone as telefone,
                cep as cep,
                rua as rua,
                numero as numero,
                bairro as bairro,
                cidade as cidade,
                estado as estado,
                inscricao_estadual as inscricaoEstadual,
                valor_mensalidade as valorMensalidade
            FROM tenants
            ORDER BY nome");

        return Results.Ok(lista);
    }

    public class ProvisionarTenantRequest
    {
        public string NomeCliente { get; set; } = string.Empty;
        public string RazaoSocial { get; set; } = string.Empty;
        public string Documento { get; set; } = string.Empty;
        public string Telefone { get; set; } = string.Empty;
        public string Cep { get; set; } = string.Empty;
        public string Rua { get; set; } = string.Empty;
        public string Numero { get; set; } = string.Empty;
        public string Bairro { get; set; } = string.Empty;
        public string Cidade { get; set; } = string.Empty;
        public string Estado { get; set; } = string.Empty;
        public string InscricaoEstadual { get; set; } = string.Empty;
        public decimal ValorMensalidade { get; set; }

        public string NomeBanco { get; set; } = string.Empty;
        public string AdminEmail { get; set; } = string.Empty;
        public string AdminSenha { get; set; } = string.Empty;
    }

    private static async Task<IResult> ProvisionarTenantAsync([FromBody] ProvisionarTenantRequest req, IConfiguration configuration, IServiceProvider services)
    {
        if (string.IsNullOrWhiteSpace(req.NomeCliente) || string.IsNullOrWhiteSpace(req.NomeBanco) || string.IsNullOrWhiteSpace(req.AdminEmail) || string.IsNullOrWhiteSpace(req.AdminSenha))
            return Results.BadRequest(new { erro = "Todos os campos são obrigatórios." });

        var connectionString = GetAdminConnectionString(configuration);
        var tenantId = "t-" + Guid.NewGuid().ToString("N")[..8];
        var userId = "u-" + Guid.NewGuid().ToString("N")[..8];

        await using var con = new SqlConnection(connectionString);
        await con.OpenAsync();
        using var tx = con.BeginTransaction();

        try
        {
            // 1. Criar Tenant no Mestre
            await con.ExecuteAsync(@"
                INSERT INTO tenants (id, nome, banco_dados, ativo, documento, razao_social, telefone, cep, rua, numero, bairro, cidade, estado, inscricao_estadual, valor_mensalidade) 
                VALUES (@Id, @Nome, @BancoDados, 1, @Documento, @RazaoSocial, @Telefone, @Cep, @Rua, @Numero, @Bairro, @Cidade, @Estado, @InscricaoEstadual, @ValorMensalidade)",
                new { 
                    Id = tenantId, 
                    Nome = req.NomeCliente, 
                    BancoDados = req.NomeBanco,
                    Documento = req.Documento,
                    RazaoSocial = req.RazaoSocial,
                    Telefone = req.Telefone,
                    Cep = req.Cep,
                    Rua = req.Rua,
                    Numero = req.Numero,
                    Bairro = req.Bairro,
                    Cidade = req.Cidade,
                    Estado = req.Estado,
                    InscricaoEstadual = req.InscricaoEstadual,
                    ValorMensalidade = req.ValorMensalidade
                }, transaction: tx);

            // 2. Criar Usuario Admin
            var passwordHasher = new PasswordHasher<object>();
            var senhaHash = passwordHasher.HashPassword(null!, req.AdminSenha);

            await con.ExecuteAsync(
                "INSERT INTO usuarios (id, nome, email, senha_hash, ativo) VALUES (@Id, @Nome, @Email, @SenhaHash, 1)",
                new { Id = userId, Nome = $"Admin {req.NomeCliente}", Email = req.AdminEmail, SenhaHash = senhaHash }, transaction: tx);

            // 3. Vincular Usuario ao Tenant
            await con.ExecuteAsync(
                "INSERT INTO usuarios_tenants (usuario_id, tenant_id, ativo) VALUES (@UserId, @TenantId, 1)",
                new { UserId = userId, TenantId = tenantId }, transaction: tx);

            // 4. Perfil Admin
            await con.ExecuteAsync(
                "IF NOT EXISTS (SELECT 1 FROM perfis WHERE id = 'admin') INSERT INTO perfis (id, nome, ativo) VALUES ('admin', 'Administrador', 1)",
                transaction: tx);
            await con.ExecuteAsync(
                "INSERT INTO usuarios_perfis (usuario_id, perfil_id, ativo) VALUES (@UserId, 'admin', 1)",
                new { UserId = userId }, transaction: tx);

            await tx.CommitAsync();
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            return Results.BadRequest(new { erro = "Erro ao cadastrar tenant no Mestre.", detalhe = ex.Message });
        }

        // 5. Provisionar Banco de Dados Operacional (EF Core)
        try
        {
            var baseConnString = connectionString;
            var tenantConnString = baseConnString.Replace("Database=db_servicopro_mssql", $"Database={req.NomeBanco}");

            var optionsBuilder = new DbContextOptionsBuilder<ServicoProDbContext>();
            optionsBuilder.UseSqlServer(tenantConnString);
            
            var mockTenantContext = new ServicoPro.Api.Infrastructure.Security.TenantContext(configuration);
            mockTenantContext.SetarTenant(new TenantInfo(tenantId, req.NomeCliente, req.NomeBanco, true, tenantId, tenantConnString));

            using var tenantDb = new ServicoProDbContext(optionsBuilder.Options, mockTenantContext);
            await tenantDb.Database.EnsureCreatedAsync();

            var alterSql = @"
                IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'Email' AND Object_ID = Object_ID(N'Funcionarios'))
                BEGIN
                    ALTER TABLE Funcionarios ADD Email nvarchar(max) NOT NULL DEFAULT '';
                    ALTER TABLE Funcionarios ADD Cep nvarchar(max) NOT NULL DEFAULT '';
                    ALTER TABLE Funcionarios ADD Rua nvarchar(max) NOT NULL DEFAULT '';
                    ALTER TABLE Funcionarios ADD Numero nvarchar(max) NOT NULL DEFAULT '';
                    ALTER TABLE Funcionarios ADD Bairro nvarchar(max) NOT NULL DEFAULT '';
                    ALTER TABLE Funcionarios ADD Cidade nvarchar(max) NOT NULL DEFAULT '';
                    ALTER TABLE Funcionarios ADD Estado nvarchar(max) NOT NULL DEFAULT '';
                END";
            await tenantDb.Database.ExecuteSqlRawAsync(alterSql);
            
            var sqlForma = @"
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[FormasPagamento]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE [dbo].[FormasPagamento](
                        [Id] [uniqueidentifier] NOT NULL,
                        [TenantId] [nvarchar](max) NOT NULL,
                        [Codigo] [nvarchar](max) NOT NULL,
                        [Descricao] [nvarchar](max) NOT NULL,
                        [Ativo] [bit] NOT NULL,
                        [CriadoEm] [datetimeoffset](7) NOT NULL,
                        CONSTRAINT [PK_FormasPagamento] PRIMARY KEY CLUSTERED ([Id] ASC)
                    );
                END
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[FormasPagamentoParcela]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE [dbo].[FormasPagamentoParcela](
                        [Id] [uniqueidentifier] NOT NULL,
                        [FormaPagamentoId] [uniqueidentifier] NOT NULL,
                        [NumeroParcela] [int] NOT NULL,
                        [DiasVencimento] [int] NOT NULL,
                        [PorcentagemValor] [decimal](18, 2) NOT NULL,
                        [TaxaOuDesconto] [decimal](18, 2) NOT NULL,
                        CONSTRAINT [PK_FormasPagamentoParcela] PRIMARY KEY CLUSTERED ([Id] ASC),
                        CONSTRAINT [FK_FormasPagamentoParcela_FormasPagamento_FormaPagamentoId] FOREIGN KEY([FormaPagamentoId]) REFERENCES [dbo].[FormasPagamento] ([Id]) ON DELETE CASCADE
                    );
                    CREATE INDEX [IX_FormasPagamentoParcela_FormaPagamentoId] ON [dbo].[FormasPagamentoParcela] ([FormaPagamentoId]);
                END";
            await tenantDb.Database.ExecuteSqlRawAsync(sqlForma);

            var sqlAlterCliente = @"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'FormaPagamentoPadraoId' AND Object_ID = Object_ID(N'Clientes'))
                BEGIN
                    ALTER TABLE Clientes ADD FormaPagamentoPadraoId uniqueidentifier NULL;
                END";
            await tenantDb.Database.ExecuteSqlRawAsync(sqlAlterCliente);

            return Results.Ok(new { 
                mensagem = "Tenant provisionado com sucesso!", 
                tenantId = tenantId, 
                bancoCriado = req.NomeBanco 
            });
        }
        catch (Exception ex)
        {
            return Results.Ok(new {
                mensagem = "Tenant inserido no Mestre, mas falhou ao rodar DDL no banco destino.",
                erro = ex.Message,
                tenantId = tenantId
            });
        }
    }

    public class UpdateTenantRequest
    {
        public string Nome { get; set; } = string.Empty;
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
        public string InscricaoEstadual { get; set; } = string.Empty;
        public decimal ValorMensalidade { get; set; }
    }

    private static async Task<IResult> UpdateTenantAsync(string id, [FromBody] UpdateTenantRequest req, IConfiguration configuration)
    {
        if (id == "t-oficina-01" && !req.Ativo) return Results.BadRequest(new { erro = "Não é permitido inativar o tenant mestre." });
        if (string.IsNullOrWhiteSpace(req.Nome)) return Results.BadRequest(new { erro = "O nome é obrigatório." });

        var connectionString = GetAdminConnectionString(configuration);
        await using var con = new SqlConnection(connectionString);
        await con.OpenAsync();

        var rows = await con.ExecuteAsync(@"
            UPDATE tenants SET 
                nome = @Nome, 
                ativo = @Ativo,
                documento = @Documento,
                razao_social = @RazaoSocial,
                telefone = @Telefone,
                cep = @Cep,
                rua = @Rua,
                numero = @Numero,
                bairro = @Bairro,
                cidade = @Cidade,
                estado = @Estado,
                inscricao_estadual = @InscricaoEstadual,
                valor_mensalidade = @ValorMensalidade
            WHERE id = @Id", 
            new { 
                Nome = req.Nome, Ativo = req.Ativo ? 1 : 0, 
                Documento = req.Documento ?? "", RazaoSocial = req.RazaoSocial ?? "",
                Telefone = req.Telefone ?? "", Cep = req.Cep ?? "",
                Rua = req.Rua ?? "", Numero = req.Numero ?? "",
                Bairro = req.Bairro ?? "", Cidade = req.Cidade ?? "",
                Estado = req.Estado ?? "",
                InscricaoEstadual = req.InscricaoEstadual ?? "",
                ValorMensalidade = req.ValorMensalidade,
                Id = id 
            });
        
        if (rows == 0) return Results.NotFound(new { erro = "Tenant não encontrado." });

        return Results.Ok(new { mensagem = "Tenant atualizado com sucesso." });
    }

    private static async Task<IResult> ExcluirTenantAsync(string id, IConfiguration configuration)
    {
        if (id == "t-oficina-01") return Results.BadRequest(new { erro = "Não é permitido excluir o tenant mestre." });

        var connectionString = GetAdminConnectionString(configuration);
        await using var con = new SqlConnection(connectionString);
        await con.OpenAsync();
        
        var dbName = await con.QueryFirstOrDefaultAsync<string>("SELECT banco_dados FROM tenants WHERE id = @Id", new { Id = id });
        if (dbName == null) return Results.NotFound(new { erro = "Tenant não encontrado." });

        using var tx = con.BeginTransaction();
        try
        {
            await con.ExecuteAsync("DELETE FROM usuarios_tenants WHERE tenant_id = @Id", new { Id = id }, tx);
            await con.ExecuteAsync("DELETE FROM auditoria_login WHERE tenant_id = @Id", new { Id = id }, tx);
            await con.ExecuteAsync("DELETE FROM tenants WHERE id = @Id", new { Id = id }, tx);
            await tx.CommitAsync();
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            return Results.BadRequest(new { erro = "Erro ao excluir tenant no Mestre.", detalhe = ex.Message });
        }

        try 
        {
            if (!string.IsNullOrWhiteSpace(dbName) && dbName != "db_servicopro_mssql")
            {
                await con.ExecuteAsync($@"
                    ALTER DATABASE [{dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                    DROP DATABASE [{dbName}];
                ");
            }
        }
        catch { }

        return Results.Ok(new { mensagem = "Tenant excluído com sucesso." });
    }

    private static string GetAdminConnectionString(IConfiguration configuration)
    {
        var env = System.Environment.GetEnvironmentVariable("SERVICOPRO_MSSQL_CONNECTION_STRING");
        if (!string.IsNullOrWhiteSpace(env))
            return env;

        const string caminho = "/opt/servicopro/segredos/servicopro_mssql.env";
        if (System.IO.File.Exists(caminho))
        {
            foreach (var linha in System.IO.File.ReadAllLines(caminho))
            {
                if (linha.StartsWith("SERVICOPRO_MSSQL_CONNECTION_STRING=", System.StringComparison.Ordinal))
                    return linha["SERVICOPRO_MSSQL_CONNECTION_STRING=".Length..].Trim();
            }
        }

        return configuration.GetConnectionString("DefaultConnection") ?? "";
    }
}

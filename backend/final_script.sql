SET QUOTED_IDENTIFIER ON;
IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [AspNetRoles] (
        [Id] nvarchar(450) NOT NULL,
        [Name] nvarchar(256) NULL,
        [NormalizedName] nvarchar(256) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [AspNetUsers] (
        [Id] nvarchar(450) NOT NULL,
        [Nome] nvarchar(max) NOT NULL,
        [Cargo] nvarchar(max) NOT NULL,
        [Ativo] bit NOT NULL,
        [UserName] nvarchar(256) NULL,
        [NormalizedUserName] nvarchar(256) NULL,
        [Email] nvarchar(256) NULL,
        [NormalizedEmail] nvarchar(256) NULL,
        [EmailConfirmed] bit NOT NULL,
        [PasswordHash] nvarchar(max) NULL,
        [SecurityStamp] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(max) NULL,
        [PhoneNumberConfirmed] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [LockoutEnd] datetimeoffset NULL,
        [LockoutEnabled] bit NOT NULL,
        [AccessFailedCount] int NOT NULL,
        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [Cfops] (
        [Codigo] nvarchar(10) NOT NULL,
        [DescricaoResumida] nvarchar(500) NOT NULL,
        [IndNFe] bit NOT NULL,
        [IndComunica] bit NOT NULL,
        [IndTransp] bit NOT NULL,
        [IndDevol] bit NOT NULL,
        [Ativo] bit NOT NULL,
        CONSTRAINT [PK_Cfops] PRIMARY KEY ([Codigo])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [Clientes] (
        [Id] uniqueidentifier NOT NULL,
        [Nome] nvarchar(max) NOT NULL,
        [Documento] nvarchar(450) NOT NULL,
        [Email] nvarchar(max) NOT NULL,
        [Telefone] nvarchar(max) NOT NULL,
        [Cep] nvarchar(max) NOT NULL,
        [Rua] nvarchar(max) NOT NULL,
        [Numero] nvarchar(max) NOT NULL,
        [Bairro] nvarchar(max) NOT NULL,
        [Cidade] nvarchar(max) NOT NULL,
        [Estado] nvarchar(max) NOT NULL,
        [Ativo] bit NOT NULL,
        [CriadoEm] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Clientes] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [Funcionarios] (
        [Id] uniqueidentifier NOT NULL,
        [Nome] nvarchar(max) NOT NULL,
        [Cargo] nvarchar(max) NOT NULL,
        [Ativo] bit NOT NULL,
        CONSTRAINT [PK_Funcionarios] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [Servicos] (
        [Id] uniqueidentifier NOT NULL,
        [Nome] nvarchar(max) NOT NULL,
        [ValorUnitario] decimal(18,2) NOT NULL,
        [Ativo] bit NOT NULL,
        CONSTRAINT [PK_Servicos] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [AspNetRoleClaims] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [AspNetUserClaims] (
        [Id] int NOT NULL IDENTITY,
        [UserId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] nvarchar(450) NOT NULL,
        [ProviderKey] nvarchar(450) NOT NULL,
        [ProviderDisplayName] nvarchar(max) NULL,
        [UserId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [AspNetUserRoles] (
        [UserId] nvarchar(450) NOT NULL,
        [RoleId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [AspNetUserTokens] (
        [UserId] nvarchar(450) NOT NULL,
        [LoginProvider] nvarchar(450) NOT NULL,
        [Name] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [Produtos] (
        [Id] uniqueidentifier NOT NULL,
        [Nome] nvarchar(max) NOT NULL,
        [Sku] nvarchar(max) NOT NULL,
        [PrecoCusto] decimal(18,2) NOT NULL,
        [PrecoVenda] decimal(18,2) NOT NULL,
        [EstoqueAtual] int NOT NULL,
        [EstoqueMinimo] int NOT NULL,
        [Unidade] nvarchar(max) NOT NULL,
        [Ncm] nvarchar(max) NOT NULL,
        [Ean] nvarchar(max) NOT NULL,
        [CfopCodigo] nvarchar(10) NULL,
        [Ativo] bit NOT NULL,
        CONSTRAINT [PK_Produtos] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Produtos_Cfops_CfopCodigo] FOREIGN KEY ([CfopCodigo]) REFERENCES [Cfops] ([Codigo]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [Ativos] (
        [Id] uniqueidentifier NOT NULL,
        [ClienteId] uniqueidentifier NOT NULL,
        [Descricao] nvarchar(max) NOT NULL,
        [PlacaOuIdentificador] nvarchar(max) NOT NULL,
        [AtivoRegistro] bit NOT NULL,
        CONSTRAINT [PK_Ativos] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Ativos_Clientes_ClienteId] FOREIGN KEY ([ClienteId]) REFERENCES [Clientes] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [OrdensServico] (
        [Id] uniqueidentifier NOT NULL,
        [Numero] nvarchar(max) NOT NULL,
        [ClienteId] uniqueidentifier NOT NULL,
        [AtivoId] uniqueidentifier NOT NULL,
        [Descricao] nvarchar(max) NOT NULL,
        [ProblemaRelatado] nvarchar(max) NOT NULL,
        [DataAbertura] datetimeoffset NOT NULL,
        [KmAbertura] nvarchar(max) NOT NULL,
        [Status] int NOT NULL,
        [ValorTotal] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_OrdensServico] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_OrdensServico_Ativos_AtivoId] FOREIGN KEY ([AtivoId]) REFERENCES [Ativos] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_OrdensServico_Clientes_ClienteId] FOREIGN KEY ([ClienteId]) REFERENCES [Clientes] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [OSItensProduto] (
        [Id] uniqueidentifier NOT NULL,
        [OrdemServicoId] uniqueidentifier NOT NULL,
        [ProdutoId] uniqueidentifier NOT NULL,
        [Descricao] nvarchar(max) NOT NULL,
        [Quantidade] decimal(18,2) NOT NULL,
        [ValorUnitario] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_OSItensProduto] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_OSItensProduto_OrdensServico_OrdemServicoId] FOREIGN KEY ([OrdemServicoId]) REFERENCES [OrdensServico] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_OSItensProduto_Produtos_ProdutoId] FOREIGN KEY ([ProdutoId]) REFERENCES [Produtos] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE TABLE [OSItensServico] (
        [Id] uniqueidentifier NOT NULL,
        [OrdemServicoId] uniqueidentifier NOT NULL,
        [ServicoId] uniqueidentifier NOT NULL,
        [Descricao] nvarchar(max) NOT NULL,
        [Quantidade] decimal(18,2) NOT NULL,
        [ValorUnitario] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_OSItensServico] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_OSItensServico_OrdensServico_OrdemServicoId] FOREIGN KEY ([OrdemServicoId]) REFERENCES [OrdensServico] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_OSItensServico_Servicos_ServicoId] FOREIGN KEY ([ServicoId]) REFERENCES [Servicos] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [IX_Ativos_ClienteId] ON [Ativos] ([ClienteId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Clientes_Documento] ON [Clientes] ([Documento]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [IX_OrdensServico_AtivoId] ON [OrdensServico] ([AtivoId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [IX_OrdensServico_ClienteId] ON [OrdensServico] ([ClienteId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [IX_OSItensProduto_OrdemServicoId] ON [OSItensProduto] ([OrdemServicoId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [IX_OSItensProduto_ProdutoId] ON [OSItensProduto] ([ProdutoId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [IX_OSItensServico_OrdemServicoId] ON [OSItensServico] ([OrdemServicoId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [IX_OSItensServico_ServicoId] ON [OSItensServico] ([ServicoId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    CREATE INDEX [IX_Produtos_CfopCodigo] ON [Produtos] ([CfopCodigo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709025835_AddFiscalFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260709025835_AddFiscalFields', N'9.0.0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709030052_AddNcmFields'
)
BEGIN
    DECLARE @var0 sysname;
    SELECT @var0 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Produtos]') AND [c].[name] = N'Ncm');
    IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [Produtos] DROP CONSTRAINT [' + @var0 + '];');
    ALTER TABLE [Produtos] DROP COLUMN [Ncm];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709030052_AddNcmFields'
)
BEGIN
    ALTER TABLE [Produtos] ADD [NcmCodigo] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709030052_AddNcmFields'
)
BEGIN
    CREATE TABLE [Ncms] (
        [Codigo] nvarchar(20) NOT NULL,
        [Descricao] nvarchar(1000) NOT NULL,
        [Ativo] bit NOT NULL,
        CONSTRAINT [PK_Ncms] PRIMARY KEY ([Codigo])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709030052_AddNcmFields'
)
BEGIN
    CREATE INDEX [IX_Produtos_NcmCodigo] ON [Produtos] ([NcmCodigo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709030052_AddNcmFields'
)
BEGIN
    ALTER TABLE [Produtos] ADD CONSTRAINT [FK_Produtos_Ncms_NcmCodigo] FOREIGN KEY ([NcmCodigo]) REFERENCES [Ncms] ([Codigo]) ON DELETE SET NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709030052_AddNcmFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260709030052_AddNcmFields', N'9.0.0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [Produtos] DROP CONSTRAINT [FK_Produtos_Cfops_CfopCodigo];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [Produtos] DROP CONSTRAINT [FK_Produtos_Ncms_NcmCodigo];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    DROP INDEX [IX_Produtos_NcmCodigo] ON [Produtos];
    DECLARE @var1 sysname;
    SELECT @var1 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Produtos]') AND [c].[name] = N'NcmCodigo');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [Produtos] DROP CONSTRAINT [' + @var1 + '];');
    ALTER TABLE [Produtos] ALTER COLUMN [NcmCodigo] nvarchar(10) NULL;
    CREATE INDEX [IX_Produtos_NcmCodigo] ON [Produtos] ([NcmCodigo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    DROP INDEX [IX_Produtos_CfopCodigo] ON [Produtos];
    DECLARE @var2 sysname;
    SELECT @var2 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Produtos]') AND [c].[name] = N'CfopCodigo');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [Produtos] DROP CONSTRAINT [' + @var2 + '];');
    ALTER TABLE [Produtos] ALTER COLUMN [CfopCodigo] int NULL;
    CREATE INDEX [IX_Produtos_CfopCodigo] ON [Produtos] ([CfopCodigo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [OSItensServico] ADD [CustoUnitario] decimal(18,2) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [OSItensServico] ADD [Entregue] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [OSItensProduto] ADD [CustoUnitario] decimal(18,2) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [OSItensProduto] ADD [Entregue] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [OrdensServico] ADD [AnotacoesTecnico] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [OrdensServico] ADD [ChecklistPassou] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [OrdensServico] ADD [CustoTotal] decimal(18,2) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [OrdensServico] ADD [DataFechamento] datetimeoffset NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [OrdensServico] ADD [Diagnostico] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [OrdensServico] ADD [OrcamentoId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [OrdensServico] ADD [PercentualMargem] decimal(18,2) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE TABLE [Agendamentos] (
        [Id] uniqueidentifier NOT NULL,
        [ClienteId] uniqueidentifier NOT NULL,
        [AtivoId] uniqueidentifier NOT NULL,
        [DataHora] datetimeoffset NOT NULL,
        [Descricao] nvarchar(max) NOT NULL,
        [Status] int NOT NULL,
        [OrdemServicoId] uniqueidentifier NULL,
        [CriadoEm] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Agendamentos] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Agendamentos_Ativos_AtivoId] FOREIGN KEY ([AtivoId]) REFERENCES [Ativos] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Agendamentos_Clientes_ClienteId] FOREIGN KEY ([ClienteId]) REFERENCES [Clientes] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Agendamentos_OrdensServico_OrdemServicoId] FOREIGN KEY ([OrdemServicoId]) REFERENCES [OrdensServico] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE TABLE [Compras] (
        [Id] uniqueidentifier NOT NULL,
        [Status] int NOT NULL,
        [Fornecedor] nvarchar(max) NOT NULL,
        [NumeroNF] nvarchar(max) NULL,
        [ValorTotal] decimal(18,2) NOT NULL,
        [CriadoEm] datetimeoffset NOT NULL,
        [RecebidoEm] datetimeoffset NULL,
        CONSTRAINT [PK_Compras] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE TABLE [LivroCaixa] (
        [Id] uniqueidentifier NOT NULL,
        [Tipo] int NOT NULL,
        [Valor] decimal(18,2) NOT NULL,
        [Descricao] nvarchar(max) NOT NULL,
        [TransacaoId] uniqueidentifier NOT NULL,
        [DataHoraRegistro] datetimeoffset NOT NULL,
        CONSTRAINT [PK_LivroCaixa] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE TABLE [Orcamentos] (
        [Id] uniqueidentifier NOT NULL,
        [ClienteId] uniqueidentifier NOT NULL,
        [AtivoId] uniqueidentifier NOT NULL,
        [Status] int NOT NULL,
        [CustoTotal] decimal(18,2) NOT NULL,
        [ValorTotal] decimal(18,2) NOT NULL,
        [PercentualMargem] decimal(18,2) NOT NULL,
        [Observacoes] nvarchar(max) NOT NULL,
        [OrdemServicoId] uniqueidentifier NULL,
        [CriadoEm] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Orcamentos] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Orcamentos_Ativos_AtivoId] FOREIGN KEY ([AtivoId]) REFERENCES [Ativos] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Orcamentos_Clientes_ClienteId] FOREIGN KEY ([ClienteId]) REFERENCES [Clientes] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE TABLE [TransacoesFinanceiras] (
        [Id] uniqueidentifier NOT NULL,
        [Tipo] int NOT NULL,
        [Categoria] nvarchar(max) NOT NULL,
        [OrigemId] nvarchar(max) NULL,
        [Descricao] nvarchar(max) NOT NULL,
        [Valor] decimal(18,2) NOT NULL,
        [DataVencimento] datetimeoffset NOT NULL,
        [DataPagamento] datetimeoffset NULL,
        [Status] int NOT NULL,
        [MetodoPagamento] nvarchar(max) NULL,
        [CriadoEm] datetimeoffset NOT NULL,
        CONSTRAINT [PK_TransacoesFinanceiras] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE TABLE [CompraItens] (
        [Id] uniqueidentifier NOT NULL,
        [CompraId] uniqueidentifier NOT NULL,
        [ProdutoId] uniqueidentifier NOT NULL,
        [Nome] nvarchar(max) NOT NULL,
        [Quantidade] decimal(18,2) NOT NULL,
        [PrecoCusto] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_CompraItens] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CompraItens_Compras_CompraId] FOREIGN KEY ([CompraId]) REFERENCES [Compras] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_CompraItens_Produtos_ProdutoId] FOREIGN KEY ([ProdutoId]) REFERENCES [Produtos] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE TABLE [OrcamentoItens] (
        [Id] uniqueidentifier NOT NULL,
        [OrcamentoId] uniqueidentifier NOT NULL,
        [Tipo] nvarchar(max) NOT NULL,
        [ItemId] uniqueidentifier NOT NULL,
        [Nome] nvarchar(max) NOT NULL,
        [Quantidade] decimal(18,2) NOT NULL,
        [CustoUnitario] decimal(18,2) NOT NULL,
        [PrecoUnitario] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_OrcamentoItens] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_OrcamentoItens_Orcamentos_OrcamentoId] FOREIGN KEY ([OrcamentoId]) REFERENCES [Orcamentos] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_OrdensServico_OrcamentoId] ON [OrdensServico] ([OrcamentoId]) WHERE [OrcamentoId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE INDEX [IX_Agendamentos_AtivoId] ON [Agendamentos] ([AtivoId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE INDEX [IX_Agendamentos_ClienteId] ON [Agendamentos] ([ClienteId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE INDEX [IX_Agendamentos_OrdemServicoId] ON [Agendamentos] ([OrdemServicoId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE INDEX [IX_CompraItens_CompraId] ON [CompraItens] ([CompraId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE INDEX [IX_CompraItens_ProdutoId] ON [CompraItens] ([ProdutoId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE INDEX [IX_OrcamentoItens_OrcamentoId] ON [OrcamentoItens] ([OrcamentoId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE INDEX [IX_Orcamentos_AtivoId] ON [Orcamentos] ([AtivoId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    CREATE INDEX [IX_Orcamentos_ClienteId] ON [Orcamentos] ([ClienteId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [OrdensServico] ADD CONSTRAINT [FK_OrdensServico_Orcamentos_OrcamentoId] FOREIGN KEY ([OrcamentoId]) REFERENCES [Orcamentos] ([Id]) ON DELETE SET NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [Produtos] ADD CONSTRAINT [FK_Produtos_CFOP_CfopCodigo] FOREIGN KEY ([CfopCodigo]) REFERENCES [CFOP] ([CodigoCFOP]) ON DELETE SET NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    ALTER TABLE [Produtos] ADD CONSTRAINT [FK_Produtos_NCM_NcmCodigo] FOREIGN KEY ([NcmCodigo]) REFERENCES [NCM] ([CodigoNCM]) ON DELETE SET NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260709174112_MapToExistingFiscalTables'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260709174112_MapToExistingFiscalTables', N'9.0.0');
END;

COMMIT;
GO


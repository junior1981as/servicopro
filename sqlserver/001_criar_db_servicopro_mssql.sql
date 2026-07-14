SET NOCOUNT ON;

DECLARE @DbName sysname = N'db_servicopro_mssql';
DECLARE @LoginName sysname = N'servicopro_app';
DECLARE @AppPassword nvarchar(256) = N'aqswde12#$%&';

PRINT 'Validando banco separado do ServicoPro...';

IF DB_ID(@DbName) IS NULL
BEGIN
    DECLARE @CreateDb nvarchar(max) = N'CREATE DATABASE [' + REPLACE(@DbName, ']', ']]') + N'];';
    EXEC(@CreateDb);
    PRINT 'Banco criado.';
END
ELSE
BEGIN
    PRINT 'Banco ja existia. Nenhuma recriacao foi feita.';
END;

DECLARE @Sql nvarchar(max);

IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = @LoginName)
BEGIN
    SET @Sql = N'CREATE LOGIN [' + REPLACE(@LoginName, ']', ']]') + N'] WITH PASSWORD = N''' + REPLACE(@AppPassword, '''', '''''') + N''', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;';
    EXEC(@Sql);
    PRINT 'Login criado.';
END
ELSE
BEGIN
    PRINT 'Login ja existia. Atualizando senha informada.';
    SET @Sql = N'ALTER LOGIN [' + REPLACE(@LoginName, ']', ']]') + N'] WITH PASSWORD = N''' + REPLACE(@AppPassword, '''', '''''') + N''', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;';
    EXEC(@Sql);
END;

SET @Sql = N'
USE [' + REPLACE(@DbName, ']', ']]') + N'];

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N''' + REPLACE(@LoginName, '''', '''''') + N''')
BEGIN
    CREATE USER [' + REPLACE(@LoginName, ']', ']]') + N'] FOR LOGIN [' + REPLACE(@LoginName, ']', ']]') + N'];
END;

ALTER USER [' + REPLACE(@LoginName, ']', ']]') + N'] WITH LOGIN = [' + REPLACE(@LoginName, ']', ']]') + N'];

IF IS_ROLEMEMBER(N''db_datareader'', N''' + REPLACE(@LoginName, '''', '''''') + N''') <> 1
    ALTER ROLE db_datareader ADD MEMBER [' + REPLACE(@LoginName, ']', ']]') + N'];

IF IS_ROLEMEMBER(N''db_datawriter'', N''' + REPLACE(@LoginName, '''', '''''') + N''') <> 1
    ALTER ROLE db_datawriter ADD MEMBER [' + REPLACE(@LoginName, ']', ']]') + N'];

IF IS_ROLEMEMBER(N''db_ddladmin'', N''' + REPLACE(@LoginName, '''', '''''') + N''') <> 1
    ALTER ROLE db_ddladmin ADD MEMBER [' + REPLACE(@LoginName, ']', ']]') + N'];

IF OBJECT_ID(N''dbo.controle_migracoes'', N''U'') IS NULL
BEGIN
    CREATE TABLE dbo.controle_migracoes
    (
        id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_controle_migracoes PRIMARY KEY,
        nome varchar(160) NOT NULL,
        descricao varchar(500) NULL,
        aplicado_em datetime2(0) NOT NULL CONSTRAINT DF_controle_migracoes_aplicado_em DEFAULT SYSUTCDATETIME()
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.controle_migracoes WHERE nome = N''001_criacao_banco_servicopro_mssql'')
BEGIN
    INSERT INTO dbo.controle_migracoes (nome, descricao)
    VALUES (N''001_criacao_banco_servicopro_mssql'', N''Criacao do banco dedicado, login da aplicacao e tabela de controle.'');
END;
';
EXEC(@Sql);

PRINT 'Validacao final:';
SELECT name, create_date, state_desc, recovery_model_desc
FROM sys.databases
WHERE name = @DbName;

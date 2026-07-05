using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Data.SqlClient;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.SerializerOptions.WriteIndented = false;
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin();
    });
});

var app = builder.Build();

app.UseCors();

var adminDbPath = "db_servicopro_mssql";
var connectionString = ObterConnectionStringMssql();

InicializarBancoAdministrativo(connectionString);

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ok",
    app = "ServicoPro.Api",
    fase = "2.1-persistencia-identidade-tenancy",
    adminDb = adminDbPath,
    utc = DateTimeOffset.UtcNow
}));

app.MapGet("/api/status", () => Results.Ok(new
{
    status = "online",
    app = "ServicoPro ERP",
    backend = ".NET 9 Minimal API",
    persistencia = "MSSQL administrativo e operacional",
    tenancy = "tenant com banco isolado por cliente",
    autenticacao = "login MVP com token assinado",
    utc = DateTimeOffset.UtcNow
}));

app.MapGet("/api/tenants", () =>
{
    using var con = AbrirConexao(connectionString);
    using var cmd = con.CreateCommand();

    cmd.CommandText = """
        SELECT
            t.id,
            e.nome_fantasia AS empresa_nome,
            t.nome,
            t.banco_dados,
            t.ativo
        FROM tenants t
        INNER JOIN empresas e ON e.id = t.empresa_id
        WHERE t.ativo = 1
        ORDER BY t.nome;
    """;

    using var rd = cmd.ExecuteReader();

    var lista = new List<object>();

    while (rd.Read())
    {
        lista.Add(new
        {
            id = rd.GetString(0),
            empresaNome = rd.GetString(1),
            nome = rd.GetString(2),
            banco = rd.GetString(3),
            ativo = LerBool(rd, 4)
        });
    }

    return Results.Ok(lista);
});

app.MapPost("/api/auth/login", (LoginRequest request, HttpContext http) =>
{
    var email = (request.Usuario ?? request.Email ?? string.Empty).Trim().ToLowerInvariant();
    var senha = request.Senha ?? string.Empty;
    var tenantId = (request.TenantId ?? request.Tenant ?? string.Empty).Trim();

    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(senha))
        return Results.BadRequest(new ApiErro("LOGIN_INVALIDO", "Informe usuário e senha."));

    if (string.IsNullOrWhiteSpace(tenantId))
        return Results.BadRequest(new ApiErro("TENANT_OBRIGATORIO", "Informe a empresa/tenant para acessar."));

    using var con = AbrirConexao(connectionString);

    var usuario = BuscarUsuarioPorEmail(con, email);

    if (usuario is null || !usuario.Ativo)
    {
        RegistrarAuditoriaLogin(con, null, tenantId, email, false, "USUARIO_INVALIDO", http);
        return Results.Unauthorized();
    }

    var tenant = BuscarTenantDoUsuario(con, usuario.Id, tenantId);

    if (tenant is null || !tenant.Ativo)
    {
        RegistrarAuditoriaLogin(con, usuario.Id, tenantId, email, false, "TENANT_INVALIDO", http);
        return Results.Forbid();
    }

    if (!VerificarSenha(senha, usuario.SenhaHash))
    {
        RegistrarAuditoriaLogin(con, usuario.Id, tenant.Id, email, false, "SENHA_INVALIDA", http);
        return Results.Unauthorized();
    }

    var perfis = BuscarPerfisUsuario(con, usuario.Id);
    var expiraEm = DateTimeOffset.UtcNow.AddHours(8);
    var token = CriarToken(usuario, tenant, perfis, expiraEm);

    RegistrarAuditoriaLogin(con, usuario.Id, tenant.Id, email, true, "OK", http);

    return Results.Ok(new LoginResponse(
        Status: "ok",
        AccessToken: token,
        TokenType: "Bearer",
        ExpiresAtUtc: expiraEm,
        Usuario: new UsuarioSessao(usuario.Id, usuario.Nome, usuario.Email, perfis),
        Tenant: tenant
    ));
});

app.MapGet("/api/auth/me", (HttpRequest request) =>
{
    var auth = request.Headers.Authorization.ToString();

    if (string.IsNullOrWhiteSpace(auth) || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        return Results.Unauthorized();

    var token = auth["Bearer ".Length..].Trim();
    var validacao = ValidarToken(token);

    if (!validacao.Valido)
        return Results.Unauthorized();

    return Results.Ok(validacao.Payload);
});

app.MapGet("/api/admin/tenancy/check", () =>
{
    using var con = AbrirConexao(connectionString);

    var qtdEmpresas = Contar(con, "empresas");
    var qtdTenants = Contar(con, "tenants");
    var qtdUsuarios = Contar(con, "usuarios");
    var qtdAuditoria = Contar(con, "auditoria_login");

    return Results.Ok(new
    {
        status = "ok",
        regra = "tenant resolvido antes de acessar dados",
        isolamento = "um banco por cliente",
        adminDb = adminDbPath,
        tabelas = new
        {
            empresas = qtdEmpresas,
            tenants = qtdTenants,
            usuarios = qtdUsuarios,
            auditoriaLogin = qtdAuditoria
        },
        observacao = "Catálogo administrativo persistente criado. Próximo passo: cadastros base por tenant."
    });
});

app.MapGet("/api/admin/auditoria-login", () =>
{
    using var con = AbrirConexao(connectionString);
    using var cmd = con.CreateCommand();

    cmd.CommandText = """
        SELECT
            id,
            usuario_id,
            tenant_id,
            email_informado,
            sucesso,
            motivo,
            ip,
            user_agent,
            criado_em_utc
        FROM auditoria_login
        ORDER BY criado_em_utc DESC
        
    """;

    using var rd = cmd.ExecuteReader();

    var lista = new List<object>();

    while (rd.Read())
    {
        lista.Add(new
        {
            id = rd.GetString(0),
            usuarioId = rd.IsDBNull(1) ? null : rd.GetString(1),
            tenantId = rd.IsDBNull(2) ? null : rd.GetString(2),
            emailInformado = rd.GetString(3),
            sucesso = LerBool(rd, 4),
            motivo = rd.GetString(5),
            ip = rd.IsDBNull(6) ? null : rd.GetString(6),
            userAgent = rd.IsDBNull(7) ? null : rd.GetString(7),
            criadoEmUtc = rd.GetString(8)
        });
    }

    return Results.Ok(lista);
});


app.MapCadastrosBaseEndpoints();


app.MapOperacaoEndpoints();


app.MapOperacaoItensEndpoints();


app.MapOrcamentoItensEndpoints();

app.Run();


static string ObterConnectionStringMssql()
{
    var env = Environment.GetEnvironmentVariable("SERVICOPRO_MSSQL_CONNECTION_STRING");
    if (!string.IsNullOrWhiteSpace(env))
        return env;

    const string caminho = "/opt/servicopro/segredos/servicopro_mssql.env";

    if (!File.Exists(caminho))
        throw new InvalidOperationException("Arquivo de conexão MSSQL não encontrado: " + caminho);

    foreach (var linha in File.ReadAllLines(caminho))
    {
        if (linha.StartsWith("SERVICOPRO_MSSQL_CONNECTION_STRING=", StringComparison.Ordinal))
            return linha["SERVICOPRO_MSSQL_CONNECTION_STRING=".Length..].Trim();
    }

    throw new InvalidOperationException("SERVICOPRO_MSSQL_CONNECTION_STRING não encontrada em " + caminho);
}

static bool LerBool(IDataRecord rd, int indice)
{
    if (rd.IsDBNull(indice))
        return false;

    var valor = rd.GetValue(indice);

    return valor switch
    {
        bool b => b,
        byte b => b == 1,
        short s => s == 1,
        int i => i == 1,
        long l => l == 1,
        decimal d => d == 1,
        string s => s == "1" || s.Equals("true", StringComparison.OrdinalIgnoreCase),
        _ => Convert.ToBoolean(valor)
    };
}

static SqlConnection AbrirConexao(string connectionString)
{
    var con = new SqlConnection(connectionString);
    con.Open();
    return con;
}

static void InicializarBancoAdministrativo(string connectionString)
{
    // MSSQL: o schema e a carga inicial agora são controlados por scripts SQL/SSMS.
    // Não executar validações bloqueantes no startup para evitar derrubar a API
    // por timeout ou lock de banco durante manutenção.
}

static void SeedInicial(SqlConnection con)
{
    throw new NotSupportedException("SeedInicial SQLite desativado. Use scripts MSSQL controlados pelo SSMS.");
}

static void InserirTenant(SqlConnection con, string id, string empresaId, string nome, string banco, string criado)
{
    throw new NotSupportedException("InserirTenant do seed SQLite desativado. Use scripts MSSQL controlados pelo SSMS.");
}

static UsuarioInfo? BuscarUsuarioPorEmail(SqlConnection con, string email)
{
    using var cmd = con.CreateCommand();

    cmd.CommandText = """
        SELECT id, nome, email, senha_hash, ativo
        FROM usuarios
        WHERE lower(email) = lower(@email)
        
    """;

    cmd.Parameters.AddWithValue("@email", email);

    using var rd = cmd.ExecuteReader();

    if (!rd.Read())
        return null;

    return new UsuarioInfo(
        Id: rd.GetString(0),
        Nome: rd.GetString(1),
        Email: rd.GetString(2),
        SenhaHash: rd.GetString(3),
        Ativo: LerBool(rd, 4));
}

static TenantInfo? BuscarTenantDoUsuario(SqlConnection con, string usuarioId, string tenantId)
{
    using var cmd = con.CreateCommand();

    cmd.CommandText = """
        SELECT
            t.id,
            t.nome,
            t.banco_dados,
            t.ativo
        FROM tenants t
        INNER JOIN usuarios_tenants ut ON ut.tenant_id = t.id
        WHERE
            ut.usuario_id = @usuario_id
            AND t.id = @tenant_id
            AND ut.ativo = 1
        
    """;

    cmd.Parameters.AddWithValue("@usuario_id", usuarioId);
    cmd.Parameters.AddWithValue("@tenant_id", tenantId);

    using var rd = cmd.ExecuteReader();

    if (!rd.Read())
        return null;

    return new TenantInfo(
        Id: rd.GetString(0),
        Nome: rd.GetString(1),
        Banco: rd.GetString(2),
        Ativo: LerBool(rd, 3));
}

static string[] BuscarPerfisUsuario(SqlConnection con, string usuarioId)
{
    using var cmd = con.CreateCommand();

    cmd.CommandText = """
        SELECT p.nome
        FROM perfis p
        INNER JOIN usuarios_perfis up ON up.perfil_id = p.id
        WHERE
            up.usuario_id = @usuario_id
            AND up.ativo = 1
            AND p.ativo = 1
        ORDER BY p.nome;
    """;

    cmd.Parameters.AddWithValue("@usuario_id", usuarioId);

    using var rd = cmd.ExecuteReader();

    var perfis = new List<string>();

    while (rd.Read())
        perfis.Add(rd.GetString(0));

    return perfis.ToArray();
}

static void RegistrarAuditoriaLogin(SqlConnection con, string? usuarioId, string? tenantId, string email, bool sucesso, string motivo, HttpContext http)
{
    var ip = http.Connection.RemoteIpAddress?.ToString();
    var userAgent = http.Request.Headers.UserAgent.ToString();

    ExecutarComParametros(con, """
        INSERT INTO auditoria_login
            (id, usuario_id, tenant_id, email_informado, sucesso, motivo, ip, user_agent, criado_em_utc)
        VALUES
            (@id, @usuario_id, @tenant_id, @email, @sucesso, @motivo, @ip, @user_agent, @criado);
    """,
    new()
    {
        ["@id"] = Guid.NewGuid().ToString("N"),
        ["@usuario_id"] = usuarioId ?? (object)DBNull.Value,
        ["@tenant_id"] = tenantId ?? (object)DBNull.Value,
        ["@email"] = email,
        ["@sucesso"] = sucesso ? 1 : 0,
        ["@motivo"] = motivo,
        ["@ip"] = ip ?? (object)DBNull.Value,
        ["@user_agent"] = userAgent ?? (object)DBNull.Value,
        ["@criado"] = DateTimeOffset.UtcNow.ToString("O")
    });
}

static long Contar(SqlConnection con, string tabela)
{
    using var cmd = con.CreateCommand();
    cmd.CommandText = $"SELECT COUNT(*) FROM {tabela};";
    return (long)(cmd.ExecuteScalar() ?? 0L);
}

static void Executar(SqlConnection con, string sql)
{
    using var cmd = con.CreateCommand();
    cmd.CommandText = sql;
    cmd.ExecuteNonQuery();
}

static void ExecutarComParametros(SqlConnection con, string sql, Dictionary<string, object> parametros)
{
    using var cmd = con.CreateCommand();
    cmd.CommandText = sql;

    foreach (var item in parametros)
        cmd.Parameters.AddWithValue(item.Key, item.Value);

    cmd.ExecuteNonQuery();
}

static string HashPassword(string senha)
{
    var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(senha));
    return Convert.ToHexString(bytes);
}

static bool VerificarSenha(string senha, string hash)
{
    var senhaHash = HashPassword(senha);

    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(senhaHash),
        Encoding.UTF8.GetBytes(hash));
}

static string CriarToken(UsuarioInfo usuario, TenantInfo tenant, string[] perfis, DateTimeOffset expiraEm)
{
    var secret = Environment.GetEnvironmentVariable("SERVICOPRO_JWT_SECRET");

    if (string.IsNullOrWhiteSpace(secret))
        secret = "servicopro-dev-secret-altere-em-producao";

    var header = new
    {
        alg = "HS256",
        typ = "JWT"
    };

    var payload = new Dictionary<string, object?>
    {
        ["sub"] = usuario.Id,
        ["nome"] = usuario.Nome,
        ["email"] = usuario.Email,
        ["tenant_id"] = tenant.Id,
        ["tenant_nome"] = tenant.Nome,
        ["tenant_banco"] = tenant.Banco,
        ["roles"] = perfis,
        ["exp"] = expiraEm.ToUnixTimeSeconds(),
        ["iat"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
    };

    var headerBase64 = Base64Url(JsonSerializer.SerializeToUtf8Bytes(header));
    var payloadBase64 = Base64Url(JsonSerializer.SerializeToUtf8Bytes(payload));
    var assinaturaBase = $"{headerBase64}.{payloadBase64}";

    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var assinatura = Base64Url(hmac.ComputeHash(Encoding.UTF8.GetBytes(assinaturaBase)));

    return $"{assinaturaBase}.{assinatura}";
}

static TokenValidacao ValidarToken(string token)
{
    try
    {
        var partes = token.Split('.');

        if (partes.Length != 3)
            return new(false, null);

        var secret = Environment.GetEnvironmentVariable("SERVICOPRO_JWT_SECRET");

        if (string.IsNullOrWhiteSpace(secret))
            secret = "servicopro-dev-secret-altere-em-producao";

        var assinaturaBase = $"{partes[0]}.{partes[1]}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var assinaturaEsperada = Base64Url(hmac.ComputeHash(Encoding.UTF8.GetBytes(assinaturaBase)));

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(assinaturaEsperada),
                Encoding.UTF8.GetBytes(partes[2])))
            return new(false, null);

        var json = Encoding.UTF8.GetString(Base64UrlDecode(partes[1]));
        var payload = JsonSerializer.Deserialize<Dictionary<string, object>>(json);

        if (payload is null)
            return new(false, null);

        if (payload.TryGetValue("exp", out var expObj))
        {
            var exp = Convert.ToInt64(expObj.ToString());

            if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > exp)
                return new(false, null);
        }

        return new(true, payload);
    }
    catch
    {
        return new(false, null);
    }
}

static string Base64Url(byte[] bytes)
{
    return Convert.ToBase64String(bytes)
        .TrimEnd('=')
        .Replace('+', '-')
        .Replace('/', '_');
}

static byte[] Base64UrlDecode(string valor)
{
    var base64 = valor.Replace('-', '+').Replace('_', '/');

    switch (base64.Length % 4)
    {
        case 2:
            base64 += "==";
            break;
        case 3:
            base64 += "=";
            break;
    }

    return Convert.FromBase64String(base64);
}

public record TenantInfo(
    string Id,
    string Nome,
    string Banco,
    bool Ativo);

public record UsuarioInfo(
    string Id,
    string Nome,
    string Email,
    string SenhaHash,
    bool Ativo);

public record LoginRequest(
    string? Usuario,
    string? Email,
    string? Senha,
    string? TenantId,
    string? Tenant);

public record UsuarioSessao(
    string Id,
    string Nome,
    string Email,
    string[] Papeis);

public record LoginResponse(
    string Status,
    string AccessToken,
    string TokenType,
    DateTimeOffset ExpiresAtUtc,
    UsuarioSessao Usuario,
    TenantInfo Tenant);

public record ApiErro(
    string Codigo,
    string Mensagem);

public record TokenValidacao(
    bool Valido,
    Dictionary<string, object>? Payload);

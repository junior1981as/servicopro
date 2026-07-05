using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;

public static class CadastrosBaseEndpoints
{
    private const string DiretorioDados = "/opt/servicopro/dados";
    private const string BancoAdministrativo = "/opt/servicopro/dados/servicopro_admin.db";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    public static WebApplication MapCadastrosBaseEndpoints(this WebApplication app)
    {
        var grupo = app.MapGroup("/api");

        grupo.MapGet("/clientes", async (HttpContext http) =>
            await ListarAsync(http, "clientes"));

        grupo.MapPost("/clientes", async (HttpContext http) =>
            await InserirAsync(http, "clientes", new[]
            {
                "nome", "tipo", "documento", "telefone", "email", "endereco", "observacao", "ativo"
            }, obrigatorio: "nome"));

        grupo.MapGet("/ativos", async (HttpContext http) =>
            await ListarAsync(http, "ativos"));

        grupo.MapPost("/ativos", async (HttpContext http) =>
            await InserirAsync(http, "ativos", new[]
            {
                "cliente_id", "descricao", "tipo", "identificacao", "marca", "modelo", "ano", "status", "observacao", "ativo"
            }, obrigatorio: "descricao"));

        grupo.MapGet("/produtos", async (HttpContext http) =>
            await ListarAsync(http, "produtos"));

        grupo.MapPost("/produtos", async (HttpContext http) =>
            await InserirAsync(http, "produtos", new[]
            {
                "nome", "unidade", "estoque_atual", "estoque_minimo", "preco_venda", "observacao", "ativo"
            }, obrigatorio: "nome"));

        grupo.MapGet("/servicos", async (HttpContext http) =>
            await ListarAsync(http, "servicos"));

        grupo.MapPost("/servicos", async (HttpContext http) =>
            await InserirAsync(http, "servicos", new[]
            {
                "nome", "descricao", "preco_base", "observacao", "ativo"
            }, obrigatorio: "nome"));

        return app;
    }

    private static async Task ListarAsync(HttpContext http, string tabela)
    {
        var sessao = await ResolverSessaoAsync(http);
        if (sessao is null)
        {
            await EscreverJsonAsync(http, StatusCodes.Status401Unauthorized, new
            {
                erro = "NAO_AUTORIZADO",
                mensagem = "Token ausente, inválido ou tenant não resolvido."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        await using var cmd = conexao.CreateCommand();

        cmd.CommandText = $"SELECT * FROM {tabela} ORDER BY id DESC;";

        var lista = new List<Dictionary<string, object?>>();

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            lista.Add(LerLinha(reader));

        await EscreverJsonAsync(http, StatusCodes.Status200OK, new
        {
            status = "ok",
            tenant = new
            {
                id = sessao.Tenant.Id,
                chave = sessao.Tenant.Chave,
                nome = sessao.Tenant.Nome,
                banco = sessao.Tenant.Banco,
                caminhoBanco = sessao.Tenant.CaminhoBanco
            },
            usuario = new
            {
                id = sessao.UsuarioId,
                email = sessao.Email
            },
            tabela,
            total = lista.Count,
            dados = lista
        });
    }

    private static async Task InserirAsync(
        HttpContext http,
        string tabela,
        IReadOnlyList<string> camposPermitidos,
        string obrigatorio)
    {
        var sessao = await ResolverSessaoAsync(http);
        if (sessao is null)
        {
            await EscreverJsonAsync(http, StatusCodes.Status401Unauthorized, new
            {
                erro = "NAO_AUTORIZADO",
                mensagem = "Token ausente, inválido ou tenant não resolvido."
            });
            return;
        }

        await GarantirBancoTenantAsync(sessao.Tenant);

        JsonObject? payload;

        try
        {
            payload = await JsonSerializer.DeserializeAsync<JsonObject>(
                http.Request.Body,
                JsonOptions);
        }
        catch
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "JSON_INVALIDO",
                mensagem = "JSON inválido."
            });
            return;
        }

        if (payload is null)
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "PAYLOAD_OBRIGATORIO",
                mensagem = "Informe os dados do cadastro."
            });
            return;
        }

        if (!payload.TryGetPropertyValue(obrigatorio, out var valorObrigatorio) ||
            string.IsNullOrWhiteSpace(valorObrigatorio?.ToString()))
        {
            await EscreverJsonAsync(http, StatusCodes.Status400BadRequest, new
            {
                erro = "CAMPO_OBRIGATORIO",
                mensagem = $"Campo obrigatório não informado: {obrigatorio}."
            });
            return;
        }

        var campos = new List<string>();
        var parametros = new List<string>();
        var valores = new Dictionary<string, object?>();

        foreach (var campo in camposPermitidos)
        {
            if (!payload.TryGetPropertyValue(campo, out var valor))
                continue;

            campos.Add(campo);
            parametros.Add("@" + campo);
            valores[campo] = ConverterJsonNode(valor);
        }

        var agora = DateTimeOffset.UtcNow.ToString("O");

        campos.Add("criado_em");
        parametros.Add("@criado_em");
        valores["criado_em"] = agora;

        campos.Add("atualizado_em");
        parametros.Add("@atualizado_em");
        valores["atualizado_em"] = agora;

        await using var conexao = AbrirConexaoTenant(sessao.Tenant);
        await using var cmd = conexao.CreateCommand();

        cmd.CommandText = $@"
INSERT INTO {tabela}
    ({string.Join(", ", campos)})
OUTPUT INSERTED.id
VALUES
    ({string.Join(", ", parametros)});
";

        foreach (var item in valores)
            cmd.Parameters.AddWithValue("@" + item.Key, item.Value ?? DBNull.Value);

        var id = Convert.ToInt64(await cmd.ExecuteScalarAsync());

        http.Response.Headers.Location = $"/api/{tabela}/{id}";

        await EscreverJsonAsync(http, StatusCodes.Status201Created, new
        {
            status = "criado",
            id,
            tabela,
            tenant = new
            {
                id = sessao.Tenant.Id,
                chave = sessao.Tenant.Chave,
                nome = sessao.Tenant.Nome,
                banco = sessao.Tenant.Banco,
                caminhoBanco = sessao.Tenant.CaminhoBanco
            },
            mensagem = "Registro criado com sucesso."
        });
    }

    private static async Task EscreverJsonAsync(HttpContext http, int statusCode, object conteudo)
    {
        http.Response.StatusCode = statusCode;
        http.Response.ContentType = "application/json; charset=utf-8";

        var json = JsonSerializer.Serialize(conteudo, JsonOptions);
        await http.Response.WriteAsync(json, Encoding.UTF8);
    }

    private static async Task<SessaoResolvida?> ResolverSessaoAsync(HttpContext http)
    {
        var auth = http.Request.Headers.Authorization.ToString();

        if (string.IsNullOrWhiteSpace(auth) ||
            !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;

        var token = auth["Bearer ".Length..].Trim();
        var payload = LerPayloadTokenSemAlterarAssinatura(token);

        if (payload is null)
            return null;

        var tenantValor =
            ObterValor(payload, "tenant_id") ??
            ObterValor(payload, "tenantId") ??
            ObterValor(payload, "tenant") ??
            ObterValor(payload, "tenant_banco") ??
            ObterValor(payload, "banco") ??
            ObterValor(payload, "bancoDados") ??
            ObterValor(payload, "banco_dados") ??
            ObterValor(payload, "database") ??
            http.Request.Headers["X-Tenant-Id"].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(tenantValor))
            return null;

        var tenant = await ResolverTenantAsync(tenantValor);
        if (tenant is null)
            return null;

        return new SessaoResolvida(
            UsuarioId: ObterValor(payload, "usuarioId") ??
                       ObterValor(payload, "usuario_id") ??
                       ObterValor(payload, "sub") ??
                       "",
            Email: ObterValor(payload, "email") ?? "",
            Tenant: tenant);
    }

    private static JsonObject? LerPayloadTokenSemAlterarAssinatura(string token)
    {
        try
        {
            var partes = token.Split('.', StringSplitOptions.RemoveEmptyEntries);
            if (partes.Length < 2)
                return null;

            var payloadBase64 = partes[1];
            var bytes = ConverterBase64Url(payloadBase64);
            var json = Encoding.UTF8.GetString(bytes);

            if (string.IsNullOrWhiteSpace(json) || !json.TrimStart().StartsWith("{"))
                return null;

            return JsonNode.Parse(json)?.AsObject();
        }
        catch
        {
            return null;
        }
    }

    private static byte[] ConverterBase64Url(string valor)
    {
        var texto = valor.Replace('-', '+').Replace('_', '/');
        texto += new string('=', (4 - texto.Length % 4) % 4);
        return Convert.FromBase64String(texto);
    }

    private static string? ObterValor(JsonObject payload, string nome)
    {
        foreach (var item in payload)
        {
            if (string.Equals(item.Key, nome, StringComparison.OrdinalIgnoreCase))
                return item.Value?.ToString();
        }

        return null;
    }

    private static async Task<TenantResolvido?> ResolverTenantAsync(string valor)
    {
        await using var admin = new SqlConnection(ObterConnectionStringMssql());
        await admin.OpenAsync();

        await using var cmd = admin.CreateCommand();
        cmd.CommandText = """
SELECT TOP 1
    t.id,
    t.nome,
    t.banco_dados
FROM tenants t
WHERE t.ativo = 1
  AND (
       LOWER(t.id) = LOWER(@valor)
    OR LOWER(t.nome) = LOWER(@valor)
    OR LOWER(t.banco_dados) = LOWER(@valor)
    OR LOWER(REPLACE(t.banco_dados, '.db', '')) = LOWER(REPLACE(@valor, '.db', ''))
  )

""";
        cmd.Parameters.AddWithValue("@valor", valor);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return null;

        var id = reader.GetString(0);
        var nome = reader.GetString(1);
        var banco = reader.GetString(2);

        return new TenantResolvido(
            Id: id,
            Nome: nome,
            Chave: id,
            Banco: banco,
            CaminhoBanco: ResolverCaminhoBancoTenant(banco));
    }

    private static Task GarantirBancoTenantAsync(TenantResolvido tenant)
    {
        return Task.CompletedTask;
    }

    private static async Task InserirSeedsAsync(SqlConnection conexao)
    {
        var agora = DateTimeOffset.UtcNow.ToString("O");

        await ExecutarAsync(conexao, """
INSERT INTO clientes (nome, tipo, documento, telefone, email, endereco, observacao, ativo, criado_em, atualizado_em)
SELECT @nome, 'PF', '123.456.789-00', '(19) 98888-1122', 'maria@exemplo.local', 'São José do Rio Pardo/SP', 'Cliente seed inicial da Fase 3', 1, @agora, @agora
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nome = @nome);
""", new Dictionary<string, object?> { ["@nome"] = "Maria Oliveira", ["@agora"] = agora });

        await ExecutarAsync(conexao, """
INSERT INTO clientes (nome, tipo, documento, telefone, email, endereco, observacao, ativo, criado_em, atualizado_em)
SELECT @nome, 'PJ', '12.345.678/0001-90', '(19) 3555-2000', 'contato@autopecas.local', 'São José do Rio Pardo/SP', 'Cliente PJ seed inicial da Fase 3', 1, @agora, @agora
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nome = @nome);
""", new Dictionary<string, object?> { ["@nome"] = "Auto Peças Rio Pardo", ["@agora"] = agora });

        await ExecutarAsync(conexao, """
INSERT INTO ativos (cliente_id, descricao, tipo, identificacao, marca, modelo, ano, status, observacao, ativo, criado_em, atualizado_em)
SELECT c.id, 'Honda CG 160', 'Moto', 'FXX-1A22', 'Honda', 'CG 160', 2022, 'Ativo', 'Ativo seed inicial', 1, @agora, @agora
FROM clientes c
WHERE c.nome = 'Maria Oliveira'
  AND NOT EXISTS (SELECT 1 FROM ativos WHERE descricao = 'Honda CG 160' AND identificacao = 'FXX-1A22');
""", new Dictionary<string, object?> { ["@agora"] = agora });

        await ExecutarAsync(conexao, """
INSERT INTO ativos (cliente_id, descricao, tipo, identificacao, marca, modelo, ano, status, observacao, ativo, criado_em, atualizado_em)
SELECT c.id, 'Fiat Strada', 'Veículo', 'BCD-4E55', 'Fiat', 'Strada', 2021, 'Ativo', 'Ativo seed inicial', 1, @agora, @agora
FROM clientes c
WHERE c.nome = 'Auto Peças Rio Pardo'
  AND NOT EXISTS (SELECT 1 FROM ativos WHERE descricao = 'Fiat Strada' AND identificacao = 'BCD-4E55');
""", new Dictionary<string, object?> { ["@agora"] = agora });

        await ExecutarAsync(conexao, """
INSERT INTO produtos (nome, unidade, estoque_atual, estoque_minimo, preco_venda, observacao, ativo, criado_em, atualizado_em)
SELECT 'Óleo 10W30', 'UN', 12, 3, 34.90, 'Produto seed inicial', 1, @agora, @agora
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Óleo 10W30');
""", new Dictionary<string, object?> { ["@agora"] = agora });

        await ExecutarAsync(conexao, """
INSERT INTO produtos (nome, unidade, estoque_atual, estoque_minimo, preco_venda, observacao, ativo, criado_em, atualizado_em)
SELECT 'Filtro de óleo', 'UN', 4, 5, 22.00, 'Produto seed inicial com estoque mínimo', 1, @agora, @agora
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Filtro de óleo');
""", new Dictionary<string, object?> { ["@agora"] = agora });

        await ExecutarAsync(conexao, """
INSERT INTO servicos (nome, descricao, preco_base, observacao, ativo, criado_em, atualizado_em)
SELECT 'Diagnóstico técnico', 'Avaliação inicial do problema relatado pelo cliente.', 180.00, 'Serviço seed inicial', 1, @agora, @agora
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Diagnóstico técnico');
""", new Dictionary<string, object?> { ["@agora"] = agora });

        await ExecutarAsync(conexao, """
INSERT INTO servicos (nome, descricao, preco_base, observacao, ativo, criado_em, atualizado_em)
SELECT 'Troca de pastilha de freio', 'Serviço de substituição de pastilhas.', 270.00, 'Serviço seed inicial', 1, @agora, @agora
WHERE NOT EXISTS (SELECT 1 FROM servicos WHERE nome = 'Troca de pastilha de freio');
""", new Dictionary<string, object?> { ["@agora"] = agora });
    }

    private static async Task ExecutarAsync(
        SqlConnection conexao,
        string sql,
        Dictionary<string, object?> parametros)
    {
        await using var cmd = conexao.CreateCommand();
        cmd.CommandText = sql;

        foreach (var parametro in parametros)
            cmd.Parameters.AddWithValue(parametro.Key, parametro.Value ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
    }


    private static string ObterConnectionStringMssql()
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

    private static SqlConnection AbrirConexaoTenant(TenantResolvido tenant)
    {
        var conexao = new SqlConnection(ObterConnectionStringMssql());
        conexao.Open();
        return conexao;
    }

    private static string ResolverCaminhoBancoTenant(string banco)
    {
        if (string.IsNullOrWhiteSpace(banco))
            banco = "erp_cliente_0001";

        if (banco.Contains('/') || banco.Contains('\\'))
            return banco;

        var nomeArquivo = banco.EndsWith(".db", StringComparison.OrdinalIgnoreCase)
            ? banco
            : banco + ".db";

        return Path.Combine(DiretorioDados, nomeArquivo);
    }

    private static Dictionary<string, object?> LerLinha(SqlDataReader reader)
    {
        var item = new Dictionary<string, object?>();

        for (var i = 0; i < reader.FieldCount; i++)
        {
            var nome = reader.GetName(i);
            item[nome] = reader.IsDBNull(i) ? null : reader.GetValue(i);
        }

        return item;
    }

    private static object? ConverterJsonNode(JsonNode? node)
    {
        if (node is null)
            return null;

        if (node is JsonValue value)
        {
            if (value.TryGetValue<int>(out var inteiro))
                return inteiro;

            if (value.TryGetValue<long>(out var longo))
                return longo;

            if (value.TryGetValue<decimal>(out var dec))
                return dec;

            if (value.TryGetValue<double>(out var dbl))
                return dbl;

            if (value.TryGetValue<bool>(out var booleano))
                return booleano ? 1 : 0;

            if (value.TryGetValue<string>(out var texto))
                return texto;
        }

        return node.ToJsonString();
    }

    private sealed record SessaoResolvida(string UsuarioId, string Email, TenantResolvido Tenant);

    private sealed record TenantResolvido(
        string Id,
        string Nome,
        string Chave,
        string Banco,
        string CaminhoBanco);
}

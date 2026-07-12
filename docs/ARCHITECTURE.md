# Diretrizes de Arquitetura - ServicoPro Backend

Este documento serve como a fonte de verdade para a arquitetura do projeto C# (Backend). Qualquer nova funcionalidade deve aderir estritamente a estas regras.

## Princípios Básicos

1. **Separação de Preocupações (Separation of Concerns):** Endpoints HTTP não devem conter lógica de negócios, nem acessar o banco de dados diretamente.
2. **Injeção de Dependência:** Tudo que realizar trabalho externo (banco de dados, arquivos, APIs) deve ser injetado via construtor (no caso de endpoints Minimal APIs, via injeção de parâmetros).
3. **Padrão Dapper + Repository/Services:**
   - O acesso a dados é feito via **Dapper**.
   - As conexões são resolvidas automaticamente respeitando o conceito de **Tenancy**.
   - Queries SQL devem estar protegidas contra Injeção de SQL utilizando parâmetros (`@parametro`).
4. **Resolução de Tenancy Automática:**
   - O Middleware da aplicação (`TenantResolutionMiddleware`) será responsável por identificar qual banco de dados deve ser utilizado para cada Request. A camada de negócios/dados apenas utiliza a interface `ITenantContext` para pegar a conexão. Nunca resolver o token "na mão" nas rotas.

## Estrutura de Diretórios (Camadas Lógicas)

- `API/Endpoints`: Onde os métodos `.MapGet`, `.MapPost` residem.
- `Application/Services`: Onde as regras de negócio vivem. Os Endpoints chamam os Services.
- `Application/DTOs`: Objetos de transferência de dados (Records) usados nos Endpoints e Services.
- `Infrastructure/Data`: Conexões, métodos globais do Dapper ou classes de Repositório.
- `Infrastructure/Security`: Geradores de token, validações, middlewares.

## Como adicionar uma nova rota?

1. Crie o Request DTO e Response DTO na camada `Application/DTOs`.
2. Crie ou atualize o Service na camada `Application/Services`, implementando a regra de negócio e chamando o Dapper.
3. Exponha o Service em um Endpoint (`API/Endpoints`) mapeando a rota correspondente.
4. Utilize `[Authorize]` se a rota exigir login. Nunca verifique manualmente se o `SessaoResolvida` existe. O framework ASP.NET fará isso por você.

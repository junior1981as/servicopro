# Guia de Referência: Clean Architecture + DDD + CQRS

> Baseado em "Arquitetura Limpa" (Robert C. Martin) e "Implementando Domain-Driven Design" (Vaughn Vernon).
> Objetivo: um esquema prático, reaproveitável em qualquer projeto — não é teoria de livro, é o que vale a pena aplicar no dia a dia.

---

## 0. Antes de tudo: quando isso vale a pena

Isso aqui **não é pra todo projeto**. Overengineering mata mais projeto do que falta de arquitetura.

Use este esquema quando:
- O domínio tem regra de negócio real e não-trivial (não é só CRUD com validação de campo).
- O sistema vai crescer/mudar de regra com frequência (ex: regras fiscais, cálculo de frete, faturamento).
- Tem mais de uma forma de "entrada" (API + job + import de XML + tela) batendo na mesma lógica.

Não use (ou use bem mais leve) quando:
- É uma tela de CRUD simples.
- É um script de importação pontual.
- O domínio é estável e pequeno (ex: cadastro de município).

Regra prática: se você consegue descrever a regra de negócio em uma frase sem citar banco, tela ou API — ela é candidata a virar Domínio. Se a "regra" é só "salva no banco", não precisa de nada disso.

---

## 1. Clean Architecture — a ideia central

A única coisa que importa de verdade: **a Regra de Dependência**.

```
   ┌─────────────────────────────────────┐
   │  Frameworks & Drivers                │  ← SQL Server, React, PowerShell, APIs externas
   │  ┌─────────────────────────────────┐ │
   │  │  Interface Adapters             │ │  ← Controllers, Repositórios (implementação), ViewModels
   │  │  ┌─────────────────────────────┐│ │
   │  │  │  Use Cases (Application)    ││ │  ← Orquestra o domínio, um caso de uso por ação
   │  │  │  ┌─────────────────────────┐│││ │
   │  │  │  │  Entities (Domínio)     ││││ │  ← Regra de negócio pura, zero dependência externa
   │  │  │  └─────────────────────────┘│││ │
   │  │  └─────────────────────────────┘│ │
   │  └─────────────────────────────────┘ │
   └─────────────────────────────────────┘

   Dependência sempre aponta pra dentro. Círculo de fora conhece o de dentro.
   O de dentro NUNCA conhece o de fora.
```

**Tradução prática pro seu stack:**
- **Domínio**: classes/funções puras. Não importam `SqlConnection`, não importam `HttpClient`, não sabem que existe SEFAZ.
- **Use Cases**: uma classe/função por ação (`EmitirCTe`, `RecalcularKmAbastecimento`). Recebe interfaces, não implementações.
- **Interface Adapters**: onde entra o T-SQL, o parser de XML, o client do Graph API. Implementam interfaces que o domínio define.
- **Frameworks & Drivers**: SQL Server, PowerShell, React, filesystem, SMB.

**Teste de bolso**: se você trocar o SQL Server por Postgres, o domínio muda uma linha? Se a resposta é "sim", a dependência tá invertida errado.

---

## 2. DDD — os blocos que realmente valem a pena

Vernon lista muita coisa, mas na prática o que rende resultado é:

| Bloco | O que é | Exemplo no seu contexto |
|---|---|---|
| **Ubiquitous Language** | Vocabulário único entre código e negócio, sem tradução | `CTe`, `MDFe`, `agregado`, `filial` — nome de classe = nome que o pessoal fiscal usa |
| **Entity** | Tem identidade, muda ao longo do tempo | `ConhecimentoTransporte` (identidade = chave de acesso) |
| **Value Object** | Não tem identidade, é definido pelos atributos, imutável | `ChaveAcesso`, `CNPJ`, `PesoCarga` |
| **Aggregate** | Cluster de entidades/VOs com uma raiz, fronteira de consistência e transação | `CTe` é raiz; `DocumentosAnteriores` vive dentro dele, não existe sozinho |
| **Repository** | Interface de acesso a Aggregates inteiros (não query solta) | `ICTeRepository.ObterPorChave(chave)` |
| **Domain Service** | Regra que não pertence a nenhuma entidade sozinha | `ValidadorCnpjEmitenteVsDocAnt` (o bug do erro 733 que você já resolveu é exatamente isso) |
| **Domain Event** | "Algo aconteceu" no domínio, outros bounded contexts reagem | `CTeRejeitadoPelaSefaz`, `AbastecimentoRegistrado` |
| **Bounded Context** | Fronteira onde um modelo/vocabulário vale — fora dela, o mesmo termo pode significar outra coisa | Fiscal (CT-e/NF-e/MDF-e) ≠ Frota (abastecimento/manutenção) ≠ Faturamento |

**Regra prática de Aggregate**: se você precisa de transação pra manter duas coisas consistentes, elas são o mesmo Aggregate. Se não precisa, são Aggregates separados — nunca carregue tudo "pra garantir".

---

## 3. CQRS — separar escrita de leitura

CQRS não é "dois bancos". É separar **o que muda estado** do **o que só lê**.

```
   COMMAND SIDE                          QUERY SIDE
   ────────────                          ──────────
   Comando (intenção)                    Query (pergunta)
        │                                     │
        ▼                                     ▼
   Command Handler                       Query Handler
        │                                     │
        ▼                                     ▼
   Aggregate (domínio, regra)            Read Model (projeção, sem regra)
        │                                     │
        ▼                                     ▼
   Grava via Repository                  Lê direto de view/tabela otimizada
   (pode disparar Domain Event)           pra leitura (sem passar por Aggregate)
```

**Quando vale a pena de verdade** (sem exagero):
- Tela de listagem/dashboard que precisa de dado agregado de várias tabelas → **não** carregue os Aggregates pra montar isso. Faça uma query direta (view, stored procedure, projeção) — é exatamente o que você já faz na Torre de Controle com os painéis de faturamento/abastecimento, só que agora com nome formal.
- Escrita tem regra pesada (validação fiscal, idempotência, retry) mas leitura só quer mostrar status → command pesado, query leve e direta.

**Quando NÃO vale**:
- Se leitura e escrita usam a mesma forma de dado sem atrito nenhum, não separe artificialmente. Um repositório simples resolve.

**Tradução pro seu stack**: Command = stored procedure/classe que grava e valida (ex: `sp_ImportarCTe`, com toda a lógica de idempotência SHA-256 que você já implementou). Query = view otimizada ou DTO direto pro front do React, sem passar pelas regras de domínio.

---

## 4. Como as três coisas se encaixam

```
Requisição (API / PowerShell job / Import XML)
        │
        ▼
Interface Adapter (Controller / Handler de entrada)
        │
        ├── é um COMANDO? ──► Use Case ──► Aggregate (regra DDD) ──► Repository ──► grava
        │                                        │
        │                                        └──► Domain Event ──► outro Bounded Context reage
        │
        └── é uma QUERY? ───► Query Handler ──► Read Model / View ──► retorna DTO direto
```

A Regra de Dependência do Clean Architecture é o que garante que o Domínio (DDD) fique isolado. O CQRS é uma decisão *dentro* da camada de aplicação sobre como organizar Use Cases: um caminho pra mudar estado, outro pra ler.

---

## 5. Estrutura de pastas de referência (adaptável)

```
/src
  /Domain                      ← Clean Architecture: círculo mais interno
    /Fiscal                    ← Bounded Context
      CTe.cs / cte.py          ← Aggregate Root
      ChaveAcesso.cs           ← Value Object
      ICTeRepository.cs        ← Interface (contrato, sem implementação)
      Events/
        CTeRejeitadoPelaSefaz.cs

  /Application                 ← Use Cases + CQRS
    /Fiscal
      Commands/
        ImportarCTe/
          ImportarCTeCommand.cs
          ImportarCTeHandler.cs
      Queries/
        ObterStatusCTe/
          ObterStatusCTeQuery.cs
          ObterStatusCTeHandler.cs

  /Infrastructure               ← Interface Adapters + Frameworks
    /Fiscal
      SqlCTeRepository.cs        ← implementa ICTeRepository
      GraphApiEmailDownloader.cs

  /Api ou /Jobs                 ← Frameworks & Drivers (ponto de entrada real)
    CTeController.cs
    ImportarCTeJob.ps1
```

No seu caso concreto, isso mapeia direto pro que você já tem: `/Domain/Fiscal` seria onde a regra de CNPJ emitente-vs-docAnt do erro 733 devia morar (hoje provavelmente está espalhada no SQL ou no PowerShell).

---

## 6. Checklist pra modelar um domínio novo (passo a passo)

1. **Escreva a regra em português, sem código.** Se não conseguir sem citar banco/API, ainda não é regra de domínio.
2. **Identifique o Aggregate.** Qual é a fronteira de consistência? O que precisa mudar junto, na mesma transação?
3. **Separe Entity de Value Object.** Tem identidade que muda? Entity. É só um valor imutável? VO.
4. **Defina a interface do Repository** antes de pensar em SQL Server.
5. **Escreva o Use Case (Command) chamando só interfaces.** Zero SQL, zero HTTP, zero PowerShell nessa camada.
6. **Pergunte: alguém mais precisa saber que isso aconteceu?** Se sim, é um Domain Event.
7. **Só depois disso, implemente a Infrastructure** (T-SQL, stored procedure, PowerShell, Graph API).
8. **Pra leitura, não reaproveite o caminho de escrita.** Escreva a query/view direto pro que a tela ou dashboard precisa.

---

## 7. Erros comuns (os que realmente pegam)

- **Anemic Domain Model**: Aggregate vira só um DTO com getters/setters e a regra toda mora no Use Case ou pior, no controller. Isso não é DDD, é fachada de DDD.
- **Aggregate gigante**: modelar "o sistema fiscal inteiro" como um Aggregate só. Trava performance e concorrência. Aggregate pequeno, várias transações separadas, consistência eventual entre eles via Domain Event.
- **CQRS de fachada**: criar `Command` e `Query` só de nome mas os dois passam pelo mesmo caminho e mesmo modelo — não ganhou nada, só complicou.
- **Vazamento de dependência**: `using Microsoft.Data.SqlClient` dentro de uma classe de Domínio. Se isso acontece, a Regra de Dependência já quebrou.

---

*Guia genérico — adapte os nomes de Bounded Context e Aggregate pro domínio real de cada projeto que você aplicar.*

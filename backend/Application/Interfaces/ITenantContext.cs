namespace ServicoPro.Api.Application.Interfaces;

public record TenantInfo(string Id, string Nome, string Banco, bool Ativo, string Chave, string CaminhoBanco);

public interface ITenantContext
{
    TenantInfo? TenantAtual { get; }
    string ObterConnectionString();
    void SetarTenant(TenantInfo tenant);
}

using Microsoft.AspNetCore.Identity;

namespace ServicoPro.Api.Domain.Entities;

public class ApplicationUser : IdentityUser
{
    public string Nome { get; set; } = string.Empty;
    public string Cargo { get; set; } = string.Empty;
    public bool Ativo { get; set; } = true;
}

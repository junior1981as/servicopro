using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ServicoPro.Api.Infrastructure.Data;
using ServicoPro.Api.Domain.Entities;

var services = new ServiceCollection();
services.AddDbContext<ServicoProDbContext>(options =>
    options.UseSqlServer("Server=localhost;Database=db_servicopro_mssql;User Id=sa;Password=Your_password123;TrustServerCertificate=True;"));
var sp = services.BuildServiceProvider();

using (var scope = sp.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ServicoProDbContext>();
    var os = db.OrdensServico.Include(o => o.Produtos).FirstOrDefault(o => o.Id == Guid.Parse("03b7f561-6cdd-4800-afb4-252d0707113b"));
    if (os == null) {
        Console.WriteLine("OS NOT FOUND");
    } else {
        Console.WriteLine($"OS Found. Products count: {os.Produtos.Count}");
        foreach (var p in os.Produtos) {
            Console.WriteLine($"Product: {p.Id}, Desc: {p.Descricao}");
            p.Quantidade += 1; // force update
        }
        try {
            db.SaveChanges();
            Console.WriteLine("SAVE SUCCESS");
        } catch (Exception ex) {
            Console.WriteLine("ERROR: " + ex.ToString());
        }
    }
}

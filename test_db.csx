using System;
using System.Linq;
using Microsoft.Data.SqlClient;
using Dapper;

using var conn = new SqlConnection("Server=localhost;Database=db_servicopro_mssql;User Id=sa;Password=Your_password123;TrustServerCertificate=True;");
conn.Open();

var count = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM OSItensProduto WHERE Id = '3aee8fe6-fb60-4527-8dc0-41a501d7afaa'");
Console.WriteLine("COUNT FOR 3aee8fe6...: " + count);

if (count > 0) {
    var row = conn.QueryFirstOrDefault("SELECT * FROM OSItensProduto WHERE Id = '3aee8fe6-fb60-4527-8dc0-41a501d7afaa'");
    Console.WriteLine($"Row: Id={row.Id}, OrdemServicoId={row.OrdemServicoId}, ProdutoId={row.ProdutoId}");
}

var allProds = conn.Query("SELECT * FROM OSItensProduto WHERE OrdemServicoId = '03b7f561-6cdd-4800-afb4-252d0707113b'").ToList();
Console.WriteLine("ALL PRODS FOR THIS OS:");
foreach(var p in allProds) {
    Console.WriteLine($"- Id={p.Id}, ProdutoId={p.ProdutoId}");
}

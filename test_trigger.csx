using System;
using System.Data.SqlClient;
using Dapper;

using var conn = new SqlConnection("Server=localhost;Database=db_servicopro_mssql;User Id=sa;Password=Your_password123;TrustServerCertificate=True;");
conn.Open();

var triggers = conn.Query<string>("SELECT name FROM sys.triggers").ToList();
Console.WriteLine("TRIGGERS: " + string.Join(", ", triggers));

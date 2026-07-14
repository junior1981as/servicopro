#r "nuget: Microsoft.Data.SqlClient, 5.1.1"
using Microsoft.Data.SqlClient;

var masterConn = "Server=127.0.0.1,51666;Database=db_servicopro_mssql;User Id=servicopro_app;Password=aqswde12#$%&;TrustServerCertificate=True;Encrypt=True;MultipleActiveResultSets=True;";
using var con = new SqlConnection(masterConn);
con.Open();
using var cmd = con.CreateCommand();
cmd.CommandText = "SELECT Id, Nome FROM ContasBancarias";
try {
    using var reader = cmd.ExecuteReader();
    while (reader.Read()) {
        Console.WriteLine($"{reader["Id"]} - {reader["Nome"]}");
    }
} catch (Exception ex) {
    Console.WriteLine(ex.Message);
}

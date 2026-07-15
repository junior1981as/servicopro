using System;
using System.Data;
using Microsoft.Data.SqlClient;

var connStr = Environment.GetEnvironmentVariable("SERVICOPRO_MSSQL_CONNECTION_STRING");
if (string.IsNullOrEmpty(connStr)) {
    var lines = System.IO.File.ReadAllLines("/opt/servicopro/segredos/servicopro_mssql.env");
    foreach (var l in lines) {
        if (l.StartsWith("SERVICOPRO_MSSQL_CONNECTION_STRING=")) {
            connStr = l.Substring("SERVICOPRO_MSSQL_CONNECTION_STRING=".Length);
            break;
        }
    }
}

using var con = new SqlConnection(connStr);
con.Open();
var cmd = con.CreateCommand();
cmd.CommandText = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tenants'";
using var reader = cmd.ExecuteReader();
while (reader.Read()) {
    Console.WriteLine(reader.GetString(0));
}

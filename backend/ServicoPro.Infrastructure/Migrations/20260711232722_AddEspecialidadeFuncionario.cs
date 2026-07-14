using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicoPro.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEspecialidadeFuncionario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Especialidade",
                table: "Funcionarios",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Especialidade",
                table: "Funcionarios");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicoPro.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCodigoSequencial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Codigo",
                table: "Servicos",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<int>(
                name: "Codigo",
                table: "Produtos",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<int>(
                name: "Codigo",
                table: "OrdensServico",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<int>(
                name: "Codigo",
                table: "Orcamentos",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<int>(
                name: "Codigo",
                table: "Funcionarios",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<int>(
                name: "Codigo",
                table: "Clientes",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<int>(
                name: "Codigo",
                table: "Ativos",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<int>(
                name: "Codigo",
                table: "Agendamentos",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Codigo",
                table: "Servicos");

            migrationBuilder.DropColumn(
                name: "Codigo",
                table: "Produtos");

            migrationBuilder.DropColumn(
                name: "Codigo",
                table: "OrdensServico");

            migrationBuilder.DropColumn(
                name: "Codigo",
                table: "Orcamentos");

            migrationBuilder.DropColumn(
                name: "Codigo",
                table: "Funcionarios");

            migrationBuilder.DropColumn(
                name: "Codigo",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "Codigo",
                table: "Ativos");

            migrationBuilder.DropColumn(
                name: "Codigo",
                table: "Agendamentos");
        }
    }
}

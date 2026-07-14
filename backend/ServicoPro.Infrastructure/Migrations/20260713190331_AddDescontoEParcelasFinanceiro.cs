using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicoPro.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDescontoEParcelasFinanceiro : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Desconto",
                table: "TransacoesFinanceiras",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "NumeroParcela",
                table: "TransacoesFinanceiras",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalParcelas",
                table: "TransacoesFinanceiras",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Desconto",
                table: "OrdensServico",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Desconto",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropColumn(
                name: "NumeroParcela",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropColumn(
                name: "TotalParcelas",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropColumn(
                name: "Desconto",
                table: "OrdensServico");
        }
    }
}

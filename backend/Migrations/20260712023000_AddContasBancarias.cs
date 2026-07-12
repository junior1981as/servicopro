using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicoPro.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContasBancarias : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ContaBancariaId",
                table: "TransacoesFinanceiras",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ContaBancariaId",
                table: "LivroCaixa",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ContasBancarias",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Tipo = table.Column<int>(type: "int", nullable: false),
                    SaldoAtual = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContasBancarias", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TransacoesFinanceiras_ContaBancariaId",
                table: "TransacoesFinanceiras",
                column: "ContaBancariaId");

            migrationBuilder.CreateIndex(
                name: "IX_LivroCaixa_ContaBancariaId",
                table: "LivroCaixa",
                column: "ContaBancariaId");

            migrationBuilder.AddForeignKey(
                name: "FK_LivroCaixa_ContasBancarias_ContaBancariaId",
                table: "LivroCaixa",
                column: "ContaBancariaId",
                principalTable: "ContasBancarias",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TransacoesFinanceiras_ContasBancarias_ContaBancariaId",
                table: "TransacoesFinanceiras",
                column: "ContaBancariaId",
                principalTable: "ContasBancarias",
                principalColumn: "Id");
                
            // Automatic Seeding of a Default Bank Account for existing tenants
            migrationBuilder.Sql(@"
                DECLARE @DefaultId UNIQUEIDENTIFIER;
                SET @DefaultId = NEWID();

                INSERT INTO ContasBancarias (Id, Nome, Tipo, SaldoAtual, CriadoEm)
                VALUES (@DefaultId, 'Caixa Principal', 3, 0.0, SYSUTCDATETIME());

                UPDATE LivroCaixa SET ContaBancariaId = @DefaultId WHERE ContaBancariaId IS NULL;
                UPDATE TransacoesFinanceiras SET ContaBancariaId = @DefaultId WHERE ContaBancariaId IS NULL AND Status = 2; -- Pago
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LivroCaixa_ContasBancarias_ContaBancariaId",
                table: "LivroCaixa");

            migrationBuilder.DropForeignKey(
                name: "FK_TransacoesFinanceiras_ContasBancarias_ContaBancariaId",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropTable(
                name: "ContasBancarias");

            migrationBuilder.DropIndex(
                name: "IX_TransacoesFinanceiras_ContaBancariaId",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropIndex(
                name: "IX_LivroCaixa_ContaBancariaId",
                table: "LivroCaixa");

            migrationBuilder.DropColumn(
                name: "ContaBancariaId",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropColumn(
                name: "ContaBancariaId",
                table: "LivroCaixa");
        }
    }
}

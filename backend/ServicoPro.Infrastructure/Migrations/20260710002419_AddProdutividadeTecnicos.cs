using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicoPro.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProdutividadeTecnicos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DataConclusaoServico",
                table: "OrdensServico",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DataInicioExecucao",
                table: "OrdensServico",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DataPrevistaConclusao",
                table: "OrdensServico",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TecnicoId",
                table: "OrdensServico",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TecnicoId",
                table: "Orcamentos",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrdensServico_TecnicoId",
                table: "OrdensServico",
                column: "TecnicoId");

            migrationBuilder.CreateIndex(
                name: "IX_Orcamentos_TecnicoId",
                table: "Orcamentos",
                column: "TecnicoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Orcamentos_Funcionarios_TecnicoId",
                table: "Orcamentos",
                column: "TecnicoId",
                principalTable: "Funcionarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_OrdensServico_Funcionarios_TecnicoId",
                table: "OrdensServico",
                column: "TecnicoId",
                principalTable: "Funcionarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orcamentos_Funcionarios_TecnicoId",
                table: "Orcamentos");

            migrationBuilder.DropForeignKey(
                name: "FK_OrdensServico_Funcionarios_TecnicoId",
                table: "OrdensServico");

            migrationBuilder.DropIndex(
                name: "IX_OrdensServico_TecnicoId",
                table: "OrdensServico");

            migrationBuilder.DropIndex(
                name: "IX_Orcamentos_TecnicoId",
                table: "Orcamentos");

            migrationBuilder.DropColumn(
                name: "DataConclusaoServico",
                table: "OrdensServico");

            migrationBuilder.DropColumn(
                name: "DataInicioExecucao",
                table: "OrdensServico");

            migrationBuilder.DropColumn(
                name: "DataPrevistaConclusao",
                table: "OrdensServico");

            migrationBuilder.DropColumn(
                name: "TecnicoId",
                table: "OrdensServico");

            migrationBuilder.DropColumn(
                name: "TecnicoId",
                table: "Orcamentos");
        }
    }
}
